#!/usr/bin/env python3
"""Simulador de balanceamento do Nitro Crew.

Lê data/balance.json, implementa as fórmulas de docs/contracts.md (seção 3) e
simula N jogadores "gulosos" do começo ao fim da campanha (10 fases).

Uso:
    python tools/simulate.py                 # 200 jogadores, semente 12345
    python tools/simulate.py --players 500 --seed 7
    python tools/simulate.py --balance caminho/balance.json

Só biblioteca padrão.

Modelo da corrida (imita o motor):
- O tempo avança em passos de 1/60 s. A cada 1 s inteiro cada carro sorteia
  uma nova velocidade-alvo  potência * speedPerPower * (1 + noise * N(0,1)).
- A velocidade real se aproxima do alvo por suavização exponencial
  (constante de tempo 0,5 s): v += (alvo - v) * (1 - exp(-dt / 0,5)).
- Nitro: a cada 1 s inteiro, se o carro não está em nitro, chance
  boost * boostChancePerPointPerSec de ativar por boostDurationSec; durante o
  nitro a velocidade-alvo é multiplicada por boostSpeedMult.
- Todos largam parados (v = 0).
- Alvo limitado a >= 0 (contrato).
- A corrida acaba no instante em que o jogador cruza trackLength; colocação =
  carros que já cruzaram + 1 (empate no mesmo quadro favorece o jogador).

Jogador guloso:
- Depois de cada corrida: equipa a peça de maior bônus em cada slot (empate
  mantém a atual), desmonta todas as outras peças em scrapCoins.
- Gasta moedas no upgrade com maior ganho de potência por moeda (potência =
  soma de todo stat com peso em race.weights, inclusive boost); se não pode
  pagar esse upgrade, guarda as moedas (não compra um pior).
- Loja (balance.shop, contrato 3.1), avaliada depois de equipar e antes dos
  upgrades: entre os itens liberados e ainda não comprados, pega o de maior
  ganho de potência por moeda (ganho = bônus novo - bônus equipado no slot,
  vezes o peso do stat em race.weights; o turbo entra como qualquer slot se
  "boost" tiver peso).
  Se essa razão for maior que a do melhor upgrade:
    * tem moedas -> compra (a peça antiga é desmontada) e reavalia;
    * faltam <= SAVE_HORIZON_RACES x renda média das últimas 5 corridas ->
      economiza: não gasta em upgrade nesta rodada;
    * mais longe que isso -> ignora a loja e faz upgrades normalmente.
  Com --no-shop a loja é ignorada.
- Sempre corre a fase mais alta liberada.
- Tempo de jogo = soma da duração simulada das corridas + 5 s entre corridas.
"""
import argparse
import json
import math
import os
import random
import statistics
import sys

DT = 1.0 / 60.0
TAU = 0.5
ALPHA = 1.0 - math.exp(-DT / TAU)
GAP_BETWEEN_RACES = 5.0
SAVE_HORIZON_RACES = 10   # economiza para item da loja a <= 10 corridas de renda
INCOME_WINDOW = 5         # renda média = últimas 5 corridas (moedas + loot de moedas + sucata)
STATS = ("topSpeed", "accel", "grip", "boost")
# Diagnóstico: corridas em que algum carro terminou um segundo com velocidade < 0
# (o contrato não limita o alvo a >= 0; com noise alto isso aparece como "ré").
REVERSE = {"races": 0, "with_reverse": 0}


