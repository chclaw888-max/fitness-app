# 健身記錄 · 網頁版

以手機操作體驗為主的健身訓練記錄網頁應用,可安裝到主畫面、支援離線開啟,後端使用 Supabase(Auth + Postgres + Storage)。

## 開始開發

需要 Node.js 18 以上版本。

```bash
cp .env.example .env.local   # 填入你的 Supabase 專案 URL / anon key
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
├── index.html                  # HTML 進入頁,含 PWA meta tags
├── src/
│   ├── main.jsx                  # React 進入點,註冊 Service Worker
│   ├── App.jsx                    # 主要畫面(首頁/訓練/進度/我的 + 訓練記錄流程)
│   ├── theme.js                    # 共用色彩/字體 tokens
│   ├── components/
│   │   ├── AuthScreen.jsx            # 登入/註冊
│   │   ├── TrainScreen.jsx           # 課表列表、範本庫、自訂課表編輯器
│   │   └── ProgressPanels.jsx        # 進度頁:訓練趨勢/體態+照片對比/營養
│   ├── lib/
│   │   ├── supabase.js               # Supabase client 初始化
│   │   ├── api.js                    # 所有資料存取函式
│   │   ├── templates.js              # 課表範本靜態資料
│   │   ├── bluetooth.js              # Web Bluetooth 心率裝置連接
│   │   └── share.js                  # 分享卡片(Canvas 產圖 + Web Share API)
│   └── index.css                   # Tailwind 基礎樣式 + 字型
├── supabase/
│   ├── schema.sql                 # 完整資料表、視圖、RLS 政策(新專案用這個)
│   ├── seed.sql                   # 系統預設動作庫
│   └── migrations/                # 已存在的專案依序執行這些補齊差異
└── public/
    ├── manifest.json
    ├── service-worker.js          # 離線快取邏輯
    ├── offline.html               # 離線備用頁
    └── icons/                     # 192 / 512 / maskable / apple-touch 圖示
```

## 後端設定(Supabase)

完整步驟見 **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**,包含資料表結構說明、Storage bucket 設定、每個畫面對應到哪個 API 函式的對照表。

新專案：依序執行 `supabase/schema.sql` → `supabase/seed.sql`。
已經建立過的專案：依序補執行 `supabase/migrations/` 底下的檔案(檔名有編號,照順序執行)。

## 部署後務必檢查

- **一定要用 HTTPS**(或 localhost),否則瀏覽器不會註冊 Service Worker,Web Bluetooth 也無法使用
- 用 Chrome DevTools → Application 檢查 Manifest 與 Service Worker 是否正常
- 用 Lighthouse 跑一次 PWA 分數,確認「可安裝」項目全部通過
- 實機測試「加入主畫面」,確認開啟後沒有網址列、狀態列顏色跟主題色一致
- Supabase Dashboard → Storage,確認 `body-photos` bucket 已建立且為 Private

## 目前的已知限制

- **心率裝置僅支援 Web Bluetooth**(Chrome/Edge 桌面版、Android):iOS Safari 不支援 Web Bluetooth API,無法透過網頁讀取 Apple Watch 等裝置的心率,這是 iOS 平台限制。真正整合 Apple Health / Google Fit / Fitbit 需要各平台的 OAuth 流程與後端金鑰交換(建議用 Supabase Edge Function),目前尚未實作
- **營養紀錄是手動輸入**,沒有食物資料庫可以搜尋帶入,如果要做這個需要另外串第三方食物資料庫 API
- **離線寫入還沒有佇列機制**:訓練中若剛好斷線,`upsertSet` 會失敗並顯示錯誤提示,但不會自動在恢復連線後重試——如果需要這個,可以搭配 IndexedDB 做離線佇列,並用 Service Worker 的 Background Sync API 補送
