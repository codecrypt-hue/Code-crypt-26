"""Generate CodeCrypt brand assets derived from the supplied logo.png.

Produces:
  assets/img/codecrypt-mark.png      - shield emblem only, white background
  assets/img/codecrypt-logo.png      - full lockup (shield + wordmark), white background
  assets/img/codecrypt-watermark.png - shield, transparent background, brand gradient

The original logo.png is never modified.
"""
from PIL import Image
import os

SRC = "logo.png"
OUT = "assets/img"
os.makedirs(OUT, exist_ok=True)

im = Image.open(SRC).convert("RGB")
W, H = im.size
px = im.load()

def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]

def ink_rows():
    rows = []
    for y in range(H):
        if any(lum(px[x, y]) < 245 for x in range(W)):
            rows.append(y)
    return rows

rows = ink_rows()
# split into contiguous bands separated by >= 6 blank rows
bands, cur = [], [rows[0]]
for y in rows[1:]:
    if y - cur[-1] >= 6:
        bands.append((cur[0], cur[-1]))
        cur = [y]
    else:
        cur.append(y)
bands.append((cur[0], cur[-1]))
print("bands:", bands)

def content_bbox(y0, y1):
    xs, ys = [], []
    for y in range(y0, y1 + 1):
        for x in range(W):
            if lum(px[x, y]) < 245:
                xs.append(x); ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)

PAD = 6

def crop_save(y0, y1, path):
    x0, _, x1, _ = content_bbox(y0, y1)
    box = (max(0, x0 - PAD), max(0, y0 - PAD), min(W, x1 + PAD + 1), min(H, y1 + PAD + 1))
    im.crop(box).save(path, optimize=True)
    print(f"  {path}  {box}  -> {Image.open(path).size}")
    return box

shield_top, shield_bot = bands[0][0], bands[0][1]
word_top, word_bot = bands[1][0], bands[1][1]
print(f"shield rows {shield_top}-{shield_bot}, wordmark rows {word_top}-{word_bot}")

print("cropping:")
crop_save(shield_top, shield_bot, f"{OUT}/codecrypt-mark.png")
crop_save(shield_top, word_bot, f"{OUT}/codecrypt-logo.png")

# ---- watermark: transparent background + brand gradient ----
x0, _, x1, _ = content_bbox(shield_top, shield_bot)
box = (max(0, x0 - PAD), max(0, shield_top - PAD), min(W, x1 + PAD + 1), min(H, shield_bot + PAD + 1))
wm = Image.new("RGBA", (box[2] - box[0], box[3] - box[1]), (0, 0, 0, 0))
wpx = wm.load()
CYAN = (0x16, 0xD9, 0xE8)
VIOLET = (0xC7, 0x7D, 0xFF)
h = wm.size[1]
for y in range(h):
    t = y / max(1, h - 1)
    col = tuple(round(CYAN[i] + (VIOLET[i] - CYAN[i]) * t) for i in range(3))
    for x in range(wm.size[0]):
        L = lum(px[box[0] + x, box[1] + y])
        a = max(0.0, min(1.0, (248 - L) / 42.0))
        wpx[x, y] = (col[0], col[1], col[2], int(a * 255))
wm.save(f"{OUT}/codecrypt-watermark.png", optimize=True)
print(f"  {OUT}/codecrypt-watermark.png  {wm.size}")
