"""Letniskowo (spec 0081): wycina kafelki próbników i wizualizacje z plansz Fitout do tmp/letniskowo-styles/.
Układ plansz jest stały: siatka 6 stref x 4 kafelki (współrzędne przy 100 dpi), wizualizacje to trzy pasy strony w
pliku _ALL+VIZ. Nazwy plików kafelków biorą się z tego samego sluga co scripts/data/letniskowo-styles.ts (tileSlug).
Kafelki: WebP 96 px, deduplikacja po slugu. Wizualizacje: JPEG, kuchnia bez nakładki z tytułem planszy."""
import json, re, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FITOUT = ROOT / "_docs" / "letniskowo" / "Fitout"
OUT = ROOT / "tmp" / "letniskowo-styles"
VIZ_PDF = FITOUT / "FITOUT (EN) - (_ALL+VIZ) 20240513.pdf"

# Początek kafelków przy 100 dpi (strona 827 x 1170 px) i bok z marginesem na cień.
XS = [448, 533, 637, 721]
YS = [520, 630, 737, 843, 950, 1058]
INSET, SIDE = 6, 62
# Pasy wizualizacji jako ułamki wysokości strony: kuchnia (bez pasa z tytułem), sypialnia, łazienka.
BANDS = {"kitchen": (0.058, 0.350), "bedroom": (0.358, 0.665), "bathroom": (0.674, 0.998)}


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def render(pdf: Path, dpi: int, page: int, dest: Path) -> Image.Image:
    prefix = dest / f"p{page}"
    subprocess.run(["pdftoppm", "-r", str(dpi), "-f", str(page), "-l", str(page), "-png", str(pdf), str(prefix)], check=True)
    return Image.open(next(dest.glob(f"p{page}-*.png"))).convert("RGB")


def main(styles_json: Path):
    styles = json.loads(styles_json.read_text(encoding="utf-8"))
    (OUT / "swatches").mkdir(parents=True, exist_ok=True)
    (OUT / "viz").mkdir(parents=True, exist_ok=True)
    seen = set()
    for style in styles:
        with tempfile.TemporaryDirectory() as tmp:
            board = render(FITOUT / style["boardFile"], 200, 1, Path(tmp))
            k = 2  # 200 dpi to dwa razy 100 dpi
            for r, row in enumerate(style["rows"]):
                for c, tile in enumerate(row):
                    slug = tile
                    if slug in seen:
                        continue
                    seen.add(slug)
                    x, y = (XS[c] + INSET) * k, (YS[r] + INSET) * k
                    # Meble na wymiar mają na planszy oznaczenia "B" i "(A)" w dolnej części kafelka: bierzemy tylko górę.
                    side_h = round(SIDE * 0.6) if (r == 2 and c < 2) else SIDE
                    img = board.crop((x, y, x + SIDE * k, y + side_h * k)).resize((96, 96), Image.LANCZOS)
                    img.save(OUT / "swatches" / f"{slug}.webp", "WEBP", quality=80, method=6)
            viz = render(VIZ_PDF, 110, style["vizPage"], Path(tmp))
            for name, (a, b) in BANDS.items():
                crop = viz.crop((0, round(viz.height * a), viz.width, round(viz.height * b)))
                crop.save(OUT / "viz" / f"{style['key']}-{name}.jpg", "JPEG", quality=85, optimize=True)
        print(f"{style['key']}: kafelki i wizualizacje gotowe")
    print(f"Unikalnych kafelków: {len(seen)}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
