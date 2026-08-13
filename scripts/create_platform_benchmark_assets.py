from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "output/pdf"
INFO_DIR = ROOT / "assets/brand/infographics"
TMP_DIR = ROOT / "tmp/pdfs"
PDF_DIR.mkdir(parents=True, exist_ok=True)
INFO_DIR.mkdir(parents=True, exist_ok=True)
TMP_DIR.mkdir(parents=True, exist_ok=True)

PDF_PATH = PDF_DIR / "modularhub-platform-benchmark.pdf"
INFO_PATH = INFO_DIR / "modularhub-platform-benchmark.png"
SYMBOL_PATH = ROOT / "assets/brand/logo/v3/symbol/logo-symbol-display-v3-transparent.png"

NAVY = "#10263D"
DEEP = "#081A2D"
BLUE = "#175CD3"
ELECTRIC = "#0F5FE7"
WARM = "#F4F1EA"
STEEL = "#D9E0E7"
GRAPHITE = "#344657"
LIGHT_BLUE = "#7FAAFF"
MUTED = "#8798A8"
WHITE = "#FFFFFF"

FONT_REG = "C:/Windows/Fonts/arial.ttf"
FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"
pdfmetrics.registerFont(TTFont("MHE-Regular", FONT_REG))
pdfmetrics.registerFont(TTFont("MHE-Bold", FONT_BOLD))


def pil_font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)


def hexrgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def ptext(draw, xy, value, size, fill, bold=False, anchor=None):
    draw.text(xy, value, font=pil_font(size, bold), fill=fill, anchor=anchor)


def pwrapped(draw, xy, value, width_chars, size, fill, bold=False, gap=6):
    x, y = xy
    lines = []
    for paragraph in value.split("\n"):
        lines.extend(wrap(paragraph, width_chars) or [""])
    for line in lines:
        draw.text((x, y), line, font=pil_font(size, bold), fill=fill)
        y += size + gap
    return y


