// Utilitários de sorteio.
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randRange([min, max]) {
  return randInt(min, max);
}

// Normal padrão (Box-Muller).
export function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function pickWeighted(entries) {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.weight;
    if (r < 0) return e;
  }
  return entries[entries.length - 1];
}
