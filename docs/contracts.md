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
| `icon_stat_topSpeed`, `icon_stat_accel`, `icon_stat_grip`, `icon_stat_boost` | 12 × 12 | 1 | ícones dos atributos (contagiro, ▶▶, pneu com fumaça/água, garrafa de nitro) |
| `fx_boost` | 8 × 6 | 2–3 | chama do nitro atrás do carro |
| `finish_flag` | 8 × 60 | 1 | linha de chegada quadriculada (ocupa a pista toda) |

A cor do céu de fundo vem de `THEME.sky`.

## 2.1 Personalização do carro (`CUSTOM` em `src/art/sprites.js`)

É só visual: não muda nenhum atributo. Vale para o carro do jogador de hoje (`car_player`) e para **todo modelo de carro do jogador que vier depois** (chaves `car_player_<modelo>`). Os rivais não usam isso.

### Canais de cor (letras reservadas)

Os carros do jogador pintam as partes personalizáveis com letras reservadas. O motor troca a cor dessas letras pela opção escolhida. Cada letra também precisa existir em `PALETTE`, com a cor da opção padrão, para o carro aparecer certo sem personalização.

| Canal | Letras → tom | Onde |
|---|---|---|
| `paint` | `1` sombra, `2` base, `3` luz, `4` faixa, `5` luz da faixa | carroceria e faixa decorativa |
| `glass` | `6` base, `7` reflexo | vidros |
| `headlight` | `8` base, `9` núcleo | farol dianteiro (a lanterna traseira continua `R`) |
| `rims` | `e` base, `E` brilho | aro das rodas (o pneu continua `K`) |

Regras para qualquer modelo novo:
- Usar **só** essas letras nas partes personalizáveis, e não usá-las em mais nada.
- Pode ter menos partes (um carro sem faixa simplesmente não usa `4`/`5`), mas não pode inventar canal novo sem atualizar este contrato.
- Declarar `mounts` (abaixo), para o aerofólio e o néon se encaixarem.

### Pontos de encaixe (`mounts` no sprite do carro)

```js
car_player: {
  w: 32, h: 14, fps: 12, frames: [...],
  mounts: {
    spoiler: [x, y],          // pixel do carro onde a base do aerofólio encosta (tampa traseira)
    underglow: [x0, x1, y],   // néon: faixa de x0 até x1 na linha y (logo abaixo da carroceria, entre as rodas)
  },
},
```

O carro base **não** desenha aerofólio: ele vem sempre de um sprite separado.

### Aerofólios (sprites `spoiler_<id>`)

```js
spoiler_wing: { w: 8, h: 5, frames: [[...]], anchor: [ax, ay] }, // 1 frame
```

`anchor` é o pixel do aerofólio que fica em cima de `mounts.spoiler`: o motor desenha o aerofólio em `posição do carro + mounts.spoiler − anchor`, por cima do carro, sem recortar no quadro 32×14 (pode passar para cima ou para os lados). Um modelo pode ter variante própria `spoiler_<id>_<modelo>` (ex.: `spoiler_gt_hatch` para `car_player_hatch`); sem ela o motor usa o genérico. Pode usar os canais `paint` (`1`–`5`), aí ele sai da cor do carro.

### Néon

Desenhado pelo motor: uma faixa de luz em `mounts.underglow` (cor `base`, com brilho `light`) e um reflexo suave no asfalto abaixo.

### Catálogo (`CUSTOM.options`)

Os `id` abaixo são fixos (o save e os preços dependem deles). O agente de arte define nomes e cores; o agente de regras define os preços (seção 3.2).

