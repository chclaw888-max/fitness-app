# Supabase 後端設定指南

## 一、資料庫結構總覽

```
auth.users (Supabase 內建)
   │
   ├── profiles            使用者個人資料(顯示名稱、單位偏好)
   │
   ├── routines             課表
   │     └── routine_exercises   課表內的動作清單(順序、預設組數/次數)
   │
   ├── workouts             一次訓練場次(關聯到 routines,但存快照名稱)
   │     └── workout_sets        每一組的實際重量/次數紀錄
   │
   └── body_metrics          體重/體態(選用,對應未來的進度頁擴充)

exercises                  動作庫(created_by = null 是系統預設,所有人可讀)
```

**設計重點**
- `workouts.routine_name` 和 `workout_sets.exercise_name` 是「快照」——訓練當下複製一份名稱存起來,之後就算原本的課表或動作被改名/刪除,歷史紀錄的顯示內容也不會跟著變動,這是記帳類 APP 常見的做法。
- 所有表格都開啟 **Row Level Security(RLS)**,每個使用者只能讀寫自己的資料,規則直接寫在資料庫層,前端就算被繞過也不會看到別人的訓練紀錄。
- `v_personal_records`、`v_weekly_volume` 是兩個視圖(view),把「個人紀錄」「每週訓練量」這類進度頁需要的彙總查詢直接封裝在資料庫裡,前端不用自己寫複雜的 SQL。

## 二、建立 Supabase 專案

1. 到 [supabase.com](https://supabase.com) 建立帳號、新增一個專案(選離台灣近的區域,例如 Singapore)
2. 進入專案後,左側選單 **SQL Editor** → New query
3. 貼上 `supabase/schema.sql` 的完整內容,執行(Run)
4. 再貼上 `supabase/seed.sql` 的內容,執行——這會匯入 12 個系統預設動作
5. 左側選單 **Project Settings → API**,複製兩個值：
   - `Project URL`
   - `anon public` key

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
| 訓練 - 課表列表 | `listRoutines()` |
| 訓練中 - 開始訓練 | `startWorkout({ routineId, routineName })` |
| 訓練中 - 打勾完成一組 | `upsertSet({ workoutId, exerciseId, ... })` |
| 訓練中 - 完成訓練 | `finishWorkout({ workoutId, durationSeconds })` |
| 進度 - 訓練量趨勢圖 | `getVolumeTrend()` |
| 進度 - 個人紀錄 | `getPersonalRecords()` |

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

## 五、目前還沒做的事(下一步)

- **App.jsx 目前仍是 `useState` 假資料**,還沒有實際呼叫 `api.js`——這是刻意分開的,先確保後端結構跟資料存取邏輯正確,再串接 UI 會比較好除錯
- 沒有寫「編輯課表」「新增自訂動作」的 UI,`api.js` 裡已經有 `createRoutine`、`createCustomExercise` 這些函式,只是還沒有對應畫面
- 訓練中畫面目前是「本地先改 state,按完成才整批送出」,如果要做到「離線訓練、恢復連線後自動同步」,`upsertSet` 需要搭配 IndexedDB 做離線佇列

如果你要我接下來把 `App.jsx` 實際串上這些 API(含登入畫面、載入中狀態、錯誤處理),跟我說一聲即可。
