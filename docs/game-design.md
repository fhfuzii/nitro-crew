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
| 1 | Cais da Ferrugem | Docas | 820 | Zeca Graxa 21,7/5 · Bia Faísca 20,6/5 · Tonho Pistão 19,5/5 | 20–30 | 2–3 × t1 | 1 × t1e (1º–2º) | já liberada |
| 2 | Rua dos Guindastes | Docas | 1330 | Lu Neblina 35,0/6 · Dedé Catraca 33,2/6 · Nina Ferrolho 31,5/6 | 25–40 | 2–3 × t1 | 1 × t1e | 4 vitórias na fase 1 |
| 3 | Armazém Nove | Docas | 1440 | Juca Vela 38,0/7 · Ritinha Biela 36,1/7 · Gaúcho Turbina 34,2/7 | 35–50 | 2–3 × t1 | 1 × t2e | 3 vitórias na fase 2 |
| 4 | Avenida dos Letreiros | Centro Velho | 1650 | Marta Escapamento 43,5/8 · Pepe Embreagem 41,3/8 · Cida Centelha 39,1/8 | 45–65 | 2–3 × t2 | 1 × t2e | 3 vitórias na fase 3 |
| 5 | Viaduto do Relógio | Centro Velho | 1750 | Russo Diesel 46,0/9 · Kika Rolamento 43,7/9 · Beto Asfalto 41,4/9 | 55–80 | 2–3 × t2 | 1 × t3e | 3 vitórias na fase 4 |
| 6 | Largo da Feira | Centro Velho | 2090 | Neusa Válvula 55,0/10 · Tita Cromada 52,2/10 · Duda Cárter 49,5/10 | 70–100 | 2–3 × t3 | 1 × t3e | 3 vitórias na fase 5 |
| 7 | Túnel da Matriz | Centro Velho | 2260 | Vovó Calota 59,5/11 · Sombra 56,5/11 · Rei do Morro 53,6/11 | 85–120 | 2–3 × t3 | 1 × t3e | 3 vitórias na fase 6 |
| 8 | Curvas do Mirante | Alto da Serra | 2510 | Mestre Farol 66,0/12 · Dona Serra 62,7/12 · Barão do Mirante 59,4/12 | 100–145 | 2–3 × t4 | 1 × t4e | 3 vitórias na fase 7 |
| 9 | Estrada das Antenas | Alto da Serra | 2680 | Capitã Antena 70,5/13 · Fantasma da Serra 67,0/13 · Lobo do Cume 63,5/13 | 120–170 | 2–3 × t4 | 1 × t4e | 3 vitórias na fase 8 |
| 10 | Cume do Farol | Alto da Serra | 2790 | Magrão Nitro 73,5/14 · Iara Relâmpago 69,8/14 · O Farol 66,2/14 | 140–200 | 2–3 × t4 | 1 × t4e | 3 vitórias na fase 9 |

- **Potência do rival líder (calibrado).** Foi ajustada pelo simulador para que cada fase leve, em média, cerca de 8 corridas. Os outros dois rivais têm 95% e 90% da potência do líder (suposição: escada fixa).
- **Boost dos rivais:** 5 a 14, subindo 1 por fase (suposição).
- **Comprimento da pista (calibrado).** É `potência do líder × 38 s`, arredondado para 10 px, para que a corrida dure cerca de 35–39 s (fase 1: ~31 s) mesmo com o jogador ficando mais rápido.
- **Fim da campanha:** 3 vitórias na fase 10. Esse critério usa o campo novo `campaign.finalStageWins` (veja a seção 9).
- **Nomes de fases, bairros e rivais:** originais (suposição: escolha criativa).

## 3. Carro, peças e raridades

