"""Valida src/art/sprites.js contra docs/contracts.md (seção 2).

Uso: python tools/validate_sprites.py   (sai com código 1 se houver erro)
Sem Node: o módulo JS é convertido para JSON com regex simples. Mantenha o
formato do arquivo (chaves sem aspas, strings em aspas simples, comentários //).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPRITES_JS = ROOT / "src" / "art" / "sprites.js"

# chave: (w, h, min_frames, max_frames)
REQUIRED = {
    "car_player": (32, 14, 2, None),
    "car_rival_a": (32, 14, 2, None),
    "car_rival_b": (32, 14, 2, None),
    "car_rival_c": (32, 14, 2, None),
    "road": (32, 60, 1, 1),
    "skyline_far": (64, 48, 1, 1),
    "skyline_near": (64, 48, 1, 1),
    "crate_common": (10, 10, 1, 2),
    "crate_uncommon": (10, 10, 1, 2),
    "crate_rare": (10, 10, 1, 2),
    "crate_epic": (10, 10, 1, 2),
    "crate_legendary": (10, 10, 1, 2),
    "coin": (6, 6, 4, 4),
    "icon_engine": (12, 12, 1, 1),
    "icon_transmission": (12, 12, 1, 1),
    "icon_tires": (12, 12, 1, 1),
    "icon_turbo": (12, 12, 1, 1),
    "icon_stat_topSpeed": (12, 12, 1, 1),
    "icon_stat_accel": (12, 12, 1, 1),
    "icon_stat_grip": (12, 12, 1, 1),
    "icon_stat_boost": (12, 12, 1, 1),
    "fx_boost": (8, 6, 2, 3),
    "finish_flag": (8, 60, 1, 1),
}
THEME_KEYS = ["font", "bg", "panel", "panelBorder", "text", "textDim", "accent", "good", "bad", "sky", "rarity"]
RARITIES = ["common", "uncommon", "rare", "epic", "legendary"]
HEX = re.compile(r"^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$")
TRANSPARENT = {".", " "}


def _block(src, name):
    m = re.search(r"export\s+const\s+" + name + r"\s*=\s*(\{.*?\n\});", src, re.S)
    if not m:
        raise ValueError(f"export const {name} não encontrado")
    return m.group(1)


def js_to_json(obj_src):
    s = re.sub(r"//[^\n]*", "", obj_src)                      # comentários de linha
    s = re.sub(r"'([^'\n]*)'", lambda m: json.dumps(m.group(1)), s)  # aspas simples -> duplas
    s = re.sub(r"([{,]\s*)([A-Za-z_$][\w$]*)\s*:", r'\1"\2":', s)    # chaves sem aspas
    s = re.sub(r",(\s*[}\]])", r"\1", s)                      # vírgulas finais
    return json.loads(s)


def load(path=SPRITES_JS):
    src = Path(path).read_text(encoding="utf-8")
    return js_to_json(_block(src, "PALETTE")), js_to_json(_block(src, "THEME")), js_to_json(_block(src, "SPRITES"))


def validate(palette, theme, sprites):
    errs, warns = [], []
    # paleta
    for k, v in palette.items():
        if len(k) != 1 or k in TRANSPARENT:
            errs.append(f"PALETTE: chave inválida {k!r}")
        if not HEX.match(v):
            errs.append(f"PALETTE.{k}: hex inválido {v!r}")
    if not 16 <= len(palette) <= 24:
        warns.append(f"PALETTE tem {len(palette)} cores (guia pede 16-24)")
    # tema
    for k in THEME_KEYS:
        if k not in theme:
            errs.append(f"THEME.{k} ausente")
    for k, v in theme.items():
        if k not in ("font", "rarity") and isinstance(v, str) and not HEX.match(v):
            errs.append(f"THEME.{k}: hex inválido {v!r}")
    for r in RARITIES:
        if not HEX.match(str(theme.get("rarity", {}).get(r, ""))):
            errs.append(f"THEME.rarity.{r} ausente ou inválido")
    # obrigatórios
    for key, (w, h, fmin, fmax) in REQUIRED.items():
        s = sprites.get(key)
        if s is None:
            errs.append(f"SPRITES.{key} ausente")
            continue
        if (s.get("w"), s.get("h")) != (w, h):
            errs.append(f"{key}: tamanho {s.get('w')}x{s.get('h')}, esperado {w}x{h}")
        n = len(s.get("frames", []))
        if n < fmin or (fmax is not None and n > fmax):
            errs.append(f"{key}: {n} frames, esperado {fmin}..{fmax or 'n'}")
    # todos os sprites (inclui extras)
    for key, s in sprites.items():
        w, h, frames = s.get("w"), s.get("h"), s.get("frames")
        if not isinstance(w, int) or not isinstance(h, int) or not frames:
            errs.append(f"{key}: w/h/frames ausentes")
            continue
        if "fps" in s and not (isinstance(s["fps"], (int, float)) and s["fps"] > 0):
            errs.append(f"{key}: fps inválido")
        for fi, fr in enumerate(frames):
            if len(fr) != h:
                errs.append(f"{key}[{fi}]: {len(fr)} linhas, esperado {h}")
            for yi, row in enumerate(fr):
                if len(row) != w:
                    errs.append(f"{key}[{fi}] linha {yi}: {len(row)} colunas, esperado {w}")
                bad = {c for c in row if c not in TRANSPARENT and c not in palette}
                if bad:
                    errs.append(f"{key}[{fi}] linha {yi}: letras fora da paleta {sorted(bad)}")
            if all(c in TRANSPARENT for row in fr for c in row):
                warns.append(f"{key}[{fi}]: frame totalmente transparente")
    return errs, warns


def main():
    try:
        palette, theme, sprites = load()
    except Exception as e:  # noqa: BLE001
        print(f"ERRO ao ler {SPRITES_JS}: {e}")
        return 1
    errs, warns = validate(palette, theme, sprites)
    for w in warns:
        print("aviso:", w)
    for e in errs:
        print("ERRO:", e)
    extras = sorted(set(sprites) - set(REQUIRED))
    print(f"{len(sprites)} sprites ({len(REQUIRED)} obrigatórios, extras: {', '.join(extras) or 'nenhum'}), "
          f"{len(palette)} cores na paleta.")
    print("OK" if not errs else f"FALHOU: {len(errs)} erro(s)")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
