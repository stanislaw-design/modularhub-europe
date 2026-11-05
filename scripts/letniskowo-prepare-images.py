"""Letniskowo (spec 0081): wyciąga zdjęcia, rendery i rzut z kart modeli do tmp/letniskowo/<model>/.
Wejście: _docs/letniskowo/karty produktowe EN/{comfort,premium}/*.pdf (poza repozytorium). Wyjście: JPEG do 1920 px.
Rzut to obraz z maską przezroczystości (smask), składany na białe tło; reszta to zdjęcia i rendery."""
import re, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "_docs" / "letniskowo" / "karty produktowe EN"
OUT = ROOT / "tmp" / "letniskowo"
MAX_W = 1920

def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

def listing(pdf: Path):
    rows = subprocess.run(["pdfimages", "-list", str(pdf)], capture_output=True, text=True, check=True).stdout.splitlines()[2:]
    out = []
    for r in rows:
        p = r.split()
        out.append({"num": int(p[1]), "type": p[2], "w": int(p[3]), "h": int(p[4])})
    return out

def save_jpeg(img: Image.Image, dest: Path):
    img = img.convert("RGB")
    if img.width > MAX_W:
        img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "JPEG", quality=85, optimize=True)

def process(pdf: Path):
    key = slug(pdf.stem.replace(" EN", ""))
    items = listing(pdf)
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["pdfimages", "-png", str(pdf), str(Path(tmp) / "i")], check=True)
        files = {int(f.stem.split("-")[1]): f for f in Path(tmp).glob("i-*.png")}
        has_mask = {items[idx]["num"] for idx in range(len(items) - 1) if items[idx + 1]["type"] == "smask"}
        photos, plans = [], []
        for i in items:
            if i["type"] != "image" or i["w"] < 350:
                continue
            # Rzut ma stałe proporcje karty (ok. 2,15:1) i szerokość co najmniej 900 px.
            is_plan = i["w"] >= 900 and 2.0 <= i["w"] / i["h"] <= 2.3
            (plans if is_plan else photos).append(i)
        photos += plans[1:]
        out_dir = OUT / key

        def flatten(num: int) -> Image.Image:
            img = Image.open(files[num]).convert("RGBA")
            if num in has_mask and num + 1 in files:
                img.putalpha(Image.open(files[num + 1]).convert("L").resize(img.size))
            bg = Image.new("RGB", img.size, "white")
            bg.paste(img, mask=img.split()[3])
            return bg

        for n, i in enumerate(photos):
            save_jpeg(flatten(i["num"]), out_dir / f"{key}-{n + 1}.jpg")
        for i in plans[:1]:
            save_jpeg(flatten(i["num"]), out_dir / f"{key}-plan.jpg")
        print(f"{key}: {len(photos)} zdjec, {len(plans)} rzut")

if __name__ == "__main__":
    for line in ("comfort", "premium"):
        for pdf in sorted((SRC / line).glob("*.pdf")):
            process(pdf)
