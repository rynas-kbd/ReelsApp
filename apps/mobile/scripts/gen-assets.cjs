// Génère des PNG valides (couleur unie) pour les assets de l'app.
// Sans dépendance externe : construit les chunks PNG avec CRC corrects.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function png(w, h, [r, g, b, a]) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const row = Buffer.alloc(1 + w * 4);
  for (let x = 0; x < w; x++) {
    row[1 + x * 4] = r;
    row[2 + x * 4] = g;
    row[3 + x * 4] = b;
    row[4 + x * 4] = a;
  }
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const dir = path.join(__dirname, '..', 'assets');
const violet = [124, 58, 237, 255];   // #7C3AED
const white = [255, 255, 255, 255];

const files = {
  'icon.png': png(1024, 1024, violet),
  'adaptive-icon.png': png(1024, 1024, violet),
  'splash.png': png(1080, 1920, [11, 11, 15, 255]), // #0B0B0F fond sombre
  'notification-icon.png': png(96, 96, white),       // silhouette blanche (Android la teinte)
  'widget-preview.png': png(512, 320, violet),
};

for (const [name, buf] of Object.entries(files)) {
  fs.writeFileSync(path.join(dir, name), buf);
  console.log(`écrit ${name} (${buf.length} octets)`);
}
console.log('OK');
