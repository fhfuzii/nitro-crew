// Estado do jogador e save em localStorage.
import { SLOT_KEYS, getNextPartId, setNextPartId, partBonus } from './economy.js';

const SAVE_KEY = 'nitro-crew-save';
const SAVE_VERSION = 1;

export function newState(balance) {
  return {
    v: SAVE_VERSION,
    coins: 0,
    equipped: Object.fromEntries(SLOT_KEYS.map(s => [s, null])),
    bag: [],
    stageWins: {},
    stageRaces: {},
    currentStage: balance.stages[0].id,
    shopBought: [],
    custom: { owned: [], chosen: {} }, // personalização visual (ids de CUSTOM.options)
    autoAdvance: true,
    autoEquip: true,
    nextPartId: 1,
    totals: { races: 0, wins: 0, coinsEarned: 0, playSec: 0 },
    log: [],
  };
}

export function load(balance) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.v === SAVE_VERSION) {
        if (!balance.stages.some(st => st.id === s.currentStage)) s.currentStage = balance.stages[0].id;
        if (!Array.isArray(s.shopBought)) s.shopBought = []; // saves anteriores à loja
        if (!s.custom || !Array.isArray(s.custom.owned)) s.custom = { owned: [], chosen: {} }; // saves anteriores à personalização
        if (!s.custom.chosen) s.custom.chosen = {};
        setNextPartId(s.nextPartId || 1);
        return s;
      }
    }
  } catch { /* save corrompido ou storage bloqueado: começa do zero */ }
  return newState(balance);
}

export function save(state) {
  state.nextPartId = getNextPartId();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* sem storage */ }
}

export function resetSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* sem storage */ }
}

export function isUnlocked(balance, state, stageIdx) {
  if (stageIdx === 0) return true;
  const prev = balance.stages[stageIdx - 1];
  const need = balance.stages[stageIdx].unlock?.prevStageWins ?? 1;
  return (state.stageWins[prev.id] ?? 0) >= need;
}

export function highestUnlocked(balance, state) {
  let idx = 0;
  for (let i = 0; i < balance.stages.length; i++) if (isUnlocked(balance, state, i)) idx = i;
  return idx;
}

export function addLog(state, text, rarity) {
  state.log.unshift({ t: Date.now(), text, rarity });
  if (state.log.length > 60) state.log.length = 60;
}

// Recebe uma peça: equipa se for melhor (e autoEquip ligado), senão vai para a garagem.
export function receivePart(balance, state, part) {
  const cur = state.equipped[part.slot];
  if (state.autoEquip && (!cur || partBonus(balance, part) > partBonus(balance, cur))) {
    if (cur) state.bag.push(cur);
    state.equipped[part.slot] = part;
    return 'equipped';
  }
  state.bag.push(part);
  return 'bag';
}
