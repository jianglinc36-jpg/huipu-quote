const CACHE = 'huipu-quote-v110';
const ASSETS = ['./index.html', './admin.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  './vendor/xlsx.full.min.js', './vendor/pdf.min.js', './vendor/pdf.worker.min.js', './vendor/mammoth.browser.min.js',
  './vendor/html2canvas.min.js', './vendor/jspdf.umd.min.js', './vendor/supabase.min.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS).catch(function () { return Promise.resolve(); });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.map(function (k) { return k !== CACHE ? caches.delete(k) : Promise.resolve(); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return; // POST/PUT/DELETE 等写请求直连，不进 SW
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // CDN/云服务请求直连，不缓存
  // API 请求绝不能缓存（会导致数据不刷新/旧数据）：带认证头或 API 路径一律直连
  try {
    if (e.request.headers.get('authorization') || e.request.headers.get('x-api-key')) return;
  } catch (err) {}
  if (/\/(api|rest|database|auth|storage|functions)(\/|$)/.test(url.pathname)) return;
  // 主页面：网络优先，失败才用缓存 —— 保证每次打开都是最新版本
  if (url.pathname.endsWith('index.html') || url.pathname.endsWith('admin.html') || url.pathname === '/' || e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function (resp) {
        const cp = resp.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', cp); });
        return resp;
      }).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // 静态资源（图标等）：缓存优先
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (resp) {
        const cp = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, cp); });
        return resp;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
