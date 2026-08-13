from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/brand/boards/brand-guidelines-v3-board.png"
LOGO = ROOT / "assets/brand/logo/v3/display/logo-modularhub-display-v3.png"

W, H = 1600, 1000
NAVY = "#10263D"
DEEP = "#081A2D"
BLUE = "#175CD3"
ELECTRIC = "#0F5FE7"
WARM = "#F4F1EA"
STEEL = "#D9E0E7"
GRAPHITE = "#344657"
LIGHT_BLUE = "#7FAAFF"
MUTED = "#B6C2CC"


def font(size: int, bold: bool = False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def spaced(draw, xy, value, fnt, fill, spacing=3):
    x, y = xy
    for char in value:
        draw.text((x, y), char, font=fnt, fill=fill)
        x += draw.textlength(char, font=fnt) + spacing


def panel(draw, box, fill, outline=None):
    draw.rounded_rectangle(box, radius=8, fill=fill, outline=outline, width=1)


img = Image.new("RGB", (W, H), DEEP)
d = ImageDraw.Draw(img)
d.rectangle((0, 0, 12, H), fill=BLUE)

# Header
spaced(d, (40, 35), "MODULARHUB / BRAND SYSTEM 03", font(12, True), LIGHT_BLUE, 2)
d.text((40, 70), "Engineered confidence.", font=font(48, True), fill=WARM)
right_label = "11.08.2026 / WORKING IDENTITY"
right_x = 1558 - d.textlength(right_label, font=font(12, True))
spaced(d, (right_x, 35), right_label, font(12, True), "#8798A8", 1)
sub = "Architectural ambition. Documentary precision."
d.text((1558 - d.textlength(sub, font=font(17)), 91), sub, font=font(17), fill=MUTED)

# Hero logo panel — exact v3 master, proportionally fitted
panel(d, (40, 164, 864, 664), "#FFFFFF")
logo = Image.open(LOGO).convert("RGB")
logo.thumbnail((790, 474), Image.Resampling.LANCZOS)
img.paste(logo, (40 + (824 - logo.width) // 2, 168 + (462 - logo.height) // 2))
d.rounded_rectangle((64, 188, 238, 216), radius=2, fill=NAVY)
spaced(d, (78, 195), "DISPLAY MARK / V3", font(11, True), WARM, 1)
spaced(d, (64, 636), "LARGE-SCALE BRAND EXPRESSION · HERO · EXHIBITION · COVER", font(10), GRAPHITE, 1)

# Palette
panel(d, (880, 164, 1560, 402), WARM)
spaced(d, (910, 186), "CORE PALETTE", font(12, True), NAVY, 2)
d.text((910, 216), "Navy controls. Blue moves. Warm white explains.", font=font(14), fill=GRAPHITE)
swatches = [(NAVY, "#10263D"), (DEEP, "#081A2D"), (BLUE, "#175CD3"), (ELECTRIC, "#0F5FE7"), (STEEL, "#D9E0E7")]
for i, (color, label) in enumerate(swatches):
    x = 910 + i * 128
    d.rounded_rectangle((x, 248, x + (108 if i == 4 else 116), 334), radius=4, fill=color, outline="#314558" if i == 1 else None)
    d.text((x, 348), label, font=font(10), fill=NAVY)

# Typography
panel(d, (880, 418, 1560, 664), NAVY, "#294259")
spaced(d, (910, 440), "TYPE SYSTEM", font(12, True), LIGHT_BLUE, 2)
d.text((910, 480), "Precise by design.", font=font(41, True), fill=WARM)
d.text((910, 532), "Inter keeps complex decisions readable.", font=font(17), fill="#C9D2DA")
d.line((910, 579, 1530, 579), fill="#395066")
d.text((910, 594), "DE-BY / 248,400 EUR / 12.40 × 4.15 M", font=font(16, True), fill=WARM)
spaced(d, (910, 632), "MONTSERRAT 700 · INTER 400–600 · IBM PLEX MONO 400–600", font(10), LIGHT_BLUE, 1)

# Proposition
panel(d, (40, 680, 598, 938), NAVY, "#294259")
d.rounded_rectangle((40, 680, 48, 938), radius=4, fill=BLUE)
spaced(d, (76, 704), "MASTER PROPOSITION", font(12, True), LIGHT_BLUE, 2)
d.text((76, 752), "One project.", font=font(32, True), fill=WARM)
d.text((76, 792), "Different rules.", font=font(32, True), fill=WARM)
d.text((76, 832), "One clear path.", font=font(32, True), fill="#4C8CFF")
d.text((76, 892), "Promise the method — not an outcome without conditions.", font=font(14), fill=MUTED)

# Dual identity architecture
panel(d, (614, 680, 1028, 938), WARM)
spaced(d, (642, 704), "TWO LEVELS / ONE SYSTEM", font(12, True), NAVY, 2)
d.rounded_rectangle((648, 752, 746, 850), radius=8, fill=NAVY)
d.text((670, 770), "MH", font=font(29, True), fill="#4C8CFF")
d.text((786, 750), "V3 DISPLAY", font=font(17, True), fill=NAVY)
d.text((786, 778), "Hero, covers, stands", font=font(13), fill=GRAPHITE)
d.line((786, 812, 990, 812), fill=STEEL)
d.text((786, 824), "V2 OPERATIONAL", font=font(17, True), fill=NAVY)
d.text((786, 852), "App, favicon, dossier, mono", font=font(13), fill=GRAPHITE)
spaced(d, (642, 906), "3D BUILDS PRESENCE · FLAT BUILDS CLARITY", font(10), BLUE, 1)

# Product language
panel(d, (1044, 680, 1560, 938), WARM)
spaced(d, (1072, 704), "PRODUCT LANGUAGE", font(12, True), NAVY, 2)
d.text((1072, 738), "Brand blue is action. Status colors are evidence.", font=font(14), fill=GRAPHITE)
d.rounded_rectangle((1072, 778, 1204, 820), radius=4, fill=BLUE)
d.text((1102, 791), "CONTINUE", font=font(13, True), fill="#FFFFFF")
chips = [(1218, 1312, "#E7F3EC", "#14804A", "OK"), (1324, 1428, "#F7EEDD", "#B76E00", "CONDITION"), (1440, 1532, "#F8E7E7", "#C43D3D", "BLOCK")]
for x1, x2, bg, dot, label in chips:
    d.rounded_rectangle((x1, 778, x2, 820), radius=4, fill=bg)
    d.ellipse((x1 + 12, 795, x1 + 22, 805), fill=dot)
    d.text((x1 + 28, 790), label, font=font(10, True), fill=dot)
d.rounded_rectangle((1072, 844, 1532, 906), radius=4, fill="#FFFFFF", outline=STEEL)
spaced(d, (1092, 855), "NEXT REQUIREMENT", font(10), GRAPHITE, 1)
d.text((1092, 878), "Structural calculation · Snow zone 2", font=font(14, True), fill=NAVY)

# Footer
spaced(d, (40, 966), "MODULARHUB EUROPE · VISUAL SYSTEM V3 · NAME REMAINS WORKING", font(10), "#6F8292", 1)
footer = "WARM WHITE 55 / NAVY 25 / BLUE 15 / SUPPORT 05"
d.text((1560 - d.textlength(footer, font=font(10)), 966), footer, font=font(10), fill="#6F8292")

OUT.parent.mkdir(parents=True, exist_ok=True)
img.save(OUT, quality=95)
print(OUT)
