// Simulação e desenho de uma corrida. Fórmulas: docs/contracts.md, seção 3.
import { randn, randRange } from './rng.js';
import { frameAt } from './sprites.js';
import { rollLoot } from './economy.js';

export const VIEW_W = 480;
export const VIEW_H = 108;
const ROAD_Y = 48;
const LANE_H = 15;
const CAR_W = 32;
const PLAYER_SCREEN_X = 120;
const SMOOTH_TAU = 0.5;
const PLAYER_LANE = 2;
const RIVAL_LANES = [0, 1, 3];

export class Race {
  constructor({ balance, stage, playerPower, playerBoost, onPickup }) {
    this.balance = balance;
    this.stage = stage;
    this.onPickup = onPickup;
    this.length = stage.trackLength;
    this.time = 0;
    this.tick = 0;
    this.done = false;
    this.firstFinishTime = null;

    const mk = (name, sprite, power, boost, lane, isPlayer) => ({
      name, sprite, power, boost, lane, isPlayer,
      x: 0, v: 0, target: 0, boostLeft: 0, finishedAt: null, place: null,
    });
    this.cars = [
      mk('Você', 'car_player', playerPower, playerBoost, PLAYER_LANE, true),
      ...stage.rivals.map((r, i) => mk(r.name, r.sprite, r.power, r.boost ?? 0, RIVAL_LANES[i % 3], false)),
    ];
    this.player = this.cars[0];
    this.finishOrder = [];

    // Caixas de prêmio na pista do jogador. O item é sorteado já na largada,
    // para a caixa mostrar a raridade certa.
    const n = randRange(stage.inRace?.drops ?? [0, 0]);
    this.drops = [];
    for (let i = 0; i < n; i++) {
      const at = this.length * (0.15 + 0.7 * ((i + Math.random()) / n));
      this.drops.push({ x: at, loot: rollLoot(balance, stage.inRace.table), taken: false });
    }
    this.popups = [];
  }

  update(dt) {
    if (!(dt > 0)) return;
    if (this.done) {
      // Resultado já decidido: os carros só seguem andando na tela durante a pausa.
      this.time += dt;
      for (const c of this.cars) c.x += c.v * dt;
      for (const p of this.popups) p.t += dt;
      this.popups = this.popups.filter(p => p.t < 1.6);
      return;
    }
    const r = this.balance.race;
    this.time += dt;
    const newSecond = Math.floor(this.time) > this.tick;
    if (newSecond) this.tick = Math.floor(this.time);

    for (const c of this.cars) {
      if (c.finishedAt !== null) { c.x += c.v * dt; continue; } // segue rodando depois da chegada
      if (newSecond || this.time <= dt) {
        c.target = Math.max(0, c.power * r.speedPerPower * (1 + r.noise * randn()));
        if (c.boostLeft <= 0 && Math.random() < c.boost * r.boostChancePerPointPerSec) {
          c.boostLeft = r.boostDurationSec;
        }
      }
      const tgt = c.boostLeft > 0 ? c.target * r.boostSpeedMult : c.target;
      c.boostLeft = Math.max(0, c.boostLeft - dt);
      c.v += (tgt - c.v) * (1 - Math.exp(-dt / SMOOTH_TAU));
      c.x += c.v * dt;
      if (c.x >= this.length) {
        c.finishedAt = this.time;
        this.finishOrder.push(c);
        c.place = this.finishOrder.length;
        if (this.firstFinishTime === null) this.firstFinishTime = this.time;
      }
    }

    // Coleta automática das caixas.
    for (const d of this.drops) {
      if (!d.taken && this.player.x + CAR_W * 0.6 >= d.x) {
        d.taken = true;
        this.onPickup?.(d.loot);
        this.popups.push({ x: d.x, y: ROAD_Y + PLAYER_LANE * LANE_H - 2, t: 0, loot: d.loot });
      }
    }
    for (const p of this.popups) p.t += dt;
    this.popups = this.popups.filter(p => p.t < 1.6);

    // A corrida acaba quando o jogador cruza a linha: quem ainda não chegou fica atrás dele.
    if (this.player.finishedAt !== null) {
      const rest = this.cars.filter(c => c.finishedAt === null).sort((a, b) => b.x - a.x);
      for (const c of rest) { this.finishOrder.push(c); c.place = this.finishOrder.length; }
      this.done = true;
    }
  }

