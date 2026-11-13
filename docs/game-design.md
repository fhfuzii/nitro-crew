# Nitro Crew: documento de design de sistemas (v1)

Dono: agente `game-systems-designer`. Números em `data/balance.json`; simulador em `tools/simulate.py`.
Fórmulas: as de `docs/contracts.md`, seção 3. Este documento não muda nenhuma delas. As mudanças sugeridas estão na seção 10.

> **Convenção:** todo número marcado com **(suposição)** foi escolha de design e não saiu de simulação nem de um alvo.
> Os números marcados **(calibrado)** foram ajustados com o simulador até os alvos de ritmo baterem.

---

## 1. Loop principal

1. O carro do jogador corre sozinho contra 3 rivais na fase escolhida. Cada corrida dura cerca de 42 s na tela.
2. Durante a corrida o carro coleta 2 ou 3 caixas de prêmio na pista. A coleta é automática.
3. Ao terminar, o jogador recebe:
   - moedas pela colocação (sempre, inclusive em 4º lugar);
   - se terminou em 1º ou 2º, uma rolagem extra na tabela de "prêmio final", que é melhor que a da pista.
4. Na garagem o jogador equipa as melhores peças, desmonta as repetidas em moedas e gasta as moedas subindo o nível das peças.
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
- **Comprimento da pista (calibrado).** É `potência do líder × 38 s`, arredondado para 10 px, para que a corrida dure de 40 a 46 s mesmo com o jogador ficando mais rápido.
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

## 6. Jogador guloso (modelo do simulador)

- **Peças.** Equipa a peça de maior bônus em cada slot (em caso de empate, mantém a atual) e desmonta todas as outras em `scrapCoins`.
- **Upgrades.** Compra o upgrade com maior ganho de potência por moeda. Se não tem moedas para esse upgrade, guarda as moedas em vez de comprar outro pior. O turbo nunca recebe upgrade, porque o boost não entra na potência.
- **Fase.** Sempre corre a fase mais alta liberada.
- **Tempo.** O tempo de jogo é a duração simulada de cada corrida mais 5 s de intervalo entre corridas.
- **Corrida simulada.** Usa passos de 1/60 s com suavização exponencial (constante de 0,5 s) em forma fechada, matematicamente idêntica a repetir `v += (alvo − v)·(1 − e^(−dt/0,5))`.
  - Alvo novo a cada 1 s; o nitro é sorteado a cada 1 s se não estiver ativo.
  - A corrida termina quando o **jogador** cruza a linha; quem ainda não chegou fica atrás dele. A pausa de 5 s começa nesse momento. Com essa regra (adotada em 2026-11-13), a vitória média na fase 1 continua em ~61%, a corrida média cai para ~38 s e a campanha para ~0,86 h (p90 1,39 h). A tabela abaixo é da regra anterior; rode o simulador para a versão atual.

## 7. Resultado do simulador (tabela final)

Comando: `python tools/simulate.py`. Parâmetros: 200 jogadores, semente 12345.

```
Nitro Crew - simulacao: 200 jogadores, semente 12345
Carro base na fase 1: vitoria em 62.1% das corridas (2000 corridas)
```

| Fase | Nome | Corridas p/ liberar (media / p10-p90) | Tempo acum. (min) | Pot. jogador chegada -> liberacao | Pot. rivais (max) | Vitoria % | Duracao corrida (s) | Pecas/jogador C I R E L | 1a lendaria (% jog.) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Cais da Ferrugem | 4.5 / 4-5 | 3.5 | 22.0 -> 31.9 | 21.7 | 90 | 42.4 | 6.9 2.5 0.3 0.0 0.0 | 0 |
| 2 | Rua dos Guindastes | 8.3 / 3-13 | 10.2 | 31.9 -> 37.2 | 35.0 | 36 | 42.9 | 11.4 3.6 0.4 0.0 0.0 | 0 |
| 3 | Armazém Nove | 6.0 / 3-9 | 14.9 | 37.2 -> 42.3 | 38.0 | 50 | 42.3 | 7.2 3.0 1.6 0.4 0.0 | 0 |
| 4 | Avenida dos Letreiros | 8.4 / 3-19 | 21.6 | 42.3 -> 47.6 | 43.5 | 36 | 42.5 | 5.6 7.8 5.1 0.5 0.0 | 0 |
| 5 | Viaduto do Relógio | 9.5 / 3-20 | 29.2 | 47.6 -> 52.6 | 46.0 | 32 | 42.9 | 5.8 8.0 5.4 1.0 0.0 | 0 |
| 6 | Largo da Feira | 8.1 / 3-16 | 35.6 | 52.6 -> 61.2 | 55.0 | 37 | 42.8 | 1.9 7.2 6.9 3.0 0.0 | 0 |
| 7 | Túnel da Matriz | 7.3 / 3-12 | 41.4 | 61.2 -> 63.8 | 59.5 | 41 | 42.2 | 1.9 6.6 6.5 3.0 0.0 | 0 |
| 8 | Curvas do Mirante | 7.9 / 3-15 | 47.6 | 63.8 -> 70.0 | 66.0 | 38 | 42.3 | 0.0 4.8 7.7 5.7 1.5 | 78 |
| 9 | Estrada das Antenas | 8.2 / 3-18 | 54.0 | 70.0 -> 73.3 | 70.5 | 37 | 42.0 | 0.0 5.1 8.1 5.9 1.7 | 20 |
| 10 | Cume do Farol | 8.2 / 3-14 | 60.4 | 73.3 -> 75.1 | 73.5 | 36 | 41.7 | 0.0 5.1 8.1 6.2 1.6 | 2 |

