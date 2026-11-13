# Guia de estilo — Nitro Crew

Corrida de rua noturna numa cidade brasileira fictícia: asfalto escuro, postes de sódio âmbar, néon rosa e ciano. Tudo é pixel art em grade de letras (`src/art/sprites.js`), uma letra por cor. Prévia: `docs/sprite-sheet.png` (gerada por `python tools/preview_sprites.py`).

## 1. Paleta (24 cores)

| Letra | Hex | Papel |
|---|---|---|
| `k` | `#1a1c2c` | contorno de tudo; preto noturno |
| `a` | `#232538` | asfalto; corpo dos prédios próximos |
| `K` | `#333c57` | pneu, metal escuro, granulado do asfalto, janela apagada |
| `g` | `#566c86` | metal médio, aro, meio-fio, poste |
| `G` | `#94b0c2` | metal claro, faixas da pista; raridade **comum** |
| `w` | `#f4f4f4` | brilho especular, raio da roda, quadriculado |
| `d` | `#29366f` | vidro dos carros, prédios distantes, sombra do azul |
| `r` | `#a23e48` | sombra do carro do jogador |
| `R` | `#e8323c` | lanterna traseira, luz de antena; "ruim" na UI |
| `o` | `#f0663a` | laranja nitro — cor-base do jogador; destaque da UI |
| `O` | `#ffa94d` | luz do laranja (jogador) |
| `y` | `#ffd23f` | farol, luz de sódio, janela acesa; raridade **lendária** |
| `Y` | `#fff4b0` | núcleo de luz (lâmpada, farol, brilho) |
| `h` | `#c27c1e` | sombra do ouro; janelas distantes |
| `b` | `#2f5fd0` | azul base (rival A, caixa rara) |
| `B` | `#5cb8ff` | luz do azul; raridade **rara** |
| `n` | `#2e9e57` | verde base (rival B, caixa incomum) |
| `N` | `#7be05a` | luz do verde; raridade **incomum**; "bom" na UI |
| `q` | `#1d5e4e` | sombra do verde |
| `p` | `#7d3fc4` | roxo base (rival C, caixa épica) |
| `P` | `#c27dff` | luz do roxo; raridade **épica** |
| `v` | `#45246e` | sombra do roxo |
| `m` | `#ff4fa3` | néon rosa (letreiros, friso da picape) |
| `c` | `#3fe0d0` | néon ciano; chama do nitro |

`.` e espaço são transparentes. Não crie cor nova sem antes tentar as 24; se precisar, adicione no fim e documente aqui (limite: 24).

Além das 24, o `PALETTE` tem **11 letras reservadas** (`1`–`9`, `e`, `E`) que são canais de cor do carro do jogador (seção 7). Elas não contam no limite e não podem ser usadas em nenhum outro sprite.

**Cada família de cor tem 3 tons:** luz / base / sombra. Laranja `O o r`, azul `B b d`, verde `N n q`, roxo `P p v`, ouro `Y y h`, metal `G g K`.

## 2. Contorno, luz e sombra

- **Contorno `k` de 1 px** em todo sprite que fica sobre a pista (carros, caixas, moeda). Sem contorno duplo. Cantos externos arredondados: tire o pixel do canto (`.kkkk.`).
- **Luz vem de cima-esquerda.** A linha de cima de cada volume usa o tom de luz; a base no meio; a última linha/lado direito usa a sombra.
- Vidro: `d` com um reflexo diagonal `G` (2–3 px descendo para a esquerda) em cada janela.
- Sem anti-aliasing e sem gradiente. Transição entre tons é em degrau.
- **Dithering só em texturas grandes** (asfalto: ~7% `K` e ~3% `k` espalhados sobre `a`). Nunca em carros, caixas ou ícones.
- Profundidade do cenário: quanto mais longe, **mais claro e menos detalhe** (`skyline_far` em `d` chapado, janelas `h` soltas); perto é mais escuro com contorno (`a` + `k`, janelas 2×2).

## 3. Escala e proporções

