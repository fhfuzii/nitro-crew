# Nitro Crew: documento de design de sistemas (v1)

Dono: agente `game-systems-designer`. Números em `data/balance.json`; simulador em `tools/simulate.py`.
Fórmulas: as de `docs/contracts.md`, seção 3. Este documento não muda nenhuma delas. As mudanças sugeridas estão na seção 10.

> **Convenção:** todo número marcado com **(suposição)** foi escolha de design e não saiu de simulação nem de um alvo.
> Os números marcados **(calibrado)** foram ajustados com o simulador até os alvos de ritmo baterem.

---

## 1. Loop principal

1. O carro do jogador corre sozinho contra 3 rivais na fase escolhida. Cada corrida dura cerca de 37 s na tela (fase 1: ~31 s).
2. Durante a corrida o carro coleta 2 ou 3 caixas de prêmio na pista. A coleta é automática.
3. Ao terminar, o jogador recebe:
   - moedas pela colocação (sempre, inclusive em 4º lugar);
   - se terminou em 1º ou 2º, uma rolagem extra na tabela de "prêmio final", que é melhor que a da pista.
4. Na garagem o jogador equipa as melhores peças, desmonta as repetidas em moedas e gasta as moedas subindo o nível das peças ou juntando para um item caro da **loja** (seção 5.1).
5. Cada vitória (1º lugar) conta para liberar a próxima fase. O jogo é idle: as corridas se repetem sozinhas na fase mais alta liberada.

**Sempre existe progresso:** a menor recompensa possível de uma corrida é `round(20 × 0,2) = 4` moedas (fase 1, 4º lugar). Além disso, as 2 ou 3 caixas da pista vêm sempre, qualquer que seja a colocação.

## 2. Mundo: 3 bairros, 10 fases

Cidade fictícia: **Vila Cromada** (suposição: nome).

| # | Fase | Bairro | Pista (px) | Rivais (potência / boost) | Moedas base | Caixas na pista | Prêmio final | Para liberar |
|---|---|---|---|---|---|---|---|---|
| 1 | Cais da Ferrugem | Docas | 990 | Zeca Graxa 26,1/5 · Bia Faísca 24,8/5 · Tonho Pistão 23,5/5 | 20–30 | 2–3 × t1 | 1 × t1e (1º–2º) | já liberada |
| 2 | Rua dos Guindastes | Docas | 1580 | Lu Neblina 41,5/6 · Dedé Catraca 39,4/6 · Nina Ferrolho 37,4/6 | 25–40 | 2–3 × t1 | 1 × t1e | 4 vitórias na fase 1 |
| 3 | Armazém Nove | Docas | 1790 | Juca Vela 47,0/7 · Ritinha Biela 44,6/7 · Gaúcho Turbina 42,3/7 | 35–50 | 2–3 × t1 | 1 × t2e | 3 vitórias na fase 2 |
| 4 | Avenida dos Letreiros | Centro Velho | 2030 | Marta Escapamento 53,3/8 · Pepe Embreagem 50,6/8 · Cida Centelha 48,0/8 | 45–65 | 2–3 × t2 | 1 × t2e | 3 vitórias na fase 3 |
| 5 | Viaduto do Relógio | Centro Velho | 2150 | Russo Diesel 56,5/9 · Kika Rolamento 53,7/9 · Beto Asfalto 50,9/9 | 55–80 | 2–3 × t2 | 1 × t3e | 3 vitórias na fase 4 |
| 6 | Largo da Feira | Centro Velho | 2550 | Neusa Válvula 67,0/10 · Tita Cromada 63,6/10 · Duda Cárter 60,3/10 | 70–100 | 2–3 × t3 | 1 × t3e | 3 vitórias na fase 5 |
| 7 | Túnel da Matriz | Centro Velho | 2770 | Vovó Calota 73,0/11 · Sombra 69,3/11 · Rei do Morro 65,7/11 | 85–120 | 2–3 × t3 | 1 × t3e | 3 vitórias na fase 6 |
| 8 | Curvas do Mirante | Alto da Serra | 3060 | Mestre Farol 80,5/12 · Dona Serra 76,5/12 · Barão do Mirante 72,5/12 | 100–145 | 2–3 × t4 | 1 × t4e | 3 vitórias na fase 7 |
| 9 | Estrada das Antenas | Alto da Serra | 3270 | Capitã Antena 86,0/13 · Fantasma da Serra 81,7/13 · Lobo do Cume 77,4/13 | 120–170 | 2–3 × t4 | 1 × t4e | 3 vitórias na fase 8 |
| 10 | Cume do Farol | Alto da Serra | 3420 | Magrão Nitro 90,0/14 · Iara Relâmpago 85,5/14 · O Farol 81,0/14 | 140–200 | 2–3 × t4 | 1 × t4e | 3 vitórias na fase 9 |

