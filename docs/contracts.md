# Contratos entre as áreas do projeto

Este arquivo é a "fronteira" entre os três trabalhos do projeto. O motor do jogo (`src/engine`, `src/ui`) só lê o que está descrito aqui. Os agentes podem **acrescentar** campos, mas não podem remover nem renomear os campos obrigatórios sem atualizar este arquivo e o motor no mesmo commit.

| Área | Dono | Arquivos |
|---|---|---|
| Arte e estilo | agente `pixel-art-director` | `src/art/sprites.js`, `docs/style-guide.md` |
| Regras e balanceamento | agente `game-systems-designer` | `data/balance.json`, `docs/game-design.md`, `tools/simulate.py` |
| Motor e interface | sessão principal | `index.html`, `src/main.js`, `src/engine/*`, `src/ui/*`, `styles.css` |

---

## 1. Tela de corrida (a "faixa")

- Resolução lógica: **480 × 108 px**, escalada por número inteiro (sem suavização).
- Faixas verticais:
  - `y 0–47`: céu + skyline (2 camadas de parallax).
  - `y 48–107`: pista, 60 px de altura, **4 pistas** de 15 px. Pista 0 = topo.
- Os carros andam para a **direita**. A câmera segue o carro do jogador; ele fica fixo em `x ≈ 120`.

## 2. `src/art/sprites.js`

Módulo ES que exporta três objetos:

```js
// Uma letra por cor. '.' e ' ' são transparentes.
export const PALETTE = { k: '#1a1c2c', w: '#f4f4f4', /* ... */ };

// Cores da interface HTML (painéis da garagem, textos, raridades).
export const THEME = {
  font: 'Press Start 2P',        // fonte do Google Fonts
  bg: '#..', panel: '#..', panelBorder: '#..', text: '#..', textDim: '#..',
  accent: '#..', good: '#..', bad: '#..', sky: '#..',
  rarity: { common: '#..', uncommon: '#..', rare: '#..', epic: '#..', legendary: '#..' },
};

// Cada sprite: todas as linhas de todos os frames com exatamente w caracteres, h linhas por frame.
export const SPRITES = {
  car_player: { w: 32, h: 14, fps: 10, frames: [ ['....', /* h linhas */], /* mais frames */ ] },
};
```

Chaves obrigatórias (tamanho exato):

| Chave | w × h | Frames | Uso |
|---|---|---|---|
| `car_player` | 32 × 14 | ≥ 2 (rodas girando) | carro do jogador, virado para a direita |
| `car_rival_a`, `car_rival_b`, `car_rival_c` | 32 × 14 | ≥ 2 | rivais, cores bem diferentes do jogador |
| `road` | 32 × 60 | 1 | pista, repete na horizontal; marcações das 4 pistas |
| `skyline_far` | 64 × 48 | 1 | prédios distantes, repete na horizontal, fundo transparente em cima |
| `skyline_near` | 64 × 48 | 1 | prédios próximos / postes, repete na horizontal |
| `crate_common` … `crate_legendary` (5) | 10 × 10 | 1–2 | caixa de prêmio que aparece na pista |
| `coin` | 6 × 6 | 4 | moeda girando |
| `icon_engine`, `icon_transmission`, `icon_tires`, `icon_turbo` | 12 × 12 | 1 | ícones das peças na garagem |
| `fx_boost` | 8 × 6 | 2–3 | chama do nitro atrás do carro |
| `finish_flag` | 8 × 60 | 1 | linha de chegada quadriculada (ocupa a pista toda) |

A cor do céu de fundo vem de `THEME.sky`.

## 3. `data/balance.json`

Campos obrigatórios:

```jsonc
{
  "version": 1,
  "slots": {                       // exatamente estas 4 chaves
    "engine":       { "name": "Motor",  "stat": "topSpeed" },
    "transmission": { "name": "Câmbio", "stat": "accel" },
    "tires":        { "name": "Pneus",  "stat": "grip" },
    "turbo":        { "name": "Turbo",  "stat": "boost" }
  },
  "baseCar": { "topSpeed": 10, "accel": 10, "grip": 10, "boost": 10 },

  "rarities": [                    // em ordem crescente
    { "id": "common", "name": "Comum", "statBase": 2, "maxLevel": 5, "scrapCoins": 5 }
    // uncommon, rare, epic, legendary
  ],
  "partLevel": {
    "statGrowthPerLevel": 0.25,    // bônus da peça = statBase * (1 + growth * (nível-1))
    "upgradeCost": { "base": 20, "growth": 1.6, "rarityMult": { "common": 1, "uncommon": 1.5 } }
    // custo para subir do nível L para L+1 = round(base * growth^(L-1) * rarityMult[raridade])
  },

  "race": {
    "weights": { "topSpeed": 1.0, "accel": 0.6, "grip": 0.6 }, // potência = Σ stat * peso
    "speedPerPower": 1.0,          // px lógicos por segundo por ponto de potência
    "noise": 0.08,                 // variação aleatória da velocidade (fração)
    "boostChancePerPointPerSec": 0.004, // chance de nitro por segundo por ponto de boost
    "boostSpeedMult": 1.35, "boostDurationSec": 1.5,
    "placeRewardMult": [1.0, 0.6, 0.35, 0.2]  // 1º, 2º, 3º, 4º
  },

  "stages": [
    {
      "id": "s1", "name": "Rua do Porto", "district": "Docas",
      "trackLength": 3000,                 // px lógicos
      "rivals": [                          // exatamente 3
        { "name": "Zeca", "sprite": "car_rival_a", "power": 22, "boost": 5 }
      ],
      "coins": [20, 35],                   // moedas de base, multiplicadas por placeRewardMult
      "inRace": { "drops": [1, 3], "table": "t1" },        // nº de caixas que aparecem na pista
      "endLoot": { "rolls": 1, "maxPlace": 2, "table": "t1" }, // rola só se terminar até maxPlace
      "unlock": { "prevStageWins": 1 }     // vitórias (1º lugar) na fase anterior
    }
  ],

  "lootTables": {
    "t1": [
      { "weight": 60, "kind": "coins", "amount": [5, 15] },
      { "weight": 40, "kind": "part", "rarity": "common", "slot": "any" }
    ]
  }
}
```

### Fórmulas que o motor implementa (o designer ajusta só os números)

- `statTotal[s] = baseCar[s] + Σ bônus das peças equipadas cujo slot.stat == s`
- `bônus da peça = rarity.statBase * (1 + partLevel.statGrowthPerLevel * (nível - 1))`
- `potência = Σ statTotal[s] * race.weights[s]` (boost não entra na potência)
- Velocidade a cada segundo: `max(0, potência * speedPerPower * (1 + noise * N(0,1)))`, suavizada; durante o nitro, multiplicada por `boostSpeedMult`.
- Chance de nitro por segundo: `boost * boostChancePerPointPerSec`.
- Rivais usam `power` e `boost` diretos.
- Caixas na pista: o carro do jogador coleta automaticamente ao passar. A raridade da caixa vem do item sorteado.
- Peça sorteada com `"slot": "any"` escolhe um dos 4 slots com chance igual.
- Peças repetidas podem ser desmontadas por `scrapCoins` moedas.

## 4. Save (`localStorage`, chave `nitro-crew-save`)

Responsabilidade do motor; os agentes não mexem.
