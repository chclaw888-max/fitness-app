# 健身記錄 · 網頁版

以手機操作體驗為主的健身訓練記錄網頁應用,可安裝到主畫面、支援離線開啟。

目前是**前端 Demo**:資料存在瀏覽器記憶體中,重新整理會重置。之後可接上 Supabase / Firebase 等後端做真正的資料儲存與跨裝置同步。

## 開始開發

需要 Node.js 18 以上版本。

```bash
npm install
npm run dev
```

啟動後打開 `http://localhost:5173`,建議用瀏覽器的裝置模擬工具(如 Chrome DevTools 的手機檢視)測試,操作體驗才會跟實機一致。

## 建置正式版本

```bash
npm run build
npm run preview   # 本機預覽 build 後的成果
```

`npm run build` 的輸出會在 `dist/` 資料夾,可以直接部署到任何靜態網站託管服務(Vercel、Netlify、Cloudflare Pages 等)。

## 專案結構

```
├── index.html              # HTML 進入頁,含 PWA meta tags
├── manifest.json            # → 實際放在 public/,定義 APP 名稱與圖示
├── src/
│   ├── main.jsx              # React 進入點,註冊 Service Worker
│   ├── App.jsx                # 主要畫面(首頁/訓練/進度/我的 + 訓練記錄流程)
│   ├── register-sw.js         # Service Worker 註冊 + 更新提示邏輯
│   └── index.css              # Tailwind 基礎樣式 + 字型
└── public/
    ├── manifest.json
    ├── service-worker.js      # 離線快取邏輯
    ├── offline.html           # 離線備用頁
    └── icons/                 # 192 / 512 / maskable / apple-touch 圖示
```

## 部署後務必檢查

- **一定要用 HTTPS**(或 localhost),否則瀏覽器不會註冊 Service Worker
- 用 Chrome DevTools → Application 檢查 Manifest 與 Service Worker 是否正常
- 用 Lighthouse 跑一次 PWA 分數,確認「可安裝」項目全部通過
- 實機測試「加入主畫面」,確認開啟後沒有網址列、狀態列顏色跟主題色一致

## 後端(Supabase)

資料庫 schema、RLS 權限政策、資料存取函式都已經規劃好,詳見 **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**。

```
supabase/
  ├── schema.sql   # 資料表、視圖、RLS 政策
  └── seed.sql     # 系統預設動作庫
src/lib/
  ├── supabase.js  # Supabase client 初始化
  └── api.js       # Auth / 課表 / 訓練紀錄 / 進度查詢函式
.env.example        # 複製為 .env.local 並填入你的 Supabase 專案金鑰
```

`App.jsx` 目前仍使用假資料(`useState`),尚未實際呼叫這些 API——這是刻意分開的兩個步驟,方便先確認後端結構正確。

## 接下來可以做的事

1. **把 App.jsx 串上 Supabase**:用 `src/lib/api.js` 裡的函式取代 `useState` 假資料,加上登入畫面與載入狀態
2. **動作庫與自訂課表 UI**:`api.js` 已有 `createRoutine`、`createCustomExercise`,還缺對應的編輯畫面
3. **離線同步**:訓練中記錄先存 `IndexedDB`,恢復連線後再呼叫 `upsertSet` 同步,搭配 Service Worker 的 Background Sync API