- **Potência do rival líder (calibrado).** Foi ajustada pelo simulador para que cada fase leve, em média, cerca de 7–8 corridas sem loja. Quando o boost passou a contar na potência (peso 0,45), todos os rivais foram recalibrados e subiram cerca de 20%: o líder da fase 1 foi de 21,7 para 26,1 e o da fase 10 de 73,5 para 90,0. Os outros dois rivais têm 95% e 90% da potência do líder (suposição: escada fixa).
- **Boost dos rivais:** 5 a 14, subindo 1 por fase (suposição).
- **Comprimento da pista (calibrado).** É `potência do líder × 38 s`, arredondado para 10 px, para que a corrida dure cerca de 35–39 s (fase 1: ~31 s) mesmo com o jogador ficando mais rápido.
- **Fim da campanha:** 3 vitórias na fase 10. Esse critério usa o campo novo `campaign.finalStageWins` (veja a seção 9).
- **Nomes de fases, bairros e rivais:** originais (suposição: escolha criativa).

## 3. Carro, peças e raridades

Carro base: `topSpeed 10, accel 10, grip 10, boost 10`, o que dá **potência 26,5**.
Pesos da potência: topSpeed 1,0, accel 0,6, grip 0,6 e **boost 0,45**. O peso do boost foi escolhido pelo designer (veja a seção 4). O boost conta na potência **e** continua dando a chance de nitro.

| Raridade | statBase | Nível máx. | Bônus no nível máx. | Desmontar (moedas) | Mult. de custo |
|---|---|---|---|---|---|
| Comum | 2 | 5 | 4 | 5 | 1,0 |
| Incomum | 4 | 5 | 8 | 12 | 1,5 |
| Rara | 7 | 5 | 14 | 25 | 2,2 |
| Épica | 11 | 5 | 22 | 50 | 3,2 |
| Lendária | 16 | 5 | 32 | 100 | 4,5 |

Todos os valores desta tabela são suposições. O simulador só validou que, juntos, eles produzem a curva da seção 7.

- Bônus da peça = `statBase × (1 + 0,25 × (nível − 1))`. No nível 5 o bônus é 2× o base.
- Custo para subir do nível L para L+1 = `round(20 × 1,6^(L−1) × mult)`. Para uma peça comum: 20, 32, 51, 82 (185 moedas do nível 1 ao 5). Para uma lendária: 90, 144, 230, 369 (833 moedas). (suposição)
- Potência com as 4 peças (motor, câmbio, pneus, turbo) da mesma raridade, todas no nível 1 / todas no nível máximo (o fator 2,65 vem da soma dos pesos 1 + 0,6 + 0,6 + 0,45):

| Conjunto | Nível 1 | Nível máx. |
|---|---|---|
| Comum | 31,8 | 37,1 |
| Incomum | 37,1 | 47,7 |
| Rara | 45,1 | 63,6 |
| Épica | 55,7 | 84,8 |
| Lendária | 68,9 | 111,3 |

O teto do jogo é 111,3. O rival mais forte (90,0) exige um conjunto épico no máximo ou alguma lendária, o que deixa espaço para conteúdo futuro.

## 4. Corrida

| Parâmetro | Valor | Origem |
|---|---|---|
| `weights` | topSpeed 1,0 · accel 0,6 · grip 0,6 · **boost 0,45** | contrato + boost escolhido pelo designer |
| `speedPerPower` | 1,0 px/s por ponto | contrato |
| `noise` | 0,30 | calibrado (veja abaixo) |
| `boostChancePerPointPerSec` | 0,006 | suposição |
| `boostSpeedMult` / `boostDurationSec` | 1,35 / 1,5 s | contrato |
| `placeRewardMult` | 1,0 / 0,6 / 0,35 / 0,2 | contrato |