- Referência: **carro 32×14**, virado para a direita (traseira em x=0, frente em x=31).
- Rodas 7×7, centros em x=7 e x=24, linhas 7–13; a base da roda toca a linha 13 (o chão). A caixa de roda é preta (`k`) e a roda fica meio embutida na carroceria.
- Carroceria nas linhas 4–10; cabine nas linhas 0–4. Espaço vazio em cima é permitido (muscle car é baixo).
- Rodas têm **4 frames**: dois raios `w` girando no sentido horário sobre aro `g`, cubo `k`. Animação a ~12 fps.
- Cada carro precisa de **silhueta própria**, não só cor:
  - Jogador — cupê fastback laranja, faixa amarela, farol duplo; a asa traseira é um sprite separado (`spoiler_wing`, padrão). Cores por canais (seção 7).
  - Rival A — muscle car azul: teto baixo, capô longo com tomada de ar, frente reta, faixa branca.
  - Rival B — hatch verde: teto alto e comprido, 3 janelas, traseira reta, carro mais curto.
  - Rival C — picape roxa: cabine alta, caçamba baixa, friso néon rosa.
- Caixa 10×10, moeda 6×6, ícone 12×12, chama do nitro 8×6 (desenhada pelo motor em `x-8, y+6` do carro; a chama sai da borda direita e se abre para a esquerda).
- **Ícones 12×12** (1 frame, para a UI sobre `THEME.panel` = `#1a1c2c`, a mesma cor do contorno `k`): o contorno some no painel, então a silhueta tem que vir dos tons internos. Use a borda externa em `g`/`G` onde precisar destacar e mantenha pelo menos 1 tom claro (`G`, `w`, luz da família) em cada ícone.
  - Peças: `icon_engine` (bloco com tomada laranja), `icon_transmission` (engrenagem com cubo ciano), `icon_tires` (pneu grande ocupando o ícone, aro claro), `icon_turbo` (caracol com rotor laranja).
  - Atributos: `icon_stat_topSpeed` (contagiro com zona vermelha `R` e ponteiro `y`), `icon_stat_accel` (▶▶ verde `N/n`), `icon_stat_grip` (pneu menor no alto + respingo `c/B` e fumaça `G/w` embaixo; é isso que o diferencia de `icon_tires`), `icon_stat_boost` (garrafa azul `B/b/d` com válvula `g` e faixa `c`, sem letras nem marca).
- **Ícones de botão 10×10** (1 frame, exibidos em 2× sobre `THEME.panel`): `icon_ui_upgrade` = seta cheia para cima em verde `N/n/q` (luz à esquerda, sombra à direita), usada como "▲ 20$"; `icon_ui_equip` = chave de boca diagonal (boca aberta em cima-direita, cabo para baixo-esquerda) em `G/g` com fio de luz `w`. Mesma regra dos ícones 12×12: a silhueta vem dos tons claros.
- Pista 32×60 (4 pistas de 15 px): calçada `G/g` (y0–1), sombra `k` (y2), linha amarela tracejada `y/h` (y3), divisórias `G` em y14/29/44 (a linha livre entre carros), sombra + meio-fio (y58–59). Carros ocupam as linhas 0–13 da sua pista.
- Skyline 64×48, repete na horizontal: topo transparente, céu vem de `THEME.sky` (`#141428`).

## 4. Escala de raridade

A mesma cor aparece na caixa, na borda do cartão e no texto (`THEME.rarity`).

| Raridade | Cor (texto/borda) | Caixa (luz/base/sombra) | Tratamento |
|---|---|---|---|
| Comum | `#94b0c2` | `G g K`, fecho ouro | parada, 1 frame |
| Incomum | `#7be05a` | `N n q`, fecho ouro | parada, 1 frame |
| Rara | `#5cb8ff` | `B b d`, fecho ouro | 2 frames: brilho branco no canto da tampa |
| Épica | `#c27dff` | `P p v`, fecho ouro | 2 frames: brilho + faíscas `P` nos 4 cantos |
| Lendária | `#ffd23f` | `Y y h`, fecho com gema `R` | 2 frames: brilho + faíscas `Y`, fps mais alto |