Carro base: `topSpeed 10, accel 10, grip 10, boost 10`, o que dá **potência 22**.
Pesos da potência: topSpeed 1,0, accel 0,6, grip 0,6 (valores do contrato). O boost não entra na potência: ele só aumenta a chance de nitro.

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
- Potência com as 3 peças de potência (motor, câmbio, pneus) da mesma raridade, todas no nível 1 / todas no nível máximo (o fator 2,2 vem da soma dos pesos 1 + 0,6 + 0,6):

| Conjunto | Nível 1 | Nível máx. |
|---|---|---|
| Comum | 26,4 | 30,8 |
| Incomum | 30,8 | 39,6 |
| Rara | 37,4 | 52,8 |
| Épica | 46,2 | 70,4 |
| Lendária | 57,2 | 92,4 |

O teto do jogo é 92,4. O rival mais forte (73,5) exige um conjunto épico perto do máximo ou alguma lendária, o que deixa espaço para conteúdo futuro.

## 4. Corrida

| Parâmetro | Valor | Origem |
|---|---|---|
| `speedPerPower` | 1,0 px/s por ponto | contrato |
| `noise` | 0,30 | calibrado (veja abaixo) |
| `boostChancePerPointPerSec` | 0,006 | suposição |
| `boostSpeedMult` / `boostDurationSec` | 1,35 / 1,5 s | contrato |
| `placeRewardMult` | 1,0 / 0,6 / 0,35 / 0,2 | contrato |

- **Ruído.** O valor do exemplo (0,08) deixava o resultado quase determinístico: com 5% de potência a mais, o jogador vencia 98% das vezes, e com 5% a menos vencia 5%. Com 0,30 a curva fica mais suave: com potência igual à do líder vence cerca de 42–52%, com 10% a menos ainda vence 5–7%, e com 10% a mais vence cerca de 88% (teste de 400 corridas por ponto, rivais a 100/95/90%).
  Valores maiores suavizariam mais a curva, mas fazem carros andarem de ré (veja a seção 10).
- **Nitro.** Chance por segundo = `boost × 0,006`. Com o carro base (boost 10) é 6%/s. Com turbo lendário no nível máximo (boost 42) é 25%/s.
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
| sh_engine_rare | Motor | Rara 4 | 12,25 | 3 Armazém Nove | 650 | ~10 |
| sh_tires_rare | Pneus | Rara 4 | 12,25 | 3 Armazém Nove | 750 | ~11 |
| sh_transmission_rare | Câmbio | Rara 4 | 12,25 | 4 Avenida dos Letreiros | 1000 | ~12 |
| sh_turbo_rare | Turbo | Rara 3 | 10,5 | 4 Avenida dos Letreiros | 800 | ~9 |
| sh_engine_epic | Motor | Épica 3 | 16,5 | 6 Largo da Feira | 1300 | ~10 |
| sh_transmission_epic | Câmbio | Épica 3 | 16,5 | 6 Largo da Feira | 1500 | ~11 |
| sh_tires_epic | Pneus | Épica 3 | 16,5 | 7 Túnel da Matriz | 1700 | ~11 |
| sh_turbo_epic | Turbo | Épica 1 | 11 | 7 Túnel da Matriz | 1400 | ~9 |
| sh_engine_legendary | Motor | Lendária 3 | 24 | 9 Estrada das Antenas | 3600 | ~16 |
| sh_turbo_legendary | Turbo | Lendária 1 | 16 | 9 Estrada das Antenas | 3000 | ~13 |
| sh_transmission_legendary | Câmbio | Lendária 3 | 24 | 10 Cume do Farol | 3900 | ~16 |
| sh_tires_legendary | Pneus | Lendária 3 | 24 | 10 Cume do Farol | 3900 | ~16 |

\* **Corridas de economia** = preço ÷ renda média por corrida na fase em que o item libera. A renda inclui moedas da colocação, caixas de moedas e sucata, e foi medida no simulador (seção 7). Os valores medidos de renda são: fase 3 ≈ 68, fase 4 ≈ 87, fase 6 ≈ 133, fase 7 ≈ 158, fase 9 ≈ 227 e fase 10 ≈ 242 moedas por corrida.

