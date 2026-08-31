/**
 * 在應用程式進入點(例如 main.jsx / main.tsx)引入並呼叫：
 *
 *   import { registerServiceWorker } from "./register-sw";
 *   registerServiceWorker({
 *     onUpdateAvailable: () => {
 *       // 這裡串接你的 UI,例如顯示「有新版本，點此更新」的橫幅
 *     },
 *   });
 */

export function registerServiceWorker({ onUpdateAvailable } = {}) {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js");

      // 偵測到新版本 Service Worker 安裝完成、等待啟用時，通知外部 UI
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            if (typeof onUpdateAvailable === "function") {
              onUpdateAvailable(() => applyUpdate(registration));
            }
          }
        });
      });

      // 每次啟動時主動檢查一次是否有新版本
      registration.update();
    } catch (err) {
      console.error("Service worker 註冊失敗:", err);
    }
  });

  // 新版本套用後，重新整理頁面以載入最新內容
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

function applyUpdate(registration) {
  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}
