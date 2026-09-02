# Supabase 後端設定指南

## 一、資料庫結構總覽

```
auth.users (Supabase 內建)
   │
   ├── profiles            使用者個人資料(顯示名稱、單位偏好)
   │
   ├── routines             課表(可自訂,或從範本加入)
   │     └── routine_exercises   課表內的動作清單(順序、預設組數/次數)
   │
   ├── workouts             一次訓練場次(關聯到 routines,但存快照名稱;含心率統計)
   │     └── workout_sets        每一組的實際重量/次數紀錄
   │
   ├── body_metrics          體重/體態/照片路徑
   │
   └── nutrition_logs        每餐的熱量與三大營養素

exercises                  動作庫(created_by = null 是系統預設,所有人可讀)

storage.buckets: body-photos (private)   體態照片,路徑規則 {user_id}/{filename}
```

**設計重點**
- `workouts.routine_name` 和 `workout_sets.exercise_name` 是「快照」——訓練當下複製一份名稱存起來,之後就算原本的課表或動作被改名/刪除,歷史紀錄的顯示內容也不會跟著變動,這是記帳類 APP 常見的做法。
- 所有表格都開啟 **Row Level Security(RLS)**,每個使用者只能讀寫自己的資料,規則直接寫在資料庫層,前端就算被繞過也不會看到別人的訓練紀錄。Storage 的 `body-photos` bucket 也一樣,用檔案路徑的資料夾第一層(`{user_id}/...`)當作權限判斷依據。
- `v_personal_records`、`v_weekly_volume` 是兩個視圖(view),把「個人紀錄」「每週訓練量」這類進度頁需要的彙總查詢直接封裝在資料庫裡,前端不用自己寫複雜的 SQL。
- `body_metrics` 用 `(user_id, recorded_at)` 唯一索引,同一天重複記錄會覆蓋(upsert),照片私有存放、讀取時用短期簽章網址(1 小時過期),不是公開連結。

## 二、建立 Supabase 專案(新專案)