- **Ruído.** O valor do exemplo (0,08) deixava o resultado quase determinístico: com 5% de potência a mais, o jogador vencia 98% das vezes, e com 5% a menos vencia 5%. Com 0,30 a curva fica mais suave: com potência igual à do líder vence cerca de 42–52%, com 10% a menos ainda vence 5–7%, e com 10% a mais vence cerca de 88% (teste de 400 corridas por ponto, rivais a 100/95/90%).
  Valores maiores suavizariam mais a curva. O alvo agora é limitado a ≥ 0 (contrato), então isso pode ser testado.
- **Nitro.** Chance por segundo = `boost × 0,006`. Com o carro base (boost 10) é 6%/s. Com turbo lendário no nível máximo (boost 42) é 25%/s.
- **Por que o peso do boost é 0,45.**
  - Medi no simulador o efeito da arrancada sozinha. Subir o boost de 10 para 30 encurta a corrida em cerca de 4,5%. Isso equivale a **~0,0023 × potência** de ganho por ponto de boost: cerca de 0,07 no início do jogo (potência 30), 0,12 no meio (potência 50) e 0,17 no fim (potência 70).
  - Com peso 0,45, o valor real de um ponto de turbo fica em **0,52–0,62**. Isso é praticamente igual a accel e grip (0,6) e bem abaixo do motor (1,0).
  - Resultado: o turbo fica competitivo sem ser o melhor slot disparado.
  - Para o guloso, que só enxerga o peso, o turbo rende 75% do ganho por moeda de câmbio e pneus. Por isso ele melhora o turbo, mas um pouco depois dos outros slots.
- **Moeda média por corrida** = média de `coins` × multiplicador da colocação. Exemplo na fase 5: 67,5 × 1,0 = 68 moedas em 1º lugar e 67,5 × 0,2 = 14 moedas em 4º.

## 5. Tabelas de prêmio (chance real por rolagem)

A peça sorteada escolhe o slot com chance igual (25% cada). Assim, a chance de uma peça de raridade X num slot específico é a chance de X dividida por 4.

| Tabela | Usada em | Moedas | Comum | Incomum | Rara | Épica | Lendária |
|---|---|---|---|---|---|---|---|
| t1 | pista, fases 1–3 | 45% (8–16) | 45% | 10% | — | — | — |
| t1e | prêmio final, fases 1–2 | 20% (15–25) | 40% | 32% | 8% | — | — |
| t2 | pista, fases 4–5 | 30% (15–30) | 25% | 30% | 15% | — | — |
| t2e | prêmio final, fases 3–4 | 10% (25–40) | 10% | 35% | 35% | 10% | — |
| t3 | pista, fases 6–7 | 25% (25–45) | 10% | 30% | 25% | 10% | — |
| t3e | prêmio final, fases 5–7 | 10% (40–60) | — | 25% | 40% | 25% | — |
| t4 | pista, fases 8–10 | 20% (35–60) | — | 25% | 30% | 20% | **5%** |
| t4e | prêmio final, fases 8–10 | 10% (50–80) | — | — | 40% | 38% | **12%** |

Os pesos são iguais às porcentagens (cada tabela soma 100). O intervalo entre parênteses é a quantidade de moedas, sorteada uniformemente. Todos os pesos são suposições ajustadas iterativamente com o simulador.

**Por corrida:**

- **Caixas na pista:** 2 caixas (50%) ou 3 caixas (50%), em média 2,5.
- **Prêmio final:** 1 rolagem se o jogador terminar em 1º ou 2º.
- **Lendária:** só existe nas tabelas t4 e t4e, ou seja, nas fases 8–10.
  - Chance de pelo menos uma lendária numa corrida da fase 8, sem prêmio final: 1 − 0,95^2,5 ≈ **12%**.
  - Chance com prêmio final: ≈ **23%**.

## 5.1 Loja (`balance.shop`, contrato 3.1)

Pedido do dono do jogo: peças avançadas à venda, **caras**, para o jogador juntar moedas por várias corridas. São 12 itens, 3 por slot, e cada um pode ser comprado uma vez. As peças já vêm em nível acima de 1, para que valham a pena contra peças comuns e incomuns já melhoradas.

