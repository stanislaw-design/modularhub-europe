from pathlib import Path
import pdfplumber

root = Path(__file__).parent
for pdf in sorted(root.glob("wyniki-*.pdf")):
    parts = []
    with pdfplumber.open(pdf) as doc:
        for page_no, page in enumerate(doc.pages, 1):
            parts.append(f"\n--- PAGE {page_no} ---\n")
            parts.append(page.extract_text(layout=True, x_tolerance=2, y_tolerance=3) or "")
    target = pdf.with_suffix(".txt")
    target.write_text("\n".join(parts), encoding="utf-8")
    print(target.name, target.stat().st_size)
