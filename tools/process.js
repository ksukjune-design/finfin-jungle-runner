// Sprite post-processing: chroma key (green -> transparent), grid slice, trim, resize
// Usage:
//   node process.js key   <in> <out.png> [maxW]
//   node process.js slice <in> <outPrefix> <rows> <cols> [maxW]
const sharp = require('sharp');

function chromaKey(data, w, h) {
  // Sample background color from the 4 corners, then key by color distance.
  // Also apply hue-based key (green/magenta dominance) as a safety net.
  const magenta = process.env.KEY_COLOR === 'magenta';
  const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + w - 1) * 4];
  let br = 0, bg = 0, bb = 0;
  for (const c of corners) { br += data[c]; bg += data[c + 1]; bb += data[c + 2]; }
  br /= 4; bg /= 4; bb /= 4;

  const HARD = 45, SOFT = 95; // color-distance thresholds
  for (let i = 0; i < w * h * 4; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const dist = Math.sqrt((r - br) * (r - br) + (g - bg) * (g - bg) + (b - bb) * (b - bb));
    const keyness = magenta ? Math.min(r, b) - g : g - Math.max(r, b);
    if (dist < HARD || keyness > 60) {
      data[i + 3] = 0;
    } else if (dist < SOFT) {
      const t = (dist - HARD) / (SOFT - HARD);
      data[i + 3] = Math.round(data[i + 3] * t);
      if (magenta) {
        data[i] = Math.min(r, g + 30); data[i + 2] = Math.min(b, g + 30);
      } else if (g > Math.max(r, b)) {
        data[i + 1] = Math.max(r, b) + 10; // despill
      }
    }
  }
  return data;
}

function findBounds(data, w, h) {
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function loadRGBA(file) {
  const img = sharp(file).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

async function saveRGBA(data, w, h, out, maxW) {
  let img = sharp(Buffer.from(data), { raw: { width: w, height: h, channels: 4 } });
  if (maxW && w > maxW) img = img.resize({ width: maxW });
  await img.png().toFile(out);
  console.log('saved ' + out + ` (${w}x${h}${maxW && w > maxW ? ' -> w' + maxW : ''})`);
}

function crop(data, w, h, box) {
  const out = Buffer.alloc(box.width * box.height * 4);
  for (let y = 0; y < box.height; y++) {
    const src = ((box.top + y) * w + box.left) * 4;
    data.copy(out, y * box.width * 4, src, src + box.width * 4);
  }
  return out;
}

async function main() {
  const [cmd, inFile, out, a, b, c] = process.argv.slice(2);
  const { data, w, h } = await loadRGBA(inFile);
  chromaKey(data, w, h);

  if (cmd === 'key') {
    const maxW = a ? parseInt(a) : 0;
    const bounds = findBounds(data, w, h);
    if (!bounds) { console.error('empty after key'); process.exit(1); }
    const pad = 4;
    const box = {
      left: Math.max(0, bounds.left - pad),
      top: Math.max(0, bounds.top - pad),
      width: Math.min(w - Math.max(0, bounds.left - pad), bounds.width + pad * 2),
      height: Math.min(h - Math.max(0, bounds.top - pad), bounds.height + pad * 2),
    };
    const cropped = crop(data, w, h, box);
    await saveRGBA(cropped, box.width, box.height, out, maxW);
  } else if (cmd === 'slice') {
    const rows = parseInt(a), cols = parseInt(b);
    const maxW = c ? parseInt(c) : 0;
    const cw = Math.floor(w / cols), ch = Math.floor(h / rows);
    let n = 1;
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const cell = crop(data, w, h, { left: col * cw, top: r * ch, width: cw, height: ch });
        const bounds = findBounds(cell, cw, ch);
        if (!bounds) { console.log(`cell ${n} empty, skipped`); n++; continue; }
        const pad = 2;
        const box = {
          left: Math.max(0, bounds.left - pad),
          top: Math.max(0, bounds.top - pad),
          width: Math.min(cw - Math.max(0, bounds.left - pad), bounds.width + pad * 2),
          height: Math.min(ch - Math.max(0, bounds.top - pad), bounds.height + pad * 2),
        };
        const trimmed = crop(cell, cw, ch, box);
        await saveRGBA(trimmed, box.width, box.height, `${out}${n}.png`, maxW);
        n++;
      }
    }
  } else {
    console.error('unknown cmd');
    process.exit(1);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