| Item (`id`) | Slot | Raridade / nível | Bônus | Libera na fase | Preço | Corridas de economia* |
|---|---|---|---|---|---|---|
| sh_engine_rare | Motor | Rara 5 | 14 | 3 Armazém Nove | 650 | ~11 |
| sh_tires_rare | Pneus | Rara 5 | 14 | 3 Armazém Nove | 700 | ~12 |
| sh_turbo_rare | Turbo | Rara 5 | 14 | 3 Armazém Nove | 600 | ~10 |
| sh_transmission_rare | Câmbio | Rara 5 | 14 | 4 Avenida dos Letreiros | 800 | ~9 |
| sh_engine_epic | Motor | Épica 4 | 19,25 | 6 Largo da Feira | 1200 | ~9 |
| sh_transmission_epic | Câmbio | Épica 4 | 19,25 | 6 Largo da Feira | 1300 | ~9 |
| sh_tires_epic | Pneus | Épica 4 | 19,25 | 7 Túnel da Matriz | 1400 | ~9 |
| sh_turbo_epic | Turbo | Épica 4 | 19,25 | 7 Túnel da Matriz | 1300 | ~8 |
| sh_engine_legendary | Motor | Lendária 3 | 24 | 9 Estrada das Antenas | 3300 | ~14 |
| sh_turbo_legendary | Turbo | Lendária 3 | 24 | 9 Estrada das Antenas | 2900 | ~12 |
| sh_transmission_legendary | Câmbio | Lendária 3 | 24 | 10 Cume do Farol | 3500 | ~14 |
| sh_tires_legendary | Pneus | Lendária 3 | 24 | 10 Cume do Farol | 3500 | ~14 |

\* **Corridas de economia** = preço ÷ renda média por corrida na fase em que o item libera, com loja ligada. A renda inclui moedas da colocação, caixas de moedas e sucata, e foi medida no simulador (seção 7). Os valores medidos de renda são: fase 3 ≈ 60, fase 4 ≈ 91, fase 6 ≈ 138, fase 7 ≈ 161, fase 9 ≈ 233 e fase 10 ≈ 251 moedas por corrida.

**Regras de preço:**

- Os preços e níveis foram ajustados pelo simulador.
- A escolha de quais slots aparecem em cada fase é uma **suposição**.
- O item mais barato de cada faixa custa de 8 a 13 corridas de economia: rara 600 (~10), épica 1200 (~9), lendária 2900 (~12). Isso fica dentro do alvo de 8–15 corridas.
- **Turbos:** com o boost valendo 0,45 na potência, os turbos da loja custam cerca de 10–15% menos que os itens equivalentes de câmbio e pneus. O turbo raro também foi antecipado para a fase 3 (suposição de design).
- **Ajustes feitos quando o boost entrou na potência:**
  - níveis: raras do nível 4 para o 5, épicas do 3 para o 4, turbos igualados às outras peças da mesma raridade;
  - preços reduzidos de 7–20%.

  Sem esses ajustes, a loja só encurtava a campanha em 12–13%, porque os upgrades de turbo passaram a disputar as moedas.
- **A lendária da loja custa mais do que esperar pela sorte.**
  - Por sorte, a chance de lendária é de 12–23% por corrida a partir da fase 8; na média ela sai em cerca de 5 corridas.
  - Na loja, a lendária só libera na fase 9 e custa 12–14 corridas de economia.

**Efeito na campanha (simulador):**

| | Sem loja | Com loja | Diferença |
|---|---|---|---|
| Semente 12345, 200 jogadores | 0,85 h, 72 corridas, p90 1,25 h | 0,70 h, 60 corridas, p90 0,92 h | **−18%** de tempo |
| Semente 777, 300 jogadores | 0,84 h, 71 corridas | 0,71 h, 61 corridas | **−15%** de tempo |
| Sementes 1 e 2, 500 jogadores | 0,83 h / 0,85 h | 0,71 h / 0,72 h | **−14% / −15%** |

Leitura do resultado:

- A loja acelera a campanha em 14–18%, no limite de baixo da faixa de 15–25%.
- O maior efeito continua sendo **cortar a cauda de azar**: o p90 cai de 1,25 h para 0,92 h.
- As caixas continuam sendo a maior fonte de peças: cada jogador ganha cerca de 143 peças em caixas e compra cerca de 2,7 itens na loja.

**Itens comprados (% dos jogadores, semente 12345):**