```
Campanha completa: media 1.01 h (p10 0.63 h, p90 1.42 h); corridas: media 76
Jogadores sem nenhuma lendaria ao fim: 0%
Duracao das corridas: min 36.2 s, p5 39.6 s, p95 45.7 s, max 54.5 s
Corridas com algum carro em marcha a re (v < 0 ao fim de um segundo): 1.21%
```

**Como ler a tabela:**

- **Corridas p/ liberar:** corridas jogadas naquela fase até liberar a próxima. Na fase 10, até a 3ª vitória.
- **Vitoria %:** média de todas as corridas da fase. Na fase 1 o carro já melhora logo após a 1ª corrida, por isso o número é maior que os 62% do carro base.
- **Peças/jogador:** peças obtidas na fase por jogador, por raridade (C = comum, I = incomum, R = rara, E = épica, L = lendária).
- **Robustez:** com outra semente (777, 300 jogadores) o resultado é praticamente igual: 0,94 h de campanha, 72 corridas e fases com média entre 4,5 e 9,5 corridas.

## 8. Metas de ritmo: o que bateu

| Meta | Resultado | Status |
|---|---|---|
| Corrida de 25 a 50 s na tela | média de 42 s; p5 39,6 s; p95 45,7 s; máximo raro de 54,5 s | **bateu** (corridas acima de 50 s são raras: o p95 é 45,7 s) |
| Fase 1 vencível com o carro base em ~60% | 62,1% | **bateu** |
| Cada fase nova leva 3 a 10 corridas | média por fase de 4,5 a 9,5. Cauda: p90 de 12 a 20 nas fases 4, 5 e 9 | **bateu na média**; cerca de 10–15% dos jogadores passam de 10 corridas nas fases do meio |
| Jogo inteiro em 2 a 4 h | **1,0 h** (p90 de 1,4 h) | **não bateu** (motivo abaixo) |
| Primeira lendária entre as fases 7 e 10 | 78% na fase 8, 20% na fase 9, 2% na fase 10 e 0% sem nenhuma | **bateu** |
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

Nenhum campo obrigatório foi renomeado ou removido. A fase 1 tem `unlock.prevStageWins = 0` porque já começa liberada.

## 10. Propostas de mudança no motor

Todo o balanceamento acima usa as fórmulas atuais. As propostas são opcionais.

1. **Limitar a velocidade-alvo a ≥ 0**, por exemplo `alvo = potência × speedPerPower × max(0,2, 1 + noise·N)`.
   - Hoje o contrato permite alvo negativo. Com `noise` 0,30, em **1,2% das corridas** algum carro termina um segundo andando de ré.
   - Com o limite, daria para subir o `noise` para cerca de 0,45 (suposição: não simulado com o limite), o que deixa a curva de vitória mais suave e reduz a cauda de jogadores travados.
2. **Proteção contra azar no slot.** Com `"slot": "any"` sorteado em 25%, o jogador sem sorte demora para conseguir peça boa num slot específico. É a maior fonte da cauda p90 de 15–20 corridas nas fases 4–5 e 9.
   - Proposta: aceitar `"slot": "weakest"` nas tabelas, que daria a peça no slot com menor bônus equipado.
   - Alternativa: o motor sortear o slot com peso maior para o slot mais fraco.
3. **Meta de tempo total.** Se 2–4 h for prioridade, há duas saídas no motor ou no escopo:
   - aumentar o número de fases (cerca de 20 com o ritmo atual);
   - ou aceitar mais corridas por fase (variante da seção 8).

   Só aumentar o intervalo entre corridas não basta: com 30 s de intervalo, a campanha daria 76 × 72 s ≈ 1,5 h.
4. **Nitro fora da potência.** Como o boost não entra na potência, o guloso (e provavelmente o jogador) nunca melhora o turbo.
   - Proposta: incluir `boost` em `race.weights` com peso baixo (por exemplo 0,2), para que valha a pena subir o turbo.
   - Outra opção: mostrar na garagem a "chance de nitro" como benefício do turbo.