# ----------------------------------------------------------------------------
# Fórmulas do contrato
# ----------------------------------------------------------------------------
class Balance:
    def __init__(self, data):
        self.d = data
        self.slots = data["slots"]
        self.rarities = data["rarities"]
        self.rar_by_id = {r["id"]: r for r in self.rarities}
        self.rar_index = {r["id"]: i for i, r in enumerate(self.rarities)}
        self.race = data["race"]
        self.stages = data["stages"]
        self.tables = data["lootTables"]
        self.pl = data["partLevel"]
        self.final_wins = data.get("campaign", {}).get("finalStageWins", 1)
        self.stage_index = {st["id"]: i for i, st in enumerate(self.stages)}
        self.shop = data.get("shop", {}).get("items", [])

    def part_bonus(self, rarity, level):
        r = self.rar_by_id[rarity]
        return r["statBase"] * (1 + self.pl["statGrowthPerLevel"] * (level - 1))

    def upgrade_cost(self, rarity, level):
        uc = self.pl["upgradeCost"]
        return round(uc["base"] * uc["growth"] ** (level - 1) * uc["rarityMult"][rarity])

    def stat_weight(self, slot):
        stat = self.slots[slot]["stat"]
        return self.race["weights"].get(stat, 0.0)

    def stat_totals(self, equipped):
        tot = dict(self.d["baseCar"])
        for slot, part in equipped.items():
            if part is None:
                continue
            stat = self.slots[slot]["stat"]
            tot[stat] = tot.get(stat, 0) + self.part_bonus(part["rarity"], part["level"])
        return tot

    def power(self, totals):
        return sum(totals.get(s, 0) * w for s, w in self.race["weights"].items())


# ----------------------------------------------------------------------------
# Corrida
# ----------------------------------------------------------------------------
def _advance(v, x, tgt, nframes):
    """Aplica nframes passos de suavização com alvo constante (forma fechada,
    idêntica a repetir v += (tgt - v) * ALPHA; x += v * DT)."""
    if nframes <= 0:
        return v, x
    beta = 1.0 - ALPHA
    bn = beta ** nframes
    x += nframes * tgt * DT + (v - tgt) * DT * beta * (1.0 - bn) / ALPHA
    v = tgt + (v - tgt) * bn
    return v, x


def run_race(bal, track, cars, rng):
    """cars: lista de (power, boost). Retorna (colocações 0-based por índice, duração em s).

    Equivalente a simular quadro a quadro (1/60 s); usa forma fechada dentro de
    cada trecho de alvo constante e só anda quadro a quadro no trecho em que o
    carro cruza a linha de chegada."""
    rc = bal.race
    spp = rc["speedPerPower"]
    noise = rc["noise"]
    bchance = rc["boostChancePerPointPerSec"]
    bmult = rc["boostSpeedMult"]
    bframes = int(round(rc["boostDurationSec"] * 60))
    n = len(cars)
    v = [0.0] * n
    x = [0.0] * n
    boost_until = [-1] * n          # quadro (exclusivo) em que o nitro acaba
    finish = [None] * n             # quadro em que cruzou
    frame = 0
    cutoff = None
    reverse = False
    while True:
        for i, (p, b) in enumerate(cars):
            tgt = max(0.0, p * spp * (1 + noise * rng.gauss(0.0, 1.0)))
            if frame >= boost_until[i] and rng.random() < b * bchance:
                boost_until[i] = frame + bframes
            if finish[i] is not None:
                continue
            nb = max(0, min(60, boost_until[i] - frame))
            segs = ((nb, tgt * bmult), (60 - nb, tgt))
            f0 = frame
            for nf, t in segs:
                if nf <= 0:
                    continue
                v2, x2 = _advance(v[i], x[i], t, nf)
                if x2 >= track:
                    vv, xx = v[i], x[i]
                    for k in range(1, nf + 1):
                        vv += (t - vv) * ALPHA
                        xx += vv * DT
                        if xx >= track:
                            finish[i] = f0 + k
                            break
                    v[i], x[i] = vv, xx
                    break
                v[i], x[i] = v2, x2
                f0 += nf
                if v2 < 0:
                    reverse = True
        frame += 60
        # A corrida acaba quando o jogador (índice 0) cruza a linha.
        if finish[0] is not None or frame > 60 * 600:
            break
    REVERSE["races"] += 1
    REVERSE["with_reverse"] += reverse
    end_frame = finish[0] if finish[0] is not None else frame
    for i in range(1, n):
        if finish[i] is not None and finish[i] > end_frame:
            finish[i] = None  # cruzou depois do jogador: fica atrás dele
    # Empate no mesmo quadro favorece o jogador (o motor processa o jogador primeiro).
    order = sorted(range(n), key=lambda i: (0, finish[i], i) if finish[i] is not None else (1, -x[i], i))
    place = [0] * n
    for pos, i in enumerate(order):
        place[i] = pos
    return place, end_frame * DT


