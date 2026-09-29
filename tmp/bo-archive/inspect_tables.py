from pathlib import Path
import pdfplumber

pdf = Path(__file__).parent / "wyniki-2020.pdf"
with pdfplumber.open(pdf) as doc:
    for page_no in [0, 1]:
        page = doc.pages[page_no]
        tables = page.extract_tables()
        print("PAGE", page_no + 1, "TABLES", len(tables))
        for table in tables:
            for row in table[:12]:
                print(row)
