// Interface HTML: cabeçalho, garagem, fases e registro.
import { SLOT_KEYS, statTotals, powerOf, partBonus, upgradeCost, rarityOf, rarityIndex, tableOdds } from '../engine/economy.js';
import { isUnlocked, resetSave, addLog } from '../engine/state.js';
import { spriteDataURL } from '../engine/sprites.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => (Math.round(n * 10) / 10).toLocaleString('pt-BR');

export function initUI(game, { onChange }) {
  const { balance, state, S } = game;
  const $ = id => document.getElementById(id);
  const icons = Object.fromEntries(SLOT_KEYS.map(s => [s, S[`icon_${s}`] ? spriteDataURL(S[`icon_${s}`], 3) : '']));
  const statIcons = Object.fromEntries(['topSpeed', 'accel', 'grip', 'boost']
    .map(k => [k, S[`icon_stat_${k}`] ? spriteDataURL(S[`icon_stat_${k}`], 2) : '']));
  const statIcon = k => statIcons[k] ? `<img class="si" src="${statIcons[k]}" alt="">` : '';
  let tab = 'garage';
  try { tab = localStorage.getItem('nitro-crew-tab') || 'garage'; } catch { /* sem storage */ }

  document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
    tab = b.dataset.tab;
    try { localStorage.setItem('nitro-crew-tab', tab); } catch { /* sem storage */ }
    refresh();
  }));

  $('speed').addEventListener('click', () => {
    game.speed = game.speed >= 4 ? 1 : game.speed * 2;
    refresh();
  });

  // Ações dos botões (delegação).
  document.body.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = Number(b.dataset.id);
    const act = b.dataset.act;
    if (act === 'equip') {
      const i = state.bag.findIndex(p => p.id === id);
      if (i < 0) return;
      const part = state.bag.splice(i, 1)[0];
      const cur = state.equipped[part.slot];
      if (cur) state.bag.push(cur);
      state.equipped[part.slot] = part;
    } else if (act === 'scrap') {
      const i = state.bag.findIndex(p => p.id === id);
      if (i < 0) return;
      const part = state.bag.splice(i, 1)[0];
      const v = rarityOf(balance, part.rarity).scrapCoins;
      state.coins += v;
      addLog(state, `Desmontou ${game.labels.loot({ kind: 'part', part })}: +${v} moedas`, 'common');
    } else if (act === 'scrapAll') {
      let total = 0;
      for (const p of state.bag) total += rarityOf(balance, p.rarity).scrapCoins;
      if (state.bag.length) addLog(state, `Desmontou ${state.bag.length} peças: +${total} moedas`, 'common');
      state.bag = [];
      state.coins += total;
    } else if (act === 'upgrade') {
      const part = Object.values(state.equipped).find(p => p && p.id === id);
      const cost = part && upgradeCost(balance, part);
      if (!part || cost === null || state.coins < cost) return;
      state.coins -= cost;
      part.level++;
    } else if (act === 'stage') {
      state.currentStage = b.dataset.stage;
      game.restartRace();
    } else if (act === 'toggle') {
      state[b.dataset.key] = !state[b.dataset.key];
    } else if (act === 'reset') {
      if (!confirm('Apagar todo o progresso e começar do zero?')) return;
      resetSave();
      location.reload();
      return;
    } else return;
    onChange();
    refresh();
  });

  function header() {
    const totals = statTotals(balance, state.equipped);
    const power = powerOf(balance, totals);
    const stage = balance.stages.find(s => s.id === state.currentStage);
    const rivalMax = Math.max(...stage.rivals.map(r => r.power));
    $('coins').textContent = state.coins.toLocaleString('pt-BR');
    $('stageName').textContent = `${stage.name} · ${stage.district}`;
    $('power').innerHTML = `Potência <b>${fmt(power)}</b> <span class="dim">vs rival ${fmt(rivalMax)}</span>`;
    $('speed').textContent = `${game.speed}x`;
  }

  function garage() {
    const slots = SLOT_KEYS.map(slot => {
      const p = state.equipped[slot];
      const def = balance.slots[slot];
      if (!p) return `<div class="card slot empty"><img src="${icons[slot]}" alt=""><div><b>${esc(def.name)}</b><div class="dim">original de fábrica</div></div></div>`;
      const r = rarityOf(balance, p.rarity);
      const cost = upgradeCost(balance, p);
      const btn = cost === null
        ? `<span class="dim">nível máx.</span>`
        : `<button data-act="upgrade" data-id="${p.id}" ${state.coins < cost ? 'disabled' : ''}>Melhorar ${cost}$</button>`;
      return `<div class="card slot r-${p.rarity}"><img src="${icons[slot]}" alt="">
        <div><b>${esc(def.name)}</b> <span class="rar">${esc(r.name)}</span>
        <div class="dim">nível ${p.level}/${r.maxLevel} · ${statIcon(def.stat)}+${fmt(partBonus(balance, p))} ${esc(statName(def.stat))}</div></div>${btn}</div>`;
    }).join('');

    const bag = [...state.bag].sort((a, b) => rarityIndex(balance, b.rarity) - rarityIndex(balance, a.rarity) || partBonus(balance, b) - partBonus(balance, a));
    const items = bag.map(p => {
      const r = rarityOf(balance, p.rarity);
      const def = balance.slots[p.slot];
      const cur = state.equipped[p.slot];
      const diff = partBonus(balance, p) - (cur ? partBonus(balance, cur) : 0);
      const cls = diff > 0 ? 'good' : 'bad';
      return `<div class="card item r-${p.rarity}"><img src="${icons[p.slot]}" alt="">
        <div><b>${esc(def.name)}</b> <span class="rar">${esc(r.name)}</span>
        <div class="dim">nível ${p.level} · <span class="${cls}">${diff > 0 ? '+' : ''}${fmt(diff)}</span> vs atual</div></div>
        <span class="btns"><button data-act="equip" data-id="${p.id}">Equipar</button><button data-act="scrap" data-id="${p.id}">${r.scrapCoins}$</button></span></div>`;
    }).join('') || '<p class="dim">Nenhuma peça guardada. Peças aparecem em caixas na pista e no prêmio final.</p>';

    const totals = statTotals(balance, state.equipped);
    const stats = Object.entries(totals).map(([k, v]) => `<span class="stat">${statIcon(k)}${esc(statName(k))} <b>${fmt(v)}</b></span>`).join('');

    return `<div class="stats">${stats}</div>
      <h3>Peças equipadas</h3><div class="grid">${slots}</div>
      <h3>Garagem (${state.bag.length}) ${state.bag.length ? '<button data-act="scrapAll">Desmontar tudo</button>' : ''}</h3>
      <div class="grid">${items}</div>
      <div class="toggles">
        ${toggle('autoEquip', 'Equipar automaticamente peças melhores')}
        ${toggle('autoAdvance', 'Avançar sozinho para a fase liberada')}
      </div>`;
  }

  function stages() {
    return `<div class="grid">${balance.stages.map((st, i) => {
      const open = isUnlocked(balance, state, i);
      const cur = st.id === state.currentStage;
      const wins = state.stageWins[st.id] ?? 0;
      const races = state.stageRaces[st.id] ?? 0;
      const odds = tableOdds(balance, st.inRace.table)
        .map(o => `<span class="r-${o.rarity ?? 'common'}">${o.kind === 'coins' ? 'moedas' : esc(rarityOf(balance, o.rarity).name)} ${fmt(o.pct)}%</span>`).join(' ');
      const need = st.unlock?.prevStageWins ?? 1;
      return `<div class="card stage ${cur ? 'current' : ''} ${open ? '' : 'locked'}">
        <div><b>${i + 1}. ${esc(st.name)}</b> <span class="dim">${esc(st.district)}</span>
        <div class="dim">rivais ${st.rivals.map(r => `${esc(r.name)} (${fmt(r.power)})`).join(', ')}</div>
        <div class="dim">vitórias ${wins}/${races} corridas · caixas: ${odds}</div></div>
        ${open ? (cur ? '<span class="tag">correndo</span>' : `<button data-act="stage" data-stage="${esc(st.id)}">Correr</button>`)
               : `<span class="dim">vença ${need}x a anterior</span>`}</div>`;
    }).join('')}</div>`;
  }

  function log() {
    const t = state.totals;
    const head = `<p class="dim">${t.races} corridas · ${t.wins} vitórias · ${t.coinsEarned.toLocaleString('pt-BR')} moedas ganhas · ${Math.floor(t.playSec / 60)} min</p>`;
    const rows = state.log.map(l => `<div class="logrow r-${l.rarity ?? 'common'}">${esc(l.text)}</div>`).join('');
    return head + (rows || '<p class="dim">Nada ainda.</p>') + `<p><button data-act="reset" class="danger">Apagar progresso</button></p>`;
  }

  function toggle(key, label) {
    return `<button data-act="toggle" data-key="${key}" class="toggle ${state[key] ? 'on' : ''}">${state[key] ? '■' : '□'} ${esc(label)}</button>`;
  }

  function statName(k) {
    return { topSpeed: 'Velocidade', accel: 'Aceleração', grip: 'Aderência', boost: 'Nitro' }[k] ?? k;
  }

  function refresh() {
    header();
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $('panel').innerHTML = tab === 'garage' ? garage() : tab === 'stages' ? stages() : log();
  }

  return { refresh };
}