# ----------------------------------------------------------------------------
# Loot
# ----------------------------------------------------------------------------
SLOT_KEYS = ("engine", "transmission", "tires", "turbo")


def roll_table(bal, table_id, rng):
    table = bal.tables[table_id]
    total = sum(e["weight"] for e in table)
    r = rng.random() * total
    acc = 0.0
    for e in table:
        acc += e["weight"]
        if r < acc:
            break
    if e["kind"] == "coins":
        return ("coins", rng.randint(e["amount"][0], e["amount"][1]))
    slot = e.get("slot", "any")
    if slot == "any":
        slot = rng.choice(SLOT_KEYS)
    return ("part", {"rarity": e["rarity"], "slot": slot, "level": 1})


def table_chances(bal, table_id):
    """Chance real (%) de cada raridade de peça / moedas numa rolagem."""
    table = bal.tables[table_id]
    total = sum(e["weight"] for e in table)
    out = []
    for e in table:
        out.append((e, 100.0 * e["weight"] / total))
    return out


# ----------------------------------------------------------------------------
# Jogador guloso
# ----------------------------------------------------------------------------
class Player:
    def __init__(self, bal):
        self.bal = bal
        self.equipped = {s: None for s in SLOT_KEYS}
        self.coins = 0
        self.bought = set()
        self.saving = False
        self.slot_upgrades = {s: 0 for s in SLOT_KEYS}

    def totals(self):
        return self.bal.stat_totals(self.equipped)

    def power(self):
        return self.bal.power(self.totals())

    def boost(self):
        return self.totals()["boost"]

    def receive_parts(self, parts):
        bal = self.bal
        for p in parts:
            cur = self.equipped[p["slot"]]
            if cur is None or bal.part_bonus(p["rarity"], p["level"]) > bal.part_bonus(cur["rarity"], cur["level"]):
                if cur is not None:
                    self.coins += bal.rar_by_id[cur["rarity"]]["scrapCoins"]
                self.equipped[p["slot"]] = p
            else:
                self.coins += bal.rar_by_id[p["rarity"]]["scrapCoins"]

    def best_upgrade(self):
        bal = self.bal
        best = None
        for slot, part in self.equipped.items():
            if part is None:
                continue
            w = bal.stat_weight(slot)
            if w <= 0:
                continue
            r = bal.rar_by_id[part["rarity"]]
            if part["level"] >= r["maxLevel"]:
                continue
            gain = r["statBase"] * bal.pl["statGrowthPerLevel"] * w
            cost = bal.upgrade_cost(part["rarity"], part["level"])
            ratio = gain / max(cost, 1)
            if best is None or ratio > best[0]:
                best = (ratio, part, cost, slot)
        return best

    def shop_step(self, unlocked_idx, income):
        """Compra ou economiza na loja. Retorna os ids comprados agora."""
        bal = self.bal
        bought_now = []
        self.saving = False
        while True:
            best = None
            for it in bal.shop:
                if it["id"] in self.bought:
                    continue
                if bal.stage_index[it["unlock"]["stage"]] > unlocked_idx:
                    continue
                lvl = it.get("level", 1)
                cur = self.equipped[it["slot"]]
                cur_b = bal.part_bonus(cur["rarity"], cur["level"]) if cur else 0.0
                gain = (bal.part_bonus(it["rarity"], lvl) - cur_b) * bal.stat_weight(it["slot"])
                if gain <= 0:
                    continue
                ratio = gain / it["price"]
                if best is None or ratio > best[0]:
                    best = (ratio, it)
            if best is None:
                return bought_now
            up = self.best_upgrade()
            if up is not None and up[0] >= best[0]:
                return bought_now
            it = best[1]
            if self.coins >= it["price"]:
                self.coins -= it["price"]
                self.bought.add(it["id"])
                bought_now.append(it["id"])
                self.receive_parts([{"rarity": it["rarity"], "slot": it["slot"], "level": it.get("level", 1)}])
                continue
            if it["price"] - self.coins <= SAVE_HORIZON_RACES * income:
                self.saving = True
            return bought_now

    def spend(self):
        bal = self.bal
        upgrades = 0
        if self.saving:
            return 0
        while True:
            best = None
            for slot, part in self.equipped.items():
                if part is None:
                    continue
                w = bal.stat_weight(slot)
                if w <= 0:
                    continue
                r = bal.rar_by_id[part["rarity"]]
                if part["level"] >= r["maxLevel"]:
                    continue
                gain = r["statBase"] * bal.pl["statGrowthPerLevel"] * w
                cost = bal.upgrade_cost(part["rarity"], part["level"])
                ratio = gain / max(cost, 1)
                if best is None or ratio > best[0]:
                    best = (ratio, part, cost, slot)
            if best is None or best[2] > self.coins:
                return upgrades
            self.coins -= best[2]
            best[1]["level"] += 1
            self.slot_upgrades[best[3]] += 1
            upgrades += 1


