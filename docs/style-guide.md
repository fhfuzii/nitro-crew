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
  - Jogador — cupê fastback laranja, asa traseira em postes, faixa amarela, farol duplo.
  - Rival A — muscle car azul: teto baixo, capô longo com tomada de ar, frente reta, faixa branca.
  - Rival B — hatch verde: teto alto e comprido, 3 janelas, traseira reta, carro mais curto.
  - Rival C — picape roxa: cabine alta, caçamba baixa, friso néon rosa.
- Caixa 10×10, moeda 6×6, ícone 12×12, chama do nitro 8×6 (desenhada pelo motor em `x-8, y+6` do carro; a chama sai da borda direita e se abre para a esquerda).
- **Ícones 12×12** (1 frame, para a UI sobre `THEME.panel` = `#1a1c2c`, a mesma cor do contorno `k`): o contorno some no painel, então a silhueta tem que vir dos tons internos. Use a borda externa em `g`/`G` onde precisar destacar e mantenha pelo menos 1 tom claro (`G`, `w`, luz da família) em cada ícone.
  - Peças: `icon_engine` (bloco com tomada laranja), `icon_transmission` (engrenagem com cubo ciano), `icon_tires` (pneu grande ocupando o ícone, aro claro), `icon_turbo` (caracol com rotor laranja).
  - Atributos: `icon_stat_topSpeed` (contagiro com zona vermelha `R` e ponteiro `y`), `icon_stat_accel` (▶▶ verde `N/n`), `icon_stat_grip` (pneu menor no alto + respingo `c/B` e fumaça `G/w` embaixo; é isso que o diferencia de `icon_tires`), `icon_stat_boost` (garrafa azul `B/b/d` com válvula `g` e faixa `c`, sem letras nem marca).
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
