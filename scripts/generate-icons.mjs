// ============================================================
// generate-icons.mjs — Íconos PNG de la PWA, sin dependencias
// ------------------------------------------------------------
// Chrome exige PNG reales de 192 y 512 px para permitir instalar
// la app; un SVG declarado con `sizes` no sirve. Aquí se rasteriza
// la marca con supermuestreo 4× y se codifica el PNG a mano
// (zlib viene incluido en Node), así el build no arrastra sharp
// ni ninguna otra dependencia binaria.
// ============================================================

import { deflateSync } from 'node:zlib';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'icons');
const SS = 4; // factor de supermuestreo (antialiasing)

// ── Paleta de marca ─────────────────────────────────────────
const C = {
  brand: [0x1d, 0x43, 0xd8, 255], // brand-700
  deep: [0x17, 0x22, 0x54, 255],  // brand-950
  bar1: [0x93, 0xbb, 0xfd, 255],  // brand-300
  bar2: [0xdb, 0xe8, 0xfe, 255],  // brand-100
  bar3: [0xff, 0xff, 0xff, 255],
  accent: [0x10, 0xb9, 0x81, 255], // emerald-500
};

// ════════════════════════════════════════════════════════════
// Codificador PNG (RGBA, sin filtros)
// ════════════════════════════════════════════════════════════
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filtro "none"
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1
    );
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // 8 bits por canal
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ════════════════════════════════════════════════════════════
// Lienzo con supermuestreo
// ════════════════════════════════════════════════════════════
class Canvas {
  constructor(width, height) {
    this.w = width;
    this.h = height;
    this.W = width * SS;
    this.H = height * SS;
    this.buf = new Uint8Array(this.W * this.H * 4);
  }

  px(x, y, color) {
    const i = (y * this.W + x) * 4;
    const [r, g, b, a] = color;
    if (a === 255) {
      this.buf[i] = r; this.buf[i + 1] = g; this.buf[i + 2] = b; this.buf[i + 3] = 255;
      return;
    }
    const al = a / 255;
    this.buf[i] = Math.round(r * al + this.buf[i] * (1 - al));
    this.buf[i + 1] = Math.round(g * al + this.buf[i + 1] * (1 - al));
    this.buf[i + 2] = Math.round(b * al + this.buf[i + 2] * (1 - al));
    this.buf[i + 3] = Math.max(this.buf[i + 3], a);
  }

  /** Rectángulo con esquinas redondeadas, en unidades del lienzo lógico. */
  roundRect(x, y, w, h, r, color) {
    const X = x * SS, Y = y * SS, W = w * SS, H = h * SS;
    const R = Math.min(r * SS, W / 2, H / 2);
    const x0 = Math.max(0, Math.floor(X));
    const y0 = Math.max(0, Math.floor(Y));
    const x1 = Math.min(this.W, Math.ceil(X + W));
    const y1 = Math.min(this.H, Math.ceil(Y + H));

    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const cx = px + 0.5;
        const cy = py + 0.5;
        // Distancia a la caja interior (redondeo de esquinas)
        const dx = Math.max(X + R - cx, 0, cx - (X + W - R));
        const dy = Math.max(Y + R - cy, 0, cy - (Y + H - R));
        if (dx * dx + dy * dy <= R * R) this.px(px, py, color);
      }
    }
  }

  fill(color) {
    this.roundRect(0, 0, this.w, this.h, 0, color);
  }

  /** Promedia el supermuestreo y devuelve el buffer RGBA final. */
  resolve() {
    const out = new Uint8Array(this.w * this.h * 4);
    const n = SS * SS;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let sy = 0; sy < SS; sy++) {
          for (let sx = 0; sx < SS; sx++) {
            const i = ((y * SS + sy) * this.W + (x * SS + sx)) * 4;
            r += this.buf[i]; g += this.buf[i + 1]; b += this.buf[i + 2]; a += this.buf[i + 3];
          }
        }
        const o = (y * this.w + x) * 4;
        out[o] = Math.round(r / n);
        out[o + 1] = Math.round(g / n);
        out[o + 2] = Math.round(b / n);
        out[o + 3] = Math.round(a / n);
      }
    }
    return out;
  }
}

/**
 * Dibuja la marca (tres barras ascendentes) dentro de un cuadro.
 * @param {Canvas} c
 * @param {number} cx  centro X del cuadro
 * @param {number} cy  centro Y del cuadro
 * @param {number} size lado del cuadro que ocupa la marca
 */
function drawMark(c, cx, cy, size) {
  const u = size / 32; // el diseño está trazado sobre una rejilla de 32
  const x = cx - size / 2;
  const y = cy - size / 2;
  const bars = [
    { bx: 8, by: 17, bh: 8, color: C.bar1 },
    { bx: 14, by: 12, bh: 13, color: C.bar2 },
    { bx: 20, by: 7, bh: 18, color: C.bar3 },
  ];
  for (const b of bars) {
    c.roundRect(x + b.bx * u, y + b.by * u, 4 * u, b.bh * u, 1.5 * u, b.color);
  }
}

function iconCanvas(size, { maskable = false } = {}) {
  const c = new Canvas(size, size);
  if (maskable) {
    // A pantalla completa: el sistema recorta el ícono a su antojo,
    // así que la marca se reduce para caber en la zona segura (80%).
    c.fill(C.brand);
    drawMark(c, size / 2, size / 2, size * 0.52);
  } else {
    c.roundRect(0, 0, size, size, size * 0.22, C.brand);
    drawMark(c, size / 2, size / 2, size * 0.78);
  }
  return c;
}

function ogCanvas() {
  const w = 1200;
  const h = 630;
  const c = new Canvas(w, h);
  c.fill(C.deep);
  // Bloque de marca centrado, con una franja de acento al pie
  c.roundRect(w / 2 - 150, h / 2 - 170, 300, 300, 66, C.brand);
  drawMark(c, w / 2, h / 2 - 20, 234);
  c.roundRect(w / 2 - 110, h / 2 + 168, 220, 12, 6, C.accent);
  return c;
}

// ════════════════════════════════════════════════════════════
const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#1d43d8"/>
  <rect x="8" y="17" width="4" height="8" rx="1.5" fill="#93bbfd"/>
  <rect x="14" y="12" width="4" height="13" rx="1.5" fill="#dbe8fe"/>
  <rect x="20" y="7" width="4" height="18" rx="1.5" fill="#ffffff"/>
</svg>
`;

await mkdir(OUT, { recursive: true });

const targets = [
  ['icon-192.png', iconCanvas(192)],
  ['icon-512.png', iconCanvas(512)],
  ['icon-maskable-512.png', iconCanvas(512, { maskable: true })],
  ['apple-touch-icon.png', iconCanvas(180)],
  ['og-image.png', ogCanvas()],
];

for (const [name, canvas] of targets) {
  const png = encodePNG(canvas.w, canvas.h, canvas.resolve());
  await writeFile(join(OUT, name), png);
  console.log(`  ícono: icons/${name} (${canvas.w}×${canvas.h}, ${(png.length / 1024).toFixed(1)} KB)`);
}

await writeFile(join(ROOT, 'favicon.svg'), FAVICON, 'utf8');
console.log('  ícono: favicon.svg');