def simulate_player(bal, rng, stats, use_shop=True, shop_log=None):
    """Simula um jogador até concluir a campanha. Acumula em stats[stage_idx]."""
    pl = Player(bal)
    incomes = []
    nst = len(bal.stages)
    unlocked = 0
    wins = [0] * nst
    t_total = 0.0
    first_legendary_stage = None
    total_races = 0
    while True:
        si = unlocked
        st = bal.stages[si]
        s = stats[si]
        if s["_races_here"] is None:
            s["_races_here"] = 0
        coins_before = pl.coins
        p_power = pl.power()
        if wins[si] == 0 and s["_arrive_power"] is None:
            s["_arrive_power"] = p_power
        cars = [(p_power, pl.boost())] + [(r["power"], r["boost"]) for r in st["rivals"]]
        place, dur = run_race(bal, st["trackLength"], cars, rng)
        my = place[0]
        total_races += 1
        t_total += dur + GAP_BETWEEN_RACES
        s["_races_here"] += 1
        s["durations"].append(dur)
        s["races"] += 1
        s["places"][my] += 1
        # moedas da corrida
        lo, hi = st["coins"]
        coins = round(rng.randint(lo, hi) * bal.race["placeRewardMult"][my])
        s["coins"] += coins
        pl.coins += coins
        # caixas na pista
        got_parts = []
        nd = rng.randint(st["inRace"]["drops"][0], st["inRace"]["drops"][1])
        rolls = [st["inRace"]["table"]] * nd
        if my + 1 <= st["endLoot"]["maxPlace"]:
            rolls += [st["endLoot"]["table"]] * st["endLoot"]["rolls"]
        for tid in rolls:
            kind, val = roll_table(bal, tid, rng)
            if kind == "coins":
                pl.coins += val
                s["coins"] += val
            else:
                got_parts.append(val)
                s["parts"][val["rarity"]] += 1
                if val["rarity"] == "legendary" and first_legendary_stage is None:
                    first_legendary_stage = si
        pl.receive_parts(got_parts)
        incomes.append(pl.coins - coins_before)
        s["income"].append(incomes[-1])
        if use_shop and bal.shop:
            recent = incomes[-INCOME_WINDOW:]
            for iid in pl.shop_step(unlocked, sum(recent) / len(recent)):
                s["shop_buys"] += 1
                if shop_log is not None:
                    shop_log.setdefault(iid, []).append((si, total_races))
        s["upgrades"] += pl.spend()
        if my == 0:
            wins[si] += 1
        # liberação
        if si + 1 < nst:
            need = bal.stages[si + 1]["unlock"]["prevStageWins"]
            if wins[si] >= need:
                s["unlock_races"].append(s["_races_here"])
                s["unlock_time"].append(t_total)
                s["power_at_unlock"].append(pl.power())
                s["arrive_power"].append(s["_arrive_power"])
                unlocked += 1
                for x in stats:
                    x["_races_here"] = None
                    x["_arrive_power"] = None
                continue
        else:
            if wins[si] >= bal.final_wins:
                s["unlock_races"].append(s["_races_here"])
                s["unlock_time"].append(t_total)
                s["power_at_unlock"].append(pl.power())
                s["arrive_power"].append(s["_arrive_power"])
                for x in stats:
                    x["_races_here"] = None
                    x["_arrive_power"] = None
                break
        if total_races > 5000:
            break  # trava de segurança: campanha travada
    stats[-1].setdefault("_first_leg", []).append(first_legendary_stage)
    su = stats[-1].setdefault("_slot_upgrades", {k: 0 for k in SLOT_KEYS})
    for k, v in pl.slot_upgrades.items():
        su[k] += v
    fin = stats[-1].setdefault("_final_parts", {k: [] for k in SLOT_KEYS})
    for k, part in pl.equipped.items():
        fin[k].append(part)
    return t_total, total_races


