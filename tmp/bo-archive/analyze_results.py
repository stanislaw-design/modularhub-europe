from collections import defaultdict
from pathlib import Path
import json
import re
import unicodedata

import pdfplumber

ROOT = Path(__file__).parent
ID_RE = re.compile(r"(?:20\d{2}/)?[A-Z]{3}/\d{4}")

def clean(value):
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()

def asciiish(value):
    value = clean(value).lower().replace("�", "l")
    value = value.translate(str.maketrans({"ł": "l", "Ł": "L"}))
    return "".join(c for c in unicodedata.normalize("NFKD", value) if not unicodedata.combining(c))

def has_school_word(title):
    text = asciiish(title)
    tokens = re.findall(r"\w+", text)
    return any("szkol" in token and not token.startswith("szkolen") for token in tokens)

def parse_modern(year):
    if year == 2020:
        return parse_2020()
    projects = []
    category = None
    current = None

    def finish():
        nonlocal current
        if current:
            current["title"] = clean(current["title"])
            projects.append(current)
            current = None

    with pdfplumber.open(ROOT / f"wyniki-{year}.pdf") as doc:
        for page in doc.pages:
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    cells = [clean(cell) for cell in row]
                    joined = " | ".join(cell for cell in cells if cell)
                    norm = asciiish(joined)
                    if "projekty du" in norm or "projekty duze" in norm:
                        finish()
                        category = "duży"
                        continue
                    if "projekty ma" in norm or "projekty male" in norm:
                        finish()
                        category = "mały"
                        continue

                    id_index = None
                    project_id = None
                    for index, cell in enumerate(cells):
                        match = ID_RE.search(cell)
                        if match:
                            id_index = index
                            project_id = match.group(0)
                            break

                    if project_id:
                        finish()
                        status = ""
                        for cell in cells:
                            n = asciiish(cell)
                            if n in {"tak", "nie"} or "projekt +1" in n or n.startswith("tak -"):
                                status = cell
                        title_parts = []
                        for cell in cells[id_index + 1:]:
                            n = asciiish(cell)
                            if not cell or " zl" in f" {n}" or re.fullmatch(r"[\d\s]+", n):
                                continue
                            if n in {"tak", "nie"} or "projekt +1" in n or n.startswith("tak -"):
                                continue
                            title_parts.append(cell)
                        current = {
                            "year": year,
                            "id": project_id,
                            "category": category,
                            "status": status,
                            "title": " ".join(title_parts),
                        }
                    elif current:
                        continuation = []
                        for cell in cells:
                            n = asciiish(cell)
                            if not cell or " zl" in f" {n}" or re.fullmatch(r"[\d\s]+", n):
                                continue
                            if n in {"tak", "nie"} or "projekt +1" in n or n.startswith("tak -"):
                                if not current["status"]:
                                    current["status"] = cell
                                continue
                            if any(token in n for token in ["liczba projektow", "laczna pula", "srodki niewykorzystane", "dodatkowe srodki", "projekty dzielnicowe"]):
                                continue
                            continuation.append(cell)
                        if continuation:
                            current["title"] += " " + " ".join(continuation)
            finish()

    unique = {}
    for project in projects:
        unique[project["id"]] = project
    winners = []
    for project in unique.values():
        status = asciiish(project["status"])
        if "OGM/" not in project["id"] and project["category"] in {"duży", "mały"} and (status == "tak" or "projekt +1" in status):
            winners.append(project)
    return winners

def parse_2020():
    winners = []
    category = None
    with pdfplumber.open(ROOT / "wyniki-2020.pdf") as doc:
        for page in doc.pages:
            for table in page.extract_tables():
                for row in table:
                    cells = [clean(cell) for cell in row]
                    joined = " | ".join(cell for cell in cells if cell)
                    norm = asciiish(joined)
                    if "projekty du" in norm:
                        category = "duży"
                        continue
                    if "projekty ma" in norm:
                        category = "mały"
                        continue
                    if "projekty miejskie" in norm or "ogolnomiejskie" in norm:
                        category = None
                        continue
                    if len(cells) < 6 or category not in {"duży", "mały"}:
                        continue
                    if not re.fullmatch(r"\d+", cells[0]) or not cells[1]:
                        continue
                    status = asciiish(cells[5])
                    if status == "tak" or "projekt +1" in status:
                        winners.append({
                            "year": 2020,
                            "id": f"p{len(winners)+1}",
                            "category": category,
                            "status": cells[5],
                            "title": cells[1],
                        })
    return winners

LEGACY = {
    2015: {"fills": {(0.612, 0.761, 0.898)}, "title_x": (90, 341)},
    2016: {"fills": {(0.608, 0.761, 0.902), (1.0, 0.753, 0.0)}, "title_x": (121, 334)},
    2017: {"fills": {(0.612, 0.761, 0.898), (1.0, 0.851, 0.4)}, "title_x": (137, 305)},
    2018: {"fills": {(0.705882, 0.827451, 0.329412), (0.952941, 0.705882, 0.172549)}, "title_x": (83, 350)},
}

def rounded_color(color):
    if isinstance(color, (tuple, list)):
        return tuple(round(float(v), 6) for v in color)
    return color

def parse_legacy(year):
    cfg = LEGACY[year]
    fills = {rounded_color(c) for c in cfg["fills"]}
    x_min, x_max = cfg["title_x"]
    rows = []
    with pdfplumber.open(ROOT / f"wyniki-{year}.pdf") as doc:
        for page_no, page in enumerate(doc.pages, 1):
            intervals = []
            for rect in page.rects:
                color = rounded_color(rect.get("non_stroking_color"))
                if color not in fills:
                    continue
                if rect.get("x0", 0) > x_min + 25 or rect.get("x1", 0) < x_max - 25:
                    continue
                if rect.get("top", 0) < 65:
                    continue
                intervals.append((rect["top"], rect["bottom"]))
            merged = []
            for top, bottom in sorted(intervals):
                if not merged or top >= merged[-1][1] - 0.2:
                    merged.append([top, bottom])
                else:
                    merged[-1][1] = max(merged[-1][1], bottom)
            for top, bottom in merged:
                bbox = (x_min, top, x_max, bottom)
                title = clean(page.crop(bbox).extract_text(x_tolerance=2, y_tolerance=3) or "")
                n = asciiish(title)
                if not title or "nazwa projektu" in n or "wyniki glosowania" in n:
                    continue
                rows.append({"year": year, "category": None, "status": "zwycięski", "title": title})
    return rows

results = {}
for year in range(2015, 2027):
    winners = parse_legacy(year) if year <= 2018 else parse_modern(year)
    counts = defaultdict(int)
    for item in winners:
        counts[item["category"] or "bez podziału"] += 1
    school = [item for item in winners if has_school_word(item["title"])]
    results[year] = {
        "counts": dict(counts),
        "winner_count": len(winners),
        "school_count": len(school),
        "school_projects": school,
        "all_winners": winners,
    }
    print(year, dict(counts), "total", len(winners), "school", len(school))
    for item in school:
        print("  ", item["category"], item.get("id", ""), item["title"])

(ROOT / "analysis.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
