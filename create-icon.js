const fs = require('fs');

// 简单的 SVG 图标生成器 - 生成一个日历样式的图标
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8B4513;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#A0522D;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#grad)" rx="80"/>
  <text x="256" y="200" font-family="Arial" font-size="80" fill="white" text-anchor="middle" font-weight="bold">知</text>
  <text x="256" y="340" font-family="Arial" font-size="80" fill="white" text-anchor="middle" font-weight="bold">日</text>
</svg>`;

// 将 SVG 写入文件
fs.writeFileSync('public/icon.svg', svgIcon);
console.log('SVG icon created');