| Item | Raridade nv | Libera na fase | Preco | Corridas de economia | % jogadores que compram | Fase media da compra |
|---|---|---|---|---|---|---|
| sh_engine_rare | rare 5 | 3 | 650 | 10.9 | 50% | 4.3 |
| sh_tires_rare | rare 5 | 3 | 700 | 11.7 | 24% | 5.5 |
| sh_transmission_rare | rare 5 | 4 | 800 | 8.8 | 0% | 5.0 |
| sh_turbo_rare | rare 5 | 3 | 600 | 10.0 | 8% | 6.0 |
| sh_engine_epic | epic 4 | 6 | 1200 | 8.7 | 67% | 7.1 |
| sh_transmission_epic | epic 4 | 6 | 1300 | 9.4 | 40% | 7.9 |
| sh_tires_epic | epic 4 | 7 | 1400 | 8.7 | 35% | 8.8 |
| sh_turbo_epic | epic 4 | 7 | 1300 | 8.1 | 32% | 9.1 |
| sh_engine_legendary | legendary 3 | 9 | 3300 | 14.2 | 16% | 10.0 |
| sh_turbo_legendary | legendary 3 | 9 | 2900 | 12.4 | 0% | - |
| sh_transmission_legendary | legendary 3 | 10 | 3500 | 13.9 | 0% | - |
| sh_tires_legendary | legendary 3 | 10 | 3500 | 13.9 | 0% | - |

O câmbio raro e as lendárias de turbo, câmbio e pneus quase nunca compensam para o guloso, porque quando ele economizaria para esses itens já tem peça igual ou melhor no slot.

## 6. Jogador guloso (modelo do simulador)

- **Peças.** Equipa a peça de maior bônus em cada slot (em caso de empate, mantém a atual) e desmonta todas as outras em `scrapCoins`.
- **Upgrades.** Compra o upgrade com maior ganho de potência por moeda. Se não tem moedas para esse upgrade, guarda as moedas em vez de comprar outro pior. A potência inclui o boost (peso 0,45), então o turbo é tratado como qualquer slot.
- **Loja.** Avaliada depois de equipar e antes dos upgrades.
  - Entre os itens liberados e ainda não comprados, escolhe o de maior ganho de potência por moeda. O ganho é `(bônus do item − bônus equipado no slot) × peso do stat`, e para o turbo o peso é 0,45.
  - Se a razão desse item for maior que a do melhor upgrade:
    - se tem as moedas, **compra** (a peça antiga é desmontada) e reavalia;
    - se faltam até **10 × a renda média das últimas 5 corridas**, **economiza**: não compra upgrade nesta rodada;
    - se faltam mais que isso, ignora a loja e faz upgrades normalmente.
  - Com `--no-shop` a loja é ignorada.
- **Fase.** Sempre corre a fase mais alta liberada.
- **Tempo.** O tempo de jogo é a duração simulada de cada corrida mais 5 s de intervalo entre corridas.
- **Corrida simulada.** Usa passos de 1/60 s com suavização exponencial (constante de 0,5 s) em forma fechada, matematicamente idêntica a repetir `v += (alvo − v)·(1 − e^(−dt/0,5))`.
  - Alvo novo a cada 1 s; o nitro é sorteado a cada 1 s se não estiver ativo.
  - O alvo é limitado a ≥ 0, como diz o contrato.
  - A corrida termina quando o **jogador** cruza a linha; quem ainda não chegou fica atrás dele. A pausa de 5 s começa nesse momento.

## 7. Resultado do simulador (tabela final)

Comando: `python tools/simulate.py` (loja ligada). Parâmetros: 200 jogadores, semente 12345, peso do boost 0,45. A regra de fim de corrida é a atual: termina quando o jogador cruza.

### Com loja

```
Nitro Crew - simulacao: 200 jogadores, semente 12345, loja LIGADA
Carro base na fase 1: vitoria em 61.5% das corridas (2000 corridas)
```

