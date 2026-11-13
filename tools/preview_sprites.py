"""Exporta docs/sprite-sheet.png (4x) com todos os sprites e frames, para revisão humana.

Uso: python tools/preview_sprites.py [escala]
Só biblioteca padrão (PNG escrito com zlib + struct). Inclui uma cena de teste
montada como o motor desenha (céu, skyline, pista, carros nas 4 pistas).
"""
import struct
import sys
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_sprites import load, ROOT  # noqa: E402

OUT = ROOT / "docs" / "sprite-sheet.png"
BG = (40, 42, 54)
CHECK = (52, 55, 70)


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [[BG if ((x // 4 + y // 4) % 2) else CHECK for x in range(w)] for y in range(h)]

    def fill(self, x0, y0, w, h, rgb):
        for y in range(max(0, y0), min(self.h, y0 + h)):
            for x in range(max(0, x0), min(self.w, x0 + w)):
                self.px[y][x] = rgb

    def blit(self, rows, x0, y0, pal):
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch in ". ":
                    continue
                X, Y = x0 + x, y0 + y
                if 0 <= X < self.w and 0 <= Y < self.h:
                    self.px[Y][X] = pal[ch]

    def png(self, path, scale):
        raw = bytearray()
        for row in self.px:
            line = bytearray(b"\x00")
            for rgb in row:
                line += bytes(rgb) * scale
            raw += bytes(line) * scale
        def chunk(t, d):
            return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
        ihdr = struct.pack(">IIBBBBB", self.w * scale, self.h * scale, 8, 2, 0, 0, 0)
        data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
        Path(path).write_bytes(data)


def main():
    scale = int(sys.argv[1]) if len(sys.argv) > 1 else 4
    palette, theme, sprites = load()
    pal = {k: hex_rgb(v) for k, v in palette.items()}
    sky = hex_rgb(theme["sky"])
    pad = 4

    # layout: cena de teste no topo, depois cada sprite numa linha com seus frames
    scene_w, scene_h = 240, 108
    rows_layout = []
    y = pad + scene_h + pad + 12 + pad  # espaço para a faixa de paleta
    width = scene_w + 2 * pad
    for key, s in sprites.items():
        if key in ("road", "skyline_far", "skyline_near", "finish_flag"):
            continue
        rows_layout.append((key, s, y))
        width = max(width, pad + len(s["frames"]) * (s["w"] + pad))
        y += s["h"] + pad
    # tiras grandes lado a lado
    big = [k for k in ("skyline_far", "skyline_near", "road", "finish_flag") if k in sprites]
    bx, by = pad, y
    big_h = max(sprites[k]["h"] for k in big)
    width = max(width, pad + sum(sprites[k]["w"] + pad for k in big))
    height = by + big_h + pad

    cv = Canvas(width, height)

    # cena de teste
    sx0, sy0 = pad, pad
    cv.fill(sx0, sy0, scene_w, scene_h, sky)
    def tile(key, y_off, x_shift=0):
        s = sprites[key]
        fr = s["frames"][0]
        x = -x_shift
        while x < scene_w:
            for yy, row in enumerate(fr):
                for xx, ch in enumerate(row):
                    X = x + xx
                    if ch in ". " or not (0 <= X < scene_w):
                        continue
                    cv.px[sy0 + y_off + yy][sx0 + X] = pal[ch]
            x += s["w"]
    tile("skyline_far", 0, 10)
    tile("skyline_near", 0, 30)
    tile("road", 48)
    cv.blit(sprites["finish_flag"]["frames"][0], sx0 + 200, sy0 + 48, pal)
    lanes = [("car_rival_a", 0, 140), ("car_rival_b", 1, 90), ("car_player", 2, 120), ("car_rival_c", 3, 60)]
    for key, lane, x in lanes:
        if key in sprites:
            if key == "car_player" and "fx_boost" in sprites:
                cv.blit(sprites["fx_boost"]["frames"][1], sx0 + x - 8, sy0 + 48 + lane * 15 + 6, pal)
            cv.blit(sprites[key]["frames"][0], sx0 + x, sy0 + 48 + lane * 15, pal)
    for i, key in enumerate(["crate_common", "crate_rare", "crate_legendary"]):
        cv.blit(sprites[key]["frames"][-1], sx0 + 165 + i * 12, sy0 + 48 + 2 * 15 + 2, pal)
    cv.blit(sprites["coin"]["frames"][0], sx0 + 20, sy0 + 48 + 2 * 15 + 4, pal)

    # faixa de paleta
    py = pad + scene_h + pad
    for i, rgb in enumerate(pal.values()):
        cv.fill(pad + i * 10, py, 9, 12, rgb)

    for key, s, y in rows_layout:
        for fi, fr in enumerate(s["frames"]):
            cv.blit(fr, pad + fi * (s["w"] + pad), y, pal)
    for k in big:
        cv.fill(bx, by, sprites[k]["w"], sprites[k]["h"], sky)
        cv.blit(sprites[k]["frames"][0], bx, by, pal)
        bx += sprites[k]["w"] + pad

    OUT.parent.mkdir(parents=True, exist_ok=True)
    cv.png(OUT, scale)
    print(f"gerado {OUT} ({width * scale}x{height * scale}, {scale}x)")


if __name__ == "__main__":
    main()
