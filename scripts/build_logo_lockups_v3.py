from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "assets/brand/logo/v3/display/logo-modularhub-display-v3.png"
BASE = ROOT / "assets/brand/logo/v3"
LOCKUPS = BASE / "lockups"
SYMBOLS = BASE / "symbol"
WORDMARKS = BASE / "wordmark"
PREVIEWS = BASE / "previews"

WARM = (244, 241, 234, 255)
WHITE = (255, 255, 255, 255)
NAVY = (16, 38, 61, 255)
DEEP = (8, 26, 45, 255)
BLUE = (23, 92, 211, 255)
STEEL = (217, 224, 231, 255)
GRAPHITE = (52, 70, 87, 255)

for folder in (LOCKUPS, SYMBOLS, WORDMARKS, PREVIEWS):
    folder.mkdir(parents=True, exist_ok=True)


def font(size, bold=False):
    filename = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / filename), size)


def remove_near_white(source):
    """Build a soft alpha matte from distance to white; keeps exact source pixels."""
    rgba = source.convert("RGBA")
    px = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, _ = px[x, y]
            distance = max(255 - r, 255 - g, 255 - b)
            alpha = max(0, min(255, (distance - 3) * 7))
            px[x, y] = (r, g, b, alpha)
    return rgba


def trim(source, padding=0):
    box = source.getchannel("A").getbbox()
    if not box:
        return source
    left = max(0, box[0] - padding)
    top = max(0, box[1] - padding)
    right = min(source.width, box[2] + padding)
    bottom = min(source.height, box[3] + padding)
    return source.crop((left, top, right, bottom))


def fit(source, max_size):
    copy = source.copy()
    copy.thumbnail(max_size, Image.Resampling.LANCZOS)
    return copy


def place(canvas, asset, box, align="center"):
    x, y, w, h = box
    scaled = fit(asset, (w, h))
    if align == "left":
        px = x
    else:
        px = x + (w - scaled.width) // 2
    py = y + (h - scaled.height) // 2
    canvas.alpha_composite(scaled, (px, py))


def save_on_background(asset, size, box, path, background=WARM):
    canvas = Image.new("RGBA", size, background)
    place(canvas, asset, box)
    canvas.convert("RGB").save(path, quality=96)


master = Image.open(MASTER).convert("RGB")

# Fixed source regions preserve the exact geometry from the approved display master.
symbol_source = master.crop((370, 85, 1165, 650))
wordmark_source = master.crop((180, 628, 1360, 905))
name_source = master.crop((210, 635, 1335, 803))
stacked_source = master.crop((150, 65, 1385, 920))

symbol = trim(remove_near_white(symbol_source), 12)
wordmark = trim(remove_near_white(wordmark_source), 12)
name = trim(remove_near_white(name_source), 12)
stacked = trim(remove_near_white(stacked_source), 16)

# Standalone transparent building blocks.
symbol.save(SYMBOLS / "logo-symbol-display-v3-transparent.png")
wordmark.save(WORDMARKS / "logo-wordmark-europe-v3-transparent.png")
name.save(WORDMARKS / "logo-wordmark-name-v3-transparent.png")

# 01 — Stacked primary
save_on_background(stacked, (1536, 1024), (105, 70, 1326, 884), LOCKUPS / "logo-stacked-primary-v3.png")
stacked_canvas = Image.new("RGBA", (1536, 1024), (0, 0, 0, 0))
place(stacked_canvas, stacked, (105, 70, 1326, 884))
stacked_canvas.save(LOCKUPS / "logo-stacked-primary-v3-transparent.png")

# 02 — Horizontal primary: architectural symbol left, full descriptor right.
horizontal = Image.new("RGBA", (1920, 720), WARM)
place(horizontal, symbol, (80, 74, 710, 572))
place(horizontal, wordmark, (795, 190, 1045, 340))
horizontal.convert("RGB").save(LOCKUPS / "logo-horizontal-primary-v3.png", quality=96)

horizontal_alpha = Image.new("RGBA", (1920, 720), (0, 0, 0, 0))
place(horizontal_alpha, symbol, (80, 74, 710, 572))
place(horizontal_alpha, wordmark, (795, 190, 1045, 340))
horizontal_alpha.save(LOCKUPS / "logo-horizontal-primary-v3-transparent.png")

# 03 — Horizontal compact: tighter symbol and name, for wide banners.
compact = Image.new("RGBA", (1920, 560), WARM)
place(compact, symbol, (100, 60, 560, 440))
place(compact, name, (690, 160, 1110, 240))
compact.convert("RGB").save(LOCKUPS / "logo-horizontal-compact-v3.png", quality=96)

# 04 — Compact stacked: tighter vertical lockup for square placements.
compact_stacked = Image.new("RGBA", (1200, 1200), WARM)
place(compact_stacked, symbol, (190, 70, 820, 670))
place(compact_stacked, wordmark, (120, 755, 960, 270))
compact_stacked.convert("RGB").save(LOCKUPS / "logo-compact-stacked-v3.png", quality=96)

# 05 — Symbol-only and wordmark-only presentation files.
save_on_background(symbol, (1024, 1024), (112, 146, 800, 730), SYMBOLS / "logo-symbol-display-v3.png")
save_on_background(wordmark, (1600, 520), (100, 90, 1400, 340), WORDMARKS / "logo-wordmark-europe-v3.png")
save_on_background(name, (1600, 420), (100, 90, 1400, 240), WORDMARKS / "logo-wordmark-name-v3.png")

# Review board
board = Image.new("RGBA", (1800, 1280), DEEP)
d = ImageDraw.Draw(board)
d.rectangle((0, 0, 14, 1280), fill=BLUE)
d.text((52, 34), "MODULARHUB / LOGO LOCKUPS V3", font=font(14, True), fill=(127, 170, 255, 255))
d.text((52, 74), "One identity. Different levels of presence.", font=font(38, True), fill=WARM)
d.text((1748, 45), "WORKING NAME / 11.08.2026", anchor="ra", font=font(12, True), fill=(135, 152, 168, 255))

cards = [
    ((52, 142, 1118, 640), "01 / STACKED PRIMARY", stacked, (120, 60, 826, 380)),
    ((1138, 142, 1748, 640), "04 / SYMBOL", symbol, (120, 70, 370, 330)),
    ((52, 660, 1748, 930), "02 / HORIZONTAL PRIMARY", horizontal_alpha, (80, 36, 1536, 190)),
    ((52, 950, 896, 1228), "03 / HORIZONTAL COMPACT", compact, (55, 72, 734, 130)),
    ((916, 950, 1748, 1228), "05 / WORDMARK", wordmark, (55, 82, 722, 120)),
]

for box, label, asset, local in cards:
    x1, y1, x2, y2 = box
    d.rounded_rectangle(box, radius=8, fill=WARM)
    d.text((x1 + 22, y1 + 18), label, font=font(11, True), fill=NAVY)
    lx, ly, lw, lh = local
    place(board, asset, (x1 + lx, y1 + ly, lw, lh))

d.text((52, 1250), "DISPLAY V3: HERO / COVER / STAND    ·    OPERATIONAL V2: APP / FAVICON / DOSSIER / MONO", font=font(11), fill=(111, 130, 146, 255))
board.convert("RGB").save(PREVIEWS / "logo-lockups-v3-board.png", quality=96)

print("Created v3 logo lockups in", BASE)