| Fase | Nome | Corridas p/ liberar (media / p10-p90) | Tempo acum. (min) | Pot. jogador chegada -> liberacao | Pot. rivais (max) | Vitoria % | Duracao corrida (s) | Pecas/jogador C I R E L | 1a lendaria (% jog.) | Renda/corrida | Compras loja/jog. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Cais da Ferrugem | 4.5 / 4-5 | 2.7 | 26.5 -> 38.2 | 26.1 | 90 | 30.9 | 6.9 2.5 0.4 0.0 0.0 | 0 | 49 | 0.00 |
| 2 | Rua dos Guindastes | 7.6 / 3-12 | 8.2 | 38.2 -> 44.1 | 41.5 | 40 | 38.6 | 10.3 3.4 0.3 0.0 0.0 | 0 | 49 | 0.00 |
| 3 | Armazém Nove | 7.6 / 4-14 | 13.7 | 44.1 -> 51.0 | 47.0 | 39 | 38.4 | 8.9 3.5 1.8 0.4 0.0 | 0 | 60 | 0.06 |
| 4 | Avenida dos Letreiros | 5.9 / 3-10 | 17.9 | 51.0 -> 57.9 | 53.3 | 51 | 37.4 | 4.3 5.9 3.5 0.5 0.0 | 0 | 91 | 0.24 |
| 5 | Viaduto do Relógio | 4.1 / 3-6 | 20.6 | 57.9 -> 64.0 | 56.5 | 73 | 35.0 | 2.6 4.1 3.0 1.0 0.0 | 0 | 119 | 0.34 |
| 6 | Largo da Feira | 7.0 / 3-13 | 25.6 | 64.0 -> 70.9 | 67.0 | 43 | 37.5 | 1.7 6.7 6.2 3.0 0.0 | 0 | 138 | 0.36 |
| 7 | Túnel da Matriz | 5.9 / 3-10 | 29.7 | 70.9 -> 75.3 | 73.0 | 51 | 36.9 | 1.4 5.1 5.6 2.7 0.0 | 0 | 161 | 0.43 |
| 8 | Curvas do Mirante | 6.5 / 4-10 | 34.3 | 75.3 -> 84.3 | 80.5 | 46 | 37.2 | 0.0 4.1 6.6 5.0 1.5 | 84 | 201 | 0.46 |
| 9 | Estrada das Antenas | 5.4 / 3-9 | 38.0 | 84.3 -> 88.4 | 86.0 | 56 | 36.3 | 0.0 3.7 5.7 4.5 1.1 | 12 | 233 | 0.58 |
| 10 | Cume do Farol | 5.8 / 3-10 | 42.0 | 88.4 -> 90.2 | 90.0 | 52 | 36.5 | 0.0 3.7 6.1 4.6 1.3 | 4 | 251 | 0.26 |

```
Campanha completa: media 0.70 h (p10 0.51 h, p90 0.92 h); corridas: media 60
Jogadores sem nenhuma lendaria ao fim: 2%
Duracao das corridas: min 20.3 s, p5 30.2 s, p95 42.7 s, max 49.4 s
Corridas com algum carro em marcha a re (v < 0 ao fim de um segundo): 0.00%

Por slot (media por jogador): upgrades comprados | bonus da peca equipada no fim | % com peca rara+ no fim
  engine        upgrades   7.3 | bonus  23.7 | rara+ 100% | peso 1.00
  transmission  upgrades   8.0 | bonus  23.2 | rara+ 100% | peso 0.60
  tires         upgrades   7.7 | bonus  24.9 | rara+ 100% | peso 0.60
  turbo         upgrades   7.8 | bonus  24.9 | rara+ 100% | peso 0.45
```

A tabela de itens da loja comprados está na seção 5.1.

### Sem loja (`python tools/simulate.py --no-shop`)

| Fase | Nome | Corridas p/ liberar (media / p10-p90) | Tempo acum. (min) | Pot. jogador chegada -> liberacao | Pot. rivais (max) | Vitoria % | Duracao corrida (s) | Pecas/jogador C I R E L | 1a lendaria (% jog.) | Renda/corrida | Compras loja/jog. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Cais da Ferrugem | 4.5 / 4-5 | 2.7 | 26.5 -> 37.8 | 26.1 | 89 | 31.0 | 6.7 2.4 0.4 0.0 0.0 | 0 | 49 | 0.00 |
| 2 | Rua dos Guindastes | 8.1 / 3-13 | 8.6 | 37.8 -> 44.2 | 41.5 | 37 | 38.9 | 11.0 3.6 0.4 0.0 0.0 | 0 | 48 | 0.00 |
| 3 | Armazém Nove | 7.4 / 3-12 | 13.9 | 44.2 -> 50.9 | 47.0 | 41 | 38.4 | 8.8 3.6 1.6 0.5 0.0 | 0 | 61 | 0.00 |
| 4 | Avenida dos Letreiros | 8.7 / 3-18 | 20.3 | 50.9 -> 57.4 | 53.3 | 35 | 38.8 | 5.8 8.3 4.9 0.6 0.0 | 0 | 82 | 0.00 |
| 5 | Viaduto do Relógio | 6.4 / 3-9 | 24.8 | 57.4 -> 63.0 | 56.5 | 47 | 37.5 | 4.0 5.6 4.1 0.9 0.0 | 0 | 100 | 0.00 |
| 6 | Largo da Feira | 6.8 / 3-13 | 29.6 | 63.0 -> 72.0 | 67.0 | 44 | 38.0 | 1.6 6.1 6.0 2.6 0.0 | 0 | 130 | 0.00 |
| 7 | Túnel da Matriz | 7.1 / 3-13 | 34.7 | 72.0 -> 75.5 | 73.0 | 42 | 37.9 | 1.6 6.3 6.1 3.0 0.0 | 0 | 145 | 0.00 |
| 8 | Curvas do Mirante | 8.1 / 3-16 | 40.6 | 75.5 -> 83.6 | 80.5 | 37 | 38.3 | 0.0 5.2 8.0 5.9 1.6 | 78 | 185 | 0.00 |
| 9 | Estrada das Antenas | 7.8 / 3-15 | 46.1 | 83.6 -> 88.2 | 86.0 | 39 | 37.9 | 0.0 5.0 7.7 5.7 1.5 | 20 | 203 | 0.00 |
| 10 | Cume do Farol | 7.3 / 3-14 | 51.3 | 88.2 -> 90.8 | 90.0 | 41 | 37.5 | 0.0 4.4 7.4 5.4 1.4 | 2 | 228 | 0.00 |