Na UI: cartão comum tem borda 1 px; incomum+ borda 2 px; épica e lendária podem pulsar a borda (alternar entre a cor e `w`, 2 passos, ~2 Hz). Texto de raridade sempre com sombra/contorno `k` de 1 px.

## 5. Interface

- Fonte: **Press Start 2P** (Google Fonts), `THEME.font`. Tamanhos só múltiplos de 8 px: 8 px (corpo, HUD), 16 px (títulos), 24 px (número grande). Nunca fracionário.
- Cores: fundo `#0d0e1a`, painel `#1a1c2c`, borda do painel `#566c86`, texto `#f4f4f4`, texto secundário `#94b0c2`, destaque `#f0663a` (laranja do jogador), bom `#7be05a`, ruim `#e8323c`. Extras: `neon` `#ff4fa3`, `neon2` `#3fe0d0`.
- Espaçamento em múltiplos de 4 px (4/8/12/16). Padding interno do painel: 8 px.
- Borda de painel em pixel: 2 px sólida `panelBorder`, sem `border-radius`; cantos "cortados" (1 px transparente no canto) quando possível. Sombra dura 2 px `k`, sem blur.
- Imagens sempre com `image-rendering: pixelated` e escala inteira (2×, 3×, 4×).
- Botão: fundo `panel`, borda 2 px `panelBorder`; hover = borda `accent`; desabilitado = texto `textDim`.

## 6. Checklist para um sprite novo

1. Tamanho conferido com `docs/contracts.md`; cada linha tem exatamente `w` caracteres e cada frame `h` linhas.
2. Só letras da paleta (ou `.`). Usou a família de 3 tons certa?
3. Contorno `k` de 1 px se fica sobre a pista; cantos arredondados.
4. Luz de cima-esquerda; reflexo diagonal em vidro/metal.
5. Silhueta legível em 1× (olhe a prévia reduzida) e diferente dos sprites vizinhos.
6. Animação: frames com a mesma silhueta; só o detalhe muda (raio, brilho, chama). Defina `fps`.
7. Tiles (pista, skyline) repetem sem emenda: confira a coluna 0 contra a última.
8. Nada copiado: sem marcas, logos, carros licenciados ou personagens existentes.
9. Rode `python tools/validate_sprites.py` (tem que dar `OK`) e `python tools/preview_sprites.py`, e olhe `docs/sprite-sheet.png`.
10. Se for carro do jogador: siga também a seção 7 e confira a fileira de combinações no sprite sheet.

## 7. Personalização e modelos futuros

A personalização (contrato, seção 2.1) é só troca de cor por canal + peças encaixadas. Todo carro do jogador, o `car_player` de hoje e qualquer `car_player_<modelo>` futuro, aceita **as mesmas opções** do `CUSTOM.options`, sem nenhum dado por modelo além dos `mounts`. Por isso, o desenho do carro tem que seguir as regras abaixo.

### 7.1 Canais (letras reservadas)

| Canal | Letras | Como usar no desenho |
|---|---|---|
| paint | `3` luz, `2` base, `1` sombra | carroceria: linha de cima = `3`, laterais = `2`, metade de baixo e saias = `1`. Separações de porta/painel em `1`. Teto em `3`. |
| paint | `4` faixa, `5` luz da faixa | faixa decorativa de 1 px na lateral; `5` só no 1º pixel de cada trecho (luz vinda da esquerda). |
| glass | `6` base, `7` reflexo | todas as janelas; reflexo diagonal de 2–3 px em `7` em cada janela. Colunas (pilares) em `k`. |
| headlight | `8` base, `9` núcleo | farol na frente (2–4 px); `9` no centro. A lanterna traseira continua `R`. |
| rims | `e` aro, `E` raio | a roda padrão (7×7, 4 frames) com aro `e` e raios girando em `E`; pneu `K`, cubo `k`. |

Fixos (não personalizáveis): contorno `k`, pneu `K`, caixa de roda `k`, lanterna `R`, escapamento `K`, brilho do pneu `g`.

Cada pintura do catálogo tem 3 tons separados por contraste claro e uma faixa que contrasta com a base (dourado com faixa preta, preto fosco com faixa vermelha, branco com faixa vermelha, azul com faixa ciano para não virar o rival A, verde com faixa amarela). Vidro fumê e espelhado mantêm o reflexo `7` bem mais claro que `6`, para continuar lendo como vidro. Os néons usam as cores mais saturadas da paleta, para contrastar com o asfalto `a`.

