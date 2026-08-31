/**
 * 健身記錄 APP - Service Worker
 *
 * 快取策略:
 * 1. App Shell(HTML/CSS/JS/圖示) → Cache First,並在背景更新(stale-while-revalidate)
 * 2. 導覽請求(切換頁面) → Network First,離線時退回快取,再退回 offline.html
 * 3. API / 資料請求  → Network First,離線時退回快取(讓使用者仍能看到上次同步的資料)
 *
 * 版本號規則:每次部署更新「靜態資源」內容時,務必更動 CACHE_VERSION,
 * 否則使用者的瀏覽器會持續使用舊的快取。
 */

const CACHE_VERSION = "v1.0.0";
const SHELL_CACHE = `workout-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `workout-runtime-${CACHE_VERSION}`;
const DATA_CACHE = `workout-data-${CACHE_VERSION}`;

// 首次安裝時要預先快取的核心檔案(依實際專案的建置輸出路徑調整)
const APP_SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// -------- install --------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// -------- activate: 清除舊版本快取 --------
self.addEventListener("activate", (event) => {
  const currentCaches = [SHELL_CACHE, RUNTIME_CACHE, DATA_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !currentCaches.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 讓前端可以主動觸發「立即套用新版本」(搭配 register-sw.js 的更新提示使用)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isStaticAsset(request) {
  return ["style", "script", "image", "font"].includes(request.destination);
}

// -------- fetch --------
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // 寫入類請求交給前端自行處理離線佇列

  const url = new URL(request.url);

  // 1) 頁面導覽:Network First → 快取 → 離線頁
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, resClone));
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/offline.html")))
    );
    return;
  }

  // 2) API / 資料請求:Network First,離線時用快取的舊資料
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(DATA_CACHE).then((cache) => cache.put(request, resClone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 3) 靜態資源:Cache First,背景更新
  if (isStaticAsset(request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((res) => {
            const resClone = res.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, resClone));
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 其他請求:直接放行,失敗才查快取
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