**Regras de preço:**

- Os preços e níveis foram ajustados pelo simulador.
- A escolha de quais slots aparecem em cada fase é uma **suposição**.
- O item mais barato de cada faixa custa de 9 a 13 corridas de economia: rara 650 (~10), épica 1300 (~10), lendária 3000 (~13). Isso fica dentro do alvo de 8–15 corridas.
- **A lendária da loja custa mais do que esperar pela sorte.**
  - Por sorte, a chance de lendária é de 12–23% por corrida a partir da fase 8. Na média ela sai em cerca de 5 corridas, e 96% dos jogadores já têm uma ao chegar na fase 9.
  - Na loja, a lendária só libera na fase 9 e custa 13–16 corridas de economia.
- **Turbos:** como o boost não entra na potência, o jogador guloso nunca compra turbo. Eles existem para quem gosta de nitro e para completar os 4 slots (veja a proposta 4 da seção 10).

**Efeito na campanha (simulador, mesma semente):**

| | Sem loja | Com loja | Diferença |
|---|---|---|---|
| Semente 12345, 200 jogadores | 0,86 h, 73 corridas, p90 1,39 h | 0,71 h, 61 corridas, p90 0,92 h | **−17%** de tempo |
| Semente 777, 300 jogadores | 0,90 h, 75 corridas | 0,73 h, 63 corridas | **−19%** de tempo |

Leitura do resultado:

- A loja acelera a campanha em 17–19%, dentro do teto de 15–25%.
- O maior efeito é **cortar a cauda de azar**: o p90 cai de 1,39 h para 0,92 h. Na prática a loja vira a proteção contra azar no slot.
- As caixas continuam sendo a maior fonte de peças: cada jogador ganha cerca de 146 peças em caixas ao longo da campanha e compra cerca de 2,5 itens na loja. Os itens mais comprados são o motor raro (61%), o motor épico (80%) e a lendária de motor (26%).
- O câmbio raro e as lendárias de câmbio e pneus quase nunca compensam para o guloso, porque o jogador já tem peça melhor quando economizaria para eles.

## 6. Jogador guloso (modelo do simulador)

- **Peças.** Equipa a peça de maior bônus em cada slot (em caso de empate, mantém a atual) e desmonta todas as outras em `scrapCoins`.
- **Upgrades.** Compra o upgrade com maior ganho de potência por moeda. Se não tem moedas para esse upgrade, guarda as moedas em vez de comprar outro pior. O turbo nunca recebe upgrade, porque o boost não entra na potência.
- **Loja.** Avaliada depois de equipar e antes dos upgrades.
  - Entre os itens liberados e ainda não comprados, escolhe o de maior ganho de potência por moeda. O ganho é `(bônus do item − bônus equipado no slot) × peso do stat`, por isso turbo tem ganho 0.
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

Comando: `python tools/simulate.py` (loja ligada). Parâmetros: 200 jogadores, semente 12345. A regra de fim de corrida é a atual: termina quando o jogador cruza.

### Com loja

```
Nitro Crew - simulacao: 200 jogadores, semente 12345, loja LIGADA
Carro base na fase 1: vitoria em 61.2% das corridas (2000 corridas)
```