```
Campanha completa: media 0.85 h (p10 0.57 h, p90 1.25 h); corridas: media 72
Jogadores sem nenhuma lendaria ao fim: 0%
Duracao das corridas: min 21.0 s, p5 30.5 s, p95 44.1 s, max 53.2 s
Corridas com algum carro em marcha a re (v < 0 ao fim de um segundo): 0.00%

Por slot (media por jogador): upgrades comprados | bonus da peca equipada no fim | % com peca rara+ no fim
  engine        upgrades   9.7 | bonus  24.3 | rara+ 100% | peso 1.00
  transmission  upgrades   8.8 | bonus  24.1 | rara+ 100% | peso 0.60
  tires         upgrades   8.9 | bonus  24.4 | rara+ 100% | peso 0.60
  turbo         upgrades   8.5 | bonus  24.3 | rara+ 100% | peso 0.45
```

**Turbo agora:** o guloso compra em média **7,8 upgrades de turbo** por campanha com loja (8,5 sem loja), contra 0 antes da mudança. É praticamente o mesmo número dos outros slots (7,3–9,7). No fim da campanha o turbo equipado tem bônus médio de 24,9, igual ao dos outros slots. Na loja, 8% dos jogadores compram o turbo raro e 32% o turbo épico.

**Como ler a tabela:**

- **Corridas p/ liberar:** corridas jogadas naquela fase até liberar a próxima. Na fase 10, até a 3ª vitória.
- **Vitoria %:** média de todas as corridas da fase. Na fase 1 o carro já melhora logo após a 1ª corrida, por isso o número é maior que os 62% do carro base.
- **Peças/jogador:** peças obtidas em caixas na fase por jogador, por raridade (C = comum, I = incomum, R = rara, E = épica, L = lendária).
- **Renda/corrida:** moedas da colocação + caixas de moedas + sucata.
- **Compras loja/jog.:** itens comprados por jogador na fase.
- **Robustez:** com outra semente (777, 300 jogadores): 0,71 h com loja e 0,84 h sem loja.

## 8. Metas de ritmo: o que bateu

| Meta | Resultado | Status |
|---|---|---|
| Corrida de 25 a 50 s na tela | média de 31 s na fase 1 e 35–39 s nas outras; p5 30,2 s; p95 42,7 s; máximo de 49,4 s | **bateu** |
| Fase 1 vencível com o carro base em ~60% | 61,5% (carro base com potência 26,5 contra líder 26,1) | **bateu** |
| Cada fase nova leva 3 a 10 corridas | com loja, média por fase de 4,1 a 7,6 e p90 até 14; sem loja, média de 4,5 a 8,7 e p90 até 18 | **bateu na média**; a cauda passa de 10 corridas para cerca de 10% dos jogadores |
| Jogo inteiro em 2 a 4 h | **0,70 h** com loja e 0,85 h sem loja | **não bateu**; o dono do jogo aceitou 0,7–0,9 h |
| Primeira lendária entre as fases 7 e 10 | com loja: 84% na fase 8, 12% na 9, 4% na 10 e 2% sem nenhuma em caixa. Sem loja: 78% / 20% / 2% | **bateu** |
| Loja: item mais barato de cada faixa custa 8–15 corridas de economia | rara ~10, épica ~9, lendária ~12 | **bateu** |
| Loja acelera a campanha em ~15–25% | −18% (semente 12345), −15% (777), −14% e −15% (sementes 1 e 2 com 500 jogadores) | **bateu, no limite de baixo** |
| Lendária da loja mais cara que a sorte | loja: 12–14 corridas de economia a partir da fase 9; sorte: ~5 corridas a partir da fase 8 | **bateu** |
| Turbo competitivo com os outros slots | 7,8 upgrades de turbo por jogador (outros slots: 7,3–8,0); valor real de cada ponto de turbo ≈ 0,52–0,62 contra 0,6 de accel e grip | **bateu** |
| Sempre há progresso | no mínimo 4 moedas e 2 caixas por corrida | **bateu** |

