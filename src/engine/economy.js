// Peças, estatísticas, prêmios e custos — tudo derivado de data/balance.json.
import { pickWeighted, randRange } from './rng.js';

export const SLOT_KEYS = ['engine', 'transmission', 'tires', 'turbo'];

let nextPartId = 1;
export function setNextPartId(n) { nextPartId = n; }
export function getNextPartId() { return nextPartId; }

export function rarityOf(balance, id) {
  return balance.rarities.find(r => r.id === id);
}

export function rarityIndex(balance, id) {
  return balance.rarities.findIndex(r => r.id === id);
}

export function partBonus(balance, part) {
  const r = rarityOf(balance, part.rarity);
  return r.statBase * (1 + balance.partLevel.statGrowthPerLevel * (part.level - 1));
}

export function upgradeCost(balance, part) {
  const r = rarityOf(balance, part.rarity);
  if (part.level >= r.maxLevel) return null;
  const c = balance.partLevel.upgradeCost;
  const mult = (c.rarityMult && c.rarityMult[part.rarity]) ?? 1;
  return Math.round(c.base * Math.pow(c.growth, part.level - 1) * mult);
}

export function statTotals(balance, equipped) {
  const totals = { ...balance.baseCar };
  for (const slot of SLOT_KEYS) {
    const part = equipped[slot];
    if (!part) continue;
    const stat = balance.slots[slot].stat;
    totals[stat] = (totals[stat] ?? 0) + partBonus(balance, part);
  }
  return totals;
}

export function powerOf(balance, totals) {
  let p = 0;
  for (const [stat, w] of Object.entries(balance.race.weights)) p += (totals[stat] ?? 0) * w;
  return p;
}

export function makePart(balance, slot, rarity) {
  const s = slot === 'any' ? SLOT_KEYS[Math.floor(Math.random() * SLOT_KEYS.length)] : slot;
  return { id: nextPartId++, slot: s, rarity, level: 1 };
}

// Rola uma vez numa tabela. Retorna { kind: 'coins', amount } ou { kind: 'part', part }.
export function rollLoot(balance, tableId) {
  const table = balance.lootTables[tableId];
  if (!table) throw new Error(`Tabela de prêmio inexistente: ${tableId}`);
  const e = pickWeighted(table);
  if (e.kind === 'coins') return { kind: 'coins', amount: randRange(e.amount), rarity: 'common' };
  if (e.kind === 'part') {
    const part = makePart(balance, e.slot ?? 'any', e.rarity);
    return { kind: 'part', part, rarity: part.rarity };
  }
  throw new Error(`Tipo de prêmio desconhecido: ${e.kind}`);
}

// Chance real (%) de cada linha de uma tabela — usado na tela de fases.
export function tableOdds(balance, tableId) {
  const table = balance.lootTables[tableId];
  const total = table.reduce((s, e) => s + e.weight, 0);
  return table.map(e => ({ ...e, pct: (100 * e.weight) / total }));
}
