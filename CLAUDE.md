# Nitro Crew (nome provisório)

Jogo idle de corrida de rua em pixel art. O jogador é gerente de uma equipe; o carro corre sozinho as fases numa faixa horizontal, coleta caixas de prêmio e, ao final, recebe prêmios que melhoram as peças do carro.

## Idioma
Responda em português do Brasil.

## Stack
- HTML + JavaScript puro (módulos ES), sem build e sem dependências. Canvas 2D para a corrida, HTML/CSS para a garagem.
- Rodar local: `python -m http.server 8080` na raiz do repositório e abrir http://localhost:8080 (módulos ES não funcionam via `file://`).
- Publicação: GitHub Pages via `.github/workflows/pages.yml` a cada push na `main`.

## Divisão do trabalho
Leia `docs/contracts.md` antes de mexer em qualquer coisa. Ele define o que cada área entrega e o que o motor lê.
- Arte: agente `pixel-art-director` (`src/art/sprites.js`, `docs/style-guide.md`).
- Regras/balanceamento: agente `game-systems-designer` (`data/balance.json`, `docs/game-design.md`, `tools/simulate.py`).
- Motor/interface: `src/engine/*`, `src/ui/*`, `index.html`, `styles.css`.

## Regras
- Arte e nomes são originais: nada de personagens, marcas de carro, logos ou visual copiados de jogos existentes.
- Ao mudar uma fórmula no motor, atualize `docs/contracts.md` e `tools/simulate.py` no mesmo commit.
