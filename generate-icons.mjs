// 生成有效的 PNG 图标
import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, outputPath) {
  const pixels = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 棕色渐变背景
      const r = Math.floor(139 - (y / height) * 20);
      const g = Math.floor(69 - (y / height) * 10);
      const b = Math.floor(19);
      pixels.push(r, g, b, 255);
    }
  }
  const png = encodePNG(width, height, pixels);
  fs.writeFileSync(outputPath, png);
}

function encodePNG(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = createChunk('IHDR', ihdrData);
  
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const rawIdx = y * (width * 4 + 1) + x * 4 + 1;
      rawData[rawIdx] = pixels[idx];
      rawData[rawIdx + 1] = pixels[idx + 1];
      rawData[rawIdx + 2] = pixels[idx + 2];
      rawData[rawIdx + 3] = pixels[idx + 3];
    }
  }
  
  const compressed = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  const table = makeCRCTable();
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return c ^ 0xFFFFFFFF;
}

function makeCRCTable() {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
}

createPNG(192, 192, 'public/icon-192.png');
createPNG(512, 512, 'public/icon-512.png');
console.log('✅ 图标已生成: icon-192.png (192x192), icon-512.png (512x512)');
