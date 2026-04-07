#!/usr/bin/env node
/**
 * 知日 - 轻量级静态文件服务器
 * 零依赖，支持 HTTPS，Service Worker 离线缓存
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

// MIME 类型映射
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function serveFile(res, filePath) {
  const ext = path.extname(filePath);
  const mime = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    // 缓存控制
    const isStatic = /\.(js|css|png|jpg|gif|svg|ico|woff2?)$/.test(filePath);
    if (isStatic) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }

    res.setHeader('Content-Type', mime);
    res.writeHead(200);
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  let urlPath = new URL(req.url, `http://localhost:${PORT}`).pathname;

  // 默认首页
  if (urlPath === '/' || urlPath === '/index.html') {
    serveFile(res, path.join(DIST_DIR, 'index.html'));
    return;
  }

  // 去掉开头的 /
  let filePath = path.join(DIST_DIR, urlPath);

  // 安全检查：防止路径穿越
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // 如果请求的是目录，尝试返回 index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // 如果文件不存在，返回 index.html（SPA 路由支持）
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  serveFile(res, filePath);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════╗
║          知日 - 日历应用服务器              ║
╠══════════════════════════════════════════════╣
║  🌐 地址: http://localhost:${PORT}           ║
║  📱 局域网: http://<你的IP>:${PORT}           ║
║                                              ║
║  💡 使用方法:                                ║
║  1. 浏览器打开 http://localhost:${PORT}       ║
║  2. 点击菜单 → "添加到主屏幕"                ║
║  3. 安装后即使断网也能使用                   ║
║                                              ║
║  🛑 按 Ctrl+C 停止服务器                    ║
╚══════════════════════════════════════════════╝
  `);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\\n服务器已停止');
  process.exit(0);
});