| Fase | Nome | Corridas p/ liberar (media / p10-p90) | Tempo acum. (min) | Pot. jogador chegada -> liberacao | Pot. rivais (max) | Vitoria % | Duracao corrida (s) | Pecas/jogador C I R E L | 1a lendaria (% jog.) | Renda/corrida | Compras loja/jog. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Cais da Ferrugem | 4.5 / 4-5 | 2.7 | 22.0 -> 32.1 | 21.7 | 89 | 30.9 | 6.8 2.4 0.4 0.0 0.0 | 0 | 49 | 0.00 |
| 2 | Rua dos Guindastes | 8.0 / 4-12 | 8.5 | 32.1 -> 37.5 | 35.0 | 38 | 38.8 | 10.4 3.7 0.5 0.0 0.0 | 0 | 49 | 0.00 |
| 3 | Armazém Nove | 5.2 / 3-9 | 12.1 | 37.5 -> 42.3 | 38.0 | 58 | 36.5 | 6.5 2.8 1.5 0.4 0.0 | 0 | 68 | 0.04 |
| 4 | Avenida dos Letreiros | 6.6 / 3-12 | 16.8 | 42.3 -> 47.9 | 43.5 | 46 | 37.7 | 4.5 6.7 3.9 0.4 0.0 | 0 | 87 | 0.36 |
| 5 | Viaduto do Relógio | 4.2 / 3-6 | 19.6 | 47.9 -> 52.6 | 46.0 | 71 | 34.9 | 2.6 4.0 3.1 1.0 0.0 | 0 | 120 | 0.26 |
| 6 | Largo da Feira | 7.2 / 3-14 | 24.8 | 52.6 -> 58.5 | 55.0 | 42 | 38.0 | 1.8 6.4 6.4 3.0 0.0 | 0 | 133 | 0.28 |
| 7 | Túnel da Matriz | 6.1 / 3-10 | 29.0 | 58.5 -> 62.4 | 59.5 | 49 | 36.9 | 1.5 5.5 5.7 2.6 0.0 | 0 | 158 | 0.49 |
| 8 | Curvas do Mirante | 6.5 / 3-10 | 33.5 | 62.4 -> 69.9 | 66.0 | 46 | 37.1 | 0.0 4.0 6.7 5.2 1.4 | 77 | 203 | 0.46 |
| 9 | Estrada das Antenas | 6.2 / 3-11 | 37.8 | 69.9 -> 72.8 | 70.5 | 49 | 36.7 | 0.0 3.9 6.3 4.9 1.4 | 20 | 227 | 0.41 |
| 10 | Cume do Farol | 6.9 / 3-13 | 42.7 | 72.8 -> 74.8 | 73.5 | 44 | 37.0 | 0.0 4.2 7.5 5.3 1.4 | 4 | 242 | 0.25 |

```
Campanha completa: media 0.71 h (p10 0.52 h, p90 0.92 h); corridas: media 61
Jogadores sem nenhuma lendaria ao fim: 0%
Duracao das corridas: min 20.1 s, p5 29.9 s, p95 42.9 s, max 50.0 s
Corridas com algum carro em marcha a re (v < 0 ao fim de um segundo): 0.00%
```

| Item | Raridade nv | Libera na fase | Preco | Corridas de economia | % jogadores que compram | Fase media da compra |
|---|---|---|---|---|---|---|
| sh_engine_rare | rare 4 | 3 | 650 | 9.6 | 61% | 4.3 |
| sh_tires_rare | rare 4 | 3 | 750 | 11.1 | 22% | 5.6 |
| sh_transmission_rare | rare 4 | 4 | 1000 | 11.6 | 0% | - |
| sh_turbo_rare | rare 3 | 4 | 800 | 9.2 | 0% | - |
| sh_engine_epic | epic 3 | 6 | 1300 | 9.8 | 80% | 7.3 |
| sh_transmission_epic | epic 3 | 6 | 1500 | 11.3 | 31% | 7.6 |
| sh_tires_epic | epic 3 | 7 | 1700 | 10.8 | 35% | 9.0 |
| sh_turbo_epic | epic 1 | 7 | 1400 | 8.9 | 0% | - |
| sh_engine_legendary | legendary 3 | 9 | 3600 | 15.8 | 26% | 9.9 |
| sh_turbo_legendary | legendary 1 | 9 | 3000 | 13.2 | 0% | - |
| sh_transmission_legendary | legendary 3 | 10 | 3900 | 16.1 | 0% | - |
| sh_tires_legendary | legendary 3 | 10 | 3900 | 16.1 | 0% | - |

### Sem loja (`python tools/simulate.py --no-shop`)

