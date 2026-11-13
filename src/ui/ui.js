// Interface HTML: cabeçalho, garagem, fases e registro.
import { SLOT_KEYS, statTotals, powerOf, partBonus, upgradeCost, rarityOf, rarityIndex, tableOdds, makePart } from '../engine/economy.js';
import { isUnlocked, resetSave, addLog, receivePart } from '../engine/state.js';
import { spriteDataURL } from '../engine/sprites.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => (Math.round(n * 10) / 10).toLocaleString('pt-BR');

export function initUI(game, { onChange }) {
  const { balance, state, S } = game;
  const $ = id => document.getElementById(id);
  const icons = Object.fromEntries(SLOT_KEYS.map(s => [s, S[`icon_${s}`] ? spriteDataURL(S[`icon_${s}`], 3) : '']));
  const statIcons = Object.fromEntries(['topSpeed', 'accel', 'grip', 'boost']
    .map(k => [k, S[`icon_stat_${k}`] ? spriteDataURL(S[`icon_stat_${k}`], 2) : '']));
  const uiIcon = (key, fallback) => S[key] ? `<img class="bi" src="${spriteDataURL(S[key], 2)}" alt="">` : fallback;
  const ICON_UP = uiIcon('icon_ui_upgrade', '▲');
  const ICON_EQUIP = uiIcon('icon_ui_equip', 'Equipar');
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
      addLog(state, `Vendeu ${game.labels.loot({ kind: 'part', part })}: +${v} moedas`, 'common');
    } else if (act === 'scrapAll') {
      let total = 0;
      for (const p of state.bag) total += rarityOf(balance, p.rarity).scrapCoins;
      if (state.bag.length) addLog(state, `Vendeu ${state.bag.length} peças: +${total} moedas`, 'common');
      state.bag = [];
      state.coins += total;
    } else if (act === 'upgrade') {
      const part = Object.values(state.equipped).find(p => p && p.id === id);
      const cost = part && upgradeCost(balance, part);
      if (!part || cost === null || state.coins < cost) return;
      state.coins -= cost;
      part.level++;
    } else if (act === 'buy') {
      const item = shopItems().find(it => it.id === b.dataset.item);
      if (!item || !shopOpen(item) || state.shopBought.includes(item.id) || state.coins < item.price) return;
      state.coins -= item.price;
      state.shopBought.push(item.id);
      const part = makePart(balance, item.slot, item.rarity);
      part.level = item.level ?? 1;
      const where = receivePart(balance, state, part);
      addLog(state, `Loja: comprou ${game.labels.loot({ kind: 'part', part })} por ${item.price}$${where === 'equipped' ? ' (equipada)' : ''}`, part.rarity);
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
        : `<button class="ib up" data-act="upgrade" data-id="${p.id}" title="Melhorar para o nível ${p.level + 1} (${cost}$)" aria-label="Melhorar por ${cost} moedas" ${state.coins < cost ? 'disabled' : ''}>${ICON_UP}${cost}$</button>`;
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
        <span class="btns"><button class="ib" data-act="equip" data-id="${p.id}" title="Equipar" aria-label="Equipar">${ICON_EQUIP}</button><button data-act="scrap" data-id="${p.id}" title="Vender por ${r.scrapCoins}$" aria-label="Vender por ${r.scrapCoins} moedas">${r.scrapCoins}$</button></span></div>`;
    }).join('') || '<p class="dim">Nenhuma peça guardada. Peças aparecem em caixas na pista e no prêmio final.</p>';

    const totals = statTotals(balance, state.equipped);
    const stats = Object.entries(totals).map(([k, v]) => `<span class="stat">${statIcon(k)}${esc(statName(k))} <b>${fmt(v)}</b></span>`).join('');

    return `<div class="stats">${stats}</div>
      <h3>Peças equipadas</h3><div class="grid">${slots}</div>
      <h3>Garagem (${state.bag.length}) ${state.bag.length ? '<button data-act="scrapAll">Vender tudo</button>' : ''}</h3>
      <div class="grid">${items}</div>
      <div class="toggles">
        ${toggle('autoEquip', 'Equipar automaticamente peças melhores')}
        ${toggle('autoAdvance', 'Avançar sozinho para a fase liberada')}
      </div>`;
  }

  function shopItems() { return balance.shop?.items ?? []; }

  function shopOpen(item) {
    const idx = balance.stages.findIndex(s => s.id === item.unlock?.stage);
    return idx < 0 || isUnlocked(balance, state, idx);
  }

  function shop() {
    const items = shopItems();
    if (!items.length) return '<p class="dim">A loja ainda está sendo abastecida.</p>';
    const order = it => (state.shopBought.includes(it.id) ? 2 : shopOpen(it) ? 0 : 1);
    const sorted = [...items].sort((a, b) => order(a) - order(b) || a.price - b.price);
    const cards = sorted.map(it => {
      const r = rarityOf(balance, it.rarity);
      const def = balance.slots[it.slot];
      const fake = { slot: it.slot, rarity: it.rarity, level: it.level ?? 1 };
      const bonus = partBonus(balance, fake);
      const cur = state.equipped[it.slot];
      const diff = bonus - (cur ? partBonus(balance, cur) : 0);
      const bought = state.shopBought.includes(it.id);
      const open = shopOpen(it);
      let action;
      if (bought) action = '<span class="tag">comprado</span>';
      else if (!open) {
        const st = balance.stages.find(s => s.id === it.unlock.stage);
        action = `<span class="dim">libera em<br>${esc(st ? st.name : it.unlock.stage)}</span>`;
      } else {
        const missing = it.price - state.coins;
        action = `<span class="buy"><button data-act="buy" data-item="${esc(it.id)}" title="Comprar por ${it.price}$" ${missing > 0 ? 'disabled' : ''}>${it.price.toLocaleString('pt-BR')}$</button>
          ${missing > 0 ? `<span class="dim">faltam ${missing.toLocaleString('pt-BR')}$</span>` : ''}</span>`;
      }
      return `<div class="card item r-${it.rarity} ${!open && !bought ? 'locked' : ''} ${bought ? 'sold' : ''}"><img src="${icons[it.slot]}" alt="">
        <div><b>${esc(def.name)}</b> <span class="rar">${esc(r.name)}</span>
        <div class="dim">nível ${fake.level} · ${statIcon(def.stat)}+${fmt(bonus)} ${esc(statName(def.stat))}</div>
        ${bought ? '' : `<div class="dim"><span class="${diff > 0 ? 'good' : 'bad'}">${diff > 0 ? '+' : ''}${fmt(diff)}</span> vs atual</div>`}</div>
        ${action}</div>`;
    }).join('');
    return `<p class="dim">Peças de alto desempenho. Cada uma pode ser comprada uma vez; novas peças chegam conforme você libera fases.</p>
      <div class="grid">${cards}</div>`;
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
    $('panel').innerHTML = tab === 'garage' ? garage() : tab === 'shop' ? shop() : tab === 'stages' ? stages() : log();
  }

  return { refresh };
}
