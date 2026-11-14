const CACHE = 'huipu-quote-v142';
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

self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') { try { self.skipWaiting(); } catch (err) {} }
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
  // 版本清单：永远走网络，绝不缓存（用来判断 APP 是否有新版）
  if (url.pathname.endsWith('version.json')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }).catch(function () {
      return new Response('{"version":0}', { headers: { 'Content-Type': 'application/json' } });
    }));
    return;
  }
  // 主页面：网络优先（强制绕过浏览器 HTTP 缓存，GitHub Pages 默认 max-age=600 会导致改了看不到），失败才用缓存
  const isAdmin = url.pathname.endsWith('admin.html');
  if (isAdmin || url.pathname.endsWith('index.html') || url.pathname === '/' || url.pathname.endsWith('/huipu-quote/') || e.request.mode === 'navigate') {
    const selfKey = isAdmin ? './admin.html' : './index.html';
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).then(function (resp) {
        if (resp && resp.ok) { // 只缓存成功响应，绝不把 404/错误页写进缓存
          const cp = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(selfKey, cp); });
        }
        return resp;
      }).catch(function () {
        return caches.match(selfKey).then(function (hit) {
          return hit || caches.match('./index.html');
        });
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
