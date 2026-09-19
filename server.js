const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const port = Number(process.env.PORT || 4173);

http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!target.startsWith(root + path.sep) && target !== path.join(root, 'index.html')) {
    response.writeHead(403).end();
    return;
  }
  fs.readFile(target, (error, data) => {
    if (error) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' });
    response.end(data);
  });
}).listen(port, () => console.log(`Virtual office: http://localhost:${port}`));
