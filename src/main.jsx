import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { registerServiceWorker } from "./register-sw.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

registerServiceWorker({
  onUpdateAvailable: (applyUpdate) => {
    // 簡易版本：偵測到新版本時直接詢問使用者是否要更新
    // 正式專案可以換成不打斷操作的 Toast 提示
    if (window.confirm("有新版本可用，要立即更新嗎？")) {
      applyUpdate();
    }
  },
});
