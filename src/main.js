// Ponto de entrada: carrega dados e arte, roda o loop de corridas.
import { PALETTE, THEME, SPRITES } from './art/sprites.js';
import { buildSprites } from './engine/sprites.js';
import { Race, VIEW_W, VIEW_H, outlinedText } from './engine/race.js';
import { statTotals, powerOf, rollLoot, rarityOf } from './engine/economy.js';
import { load, save, addLog, receivePart, highestUnlocked } from './engine/state.js';
import { randRange } from './engine/rng.js';
import { initUI } from './ui/ui.js';

const RESULT_PAUSE_SEC = 5;

async function boot() {
  const balance = await fetch('data/balance.json', { cache: 'no-store' }).then(r => r.json());
  applyTheme(THEME);
  await document.fonts.load(`8px "${THEME.font}"`).catch(() => {});

  const S = buildSprites(PALETTE, SPRITES);
  const state = load(balance);
  const canvas = document.getElementById('race');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;

  const game = { balance, state, S, theme: THEME, race: null, phase: 'racing', pauseLeft: 0, lastResult: null, speed: 1 };

  const labels = {
    loot(l) {
      if (l.kind === 'coins') return `+${l.amount}$`;
      return `${rarityOf(balance, l.part.rarity).name} ${balance.slots[l.part.slot].name}`;
    },
  };
  game.labels = labels;

  const ui = initUI(game, { onChange: () => save(state) });

  function stageById(id) { return balance.stages.find(s => s.id === id); }

  function grant(loot, source) {
    if (loot.kind === 'coins') {
      state.coins += loot.amount;
      state.totals.coinsEarned += loot.amount;
      addLog(state, `${source}: +${loot.amount} moedas`, 'common');
    } else {
      const where = receivePart(balance, state, loot.part);
      addLog(state, `${source}: ${labels.loot(loot)}${where === 'equipped' ? ' (equipada)' : ''}`, loot.part.rarity);
    }
  }

  function startRace() {
    const stage = stageById(state.currentStage);
    const totals = statTotals(balance, state.equipped);
    game.race = new Race({
      balance, stage,
      playerPower: powerOf(balance, totals),
      playerBoost: totals.boost ?? 0,
      onPickup: loot => { grant(loot, 'Pista'); ui.refresh(); },
    });
    game.phase = 'racing';
  }

  function finishRace() {
    const race = game.race;
    const stage = race.stage;
    const place = race.player.place;
    const mult = balance.race.placeRewardMult[place - 1] ?? 0;
    const coins = Math.round(randRange(stage.coins) * mult);
    const rewards = [];
    if (coins > 0) { const l = { kind: 'coins', amount: coins, rarity: 'common' }; grant(l, `${place}º lugar`); rewards.push(l); }
    if (stage.endLoot && place <= stage.endLoot.maxPlace) {
      for (let i = 0; i < stage.endLoot.rolls; i++) {
        const l = rollLoot(balance, stage.endLoot.table);
        grant(l, 'Prêmio final');
        rewards.push(l);
      }
    }
    state.totals.races++;
    state.stageRaces[stage.id] = (state.stageRaces[stage.id] ?? 0) + 1;
    if (place === 1) {
      state.totals.wins++;
      state.stageWins[stage.id] = (state.stageWins[stage.id] ?? 0) + 1;
    }
    if (state.autoAdvance) {
      const top = balance.stages[highestUnlocked(balance, state)];
      if (top.id !== state.currentStage) {
        state.currentStage = top.id;
        addLog(state, `Nova fase liberada: ${top.name}`, 'rare');
      }
    }
    game.lastResult = { place, rewards, total: race.cars.length };
    game.phase = 'results';
    game.pauseLeft = RESULT_PAUSE_SEC;
    save(state);
    ui.refresh();
  }

  game.restartRace = () => startRace();

  let last = performance.now();
  function frame(now) {
    // Agenda o próximo quadro antes de tudo: um erro aqui não pode parar o jogo.
    requestAnimationFrame(frame);
    // O timestamp do rAF pode ser anterior ao performance.now() da largada; nunca usar dt negativo.
    const realDt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = Math.max(last, now);
    try {
      step(realDt);
    } catch (err) {
      console.error(err);
    }
  }

  function step(realDt) {
    state.totals.playSec += realDt;
    const steps = game.speed;
    for (let i = 0; i < steps; i++) {
      if (game.phase === 'racing') {
        game.race.update(realDt);
        if (game.race.done) { finishRace(); break; }
      }
    }
    if (game.phase === 'results') {
      game.race.update(realDt * game.speed);
      game.pauseLeft -= realDt * game.speed;
      if (game.pauseLeft <= 0) startRace();
    }
    game.race.draw(g, S, THEME, labels);
    if (game.phase === 'results') drawResults(g, game);
  }

  startRace();
  ui.refresh();
  requestAnimationFrame(frame);
}

function drawResults(g, game) {
  const { place, rewards, total } = game.lastResult;
  const T = game.theme;
  g.fillStyle = 'rgba(0,0,0,0.6)';
  g.fillRect(0, 24, VIEW_W, 60);
  g.font = `8px "${T.font}", monospace`;
  g.textBaseline = 'top';
  const title = place === 1 ? '1º LUGAR! VITÓRIA' : `${place}º DE ${total}`;
  outlinedText(g, title, (VIEW_W - g.measureText(title).width) / 2, 32, place === 1 ? T.good : T.text);
  const items = rewards.map(r => game.labels.loot(r));
  let x = 0;
  const widths = items.map(t => g.measureText(t).width);
  const totalW = widths.reduce((a, b) => a + b, 0) + 12 * Math.max(0, items.length - 1);
  x = (VIEW_W - totalW) / 2;
  items.forEach((t, i) => {
    outlinedText(g, t, x, 52, T.rarity[rewards[i].rarity] ?? T.text);
    x += widths[i] + 12;
  });
  const next = `próxima corrida em ${Math.ceil(game.pauseLeft)}s`;
  outlinedText(g, next, (VIEW_W - g.measureText(next).width) / 2, 70, T.textDim);
}

function applyTheme(T) {
  const r = document.documentElement.style;
  for (const k of ['bg', 'panel', 'panelBorder', 'text', 'textDim', 'accent', 'good', 'bad', 'sky']) r.setProperty(`--${k}`, T[k]);
  for (const [k, v] of Object.entries(T.rarity)) r.setProperty(`--r-${k}`, v);
  r.setProperty('--font', `"${T.font}", monospace`);
}

boot().catch(err => {
  console.error(err);
  document.getElementById('fatal').textContent = `Erro ao iniciar: ${err.message}`;
});