def new_stats(bal):
    return [
        {
            "races": 0, "places": [0, 0, 0, 0], "coins": 0, "upgrades": 0,
            "parts": {r["id"]: 0 for r in bal.rarities},
            "durations": [], "unlock_races": [], "unlock_time": [],
            "power_at_unlock": [], "arrive_power": [],
            "_races_here": None, "_arrive_power": None,
            "income": [], "shop_buys": 0,
        }
        for _ in bal.stages
    ]


def base_car_check(bal, rng, n=2000):
    st = bal.stages[0]
    pl = Player(bal)
    cars = [(pl.power(), pl.boost())] + [(r["power"], r["boost"]) for r in st["rivals"]]
    wins = 0
    for _ in range(n):
        place, _ = run_race(bal, st["trackLength"], cars, rng)
        wins += place[0] == 0
    return 100.0 * wins / n


def pct(vals, q):
    v = sorted(vals)
    if not v:
        return float("nan")
    k = (len(v) - 1) * q
    f = math.floor(k)
    c = math.ceil(k)
    return v[f] + (v[c] - v[f]) * (k - f)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser()
    ap.add_argument("--balance", default=os.path.join(here, "..", "data", "balance.json"))
    ap.add_argument("--players", type=int, default=200)
    ap.add_argument("--seed", type=int, default=12345)
    ap.add_argument("--no-shop", action="store_true", help="ignora balance.shop")
    args = ap.parse_args()
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    with open(args.balance, encoding="utf-8") as f:
        bal = Balance(json.load(f))
    rng = random.Random(args.seed)

    stage1_wr = base_car_check(bal, rng)
    stats = new_stats(bal)
    totals = []
    race_counts = []
    shop_log = {}
    use_shop = not args.no_shop
    for _ in range(args.players):
        t, n = simulate_player(bal, rng, stats, use_shop, shop_log)
        totals.append(t)
        race_counts.append(n)

    rar_ids = [r["id"] for r in bal.rarities]
    rar_short = {"common": "C", "uncommon": "I", "rare": "R", "epic": "E", "legendary": "L"}
    first_leg = stats[-1].get("_first_leg", [])
    n = args.players

    loja = "LIGADA" if (use_shop and bal.shop) else "DESLIGADA"
    print(f"Nitro Crew - simulacao: {n} jogadores, semente {args.seed}, loja {loja}")
    print(f"Carro base na fase 1: vitoria em {stage1_wr:.1f}% das corridas (2000 corridas)")
    print()
    hdr = ("| Fase | Nome | Corridas p/ liberar (media / p10-p90) | Tempo acum. (min) | "
           "Pot. jogador chegada -> liberacao | Pot. rivais (max) | Vitoria % | Duracao corrida (s) | "
           "Pecas/jogador " + " ".join(rar_short.get(r, r) for r in rar_ids) + " | 1a lendaria (% jog.) | "
           "Renda/corrida | Compras loja/jog. |")
    print(hdr)
    print("|" + "---|" * 12)
    for i, (st, s) in enumerate(zip(bal.stages, stats)):
        ur = s["unlock_races"]
        races = s["races"] or 1
        wr = 100.0 * s["places"][0] / races
        dur = statistics.mean(s["durations"]) if s["durations"] else float("nan")
        parts = " ".join(f"{s['parts'][r] / n:.1f}" for r in rar_ids)
        fl = 100.0 * sum(1 for x in first_leg if x == i) / n
        print(
            f"| {i + 1} | {st['name']} | {statistics.mean(ur):.1f} / {pct(ur, .1):.0f}-{pct(ur, .9):.0f} | "
            f"{statistics.mean(s['unlock_time']) / 60:.1f} | "
            f"{statistics.mean(s['arrive_power']):.1f} -> {statistics.mean(s['power_at_unlock']):.1f} | "
            f"{max(r['power'] for r in st['rivals']):.1f} | {wr:.0f} | {dur:.1f} | {parts} | {fl:.0f} | "
            f"{statistics.mean(s['income']):.0f} | {s['shop_buys'] / n:.2f} |"
        )
    print()
    no_leg = 100.0 * sum(1 for x in first_leg if x is None) / n
    print(f"Campanha completa: media {statistics.mean(totals) / 3600:.2f} h "
          f"(p10 {pct(totals, .1) / 3600:.2f} h, p90 {pct(totals, .9) / 3600:.2f} h); "
          f"corridas: media {statistics.mean(race_counts):.0f}")
    print(f"Jogadores sem nenhuma lendaria ao fim: {no_leg:.0f}%")
    all_d = [d for s in stats for d in s["durations"]]
    print(f"Duracao das corridas: min {min(all_d):.1f} s, p5 {pct(all_d, .05):.1f} s, "
          f"p95 {pct(all_d, .95):.1f} s, max {max(all_d):.1f} s")
    print(f"Corridas com algum carro em marcha a re (v < 0 ao fim de um segundo): "
          f"{100.0 * REVERSE['with_reverse'] / max(REVERSE['races'], 1):.2f}%")
    su = stats[-1].get("_slot_upgrades", {})
    fin = stats[-1].get("_final_parts", {})
    print()
    print("Por slot (media por jogador): upgrades comprados | bonus da peca equipada no fim | % com peca rara+ no fim")
    for k in SLOT_KEYS:
        parts_k = fin.get(k, [])
        bon = [bal.part_bonus(x["rarity"], x["level"]) if x else 0.0 for x in parts_k]
        rare_plus = sum(1 for x in parts_k if x and bal.rar_index[x["rarity"]] >= 2)
        print(f"  {k:13s} upgrades {su.get(k, 0) / n:5.1f} | bonus {statistics.mean(bon):5.1f} | "
              f"rara+ {100.0 * rare_plus / n:3.0f}% | peso {bal.stat_weight(k):.2f}")
    if bal.shop and use_shop:
        print()
        print("Loja: corridas de economia = preco / renda media por corrida na fase em que o item libera")
        print("| Item | Raridade nv | Libera na fase | Preco | Corridas de economia | % jogadores que compram | Fase media da compra |")
        print("|---|---|---|---|---|---|---|")
        for it in bal.shop:
            si = bal.stage_index[it["unlock"]["stage"]]
            inc = statistics.mean(stats[si]["income"]) if stats[si]["income"] else float("nan")
            log = shop_log.get(it["id"], [])
            fase = f"{statistics.mean(x[0] for x in log) + 1:.1f}" if log else "-"
            print(f"| {it['id']} | {it['rarity']} {it.get('level', 1)} | {si + 1} | {it['price']} | "
                  f"{it['price'] / inc:.1f} | {100.0 * len(log) / n:.0f}% | {fase} |")
    print("Legenda pecas: C=comum I=incomum R=rara E=epica L=lendaria (media por jogador obtidas na fase)")


if __name__ == "__main__":
    sys.exit(main())
