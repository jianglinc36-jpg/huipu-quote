// 汇普报价软件 —— 本地静态服务器（Node 版，无需 Python）
// 仅监听 127.0.0.1（本机回环），对外不可访问，安全。
// 用法：node serve.js   （端口可用环境变量 PORT 覆盖，默认 8753）
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8753;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf'
};

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    // 防目录穿越
    const safe = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
    let filePath = path.join(ROOT, safe);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        // SPA 兜底：未知路径回 index.html
        fs.readFile(path.join(ROOT, 'index.html'), (e2, d2) => {
          if (e2) { res.writeHead(404); res.end('404 Not Found'); }
          else { res.writeHead(200, {'Content-Type': MIME['.html']}); res.end(d2); }
        });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {'Content-Type': MIME[ext] || 'application/octet-stream'});
      res.end(data);
    });
  } catch (e) {
    res.writeHead(500); res.end('Server Error');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('汇普报价软件本地服务已启动: http://127.0.0.1:' + PORT + '/');
});