def create_infographic():
    img = Image.new("RGB", (1600, 1100), hexrgb(DEEP))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 14, 1100), fill=hexrgb(BLUE))
    ptext(d, (54, 40), "MODULARHUB / PLATFORM BENCHMARK", 14, hexrgb(LIGHT_BLUE), True)
    ptext(d, (54, 82), "Bierzemy najlepsze mechanizmy. Nie kopiujemy katalogu.", 38, hexrgb(WARM), True)
    ptext(d, (54, 135), "Cztery sprawdzone modele prowadzą do jednej platformy kontroli transgranicznej.", 18, hexrgb(MUTED))

    sources = [
        ("01", "DISCOVERY", "PrefabMarket + CasitaLand", "Porównywalne parametry, filtry i zweryfikowani producenci."),
        ("02", "FEASIBILITY", "ModularPrefabHomes", "Wykonalność, budżet i logistyka przed podpisaniem umowy."),
        ("03", "SOURCE OF TRUTH", "Procore", "Jedno dossier, wersje dokumentów, role i historia decyzji."),
        ("04", "TRANSACTION", "Alibaba Trade Assurance", "Płatność chroniona przez mierzalne warunki kontraktu."),
    ]
    x0, y0, gap, card_w, card_h = 54, 210, 18, 355, 245
    for i, (num, title, platform, description) in enumerate(sources):
        x = x0 + i * (card_w + gap)
        rounded(d, (x, y0, x + card_w, y0 + card_h), 10, hexrgb(NAVY), hexrgb("#294259"), 2)
        ptext(d, (x + 24, y0 + 20), num, 13, hexrgb(LIGHT_BLUE), True)
        ptext(d, (x + 24, y0 + 53), title, 18, hexrgb(WARM), True)
        ptext(d, (x + 24, y0 + 90), platform, 14, hexrgb("#BFD1E3"), True)
        pwrapped(d, (x + 24, y0 + 126), description, 34, 15, hexrgb(MUTED), False, 7)
        d.line((x + card_w // 2, y0 + card_h, x + card_w // 2, 505), fill=hexrgb(BLUE), width=3)

    # Central synthesis
    rounded(d, (270, 505, 1330, 665), 12, hexrgb(WARM))
    symbol = Image.open(SYMBOL_PATH).convert("RGBA")
    symbol.thumbnail((205, 135), Image.Resampling.LANCZOS)
    img.paste(symbol, (300, 520), symbol)
    ptext(d, (545, 530), "MODULARHUB", 16, hexrgb(BLUE), True)
    ptext(d, (545, 565), "Mniej projektów. Więcej pewności.", 31, hexrgb(NAVY), True)
    ptext(d, (545, 612), "Projekt widoczny dopiero wtedy, gdy znamy jego status, koszt i drogę do odbioru.", 17, hexrgb(GRAPHITE))

    # Product mechanisms
    pillars = [
        ("1", "LOKALIZACJA PRZED KATALOGIEM", "Najpierw działka i jurysdykcja, potem dopasowane projekty."),
        ("2", "PASZPORT PROJEKTU", "Jednakowe dane, koszty, ograniczenia i wymagane adaptacje."),
        ("3", "WERYFIKACJA Z DOWODEM", "Co sprawdzono, przez kogo, kiedy i na jakiej podstawie."),
        ("4", "JEDNO DOSSIER", "Dokumenty, wersje, braki, odpowiedzialni i następny krok."),
        ("5", "PŁATNOŚCI ETAPOWE", "Uwolnienie środków po spełnieniu uzgodnionych warunków."),
    ]
    start_x, start_y, pw, pg = 54, 720, 286, 18
    for i, (num, title, desc) in enumerate(pillars):
        x = start_x + i * (pw + pg)
        rounded(d, (x, start_y, x + pw, 1000), 8, hexrgb(WARM))
        rounded(d, (x + 20, start_y + 20, x + 58, start_y + 58), 4, hexrgb(BLUE))
        ptext(d, (x + 39, start_y + 39), num, 15, hexrgb(WHITE), True, "mm")
        pwrapped(d, (x + 20, start_y + 82), title, 22, 15, hexrgb(NAVY), True, 5)
        pwrapped(d, (x + 20, start_y + 145), desc, 28, 14, hexrgb(GRAPHITE), False, 6)

    ptext(d, (54, 1050), "ŹRÓDŁA: PREFABMARKET · CASITALAND · MODULARPREFABHOMES · PROCORE · ALIBABA · HOUZZ", 11, hexrgb(MUTED))
    ptext(d, (1546, 1050), "WORKING STRATEGY / 2026", 11, hexrgb(MUTED), False, "ra")
    img.save(INFO_PATH, quality=96)


def pdf_color(c, value):
    r, g, b = hexrgb(value)
    c.setFillColorRGB(r / 255, g / 255, b / 255)


def pdf_stroke(c, value):
    r, g, b = hexrgb(value)
    c.setStrokeColorRGB(r / 255, g / 255, b / 255)


def pdf_wrap(value, font_name, font_size, max_width):
    words = value.split()
    lines, current = [], ""
    for word in words:
        candidate = word if not current else current + " " + word
        if pdfmetrics.stringWidth(candidate, font_name, font_size) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_text(c, value, x, y, size, color, bold=False, max_width=None, leading=None):
    name = "MHE-Bold" if bold else "MHE-Regular"
    pdf_color(c, color)
    c.setFont(name, size)
    lines = pdf_wrap(value, name, size, max_width) if max_width else [value]
    leading = leading or size * 1.25
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def header(c, title, page):
    w, h = c._pagesize
    pdf_color(c, DEEP)
    c.rect(0, 0, w, h, stroke=0, fill=1)
    pdf_color(c, BLUE)
    c.rect(0, 0, 8, h, stroke=0, fill=1)
    draw_text(c, "MODULARHUB / PLATFORM BENCHMARK", 34, h - 34, 8, LIGHT_BLUE, True)
    draw_text(c, f"0{page}", w - 55, h - 34, 8, MUTED, True)
    draw_text(c, title, 34, h - 76, 25, WARM, True, w - 68, 30)


def card(c, x, y, w, h, fill=WARM, stroke=None, radius=7):
    pdf_color(c, fill)
    if stroke:
        pdf_stroke(c, stroke)
        c.roundRect(x, y, w, h, radius, stroke=1, fill=1)
    else:
        c.roundRect(x, y, w, h, radius, stroke=0, fill=1)


def create_pdf():
    w, h = A4
    c = canvas.Canvas(str(PDF_PATH), pagesize=A4)
    c.setTitle("ModularHub - benchmark platform i rekomendowany model")
    c.setAuthor("ModularHub Europe")

    # Page 1 - cover
    pdf_color(c, DEEP)
    c.rect(0, 0, w, h, stroke=0, fill=1)
    pdf_color(c, BLUE)
    c.rect(0, 0, 10, h, stroke=0, fill=1)
    draw_text(c, "MODULARHUB / STRATEGY NOTE 01", 42, h - 54, 9, LIGHT_BLUE, True)
    draw_text(c, "Benchmark platform", 42, h - 145, 34, WARM, True)
    draw_text(c, "i rekomendowany model produktu", 42, h - 190, 27, WARM, True)
    draw_text(c, "Jak połączyć discovery, ocenę wykonalności, kontrolę dokumentów i bezpieczeństwo transakcji w jedną platformę transgraniczną.", 42, h - 245, 14, MUTED, False, 455, 20)
    card(c, 42, 210, w - 84, 235, WARM)
    c.drawImage(str(SYMBOL_PATH), 65, 245, width=185, height=145, preserveAspectRatio=True, mask="auto")
    draw_text(c, "GŁÓWNY WNIOSEK", 280, 390, 8, BLUE, True)
    draw_text(c, "Nie wygrywamy liczbą ofert.", 280, 350, 20, NAVY, True, 245, 25)
    draw_text(c, "Wygrywamy jasnym statusem, pełnym kosztem i drogą do odbioru.", 280, 292, 13, GRAPHITE, False, 245, 18)
    draw_text(c, "ONE PROJECT. DIFFERENT RULES. ONE CLEAR PATH.", 42, 60, 9, LIGHT_BLUE, True)
    draw_text(c, "11.08.2026 / WORKING STRATEGY", 400, 60, 8, MUTED, True)
    c.showPage()

    # Page 2 - benchmark
    header(c, "Co robią najlepsi", 2)
    items = [
        ("PREFABMARKET + CASITALAND", "Discovery", "Porównywalne parametry, filtry, przedziały cenowe i profile zweryfikowanych producentów.", "Bierzemy: wspólny schemat danych. Nie kopiujemy: katalogu bez oceny lokalnej wykonalności."),
        ("MODULARPREFABHOMES", "Feasibility", "Ocena technicznej, logistycznej i ekonomicznej wykonalności przed projektem i kontraktem.", "Bierzemy: szybki feasibility check zakończony wynikiem i listą warunków."),
        ("PROCORE", "Single source of truth", "Centralne dokumenty, historia wersji, uprawnienia i aktualne informacje dla wszystkich uczestników.", "Bierzemy: jedno dossier projektu, ślad decyzji i właścicieli zadań."),
        ("ALIBABA TRADE ASSURANCE", "Transaction protection", "Ochrona płatności związana z terminami i uzgodnionymi wymaganiami jakościowymi.", "Bierzemy: płatności etapowe uwalniane po spełnieniu mierzalnych warunków."),
        ("HOUZZ", "Trust profiles", "Profile profesjonalistów, opinie, komunikacja, płatności i widoczny postęp projektu.", "Bierzemy: wiarygodny profil producenta. Nie kopiujemy: inspiracyjnego feedu jako rdzenia produktu."),
    ]
    y = h - 135
    for idx, (platform, model, what, take) in enumerate(items):
        card(c, 34, y - 112, w - 68, 102, NAVY, "#294259")
        draw_text(c, f"0{idx + 1}", 50, y - 35, 9, LIGHT_BLUE, True)
        draw_text(c, platform, 82, y - 35, 10, WARM, True)
        draw_text(c, model.upper(), 390, y - 35, 8, LIGHT_BLUE, True)
        draw_text(c, what, 82, y - 58, 9.5, "#C9D2DA", False, 455, 13)
        draw_text(c, take, 82, y - 88, 9.5, WARM, True, 455, 13)
        y -= 122
    c.showPage()

    # Page 3 - full landscape infographic
    c.setPageSize(landscape(A4))
    lw, lh = landscape(A4)
    c.drawImage(str(INFO_PATH), 20, 21, width=lw - 40, height=lh - 42, preserveAspectRatio=True, anchor="c", mask="auto")
    c.showPage()

    # Page 4 - priorities and guardrails
    c.setPageSize(A4)
    header(c, "Co wdrażamy najpierw", 4)
    phases = [
        ("ETAP 1", "Qualification", "Lokalizacja przed katalogiem, podstawowy feasibility check, paszport projektu i jawne ograniczenia."),
        ("ETAP 2", "Controlled workflow", "Dossier, wersjonowanie dokumentów, lista braków, role, terminy i decyzje warunkowe."),
        ("ETAP 3", "Protected transaction", "Koszt dostawy i montażu, kamienie milowe, odbiór fabryczny oraz płatności etapowe."),
    ]
    y = h - 145
    for num, title, desc in phases:
        card(c, 34, y - 130, w - 68, 116, WARM)
        pdf_color(c, BLUE)
        c.roundRect(54, y - 80, 62, 44, 4, stroke=0, fill=1)
        draw_text(c, num, 68, y - 62, 9, WHITE, True)
        draw_text(c, title, 140, y - 51, 18, NAVY, True)
        draw_text(c, desc, 140, y - 80, 10.5, GRAPHITE, False, 385, 15)
        y -= 142

    draw_text(c, "CZEGO NIE KOPIUJEMY", 34, 260, 9, LIGHT_BLUE, True)
    guardrails = [
        "Nie budujemy szerokiego katalogu bez wiedzy, czy projekt da się postawić.",
        "Nie używamy badge'a verified bez pokazania zakresu i daty weryfikacji.",
        "Nie opieramy zaufania wyłącznie na opiniach i materiałach producenta.",
        "Nie obiecujemy zgodności, dopóki nie znamy jurysdykcji i kompletności dokumentów.",
    ]
    yy = 232
    for line in guardrails:
        pdf_color(c, BLUE)
        c.rect(36, yy + 1, 5, 5, stroke=0, fill=1)
        draw_text(c, line, 52, yy, 10, "#C9D2DA", False, 490, 14)
        yy -= 34

    draw_text(c, "ŹRÓDŁA", 34, 83, 8, LIGHT_BLUE, True)
    draw_text(c, "prefabmarket.eu · casitaland.com · modularprefabhomes.eu · procore.com · alibabagroup.com · houzz.co.uk", 34, 65, 7.5, MUTED, False, 520, 10)
    c.save()


create_infographic()
create_pdf()
print(INFO_PATH)
print(PDF_PATH)