### 7.2 Desenhando um modelo novo (`car_player_<modelo>`)

1. Mesmo quadro de 32×14, virado para a direita, rodas 7×7 tocando a linha 13, 4 frames de roda. A posição das rodas pode mudar (entre-eixos maior ou menor), mas a roda é a mesma.
2. Desenhe primeiro em cores normais, depois troque **toda** cor personalizável pela letra do canal. Nada personalizável pode ficar com cor fixa (ex.: um friso laranja fixo ficaria errado com pintura azul).
3. Partes que o modelo não tem: simplesmente não use as letras (sem faixa = sem `4`/`5`; jipe sem vidro traseiro = só a janela da frente). Nunca reaproveite uma letra de canal para outra coisa (ex.: `4` como grade do radiador).
4. Não desenhe aerofólio no corpo. A tampa traseira tem que parecer **fechada e completa** sem aerofólio: contorno `k` em cima da tampa e luz `3` logo abaixo.
5. Confira o carro com todas as pinturas, inclusive `white` (a sombra `1` vira cinza-azulado) e `matte_black` (o contorno precisa continuar separando o carro do asfalto).

### 7.3 Mounts

```js
mounts: { spoiler: [x, y], underglow: [x0, x1, y] }
```

- **`spoiler`**: o pixel **vazio logo acima do contorno da tampa traseira**, a 2–3 px da ponta traseira. No `car_player`: `[2, 2]` (tampa com contorno na linha 3). O motor desenha o aerofólio em `carro + spoiler − anchor`, por cima do carro.
- **`underglow`**: a primeira linha **vazia** logo abaixo do contorno de baixo da carroceria, entre as rodas (de 1 px depois da roda traseira até 1 px antes da dianteira). No `car_player`: `[11, 20, 11]`. O validador exige que essa linha esteja vazia em todos os frames.
- Os aerofólios têm `anchor` no pé (último pixel do poste ou da base). Com isso, um aerofólio serve em qualquer carro.

### 7.4 Aerofólios por silhueta

Aerofólios atuais (usam o canal paint, saem da cor do carro):

| Sprite | Tamanho | anchor | Sobe acima do pé |
|---|---|---|---|
| `spoiler_wing` | 7×4 | `[2, 3]` | 3 px (asa em 2 postes) |
| `spoiler_ducktail` | 6×2 | `[2, 1]` | 1 px (lábio em cunha, discreto) |
| `spoiler_gt` | 10×5 | `[2, 4]` | 4 px (asa larga, postes altos) |

Limites para que os 3 aerofólios sirvam em qualquer modelo:
- **Largura livre na tampa**: da ponta traseira até o vidro/cabine tem que haver pelo menos **10 px** sem cabine nas 4 linhas acima do mount, senão a asa GT invade o vidro. Cupê, sedã, muscle e picape (caçamba) cumprem; hatch e perua não.
- **Altura**: o aerofólio pode passar até **2 px acima** do quadro do carro (a asa GT faz isso). A linha 14 de cada pista é livre, então ninguém é coberto. Nunca mais que 2 px.
- **Hatch / perua / van** (traseira vertical, teto até a ponta): o mount vai no **teto**, na quina traseira (`[x da quina + 1, linha do teto − 1]`); a asa vira aerofólio de teto. A GT fica grande demais: aceitável, mas confira a prévia.
- **Picape**: mount na tampa da caçamba (ponta traseira), como no cupê.
- **Conversível / modelo sem tampa**: ainda precisa de um mount válido (é obrigatório pelo validador); use a borda traseira da carroceria.

### 7.5 Néon

O motor desenha o néon na linha `underglow`: pontas em `base`, meio em `light`, e um reflexo de 2 linhas no asfalto (mistura de 45% e 20% da `base`), 2 px mais largo para cada lado. O sprite do carro não desenha nada disso. A fileira de combinações do `docs/sprite-sheet.png` usa esse mesmo método.