  draw(g, S, theme, labels) {
    const camX = this.player.x - PLAYER_SCREEN_X;
    g.fillStyle = theme.sky;
    g.fillRect(0, 0, VIEW_W, VIEW_H);

    tile(g, S.skyline_far.frames[0], camX * 0.2, 0);
    tile(g, S.skyline_near.frames[0], camX * 0.5, 0);
    tile(g, S.road.frames[0], camX, ROAD_Y);

    const fx = Math.round(this.length - camX);
    if (fx > -10 && fx < VIEW_W + 10) g.drawImage(S.finish_flag.frames[0], fx, ROAD_Y);

    for (const d of this.drops) {
      if (d.taken) continue;
      const sx = Math.round(d.x - camX);
      if (sx < -12 || sx > VIEW_W) continue;
      const key = d.loot.kind === 'coins' ? 'coin' : `crate_${d.loot.rarity}`;
      const sp = S[key] ?? S.crate_common;
      const bob = Math.round(Math.sin(this.time * 4 + d.x) * 1);
      g.drawImage(frameAt(sp, this.time), sx, ROAD_Y + PLAYER_LANE * LANE_H + 2 + bob);
    }

    const byLane = [...this.cars].sort((a, b) => a.lane - b.lane);
    for (const c of byLane) {
      const sx = Math.round(c.x - camX);
      if (sx < -CAR_W - 8 || sx > VIEW_W) continue;
      const y = ROAD_Y + c.lane * LANE_H;
      const sp = S[c.sprite] ?? S.car_rival_a;
      if (c.boostLeft > 0 && S.fx_boost) g.drawImage(frameAt(S.fx_boost, this.time), sx - 8, y + 6);
      const moving = c.v > 1 ? this.time * Math.min(3, c.v / 30) : 0;
      g.drawImage(frameAt(sp, moving), sx - (sp.ox ?? 0), y - (sp.oy ?? 0)); // ox/oy: carro personalizado (aerofólio/néon)
    }

    g.font = `8px "${theme.font}", monospace`;
    g.textBaseline = 'top';
    for (const p of this.popups) {
      const sx = Math.round(p.x - camX);
      const y = Math.round(p.y - p.t * 14);
      const txt = labels.loot(p.loot);
      outlinedText(g, txt, sx - g.measureText(txt).width / 2, y, theme.rarity[p.loot.rarity] ?? theme.text);
    }

    // HUD: posição atual e progresso.
    const ranking = [...this.cars].sort((a, b) => (a.place ?? 99) - (b.place ?? 99) || b.x - a.x);
    const pos = ranking.indexOf(this.player) + 1;
    outlinedText(g, `${pos}º/${this.cars.length}`, 4, 4, theme.text);
    const pct = Math.min(1, this.player.x / this.length);
    g.fillStyle = theme.panelBorder;
    g.fillRect(VIEW_W - 104, 6, 100, 4);
    g.fillStyle = theme.accent;
    g.fillRect(VIEW_W - 104, 6, Math.round(100 * pct), 4);
  }

  results() {
    return this.finishOrder.map(c => ({ name: c.name, place: c.place, isPlayer: c.isPlayer, time: c.finishedAt }));
  }
}

function tile(g, img, offset, y) {
  const w = img.width;
  let x = -(((Math.round(offset) % w) + w) % w);
  for (; x < VIEW_W; x += w) g.drawImage(img, x, y);
}

export function outlinedText(g, txt, x, y, color, outline = '#000') {
  x = Math.round(x); y = Math.round(y);
  g.fillStyle = outline;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.fillText(txt, x + dx, y + dy);
  g.fillStyle = color;
  g.fillText(txt, x, y);
}
