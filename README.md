# Nitro Crew

Jogo idle de corrida de rua em pixel art. Você é o gerente da equipe: o carro corre sozinho, coleta caixas de prêmio na pista e, no fim de cada corrida, ganha moedas e peças para melhorar motor, câmbio, pneus e turbo.

## Rodar localmente

```bash
python -m http.server 8080
```

Abra http://localhost:8080.

## Estrutura

| Caminho | O que é |
|---|---|
| `docs/contracts.md` | contrato entre arte, regras e motor (leia primeiro) |
| `docs/style-guide.md` | guia visual |
| `docs/game-design.md` | regras, progressão, probabilidades |
| `src/art/sprites.js` | paleta, tema e sprites (grades de pixels) |
| `data/balance.json` | todos os números do jogo |
| `src/engine/` | simulação da corrida, economia, save |
| `src/ui/` | garagem, fases e registro |
| `tools/` | validação de sprites, prévia e simulador de balanceamento |
| `.claude/agents/` | agentes do projeto (`pixel-art-director`, `game-systems-designer`) |

## Publicação

Cada push na `main` publica no GitHub Pages (`.github/workflows/pages.yml`). Ative em *Settings → Pages → Source: GitHub Actions*.
