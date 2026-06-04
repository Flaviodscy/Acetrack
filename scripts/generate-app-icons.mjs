import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const files = [
  ["public/apple-touch-icon.png", 180, 0.14],
  ["public/pwa-icon-192.png", 192, 0.14],
  ["public/pwa-icon-512.png", 512, 0.14],
  ["public/pwa-maskable-512.png", 512, 0.22]
];

for (const [file, size, inset] of files) {
  writeFileSync(file, createIcon(size, inset));
}

function createIcon(size, insetRatio) {
  const data = Buffer.alloc(size * size * 4);
  const inset = Math.round(size * insetRatio);
  const center = size / 2;
  const ballRadius = size * 0.245;
  const fieldRadius = size * 0.22;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const roundedOuter = roundedRectAlpha(x, y, 0, 0, size, size, size * 0.23);
      const roundedInner = roundedRectAlpha(x, y, inset, inset, size - inset * 2, size - inset * 2, size * 0.19);
      const court = thinCourtLine(x, y, size);
      const ball = circleDistance(x, y, center, center * 0.88, ballRadius);
      const seamOne = Math.abs(circleDistance(x, y, center - ballRadius * 0.28, center * 0.74, fieldRadius));
      const seamTwo = Math.abs(circleDistance(x, y, center + ballRadius * 0.34, center * 1.05, fieldRadius));

      let color = mix([251, 253, 245], [238, 248, 202], roundedInner);
      if (court > 0) color = mix(color, [159, 198, 58], court * 0.5);
      if (ball < 0) color = [205, 234, 95];
      if (ball < 0 && (seamOne < size * 0.014 || seamTwo < size * 0.014)) color = [251, 253, 245];

      data[index] = color[0];
      data[index + 1] = color[1];
      data[index + 2] = color[2];
      data[index + 3] = Math.round(255 * roundedOuter);
    }
  }

  return png(size, size, data);
}

function roundedRectAlpha(x, y, rx, ry, width, height, radius) {
  const px = Math.max(rx - x, 0, x - (rx + width - 1));
  const py = Math.max(ry - y, 0, y - (ry + height - 1));
  const edge = Math.hypot(px, py);
  return edge <= radius ? 1 : 0;
}

function thinCourtLine(x, y, size) {
  const baseline = Math.abs(y - size * 0.77) < size * 0.006 && x > size * 0.18 && x < size * 0.82;
  const center = Math.abs(x - size * 0.5) < size * 0.004 && y > size * 0.55 && y < size * 0.84;
  const service = Math.abs(y - size * 0.66) < size * 0.004 && x > size * 0.28 && x < size * 0.72;
  return baseline || center || service ? 1 : 0;
}

function circleDistance(x, y, cx, cy, radius) {
  return Math.hypot(x - cx, y - cy) - radius;
}

function mix(a, b, t) {
  return a.map((channel, index) => Math.round(channel * (1 - t) + b[index] * t));
}

function png(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rows = Buffer.alloc((width * 4 + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    rows[rowStart] = 0;
    rgba.copy(rows, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.concat([name, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuffer), 0);
  return Buffer.concat([length, name, data, crc]);
}

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}