| Fase | Nome | Corridas p/ liberar (media / p10-p90) | Tempo acum. (min) | Pot. jogador chegada -> liberacao | Pot. rivais (max) | Vitoria % | Duracao corrida (s) | Pecas/jogador C I R E L | 1a lendaria (% jog.) | Renda/corrida | Compras loja/jog. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Cais da Ferrugem | 4.5 / 4-5 | 2.7 | 22.0 -> 32.2 | 21.7 | 88 | 30.7 | 7.0 2.6 0.3 0.0 0.0 | 0 | 48 | 0.00 |
| 2 | Rua dos Guindastes | 8.1 / 3-13 | 8.7 | 32.2 -> 37.3 | 35.0 | 37 | 39.0 | 11.0 3.8 0.5 0.0 0.0 | 0 | 48 | 0.00 |
| 3 | Armazém Nove | 6.6 / 3-8 | 13.4 | 37.3 -> 42.9 | 38.0 | 45 | 38.0 | 7.7 3.1 1.6 0.4 0.0 | 0 | 61 | 0.00 |
| 4 | Avenida dos Letreiros | 7.8 / 3-18 | 19.0 | 42.9 -> 48.4 | 43.5 | 39 | 38.2 | 5.3 7.5 4.5 0.5 0.0 | 0 | 84 | 0.00 |
| 5 | Viaduto do Relógio | 6.9 / 3-11 | 23.9 | 48.4 -> 53.4 | 46.0 | 43 | 37.7 | 4.4 6.4 4.4 1.1 0.0 | 0 | 96 | 0.00 |
| 6 | Largo da Feira | 7.2 / 3-13 | 29.2 | 53.4 -> 60.9 | 55.0 | 42 | 38.5 | 1.6 6.2 6.4 2.9 0.0 | 0 | 128 | 0.00 |
| 7 | Túnel da Matriz | 7.2 / 3-13 | 34.3 | 60.9 -> 64.1 | 59.5 | 42 | 37.6 | 1.9 6.5 6.1 2.9 0.0 | 0 | 143 | 0.00 |
| 8 | Curvas do Mirante | 7.6 / 3-15 | 39.7 | 64.1 -> 70.4 | 66.0 | 39 | 38.0 | 0.0 5.0 7.3 5.7 1.5 | 80 | 187 | 0.00 |
| 9 | Estrada das Antenas | 8.3 / 3-17 | 45.7 | 70.4 -> 73.4 | 70.5 | 36 | 37.9 | 0.0 4.8 8.4 6.2 1.6 | 16 | 205 | 0.00 |
| 10 | Cume do Farol | 8.2 / 3-17 | 51.5 | 73.4 -> 75.6 | 73.5 | 36 | 37.8 | 0.0 5.1 8.2 6.0 1.6 | 4 | 221 | 0.00 |

```
Campanha completa: media 0.86 h (p10 0.50 h, p90 1.39 h); corridas: media 73
Jogadores sem nenhuma lendaria ao fim: 0%
Duracao das corridas: min 20.3 s, p5 29.7 s, p95 44.5 s, max 58.6 s
Corridas com algum carro em marcha a re (v < 0 ao fim de um segundo): 0.00%

Loja: corridas de economia = preco / renda media por corrida na fase em que o item libera
| Item | Raridade nv | Libera na fase | Preco | Corridas de economia | % jogadores que compram | Fase media da compra |
|---|---|---|---|---|---|---|
| sh_engine_rare | rare 4 | 3 | 650 | 10.7 | 0% | - |
| sh_tires_rare | rare 4 | 3 | 750 | 12.3 | 0% | - |
| sh_transmission_rare | rare 4 | 4 | 1000 | 11.9 | 0% | - |
| sh_turbo_rare | rare 3 | 4 | 800 | 9.5 | 0% | - |
| sh_engine_epic | epic 3 | 6 | 1300 | 10.2 | 0% | - |
| sh_transmission_epic | epic 3 | 6 | 1500 | 11.7 | 0% | - |
| sh_tires_epic | epic 3 | 7 | 1700 | 11.9 | 0% | - |
| sh_turbo_epic | epic 1 | 7 | 1400 | 9.8 | 0% | - |
| sh_engine_legendary | legendary 3 | 9 | 3600 | 17.6 | 0% | - |
| sh_turbo_legendary | legendary 1 | 9 | 3000 | 14.6 | 0% | - |
| sh_transmission_legendary | legendary 3 | 10 | 3900 | 17.7 | 0% | - |
| sh_tires_legendary | legendary 3 | 10 | 3900 | 17.7 | 0% | - |
```

