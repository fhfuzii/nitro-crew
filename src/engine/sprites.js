// Converte as grades de letras de src/art/sprites.js em canvases prontos para desenhar.
export function buildSprites(PALETTE, SPRITES) {
  const out = {};
  for (const [key, def] of Object.entries(SPRITES)) {
    out[key] = {
      w: def.w,
      h: def.h,
      fps: def.fps ?? 8,
      frames: def.frames.map(rows => rasterize(PALETTE, def.w, def.h, rows)),
    };
  }
  return out;
}

function rasterize(PALETTE, w, h, rows) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const row = rows[y] ?? '';
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (!ch || ch === '.' || ch === ' ') continue;
      const hex = PALETTE[ch];
      if (!hex) continue;
      const [r, gg, b, a] = parseHex(hex);
      const i = (y * w + x) * 4;
      img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = a;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function parseHex(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

export function frameAt(sprite, timeSec) {
  if (sprite.frames.length === 1) return sprite.frames[0];
  return sprite.frames[Math.floor(timeSec * sprite.fps) % sprite.frames.length];
}

// Ícone grande para a interface HTML (data URL ampliada sem suavização).
export function spriteDataURL(sprite, scale = 3, frame = 0) {
  const src = sprite.frames[frame];
  const c = document.createElement('canvas');
  c.width = sprite.w * scale;
  c.height = sprite.h * scale;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL();
}