```js
export const CUSTOM = {
  options: {
    paint:     [ { id: 'stock', name: 'Laranja Nitro', colors: { '1': '#..', '2': '#..', '3': '#..', '4': '#..', '5': '#..' } }, /* ... */ ],
    glass:     [ { id: 'stock', name: '...', colors: { '6': '#..', '7': '#..' } } ],
    headlight: [ { id: 'stock', name: '...', colors: { '8': '#..', '9': '#..' } } ],
    rims:      [ { id: 'stock', name: '...', colors: { 'e': '#..', 'E': '#..' } } ],
    neon:      [ { id: 'none', name: 'Sem néon' }, { id: 'pink', name: '...', colors: { base: '#..', light: '#..' } } ],
    spoiler:   [ { id: 'none', name: 'Sem aerofólio' }, { id: 'wing', name: '...', sprite: 'spoiler_wing' } ],
  },
};
```

| Categoria | `id` (o primeiro é o padrão, grátis) |
|---|---|
| `paint` | `stock`, `red`, `blue`, `green`, `purple`, `white`, `matte_black`, `gold` |
| `glass` | `stock`, `smoke`, `mirror`, `emerald` |
| `headlight` | `stock`, `xenon`, `ice_blue`, `violet` |
| `rims` | `stock`, `chrome`, `black`, `gold`, `bronze` |
| `neon` | `none`, `pink`, `cyan`, `green`, `purple`, `orange` |
| `spoiler` | `wing` (padrão: a asa que o carro já tem), `none`, `ducktail`, `gt` |

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
- `potência = Σ statTotal[s] * race.weights[s]`, somando todo stat que tiver peso em `race.weights` — inclusive `boost` (o nitro conta na potência **e** continua dando a chance de arrancada abaixo).
- Velocidade a cada segundo: `max(0, potência * speedPerPower * (1 + noise * N(0,1)))`, suavizada; durante o nitro, multiplicada por `boostSpeedMult`.
- Chance de nitro por segundo: `boost * boostChancePerPointPerSec`.
- Rivais usam `power` e `boost` diretos.
- A corrida termina no instante em que o jogador cruza `trackLength`: colocação = carros que já cruzaram + 1 (empate no mesmo quadro favorece o jogador). A pausa até a próxima corrida começa aí.
- Caixas na pista: o carro do jogador coleta automaticamente ao passar. A raridade da caixa vem do item sorteado.
- Peça sorteada com `"slot": "any"` escolhe um dos 4 slots com chance igual.
- Peças repetidas podem ser desmontadas por `scrapCoins` moedas.

## 3.1 Loja (`balance.shop`)

Catálogo fixo de peças caras. Cada item pode ser comprado **uma vez**; aparece à venda quando a fase `unlock.stage` estiver liberada (antes disso aparece bloqueado, com o nome da fase).

```jsonc
"shop": {
  "items": [
    { "id": "sh_engine_rare", "slot": "engine", "rarity": "rare", "level": 1, "price": 900, "unlock": { "stage": "s3" } }
  ]
}
```

- `id` único e estável (o save guarda os ids comprados; não renomeie depois de publicado).
- `slot` é um dos 4 slots (não aceita `"any"`); `level` é o nível inicial da peça (padrão 1).
- A peça comprada entra como qualquer prêmio: equipa sozinha se for melhor e o "equipar automaticamente" estiver ligado; senão vai para a garagem.

## 3.2 Preços da personalização (`balance.cosmetics`)

```jsonc
"cosmetics": {
  "paint": {
    "stock": { "price": 0 },
    "gold":  { "price": 2500, "unlock": { "stage": "s8" } }   // unlock é opcional
  }
  // glass, headlight, rims, neon, spoiler: mesmo formato, chaves = ids de CUSTOM.options
}
```

- Cada opção é comprada **uma vez**; depois o jogador troca entre as que já tem de graça.
- O padrão de cada categoria (primeiro id da tabela da seção 2.1) tem preço 0 e já vem com o jogo. `none` também é grátis.
- Opção sem preço aqui não aparece à venda.
- É só visual: o preço compete com as melhorias de peça pelas mesmas moedas.

## 4. Save (`localStorage`, chave `nitro-crew-save`)

Responsabilidade do motor; os agentes não mexem.
