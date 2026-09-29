from collections import Counter, defaultdict
from pathlib import Path
import re
import pdfplumber

for year in range(2019, 2027):
    pdf = Path(__file__).parent / f"wyniki-{year}.pdf"
    values = defaultdict(set)
    with pdfplumber.open(pdf) as doc:
        for page in doc.pages:
            for table in page.extract_tables():
                for row in table:
                    cells = ["" if c is None else re.sub(r"\s+", " ", c).strip() for c in row]
                    pid = next((re.search(r"(?:20\d{2}/)?[A-Z]{3}/\d{4}", c).group(0) for c in cells if re.search(r"(?:20\d{2}/)?[A-Z]{3}/\d{4}", c)), None)
                    if not pid:
                        continue
                    for cell in cells:
                        low = cell.lower()
                        if low in {"tak", "nie"} or "projekt +1" in low or low.startswith("tak -"):
                            values[pid].add(cell)
    status_counts = Counter()
    for pid, statuses in values.items():
        status_counts[" / ".join(sorted(statuses))] += 1
    print(year, "ids", len(values), status_counts)
