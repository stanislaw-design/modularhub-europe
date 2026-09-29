from pathlib import Path
import re
import unicodedata
import pdfplumber

WINNER_FILLS = {
    2015: {(0.612, 0.761, 0.898)},
    2016: {(0.608, 0.761, 0.902), (1.0, 0.753, 0.0)},
    2017: {(0.612, 0.761, 0.898), (1.0, 0.851, 0.4)},
    2018: {(0.705882, 0.827451, 0.329412), (0.952941, 0.705882, 0.172549)},
}

def norm(text):
    text = text.lower().replace("ł", "l").replace("�", "l")
    return "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))

def school(text):
    return any("szkol" in t and not t.startswith("szkolen") for t in re.findall(r"\w+", norm(text)))

def color(c):
    if isinstance(c, (list, tuple)):
        return tuple(round(float(v), 6) for v in c)
    return c

root = Path(__file__).parent
for year in range(2015, 2019):
    print("YEAR", year)
    with pdfplumber.open(root / f"wyniki-{year}.pdf") as doc:
        for page_no, page in enumerate(doc.pages, 1):
            rects = [r for r in page.rects if color(r.get("non_stroking_color")) in WINNER_FILLS[year]]
            lines = {}
            for word in page.extract_words(x_tolerance=2, y_tolerance=3):
                key = round(word["top"], 1)
                lines.setdefault(key, []).append(word)
            for top, words in lines.items():
                text = " ".join(w["text"] for w in sorted(words, key=lambda x: x["x0"]))
                if not school(text):
                    continue
                mid = sum(w["top"] + w["bottom"] for w in words) / (2 * len(words))
                win = any(r["top"] <= mid <= r["bottom"] for r in rects)
                print(page_no, round(mid, 1), win, text)
