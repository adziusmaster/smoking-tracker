# Owner-approved example data for the store screenshots (2026-09-28): the home capture's
# "cravings beaten" tile read 0 on the day it was taken. This paints a sample value over it in
# the app's own font and colours. Re-run after recapturing home.png:
#   python3 store-assets/_src/patch-shots.py
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
SRC = HERE / 'shots' / 'home.png'
OUT = HERE / 'shots' / 'home-sample.png'
SAMPLE = '23'

im = Image.open(SRC).convert('RGB')
# The third hero tile; its value digit is the white glyph in this box.
box = (715, 560, 900, 630)
white = [(x, y) for y in range(box[1], box[3]) for x in range(box[0], box[2]) if min(im.getpixel((x, y))) > 225]
if not white:
    raise SystemExit('No value digit found in the third tile — has the layout moved? Update `box`.')
x0, y0 = min(p[0] for p in white), min(p[1] for p in white)
x1, y1 = max(p[0] for p in white), max(p[1] for p in white)
tile = im.getpixel((x1 + 30, (y0 + y1) // 2))

draw = ImageDraw.Draw(im)
draw.rectangle((x0 - 4, y0 - 4, x1 + 4, y1 + 4), fill=tile)
font = ImageFont.truetype(str(ROOT / 'assets' / 'fonts' / 'Manrope_700Bold.ttf'), size=round((y1 - y0 + 1) / 0.72))
# Align the new digits' cap height with the old glyph's top-left.
bbox = draw.textbbox((0, 0), SAMPLE, font=font)
draw.text((x0 - bbox[0], y0 - bbox[1]), SAMPLE, font=font, fill=(255, 255, 255))
im.save(OUT)
print(f'patched value box {(x0, y0, x1, y1)} tile {tile} -> {OUT.name}')