1. 到 [supabase.com](https://supabase.com) 建立帳號、新增一個專案(選離台灣近的區域,例如 Singapore)
2. 進入專案後,左側選單 **SQL Editor** → New query
3. 依序貼上並執行(Run)：`supabase/schema.sql` → `supabase/seed.sql`
4. 左側選單 **Storage**,確認 `body-photos` bucket 已經自動建立(schema.sql 裡已包含建立語句),且標示為 Private
5. 左側選單 **Project Settings → API**,複製兩個值：
   - `Project URL`
   - `anon public` key

### 如果是已經建立過的舊專案

依序執行 `supabase/migrations/` 底下的檔案(檔名有編號,照順序執行,重複執行也安全)：

| 檔案 | 內容 |
|---|---|
| `001_user_id_defaults.sql` | 修正 `user_id` 欄位預設值 |
| `002_more_exercises.sql` | 新增動作庫項目(支援課表範本) |
| `003_phase3.sql` | 體態照片欄位、`body-photos` Storage bucket、營養紀錄表、心率欄位 |
| `004_muscle_visceral_fat.sql` | `body_metrics` 新增肌肉量、內臟脂肪等級欄位 |

## 三、串接到前端專案

1. 複製 `.env.example` 為 `.env.local`,填入剛剛複製的兩個值：

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

2. 安裝相依套件(已加進 `package.json`)：

```bash
npm install
```

3. `src/lib/supabase.js` 是 Supabase client 初始化,`src/lib/api.js` 是所有資料存取函式,已經對應好 App.jsx 各畫面需要的操作：

| 畫面 | 對應函式 |
|---|---|
| 首頁 - 連續天數 | `getStreak()` |
| 首頁 - 本週訓練量/次數 | `getThisWeekStats()` |
| 首頁 - 最近訓練 | `listRecentWorkouts()` |
| 首頁 / 訓練完成 - 分享 | `shareCard()`(`src/lib/share.js`,純前端,不需要後端) |
| 訓練 - 課表列表 / 範本 / 自訂 | `listRoutines()`、`createRoutine()`、`updateRoutine()`、`deleteRoutine()` |
| 訓練 - 補填某天的紀錄 | `createBackfilledWorkout({ date, routineId, routineName, durationMinutes, exercises })` |
| 動作庫 - 新增/編輯/刪除自訂動作 | `createCustomExercise()`、`updateExercise()`、`deleteExercise()`(在選動作的畫面裡操作) |
| 訓練中 - 開始訓練 | `startWorkout({ routineId, routineName })` |
| 訓練中 - 打勾完成一組 | `upsertSet({ workoutId, exerciseId, ... })` |
| 訓練中 - 連接心率手環 | `connectHeartRateMonitor()`(`src/lib/bluetooth.js`,純前端) |
| 訓練中 - 完成訓練 | `finishWorkout({ workoutId, durationSeconds, heartRate })` |
| 進度 - 訓練量趨勢圖 / 個人紀錄 | `getVolumeTrend()`、`getPersonalRecords()` |
| 進度 - 體態紀錄 + 照片 | `listBodyMetrics()`、`upsertBodyMetric()`、`uploadBodyPhoto()`、`getBodyPhotoUrl()`、`deleteBodyMetric()` |
| 進度 - 營養紀錄 | `listNutritionLogs(date)`、`addNutritionEntry()`、`deleteNutritionEntry()` |

## 四、加上登入畫面

Supabase Auth 預設用 email + 密碼即可運作,不需要額外設定就能用：

```js
import { signUp, signIn, signOut, getSession, onAuthStateChange } from "./lib/api";

// 註冊
await signUp({ email, password, displayName: "阿明" });

// 登入
await signIn({ email, password });

// 監聽登入狀態變化(通常放在 App.jsx 最外層的 useEffect)
useEffect(() => {
  getSession().then(setSession);
  return onAuthStateChange(setSession);
}, []);
```

新使用者第一次登入、還沒有任何課表時,可以呼叫 `seedDefaultRoutines()` 幫他建立跟 Demo 一樣的三份預設課表：

```js
const routines = await listRoutines();
if (routines.length === 0) {
  await seedDefaultRoutines();
}
```

若想額外開放 Google / Apple 登入,在 Supabase Dashboard → **Authentication → Providers** 開啟對應的 OAuth 提供者,並在 `signIn` 旁邊加一個 `supabase.auth.signInWithOAuth({ provider: "google" })` 即可,不需要改資料庫結構。

## 五、心率手環(Web Bluetooth)

`src/lib/bluetooth.js` 用瀏覽器原生的 Web Bluetooth API 連接標準心率藍牙裝置,**完全不需要後端**,但有平台限制：

- 只支援 Chrome / Edge(桌面版或 Android),且必須是 HTTPS 或 localhost
- **iOS Safari 不支援 Web Bluetooth**,無法透過網頁讀取 Apple Watch 等裝置的心率——這是蘋果的平台限制,不是程式碼問題
- 使用者必須主動點擊「連接心率手環」按鈕,瀏覽器不允許網頁自動連線

如果要支援 Fitbit、Google Fit、Apple Health 這類平台,它們都要求 OAuth 授權流程,而 OAuth 的 client secret **不能放在前端程式碼裡**,必須透過後端(建議用 Supabase Edge Function)做金鑰交換,目前還沒有實作,算是這個 Phase 3 版本裡最大的一塊留白。

## 六、體態照片(Storage)

照片存在私有的 `body-photos` bucket,不是公開連結,每次顯示照片時前端會呼叫 `getBodyPhotoUrl()` 產生一個 1 小時後過期的簽章網址。如果照片一直載入失敗,先檢查：

1. Supabase Dashboard → Storage,確認 `body-photos` bucket 存在
2. Storage → Policies,確認 `body_photos_select_own` 等三條政策存在(`003_phase3.sql` 或 `schema.sql` 應該已經建立)

## 七、目前還沒做的事(下一步)

- **離線寫入沒有佇列機制**:斷線時 `upsertSet` 會直接失敗並顯示提示,不會自動重試,可以搭配 IndexedDB + Service Worker 的 Background Sync API 補上
- **Fitbit / Google Fit / Apple Health 的 OAuth 整合**:需要註冊各平台的開發者應用、申請 client id/secret,並寫一個 Supabase Edge Function 處理 token 交換與刷新
- **食物資料庫搜尋**:目前營養紀錄要自己輸入熱量/營養素數字,沒有「搜尋食物自動帶入」的功能

如果要我接下來做這幾項,跟我說一聲即可。
