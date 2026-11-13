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
    "icon_ui_upgrade": (10, 10, 1, 1),
    "icon_ui_equip": (10, 10, 1, 1),
    "fx_boost": (8, 6, 2, 3),
    "finish_flag": (8, 60, 1, 1),
}
THEME_KEYS = ["font", "bg", "panel", "panelBorder", "text", "textDim", "accent", "good", "bad", "sky", "rarity"]
RARITIES = ["common", "uncommon", "rare", "epic", "legendary"]
HEX = re.compile(r"^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$")
TRANSPARENT = {".", " "}

# Seção 2.1 do contrato: canais reservados do carro do jogador e catálogo.
RESERVED = {
    "1": "paint sombra", "2": "paint base", "3": "paint luz", "4": "paint faixa", "5": "paint luz da faixa",
    "6": "glass base", "7": "glass reflexo", "8": "headlight base", "9": "headlight núcleo",
    "e": "rims base", "E": "rims brilho",
}
CHANNEL_KEYS = {"paint": "12345", "glass": "67", "headlight": "89", "rims": "eE"}
CUSTOM_IDS = {
    "paint": ["stock", "red", "blue", "green", "purple", "white", "matte_black", "gold"],
    "glass": ["stock", "smoke", "mirror", "emerald"],
    "headlight": ["stock", "xenon", "ice_blue", "violet"],
    "rims": ["stock", "chrome", "black", "gold", "bronze"],
    "neon": ["none", "pink", "cyan", "green", "purple", "orange"],
    "spoiler": ["wing", "none", "ducktail", "gt"],
}


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


def load_custom(path=SPRITES_JS):
    return js_to_json(_block(Path(path).read_text(encoding="utf-8"), "CUSTOM"))


def is_player_car(key):
    return key == "car_player" or key.startswith("car_player_")


def validate_custom(custom, sprites):
    """Seção 2.1: canais, mounts, aerofólios e catálogo CUSTOM.options."""
    errs = []
    opts = (custom or {}).get("options")
    if not isinstance(opts, dict):
        return ["CUSTOM.options ausente"]
    for cat, ids in CUSTOM_IDS.items():
        lst = opts.get(cat)
        if not isinstance(lst, list):
            errs.append(f"CUSTOM.options.{cat} ausente")
            continue
        got = [o.get("id") for o in lst]
        if got != ids:
            errs.append(f"CUSTOM.options.{cat}: ids {got}, esperado {ids} (nesta ordem)")
        for o in lst:
            oid = o.get("id")
            if not o.get("name"):
                errs.append(f"CUSTOM.{cat}.{oid}: sem name")
            if cat in CHANNEL_KEYS:
                cols = o.get("colors", {})
                if sorted(cols) != sorted(CHANNEL_KEYS[cat]):
                    errs.append(f"CUSTOM.{cat}.{oid}: colors {sorted(cols)}, esperado {sorted(CHANNEL_KEYS[cat])}")
                for k, v in cols.items():
                    if not HEX.match(str(v)):
                        errs.append(f"CUSTOM.{cat}.{oid}.{k}: hex inválido {v!r}")
            elif cat == "neon" and oid != "none":
                cols = o.get("colors", {})
                for k in ("base", "light"):
                    if not HEX.match(str(cols.get(k, ""))):
                        errs.append(f"CUSTOM.neon.{oid}.{k} ausente ou inválido")
            elif cat == "spoiler" and oid != "none":
                spr = o.get("sprite")
                if spr not in sprites:
                    errs.append(f"CUSTOM.spoiler.{oid}: sprite {spr!r} não existe")
    # aerofólios
    for key, s in sprites.items():
        if not key.startswith("spoiler_"):
            continue
        a = s.get("anchor")
        if not (isinstance(a, list) and len(a) == 2 and all(isinstance(v, int) for v in a)
                and 0 <= a[0] < s["w"] and 0 <= a[1] < s["h"]):
            errs.append(f"{key}: anchor [ax, ay] ausente ou fora do sprite")
        used = {c for fr in s["frames"] for row in fr for c in row}
        bad = used & (set(RESERVED) - set("12345"))
        if bad:
            errs.append(f"{key}: aerofólio só pode usar o canal paint (1-5), usa {sorted(bad)}")
    # carros do jogador: mounts; demais sprites: sem letras reservadas
    for key, s in sprites.items():
        used = {c for fr in s["frames"] for row in fr for c in row}
        if is_player_car(key):
            m = s.get("mounts") or {}
            sp, ug = m.get("spoiler"), m.get("underglow")
            if not (isinstance(sp, list) and len(sp) == 2 and 0 <= sp[0] < s["w"] and 0 <= sp[1] < s["h"]):
                errs.append(f"{key}: mounts.spoiler [x, y] ausente ou fora do sprite")
            if not (isinstance(ug, list) and len(ug) == 3 and 0 <= ug[0] <= ug[1] < s["w"] and 0 <= ug[2] < s["h"]):
                errs.append(f"{key}: mounts.underglow [x0, x1, y] ausente ou inválido")
            elif any(fr[ug[2]][x] not in TRANSPARENT for fr in s["frames"] for x in range(ug[0], ug[1] + 1)):
                errs.append(f"{key}: a linha do néon (underglow) tem que estar vazia no carro")
            if not used & set("12345"):
                errs.append(f"{key}: carro do jogador sem canal paint")
        elif not key.startswith("spoiler_"):
            bad = used & set(RESERVED)
            if bad:
                errs.append(f"{key}: usa letras reservadas do carro do jogador {sorted(bad)}")
    return errs


def validate(palette, theme, sprites):
    errs, warns = [], []
    # paleta
    for k, v in palette.items():
        if len(k) != 1 or k in TRANSPARENT:
            errs.append(f"PALETTE: chave inválida {k!r}")
        if not HEX.match(v):
            errs.append(f"PALETTE.{k}: hex inválido {v!r}")
    base_colors = [k for k in palette if k not in RESERVED]
    if not 16 <= len(base_colors) <= 24:
        warns.append(f"PALETTE tem {len(base_colors)} cores-base fora dos canais (guia pede 16-24)")
    for ch in RESERVED:
        if ch not in palette:
            errs.append(f"PALETTE: letra reservada {ch!r} ({RESERVED[ch]}) ausente")
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
        custom = load_custom()
    except Exception as e:  # noqa: BLE001
        print(f"ERRO ao ler {SPRITES_JS}: {e}")
        return 1
    errs, warns = validate(palette, theme, sprites)
    errs += validate_custom(custom, sprites)
    for w in warns:
        print("aviso:", w)
    for e in errs:
        print("ERRO:", e)
    extras = sorted(set(sprites) - set(REQUIRED))
    print(f"{len(sprites)} sprites ({len(REQUIRED)} obrigatórios, extras: {', '.join(extras) or 'nenhum'}), "
          f"{len(palette) - len(RESERVED)} cores-base + {len(RESERVED)} canais reservados na paleta; "
          f"CUSTOM com {sum(len(v) for v in custom['options'].values())} opções.")
    print("OK" if not errs else f"FALHOU: {len(errs)} erro(s)")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
