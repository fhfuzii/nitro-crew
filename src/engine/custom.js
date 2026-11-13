// Personalização visual do carro do jogador. Contrato: docs/contracts.md, seções 2.1 e 3.2.
// Só muda a aparência: nada aqui entra no cálculo de potência.
import { rasterize } from './sprites.js';

export const CUSTOM_CATS = ['paint', 'glass', 'headlight', 'rims', 'neon', 'spoiler'];
export const CUSTOM_CAT_NAMES = {
  paint: 'Pintura', glass: 'Vidros', headlight: 'Faróis', rims: 'Rodas', neon: 'Néon', spoiler: 'Aerofólio',
};
// Letra usada como amostra de cor de cada categoria.
const SWATCH = { paint: '2', glass: '6', headlight: '8', rims: 'e', neon: 'base' };

export function catOptions(CUSTOM, cat) { return CUSTOM?.options?.[cat] ?? []; }

export function optionOf(CUSTOM, cat, id) {
  const list = catOptions(CUSTOM, cat);
  return list.find(o => o.id === id) ?? list[0] ?? null;
}

// Opção padrão = a primeira da lista (grátis, já vem com o jogo).
export function defaultCustom(CUSTOM) {
  return Object.fromEntries(CUSTOM_CATS.map(c => [c, catOptions(CUSTOM, c)[0]?.id ?? null]));
}

export function priceOf(balance, cat, id) {
  const p = balance.cosmetics?.[cat]?.[id]?.price;
  return typeof p === 'number' ? p : null; // null = não está à venda
}

export function unlockStageOf(balance, cat, id) {
  return balance.cosmetics?.[cat]?.[id]?.unlock?.stage ?? null;
}

export function isOwned(CUSTOM, balance, state, cat, id) {
  if (id === 'none') return true;
  if (catOptions(CUSTOM, cat)[0]?.id === id) return true;
  if (priceOf(balance, cat, id) === 0) return true;
  return state.custom.owned.includes(`${cat}:${id}`);
}

export function swatchColor(CUSTOM, cat, id) {
  const o = optionOf(CUSTOM, cat, id);
  return o?.colors?.[SWATCH[cat]] ?? null;
}

// Monta o sprite do carro do jogador com as opções escolhidas.
// Devolve { w, h, fps, frames, ox, oy }: ox/oy = onde fica o (0,0) do carro dentro do quadro,
// porque aerofólio e néon podem passar da caixa 32x14.
export function buildPlayerCar(PALETTE, SPRITES, CUSTOM, chosen, model = 'car_player') {
  const def = SPRITES[model];
  const pal = { ...PALETTE };
  for (const cat of ['paint', 'glass', 'headlight', 'rims']) {
    Object.assign(pal, optionOf(CUSTOM, cat, chosen?.[cat])?.colors ?? {});
  }

  const spOpt = optionOf(CUSTOM, 'spoiler', chosen?.spoiler);
  // Variante do aerofólio para o modelo (spoiler_<id>_<modelo>), se existir; senão o genérico.
  const modelTag = model.startsWith('car_player_') ? model.slice('car_player_'.length) : null;
  const spDef = spOpt?.sprite ? (modelTag && SPRITES[`${spOpt.sprite}_${modelTag}`]) || SPRITES[spOpt.sprite] : null;
  const mount = def.mounts?.spoiler;
  let sp = null;
  if (spDef && mount) {
    const [ax, ay] = spDef.anchor ?? [0, spDef.h - 1];
    sp = { img: rasterize(pal, spDef.w, spDef.h, spDef.frames[0]), x: mount[0] - ax, y: mount[1] - ay, w: spDef.w, h: spDef.h };
  }

  const neonOpt = optionOf(CUSTOM, 'neon', chosen?.neon);
  const ug = def.mounts?.underglow;
  const neon = neonOpt?.colors && ug ? { x0: ug[0], x1: ug[1], y: ug[2], base: neonOpt.colors.base, light: neonOpt.colors.light ?? neonOpt.colors.base } : null;

  let minX = 0, minY = 0, maxX = def.w, maxY = def.h;
  if (sp) { minX = Math.min(minX, sp.x); minY = Math.min(minY, sp.y); maxX = Math.max(maxX, sp.x + sp.w); maxY = Math.max(maxY, sp.y + sp.h); }
  if (neon) { minX = Math.min(minX, neon.x0 - 2); maxX = Math.max(maxX, neon.x1 + 3); maxY = Math.max(maxY, neon.y + 4); }
  const ox = -minX, oy = -minY, W = maxX - minX, H = maxY - minY;

  const frames = def.frames.map(rows => {
    const body = rasterize(pal, def.w, def.h, rows);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    if (neon) drawNeon(g, neon, ox, oy);
    g.drawImage(body, ox, oy);
    if (sp) g.drawImage(sp.img, ox + sp.x, oy + sp.y);
    return c;
  });
  return { w: W, h: H, fps: def.fps ?? 8, frames, ox, oy };
}

// Faixa de luz embaixo do carro + reflexo que se espalha no asfalto.
function drawNeon(g, n, ox, oy) {
  const x0 = ox + n.x0, x1 = ox + n.x1, y = oy + n.y;
  const len = x1 - x0 + 1;
  g.globalAlpha = 1; g.fillStyle = n.light; g.fillRect(x0, y, len, 1);
  g.fillStyle = n.base;
  g.globalAlpha = 0.6; g.fillRect(x0 - 1, y + 1, len + 2, 1);
  g.globalAlpha = 0.32; g.fillRect(x0 - 2, y + 2, len + 4, 1);
  g.globalAlpha = 0.14; g.fillRect(x0 - 2, y + 3, len + 4, 1);
  g.globalAlpha = 1;
}
