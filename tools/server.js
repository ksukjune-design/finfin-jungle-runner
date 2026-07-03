// Zero-dependency static file server for local testing
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const port = process.env.PORT || 8080;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.json': 'application/json',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
};

http.createServer((req, res) => {
  // 디버그: 캔버스 스크린샷 저장 (POST /__shot, body = dataURL)
  if (req.method === 'POST' && req.url.startsWith('/__shot')) {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const b64 = body.replace(/^data:image\/png;base64,/, '');
      const name = (req.url.split('name=')[1] || 'shot').replace(/[^a-z0-9_]/gi, '');
      fs.writeFileSync(path.join(__dirname, 'out', name + '.png'), Buffer.from(b64, 'base64'));
      res.writeHead(200); res.end('ok');
    });
    return;
  }
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.join(root, urlPath);
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('not found'); return; }
    const ext = path.extname(file).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    // mp4: range 지원 (iOS 재생 필수)
    const range = req.headers.range;
    if (range && ext === '.mp4') {
      const m = /bytes=(\d+)-(\d*)/.exec(range);
      const start = parseInt(m[1], 10);
      const end = m[2] ? parseInt(m[2], 10) : st.size - 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${st.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': type,
      });
      fs.createReadStream(file, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' });
      fs.createReadStream(file).pipe(res);
    }
  });
}).listen(port, () => console.log(`serving ${root} at http://localhost:${port}`));