**Por que 2–4 h é incompatível com as outras metas.**

- Com 10 fases, no máximo 10 corridas por fase e corridas de no máximo 50 s, mais 5 s de intervalo, o máximo teórico é 10 × 10 × 55 s = **92 min**.
- Para chegar a 2 h seriam necessárias cerca de 720 s por fase, ou seja, **~15 corridas de 48 s por fase**.
- Priorizei as metas sentidas a cada corrida: a duração da corrida e as 3–10 corridas por fase.

**Variante "2 horas" (testada, não aplicada).** Em uma calibração rápida (100 jogadores, 5 iterações). Atenção: foi feita antes do boost entrar na potência e antes da regra atual de fim de corrida, então os números de rival abaixo não valem mais:

- Mudanças: `prevStageWins = 6` em todas as fases, `campaign.finalStageWins = 6` e rivais líderes em 21,7 / 36,2 / 39,8 / 45,3 / 49,3 / 59,5 / 61,2 / 67,9 / 73,5 / 75,2.
- Resultado: **1,75 h** em média (p90 de 2,55 h), com 13–17 corridas por fase (p90 até 36).
- Para usar essa variante, a meta de "3 a 10 corridas por fase" precisa virar algo como "10 a 18".

## 9. Campos acrescentados ao `balance.json`

| Campo | Significado | Quem lê |
|---|---|---|
| `campaign.finalStageWins` | vitórias na última fase para considerar a campanha concluída (3) | simulador. O motor pode usar para mostrar "campanha concluída" e ignorar se não precisar |
| `shop.items` | catálogo da loja (contrato 3.1) | motor e simulador |

Nenhum campo obrigatório foi renomeado ou removido. A fase 1 tem `unlock.prevStageWins = 0` porque já começa liberada.

## 10. Propostas de mudança no motor

Todo o balanceamento acima usa as fórmulas atuais. As propostas são opcionais.

1. ~~Limitar a velocidade-alvo a ≥ 0~~: **adotado no contrato** (`max(0, …)`). Com o limite, daria para subir o `noise` para cerca de 0,45 (suposição: não simulado), o que deixa a curva de vitória mais suave.
2. **Proteção contra azar no slot.** Com `"slot": "any"` sorteado em 25%, o jogador sem sorte demora para conseguir peça boa num slot específico. É a maior fonte da cauda p90 de 15–20 corridas nas fases 4–5 e 9.
   - A loja já reduz essa cauda (p90 da campanha cai de 1,39 h para 0,92 h).
   - Proposta: aceitar `"slot": "weakest"` nas tabelas, que daria a peça no slot com menor bônus equipado.
   - Alternativa: o motor sortear o slot com peso maior para o slot mais fraco.
3. **Meta de tempo total.** Se 2–4 h for prioridade, há duas saídas no motor ou no escopo:
   - aumentar o número de fases (cerca de 20 com o ritmo atual);
   - ou aceitar mais corridas por fase (variante da seção 8).

   Só aumentar o intervalo entre corridas não basta: com 30 s de intervalo, a campanha daria 61 × (37 + 30) s ≈ 1,1 h com loja.

   Com a corrida terminando quando o jogador cruza, ela ficou ~5 s mais curta, e a campanha caiu de 1,0 h para 0,86 h sem loja. Isso deixa a meta de 2–4 h ainda mais longe.
4. ~~Nitro fora da potência~~: **adotado**. O boost tem peso 0,45 em `race.weights` (veja a seção 4).