**Como ler a tabela:**

- **Corridas p/ liberar:** corridas jogadas naquela fase até liberar a próxima. Na fase 10, até a 3ª vitória.
- **Vitoria %:** média de todas as corridas da fase. Na fase 1 o carro já melhora logo após a 1ª corrida, por isso o número é maior que os 62% do carro base.
- **Peças/jogador:** peças obtidas em caixas na fase por jogador, por raridade (C = comum, I = incomum, R = rara, E = épica, L = lendária).
- **Renda/corrida:** moedas da colocação + caixas de moedas + sucata.
- **Compras loja/jog.:** itens comprados por jogador na fase.
- **Robustez:** com outra semente (777, 300 jogadores): 0,73 h com loja e 0,90 h sem loja.

## 8. Metas de ritmo: o que bateu

| Meta | Resultado | Status |
|---|---|---|
| Corrida de 25 a 50 s na tela | média de 31 s na fase 1 e 35–39 s nas outras; p5 29,9 s; p95 42,9 s; máximo de 50 s | **bateu** |
| Fase 1 vencível com o carro base em ~60% | 61,2% | **bateu** |
| Cada fase nova leva 3 a 10 corridas | com loja, média por fase de 4,2 a 8,0 e p90 até 14; sem loja, média de 4,5 a 8,3 e p90 até 18 | **bateu na média**; a cauda passa de 10 corridas para cerca de 10% dos jogadores |
| Jogo inteiro em 2 a 4 h | **0,71 h** com loja e 0,86 h sem loja | **não bateu** (motivo abaixo) |
| Primeira lendária entre as fases 7 e 10 | 77% na fase 8, 20% na fase 9, 4% na fase 10 (caixas) | **bateu** |
| Loja: item mais barato de cada faixa custa 8–15 corridas de economia | rara ~10, épica ~10, lendária ~13 | **bateu** |
| Loja acelera no máximo 15–25% | −17% (semente 12345) e −19% (semente 777) | **bateu** |
| Lendária da loja mais cara que a sorte | loja: 13–16 corridas de economia a partir da fase 9; sorte: ~5 corridas a partir da fase 8 | **bateu** |
| Sempre há progresso | no mínimo 4 moedas e 2 caixas por corrida | **bateu** |

**Por que 2–4 h é incompatível com as outras metas.**

- Com 10 fases, no máximo 10 corridas por fase e corridas de no máximo 50 s, mais 5 s de intervalo, o máximo teórico é 10 × 10 × 55 s = **92 min**.
- Para chegar a 2 h seriam necessárias cerca de 720 s por fase, ou seja, **~15 corridas de 48 s por fase**.
- Priorizei as metas sentidas a cada corrida: a duração da corrida e as 3–10 corridas por fase.

**Variante "2 horas" (testada, não aplicada).** Em uma calibração rápida (100 jogadores, 5 iterações):

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
4. **Nitro fora da potência.** Como o boost não entra na potência, o guloso (e provavelmente o jogador) nunca melhora o turbo.
   - Proposta: incluir `boost` em `race.weights` com peso baixo (por exemplo 0,2), para que valha a pena subir o turbo.
   - Outra opção: mostrar na garagem a "chance de nitro" como benefício do turbo.
