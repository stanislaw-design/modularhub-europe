from collections import Counter
from pathlib import Path
import pdfplumber

root = Path(__file__).parent
for year in range(2015, 2019):
    with pdfplumber.open(root / f"wyniki-{year}.pdf") as doc:
        colors = Counter()
        samples = {}
        for page in doc.pages:
            for ch in page.chars:
                color = str(ch.get("non_stroking_color"))
                colors[color] += 1
                samples.setdefault(color, "")
                if len(samples[color]) < 100:
                    samples[color] += ch["text"]
        print("YEAR", year)
        for color, count in colors.most_common(8):
            print(color, count, repr(samples[color][:100]))
        rect_colors = Counter()
        rect_samples = {}
        for page_no, page in enumerate(doc.pages, 1):
            for rect in page.rects:
                color = str(rect.get("non_stroking_color"))
                rect_colors[color] += 1
                rect_samples.setdefault(color, (page_no, rect.get("x0"), rect.get("top"), rect.get("x1"), rect.get("bottom")))
        print("RECTS")
        for color, count in rect_colors.most_common(12):
            print(color, count, rect_samples[color])
