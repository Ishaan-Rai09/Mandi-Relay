/**
 * Generates the PWA icon set without any image dependency.
 *
 * The mark is drawn directly into an RGBA buffer and encoded as PNG using
 * Node's zlib. Run with: node scripts/make-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const FOREST = [24, 61, 43];
const IVORY = [245, 243, 236];
const GOLD = [244, 185, 66];

function crc32(buffer) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = table[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Signed-distance helpers, all in normalised 0..1 coordinates. */
function drawIcon(size, { maskable = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const inset = maskable ? 0.22 : 0.06; // maskable keeps art inside the safe zone
  const radius = 0.22;

  const inRoundedRect = (x, y) => {
    const min = inset;
    const max = 1 - inset;
    if (x < min || x > max || y < min || y > max) return false;
    const r = radius * (max - min);
    const cx = Math.min(Math.max(x, min + r), max - r);
    const cy = Math.min(Math.max(y, min + r), max - r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  };

  const ring = (x, y, cx, cy, r, thickness) => {
    const d = Math.hypot(x - cx, y - cy);
    return Math.abs(d - r) <= thickness;
  };

  const artScale = maskable ? 1 : 1;
  const cx = 0.5;
  const arcY = 0.62;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const x = (px + 0.5) / size;
      const y = (py + 0.5) / size;
      const i = (py * size + px) * 4;

      let color = null;

      if (maskable) {
        color = FOREST;
      } else if (inRoundedRect(x, y)) {
        color = FOREST;
      }

      if (color) {
        // Two converging arcs — a relay of two sellers into one market.
        const s = artScale;
        const leftArc =
          x > 0.24 * s &&
          x < 0.505 * s &&
          y > 0.3 &&
          y < arcY &&
          Math.abs(Math.hypot(x - 0.5 * s, y - arcY) - 0.255 * s) < 0.033;

        const rightArc =
          x > 0.495 * s &&
          x < 0.76 * s &&
          y > 0.3 &&
          y < arcY &&
          Math.abs(Math.hypot(x - 0.5 * s, y - arcY) - 0.255 * s) < 0.024;

        if (leftArc) color = IVORY;
        if (rightArc) color = [196, 214, 203];

        // The market: a gold node where the relays meet.
        const d = Math.hypot(x - 0.5, y - 0.315);
        if (d < 0.093) color = GOLD;

        // Stem
        if (Math.abs(x - 0.5) < 0.019 && y > 0.4 && y < 0.66) color = IVORY;
      }

      if (!color) {
        buf[i] = 0;
        buf[i + 1] = 0;
        buf[i + 2] = 0;
        buf[i + 3] = 0;
      } else {
        buf[i] = color[0];
        buf[i + 1] = color[1];
        buf[i + 2] = color[2];
        buf[i + 3] = 255;
      }
    }
  }

  return encodePng(size, size, buf);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", drawIcon(192));
writeFileSync("public/icons/icon-512.png", drawIcon(512));
writeFileSync("public/icons/icon-maskable-512.png", drawIcon(512, { maskable: true }));
writeFileSync("public/icons/apple-touch-icon.png", drawIcon(180, { maskable: true }));
writeFileSync("public/favicon.ico", drawIcon(48));

console.log("Wrote PWA icons to public/icons");
