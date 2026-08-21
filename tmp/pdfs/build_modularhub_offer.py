from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf" / "oferta-wdrozenia-modularhub-europe.pdf"
LOGO = ROOT / "assets" / "brand" / "logo" / "v3" / "lockups" / "logo-horizontal-primary-v3-transparent.png"

PAGE_W, PAGE_H = A4
MARGIN_X = 19 * mm
TOP = 22 * mm
BOTTOM = 18 * mm

NIGHT = colors.HexColor("#0E1A2B")
NIGHT_DEEP = colors.HexColor("#081220")
PAPER = colors.HexColor("#FAF8F3")
WHITE = colors.white
AMBER = colors.HexColor("#E2A542")
AMBER_STRONG = colors.HexColor("#C98A2C")
INK = colors.HexColor("#14213A")
MUTED = colors.HexColor("#5B6472")
MIST = colors.HexColor("#AAB4C2")
LINE = colors.HexColor("#E7E3DA")
PALE_BLUE = colors.HexColor("#EAF0F8")
PALE_AMBER = colors.HexColor("#FBF1DF")

pdfmetrics.registerFont(TTFont("Segoe", r"C:\Windows\Fonts\segoeui.ttf"))
pdfmetrics.registerFont(TTFont("SegoeBold", r"C:\Windows\Fonts\segoeuib.ttf"))
pdfmetrics.registerFont(TTFont("SegoeLight", r"C:\Windows\Fonts\segoeuil.ttf"))
pdfmetrics.registerFont(TTFont("SegoeItalic", r"C:\Windows\Fonts\segoeuii.ttf"))


class OfferDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=MARGIN_X,
            rightMargin=MARGIN_X,
            topMargin=TOP,
            bottomMargin=BOTTOM,
            title="Propozycja współpracy - ModularHub Europe",
            author="ModularHub Europe",
            subject="Budowa operacyjnej wersji MVP platformy",
        )
        frame = Frame(
            MARGIN_X,
            BOTTOM,
            PAGE_W - 2 * MARGIN_X,
            PAGE_H - TOP - BOTTOM,
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
            id="content",
        )
        self.addPageTemplates([
            PageTemplate(id="main", frames=frame, onPage=draw_page),
        ])


def draw_page(canvas, doc):
    # Force a clean coordinate system at the beginning of every page. This
    # prevents a transformed graphics state from a complex flowable from
    # shifting the next page's furniture or frame.
    if hasattr(canvas, "resetTransforms"):
        canvas.resetTransforms()
    page = canvas.getPageNumber()
    if page == 1:
        draw_cover_background(canvas)
        return

    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.6)
    canvas.line(MARGIN_X, PAGE_H - 14 * mm, PAGE_W - MARGIN_X, PAGE_H - 14 * mm)
    canvas.setFont("SegoeBold", 7.2)
    canvas.setFillColor(INK)
    canvas.drawString(MARGIN_X, PAGE_H - 10.6 * mm, "MODULARHUB EUROPE")
    canvas.setFont("Segoe", 7.2)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(PAGE_W - MARGIN_X, PAGE_H - 10.6 * mm, "PROPOZYCJA WSPÓŁPRACY  /  SIERPIEŃ 2026")

    canvas.setStrokeColor(LINE)
    canvas.line(MARGIN_X, 12 * mm, PAGE_W - MARGIN_X, 12 * mm)
    canvas.setFont("Segoe", 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(MARGIN_X, 7.7 * mm, "Oferta ważna 30 dni  |  Kwoty netto")
    canvas.setFont("SegoeBold", 7)
    canvas.setFillColor(INK)
    canvas.drawRightString(PAGE_W - MARGIN_X, 7.7 * mm, f"{page:02d}")
    canvas.restoreState()


def draw_cover_background(canvas):
    canvas.saveState()
    canvas.setFillColor(NIGHT_DEEP)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(NIGHT)
    canvas.rect(0, 0, PAGE_W, 76 * mm, fill=1, stroke=0)
    canvas.setFillColor(AMBER)
    canvas.rect(0, PAGE_H - 7 * mm, PAGE_W, 7 * mm, fill=1, stroke=0)
    canvas.setStrokeColor(colors.Color(1, 1, 1, alpha=0.08))
    canvas.setLineWidth(0.8)
    for x in (22, 67, 112, 157):
        canvas.line(x * mm, 0, x * mm, PAGE_H)
    canvas.restoreState()


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="Eyebrow", fontName="SegoeBold", fontSize=8, leading=10,
    textColor=AMBER_STRONG, spaceAfter=4 * mm, tracking=1.1,
))
styles.add(ParagraphStyle(
    name="H1", fontName="SegoeLight", fontSize=27, leading=31,
    textColor=INK, spaceAfter=5 * mm,
))
styles.add(ParagraphStyle(
    name="H2", fontName="SegoeBold", fontSize=16.5, leading=20,
    textColor=INK, spaceBefore=2 * mm, spaceAfter=4 * mm,
))
styles.add(ParagraphStyle(
    name="H3", fontName="SegoeBold", fontSize=11.5, leading=14,
    textColor=INK, spaceBefore=2.5 * mm, spaceAfter=2 * mm,
))
styles.add(ParagraphStyle(
    name="Body", fontName="Segoe", fontSize=9.25, leading=13.1,
    textColor=INK, spaceAfter=3.2 * mm,
))
styles.add(ParagraphStyle(
    name="BodySmall", fontName="Segoe", fontSize=8.25, leading=11.3,
    textColor=INK, spaceAfter=2.3 * mm,
))
styles.add(ParagraphStyle(
    name="BodyMuted", fontName="Segoe", fontSize=8.7, leading=12.2,
    textColor=MUTED, spaceAfter=2.5 * mm,
))
styles.add(ParagraphStyle(
    name="Lead", fontName="Segoe", fontSize=11.2, leading=16,
    textColor=INK, spaceAfter=5 * mm,
))
styles.add(ParagraphStyle(
    name="Quote", fontName="Segoe", fontSize=11.5, leading=16,
    textColor=INK, leftIndent=6 * mm, rightIndent=6 * mm,
    spaceBefore=2 * mm, spaceAfter=4 * mm,
))
styles.add(ParagraphStyle(
    name="BulletMH", fontName="Segoe", fontSize=8.8, leading=12.3,
    textColor=INK, leftIndent=5 * mm, firstLineIndent=-4 * mm,
    bulletIndent=0, spaceAfter=1.6 * mm,
))
styles.add(ParagraphStyle(
    name="BulletSmallMH", fontName="Segoe", fontSize=8.15, leading=10.8,
    textColor=INK, leftIndent=4.5 * mm, firstLineIndent=-3.8 * mm,
    bulletIndent=0, spaceAfter=1.2 * mm,
))
styles.add(ParagraphStyle(
    name="CoverKicker", fontName="SegoeBold", fontSize=9, leading=11,
    textColor=AMBER, tracking=1.4,
))
styles.add(ParagraphStyle(
    name="CoverTitle", fontName="SegoeLight", fontSize=32, leading=37,
    textColor=WHITE,
))
styles.add(ParagraphStyle(
    name="CoverLead", fontName="Segoe", fontSize=12.5, leading=18,
    textColor=colors.HexColor("#D7DFEA"),
))
styles.add(ParagraphStyle(
    name="CoverMeta", fontName="Segoe", fontSize=8.2, leading=11,
    textColor=colors.HexColor("#D7DFEA"),
))


class SectionRule(Flowable):
    def __init__(self, width=18 * mm):
        super().__init__()
        self.width = width
        self.height = 2.5 * mm

    def draw(self):
        self.canv.setFillColor(AMBER)
        self.canv.roundRect(0, 0, self.width, 1.4 * mm, 0.7 * mm, fill=1, stroke=0)


class Callout(Flowable):
    def __init__(self, text, tone="blue", height=28 * mm):
        super().__init__()
        self.text = text
        self.height = height
        self.tone = tone

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        return availWidth, self.height

    def draw(self):
        bg = PALE_BLUE if self.tone == "blue" else PALE_AMBER
        accent = INK if self.tone == "blue" else AMBER_STRONG
        self.canv.setFillColor(bg)
        self.canv.roundRect(0, 0, self.width, self.height, 3 * mm, fill=1, stroke=0)
        self.canv.setFillColor(accent)
        self.canv.roundRect(0, 0, 2.2 * mm, self.height, 1.1 * mm, fill=1, stroke=0)
        p = Paragraph(self.text, ParagraphStyle(
            "callout", parent=styles["Body"], fontSize=9.3, leading=13,
            leftIndent=0, rightIndent=0, spaceAfter=0,
        ))
        _, h = p.wrap(self.width - 13 * mm, self.height - 8 * mm)
        p.drawOn(self.canv, 8 * mm, (self.height - h) / 2)


def section(story, number, title, lead=None):
    story.append(Paragraph(f"{number}  /  OFERTA", styles["Eyebrow"]))
    story.append(Paragraph(title, styles["H1"]))
    story.append(SectionRule())
    story.append(Spacer(1, 4 * mm))
    if lead:
        story.append(Paragraph(lead, styles["Lead"]))


def p(text, style="Body"):
    return Paragraph(text, styles[style])


def bullets(items, small=False):
    sty = styles["BulletSmallMH" if small else "BulletMH"]
    return [Paragraph(f"<font color='#C98A2C'>●</font>  {item}", sty) for item in items]


def metric(label, value, width):
    data = [[Paragraph(value, ParagraphStyle(
        "metricValue", fontName="SegoeBold", fontSize=13, leading=15, textColor=INK,
    ))], [Paragraph(label.upper(), ParagraphStyle(
        "metricLabel", fontName="SegoeBold", fontSize=6.6, leading=8, textColor=MUTED, tracking=.6,
    ))]]
    t = Table(data, colWidths=[width], rowHeights=[11 * mm, 8 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), WHITE),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("ROUNDEDCORNERS", [3 * mm]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def stage_header(no, title, price, summary):
    left = Paragraph(
        f"<font color='#C98A2C'>ETAP {no}</font><br/><font size='10'><b>ZAKRES ODBIERANY I ROZLICZANY OSOBNO</b></font>",
        styles["Body"],
    )
    right = Paragraph(f"<font size='15'><b>{price}</b></font><br/><font size='7' color='#5B6472'>NETTO / PO ODBIORZE</font>", ParagraphStyle(
        "price", parent=styles["Body"], alignment=TA_RIGHT,
    ))
    top = Table([[left, right]], colWidths=[122 * mm, 47 * mm])
    top.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE_BLUE),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 5 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5 * mm),
    ]))
    return [top, Spacer(1, 4 * mm), Paragraph(summary, styles["Lead"])]


def stage_page(story, no, title, price, summary, items, note=None):
    section(story, f"04.{no}", title)
    story.extend(stage_header(no, title, price, summary))
    story.append(Paragraph("Zakres etapu", styles["H3"]))
    story.extend(bullets(items, small=True))
    if note:
        story.append(Spacer(1, 2 * mm))
        story.append(Callout(note, "amber", height=24 * mm))
    story.append(PageBreak())


story = []

# Cover
story.append(Spacer(1, 9 * mm))
story.append(Spacer(1, 48.5 * mm))
story.append(Spacer(1, 15 * mm))
story.append(Paragraph("PROPOZYCJA WSPÓŁPRACY", styles["CoverKicker"]))
story.append(Spacer(1, 4 * mm))
story.append(Paragraph("Budowa operacyjnej<br/>wersji MVP platformy", styles["CoverTitle"]))
story.append(Spacer(1, 7 * mm))
story.append(Paragraph(
    "Platforma sprzedaży domów modułowych w Europie, realizowana w pięciu płatnych etapach.",
    styles["CoverLead"],
))
story.append(Spacer(1, 31 * mm))
cover_metrics = Table([
    [p("SIERPIEŃ 2026", "CoverMeta"), p("5 ETAPÓW", "CoverMeta"), p("15 000 ZŁ NETTO", "CoverMeta")],
    [p("DATA", "CoverMeta"), p("MODEL REALIZACJI", "CoverMeta"), p("WARTOŚĆ OFERTY", "CoverMeta")],
], colWidths=[55 * mm, 55 * mm, 59 * mm])
cover_metrics.setStyle(TableStyle([
    ("TEXTCOLOR", (0, 0), (-1, -1), WHITE),
    ("LINEABOVE", (0, 0), (-1, 0), 0.8, colors.Color(1, 1, 1, alpha=.25)),
    ("TOPPADDING", (0, 0), (-1, 0), 4 * mm),
    ("BOTTOMPADDING", (0, 0), (-1, 0), 1 * mm),
    ("TOPPADDING", (0, 1), (-1, 1), 0),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
]))
story.append(cover_metrics)
story.append(PageBreak())

# Executive summary
section(story, "00", "Oferta w skrócie", "Operacyjne MVP, które przeprowadza pełny przypadek od wyszukania domu do statusu realizacji i przyjmuje pierwszą prawdziwą płatność.")
card_w = 54.4 * mm
story.append(Table([[metric("Wartość całkowita", "15 000 zł", card_w), metric("Liczba etapów", "5 etapów", card_w), metric("Czas realizacji", "8-10 tyg.", card_w)]], colWidths=[card_w] * 3, hAlign="LEFT", style=[
    ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 2.8 * mm),
]))
story.append(Spacer(1, 3 * mm))
story.append(Table([[metric("Rynki startowe", "6 krajów", card_w), metric("Ważność oferty", "30 dni", card_w), metric("Płatność", "Po etapie", card_w)]], colWidths=[card_w] * 3, hAlign="LEFT", style=[
    ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 2.8 * mm),
]))
story.append(Spacer(1, 7 * mm))
story.append(Paragraph("Rezultat współpracy", styles["H2"]))
story.append(Callout(
    "<b>Operacyjna wersja MVP ModularHub Europe</b>, zdolna obsłużyć kontrolowaną grupę prawdziwych klientów i producentów: z kontami, zapisem danych, panelem administracyjnym, pełną ścieżką klienta i producenta oraz jedną rzeczywistą płatnością.",
    "blue", height=33 * mm,
))
story.append(Spacer(1, 6 * mm))
story.append(Paragraph("Rynki startowe", styles["H3"]))
story.append(p("Niemcy  ·  Holandia  ·  Polska  ·  Belgia  ·  Francja  ·  Włochy", "Lead"))
story.append(Paragraph("Zasada realizacji", styles["H3"]))
story.append(p("Najpierw pełny, klikalny interfejs na realistycznych danych. Następnie prawdziwe zaplecze podłączane ekran po ekranie. Automatyzacje wymagające umów, wolumenu lub dodatkowego budżetu są na początku obsługiwane ręcznie przez administratora.", "Body"))
story.append(PageBreak())

# Introduction
section(story, "01", "Wprowadzenie", "Pierwsza działająca wersja platformy - nie demonstracyjny prototyp.")
story.append(p("Ta oferta opisuje budowę operacyjnej wersji MVP platformy ModularHub Europe, gotowej do obsługi pierwszych prawdziwych klientów i producentów. Platforma łączy kupujących dom modułowy z producentami działającymi w kilku krajach jednocześnie."))
story.append(p("System zapisze dane użytkowników, obsłuży logowanie, przeprowadzi pełny przypadek od wyszukania domu do statusu realizacji i przyjmie pierwszą prawdziwą płatność. Procesy, których automatyzacja wymaga zewnętrznych umów, dużego wolumenu albo dodatkowego budżetu, będą początkowo obsługiwane ręcznie przez panel administracyjny."))
story.append(Callout(
    "To świadomy model wdrożenia: ostateczny kształt złożonych procesów zostanie ustalony na podstawie pierwszych realizacji, zamiast być projektowany w oderwaniu od realnych użytkowników.",
    "amber", height=27 * mm,
))
story.append(Spacer(1, 6 * mm))
story.append(Paragraph("Logika kolejnych etapów", styles["H2"]))
logic = [
    ("Po etapie 2", "kompletna demonstracyjna ścieżka klienta"),
    ("Po etapie 3", "kompletna demonstracyjna ścieżka producenta"),
    ("Po etapie 4", "obie ścieżki połączone z kontami, zapisem danych i administracją"),
    ("Po etapie 5", "przetestowane, uruchomione operacyjne MVP z pierwszą płatnością"),
]
logic_left_style = ParagraphStyle(
    "logicLeft", parent=styles["BodySmall"], textColor=WHITE, fontName="SegoeBold"
)
logic_table = Table([[Paragraph(a, logic_left_style), p(b, "BodySmall")] for a, b in logic], colWidths=[38 * mm, 131 * mm])
logic_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (0, -1), NIGHT),
    ("TEXTCOLOR", (0, 0), (0, -1), WHITE),
    ("BACKGROUND", (1, 0), (1, -1), WHITE),
    ("BOX", (0, 0), (-1, -1), .6, LINE),
    ("INNERGRID", (0, 0), (-1, -1), .6, LINE),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
    ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
    ("TOPPADDING", (0, 0), (-1, -1), 3.2 * mm),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 3.2 * mm),
]))
story.append(logic_table)
story.append(PageBreak())

# Flow
section(story, "02", "Co wynika z dokumentu flow", "Dwie ścieżki, jedna platforma i cztery mechanizmy, które spinają cały proces.")
story.append(Callout(
    "<b>Zmiana uzgodniona względem flow:</b> pierwszy krok to wyszukiwarka w stylu booking.com, prowadząca od razu do listy wyników. Wynikiem pozostaje lista cen - nie prośba o kontakt.",
    "amber", height=29 * mm,
))
story.append(Spacer(1, 5 * mm))
client = [
    "Wyszukiwarka bez konta: kraj, budżet, metraż; wynikiem jest lista cen.",
    "Wyniki z filtrami bocznymi, ograniczone prawnie do kraju klienta, z ceną w widełkach.",
    "Zapytanie jako shortlista; konto zakładane dopiero przy wysyłce.",
    "Dossier - płatna analiza działki, zwracana przy braku zgodności.",
    "Oferta wiążąca - jedna cena, przewoźnik ukryty.",
    "Realizacja jako oś statusów z dokumentami przy każdym etapie.",
]
producer = [
    "Rejestracja w około trzy minuty; weryfikacja odłożona do momentu przed kontaktem z klientem.",
    "Pierwszy projekt jako dane techniczne, nie folder zdjęć.",
    "Gotowość eksportowa i mapa krajów od dnia rejestracji.",
    "Domykanie luk poprzez płatny pakiet dokumentów per kraj.",
    "Zapytania tylko dla gotowych producentów; oferta dla klienta dopiero po weryfikacji firmy.",
    "Realizacja i wypłata jako produkcja, transport i rozliczenie.",
]
flow_table = Table([
    [Paragraph("ŚCIEŻKA KLIENTA", styles["H3"]), Paragraph("ŚCIEŻKA PRODUCENTA", styles["H3"])],
    [Table([[x] for x in bullets(client, small=True)], colWidths=[78 * mm]), Table([[x] for x in bullets(producer, small=True)], colWidths=[78 * mm])],
], colWidths=[84.5 * mm, 84.5 * mm])
flow_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), PALE_BLUE),
    ("BOX", (0, 0), (-1, -1), .7, LINE),
    ("INNERGRID", (0, 0), (-1, -1), .7, LINE),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
    ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
    ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
]))
story.append(flow_table)
story.append(Spacer(1, 5 * mm))
story.append(Paragraph("Cztery wspólne mechanizmy", styles["H3"]))
story.extend(bullets([
    "Wspólna baza wymagań zgodności: filtr po stronie klienta i lista zadań po stronie producenta.",
    "Wycena transportu liczona raz po stronie platformy.",
    "Dwa produkty płatne: dossier klienta i pakiet zgodności producenta.",
    "Jeden wspólny widok statusu realizacji.",
], small=True))
story.append(p("Inspiracje mechaniką produktu: Otovo, Carvago, Instapro Group / Angi oraz BIMobject.", "BodyMuted"))
story.append(PageBreak())

# Key decisions
section(story, "03", "Decyzje przed startem", "Pięć ustaleń, które wpływają na koszt, ryzyko i tempo wdrożenia.")
decisions = [
    ("01", "Operacyjne MVP, nie pełna automatyzacja", "Żywa wycena transportu, automatyczny silnik zgodności i zewnętrzne KYC są na start obsługiwane ręcznie przez panel administratora."),
    ("02", "Płatność za dossier lub zaliczkę", "Etap 5 podłącza płatność rzędu kilkuset złotych. Pełna wartość domu jest rozliczana poza platformą - fakturą i przelewem."),
    ("03", "Weryfikacja przed kontaktem z klientem", "Producent może przygotować ofertę, ale klient zobaczy ją dopiero po zamknięciu weryfikacji firmy. Model ręczny lub zewnętrzny dostawca - do ustalenia przed etapem 4."),
    ("04", "Strategia językowa", "Sześć krajów oznacza pięć języków. Rekomendowany start po angielsku, z architekturą gotową na lokalizacje. Opcja niemieckiego i polskiego do decyzji przed etapem 1."),
    ("05", "Jedna domena kanoniczna", "Rekomendowana domena .eu; .com, .nl, .de i .pl kupione defensywnie i przekierowane. Pozwala to uniknąć rozbijania SEO."),
    ("06", "Baza wymagań jako proces ciągły", "Projekt dostarczy strukturę i panel edycji. Treść prawna i techniczna musi być stale aktualizowana przez lokalnych ekspertów."),
]
rows = []
for no, title, body in decisions:
    rows.append([
        Paragraph(no, ParagraphStyle("decisionNo", fontName="SegoeBold", fontSize=12, textColor=AMBER_STRONG)),
        Paragraph(f"<b>{title}</b><br/><font size='8.4' color='#5B6472'>{body}</font>", styles["BodySmall"]),
    ])
decision_table = Table(rows, colWidths=[15 * mm, 154 * mm])
decision_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), WHITE),
    ("BOX", (0, 0), (-1, -1), .7, LINE),
    ("INNERGRID", (0, 0), (-1, -1), .6, LINE),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
    ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
    ("TOPPADDING", (0, 0), (-1, -1), 3.2 * mm),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 3.2 * mm),
]))
story.append(decision_table)
story.append(PageBreak())

# Stages
stage_page(story, 1, "Fundamenty i szkielet platformy", "3 000 zł",
    "Domena, środowiska, system projektowy i mapa obu ścieżek - zanim powstanie pierwszy ekran docelowej funkcji.",
    [
        "Zakup pięciu domen: modularhubeurope.com, .eu, .nl, .de i .pl; jedna kanoniczna, pozostałe przekierowane; DNS i poczta transakcyjna.",
        "Środowisko produkcyjne i testowe oraz automatyczne wdrożenia z repozytorium.",
        "Certyfikat SSL i podstawowe zabezpieczenia formularzy.",
        "System projektowy: kolory, typografia, siatka i komponenty wielokrotnego użytku.",
        "Mapa ekranów obu ścieżek przed budową pierwszego ekranu.",
        "Strona główna i podstawowa nawigacja.",
        "Szkielet stron prawnych i baneru zgody na cookies; treść uzupełniana później.",
        "Śledzenie zdarzeń na każdym kroku lejka od pierwszego dnia.",
        "Pełna responsywność: telefon, tablet i komputer.",
    ],
    "Architektura będzie gotowa na etapowe dodawanie funkcji, języków, rynków i automatyzacji. System projektowy marki i zarys strony głównej są już rozpoczęte."
)

stage_page(story, 2, "Ścieżka klienta na realistycznych danych", "3 000 zł",
    "Kompletna, klikalna demonstracja sześciu kroków ścieżki klienta - od wyszukiwarki do statusu realizacji.",
    [
        "Pasek wyszukiwania: kraj, budżet, metraż i sypialnie - w stylu booking.com.",
        "Wyszukiwanie bez konta; wynikiem jest lista cen, nie formularz kontaktowy.",
        "Wyniki z filtrami: cena, metraż, sypialnie i kraj dostawy; tylko projekty dopuszczalne prawnie.",
        "Karta projektu: zdjęcie, cena w widełkach obejmująca dom, transport i montaż oraz kluczowe parametry.",
        "Sortowanie i zapamiętanie ostatniego wyszukiwania.",
        "Wybór dwóch lub trzech projektów do shortlisty.",
        "Zakładanie konta na etapie wysyłki zapytania.",
        "Wspólny szablon oferty dla wszystkich producentów.",
        "Ekran dossier z symulacją płatności za analizę działki i informacją o zwrocie przy braku zgodności.",
        "Oferta wiążąca: jedna cena końcowa, bez listy przewoźników.",
        "Oś realizacji: produkcja, transport, montaż, odbiór i gwarancja.",
        "Dokumenty, daty i powiadomienia przy zmianie statusu.",
    ],
    "Prawdziwe konta, zapis danych i rzeczywista płatność zostaną podłączone w etapach 4 i 5."
)

stage_page(story, 3, "Ścieżka producenta na realistycznych danych", "3 000 zł",
    "Kompletna, klikalna demonstracja ścieżki producenta - od rejestracji po status realizacji.",
    [
        "Rejestracja: NIP, kraje dostawy i technologia; formularz na około trzy minuty.",
        "Formularz projektu: rzuty, zdjęcia, cena bazowa, moce produkcyjne i wolne terminy.",
        "Dane techniczne: ściany, izolacja, przenikanie ciepła, okna, wentylacja, ogrzewanie, odporność ogniowa i wiatrowa.",
        "Pasek postępu i możliwość dokończenia formularza później.",
        "Mapa gotowości eksportowej dla sześciu krajów: gotowe, brakuje kilku rzeczy, niedopuszczalne.",
        "Konkretna lista braków przy statusie pośrednim.",
        "Domykanie luk: własne dokumenty lub zakup pakietu zgodności; płatność jako symulacja.",
        "Skrzynka zapytań tylko dla producentów gotowych w danym kraju.",
        "Formularz oferty w szablonie platformy, bez pola na transport.",
        "Brama weryfikacji firmy przed pierwszym kontaktem z klientem.",
        "Wspólny z klientem ekran realizacji i wypłaty, dostępny po weryfikacji.",
    ],
    "Przykładowe projekty, zdjęcia, parametry i teksty przygotowuje Wykonawca; Zamawiający weryfikuje je przed uruchomieniem."
)

stage_page(story, 4, "Prawdziwe dane, konta i panel administracyjny", "3 000 zł",
    "Obie ścieżki przechodzą z danych przykładowych na prawdziwy zapis i jeden wspólny proces administracyjny.",
    [
        "Konta i logowanie klientów oraz producentów.",
        "Zapis danych użytkowników, projektów i zapytań klientów.",
        "Obsługa shortlisty oraz przygotowanie i zapis oferty producenta.",
        "Panel administracyjny spinający ścieżkę klienta, producenta i administratora.",
        "Zatwierdzanie producentów przez administratora.",
        "Ręczna obsługa dossier i pakietów zgodności.",
        "Ręczne wprowadzanie wyceny transportu.",
        "Zarządzanie wymaganiami dla krajów.",
        "Zmiana statusów realizacji.",
        "Powiadomienia e-mail o najważniejszych zdarzeniach.",
        "Miejsca na treści prawne i zgody.",
    ],
    "Ręczna obsługa wybranych operacji pozwala przyjąć prawdziwych klientów bez kosztu przedwczesnej automatyzacji."
)

stage_page(story, 5, "Testy, płatności i uruchomienie", "3 000 zł",
    "Kontrolowane testy na ograniczonej grupie, poprawki, pierwsza prawdziwa płatność i wdrożenie pod docelową domeną.",
    [
        "Środowisko do testów z ograniczoną grupą prawdziwych użytkowników.",
        "Kontrolowane testy ścieżki klienta i producenta.",
        "Jedna zbiorcza lista uwag.",
        "Naprawa błędów i problemów utrudniających przejście uzgodnionych procesów.",
        "Drobne korekty interfejsu wynikające z testów.",
        "Jedna prawdziwa płatność za dossier albo zaliczkę oraz potwierdzenie płatności.",
        "Podstawowa integracja z fakturowaniem albo przekazanie danych do dokumentu sprzedaży.",
        "Wdrożenie pod docelową domeną.",
        "Szkolenie z panelu administracyjnego i dokumentacja obsługi.",
        "14 dni wsparcia w zakresie naprawy błędów po uruchomieniu.",
    ],
    "Etap kończy się gotowością operacyjnego MVP do obsługi pierwszych klientów - nie masowym publicznym startem."
)

# Cost summary
section(story, "05", "Podsumowanie kosztów", "Stały koszt każdego etapu i płatność po jego odbiorze.")
cost_rows = [
    ["ETAP", "ZAKRES W SKRÓCIE", "KWOTA"],
    ["1", "Fundamenty i szkielet platformy", "3 000 zł"],
    ["2", "Ścieżka klienta na realistycznych danych", "3 000 zł"],
    ["3", "Ścieżka producenta na realistycznych danych", "3 000 zł"],
    ["4", "Prawdziwe dane, konta i panel administracyjny", "3 000 zł"],
    ["5", "Testy użytkowników, płatności i uruchomienie", "3 000 zł"],
    ["", "RAZEM", "15 000 zł"],
]
cost_header_style = ParagraphStyle(
    "costHeader", parent=styles["BodySmall"], textColor=WHITE, fontName="SegoeBold"
)
cost_cells = []
for row_index, row in enumerate(cost_rows):
    row_style = cost_header_style if row_index == 0 else styles["BodySmall"]
    cost_cells.append([Paragraph(str(x), row_style) for x in row])
cost_table = Table(cost_cells, colWidths=[16 * mm, 112 * mm, 41 * mm])
cost_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), NIGHT),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("BACKGROUND", (0, 1), (-1, -2), WHITE),
    ("BACKGROUND", (0, -1), (-1, -1), PALE_AMBER),
    ("FONTNAME", (0, 0), (-1, 0), "SegoeBold"),
    ("FONTNAME", (1, -1), (-1, -1), "SegoeBold"),
    ("BOX", (0, 0), (-1, -1), .7, LINE),
    ("INNERGRID", (0, 0), (-1, -1), .6, LINE),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("ALIGN", (0, 0), (0, -1), "CENTER"),
    ("ALIGN", (-1, 0), (-1, -1), "RIGHT"),
    ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
    ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
    ("TOPPADDING", (0, 0), (-1, -1), 3.2 * mm),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 3.2 * mm),
]))
story.append(cost_table)
story.append(Spacer(1, 4 * mm))
story.append(p("Kwoty netto. VAT do doliczenia zgodnie z formą rozliczenia Wykonawcy.", "BodyMuted"))
story.append(Spacer(1, 5 * mm))
story.append(Paragraph("Model płatności", styles["H2"]))
story.append(Callout("Każdy etap kosztuje <b>3 000 zł netto</b>. Płatność następuje po odbiorze etapu, w terminie 7 dni. Kolejny etap rozpoczyna się po odbiorze poprzedniego etapu i zaksięgowaniu płatności.", "blue", height=28 * mm))
story.append(PageBreak())

# Acceptance
section(story, "06", "Odbiór etapów", "Jedna, przejrzysta procedura odbiorowa obowiązująca przez całą współpracę.")
acceptance = [
    "Każdy etap kończy się prezentacją działającego zakresu na środowisku testowym.",
    "Zamawiający ma 5 dni roboczych na przekazanie jednej zbiorczej listy uwag.",
    "W cenie etapu zawarta jest jedna runda poprawek dotyczących zgodności z zaakceptowanym zakresem.",
    "Błędy i braki względem zakresu oferty są poprawiane w cenie etapu.",
    "Nowe funkcje, zmiana zaakceptowanego procesu lub przebudowa odebranego elementu są zmianą zakresu i wymagają osobnej wyceny.",
    "Brak uwag w ciągu 5 dni roboczych oznacza odbiór etapu.",
    "Płatność następuje po odbiorze etapu, w terminie 7 dni.",
    "Kolejny etap zaczyna się po odbiorze poprzedniego etapu i zaksięgowaniu płatności.",
]
timeline_rows = []
for idx, item in enumerate(acceptance, 1):
    timeline_rows.append([
        Paragraph(f"{idx:02d}", ParagraphStyle("step", fontName="SegoeBold", fontSize=9, textColor=AMBER_STRONG, alignment=TA_CENTER)),
        p(item, "BodySmall"),
    ])
timeline = Table(timeline_rows, colWidths=[14 * mm, 155 * mm])
timeline.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (0, -1), PALE_AMBER),
    ("BACKGROUND", (1, 0), (1, -1), WHITE),
    ("BOX", (0, 0), (-1, -1), .7, LINE),
    ("INNERGRID", (0, 0), (-1, -1), .6, LINE),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
    ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
    ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
]))
story.append(timeline)
story.append(Spacer(1, 5 * mm))
story.append(p("Zasady wyznaczają jasny punkt odniesienia, ale nie ograniczają elastyczności. Dobry pomysł wykraczający poza zakres może zostać ujęty jako dodatkowa, osobno wyceniona praca.", "BodyMuted"))
story.append(PageBreak())

# External costs
section(story, "07", "Koszty zewnętrzne", "Wynagrodzenie obejmuje projekt, programowanie, konfigurację i wdrożenie opisane w ofercie.")
story.append(p("Cena 15 000 zł netto nie obejmuje opłat pobieranych przez zewnętrznych dostawców, do których platforma będzie się podłączać:"))
external = [
    "zakup i odnawianie domen",
    "hosting i infrastruktura produkcyjna",
    "poczta transakcyjna",
    "prowizje operatora płatności",
    "system fakturowania",
    "płatne narzędzia analityczne",
    "usługi KYC lub weryfikacji firm",
    "płatne integracje, licencje i abonamenty",
    "koszty kancelarii, prawników, inżynierów i ekspertów krajowych",
]
col1 = bullets(external[:5], small=True)
col2 = bullets(external[5:], small=True)
ext_table = Table([[Table([[x] for x in col1], colWidths=[78 * mm]), Table([[x] for x in col2], colWidths=[78 * mm])]], colWidths=[84.5 * mm, 84.5 * mm])
ext_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), WHITE),
    ("BOX", (0, 0), (-1, -1), .7, LINE),
    ("INNERGRID", (0, 0), (-1, -1), .7, LINE),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
    ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
    ("TOPPADDING", (0, 0), (-1, -1), 4 * mm),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm),
]))
story.append(ext_table)
story.append(Spacer(1, 6 * mm))
story.append(Callout("Każdy płatny dostawca zewnętrzny będzie uzgadniany przed uruchomieniem. W miarę możliwości domeny, hosting i pozostałe konta będą zakładane bezpośrednio na dane Zamawiającego, aby zachował pełną kontrolę nad infrastrukturą.", "amber", height=31 * mm))
story.append(PageBreak())

# Responsibilities
section(story, "08", "Obowiązki stron", "Jasny podział odpowiedzialności ogranicza przestoje i ryzyko zmian w harmonogramie.")
contractor = [
    "Logo i podstawowe materiały marki.",
    "Teksty interfejsu i treści robocze.",
    "Realistyczne przykładowe projekty domów.",
    "Projekt i wykonanie platformy.",
    "Konfiguracja środowisk i wdrożenie.",
    "Dokumentacja techniczno-operacyjna w zakresie oferty.",
]
client = [
    "Weryfikacja i zatwierdzenie marki, tekstów i przykładowych projektów.",
    "Informacje biznesowe potrzebne do konfiguracji procesów.",
    "Wybór modelu płatności i sposobu weryfikacji producentów.",
    "Wymagania prawne i techniczne dla krajów.",
    "Regulamin, polityka prywatności i zgody.",
    "Konta operatora płatności, hostingu, domen, poczty i fakturowania.",
    "Terminowe decyzje i jedna zbiorcza lista uwag do etapu.",
    "Uczestnicy kontrolowanych testów użytkowników.",
]
resp_table = Table([
    [Paragraph("WYKONAWCA", styles["H3"]), Paragraph("ZAMAWIAJĄCY", styles["H3"])],
    [Table([[x] for x in bullets(contractor, small=True)], colWidths=[78 * mm]), Table([[x] for x in bullets(client, small=True)], colWidths=[78 * mm])],
], colWidths=[84.5 * mm, 84.5 * mm])
resp_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), PALE_BLUE),
    ("BOX", (0, 0), (-1, -1), .7, LINE),
    ("INNERGRID", (0, 0), (-1, -1), .7, LINE),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
    ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
    ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
]))
story.append(resp_table)
story.append(Spacer(1, 5 * mm))
story.append(Callout("Terminy realizacji przesuwają się odpowiednio, jeżeli materiały, dostępy, decyzje lub uwagi niezbędne do dalszej pracy zostaną przekazane z opóźnieniem.", "amber", height=24 * mm))
story.append(PageBreak())

# Rights and conditions
section(story, "09-10", "Prawa, harmonogram i granice zakresu", "Najważniejsze warunki organizacyjne i prawne oferty.")
story.append(Paragraph("Prawa i przekazanie projektu", styles["H2"]))
story.append(p("Kod jest przechowywany w repozytorium. Po opłaceniu całego wynagrodzenia Zamawiający otrzyma dostęp do aktualnego kodu źródłowego oraz prawa do indywidualnych elementów wykonanych specjalnie dla ModularHub Europe - na zasadach określonych w umowie wykonawczej."))
story.append(p("Nie dotyczy to zewnętrznych bibliotek, frameworków, fontów, materiałów stockowych ani komponentów ogólnego zastosowania, które pozostają objęte licencjami ich dostawców. Infrastruktura i konta zewnętrzne w miarę możliwości należą bezpośrednio do Zamawiającego."))
story.append(Paragraph("Warunki czasowe", styles["H2"]))
story.extend(bullets([
    "Orientacyjny czas całej realizacji: 8-10 tygodni przy płynnym przekazywaniu uwag, decyzji i dostępów.",
    "Poszczególne etapy mogą mieć różną długość; etap 4 może wymagać więcej czasu ze względu na prace zapleczowe.",
    "Szczegółowy harmonogram jest ustalany przy rozpoczęciu każdego etapu.",
], small=True))
story.append(Spacer(1, 3 * mm))
story.append(Paragraph("Poza zakresem tej oferty", styles["H2"]))
out_scope = [
    "automatyczne wyceny przewoźników i automatyczny silnik zgodności prawnej",
    "zewnętrzne KYC i automatyczna aktualizacja przepisów",
    "wiążące treści prawne tworzone samodzielnie przez Wykonawcę",
    "masowa ekspansja i pełna lokalizacja na wszystkie języki",
    "natywne aplikacje mobilne",
    "rozliczenie pełnej wartości domu przez platformę",
    "automatyzacje i integracje niewymienione w etapach",
    "wsparcie i rozwój po 14 dniach ujętych w etapie 5",
]
scope_table = Table([
    [Table([[x] for x in bullets(out_scope[:4], small=True)], colWidths=[78 * mm]), Table([[x] for x in bullets(out_scope[4:], small=True)], colWidths=[78 * mm])]
], colWidths=[84.5 * mm, 84.5 * mm])
scope_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), WHITE),
    ("BOX", (0, 0), (-1, -1), .7, LINE),
    ("INNERGRID", (0, 0), (-1, -1), .7, LINE),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
    ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
    ("TOPPADDING", (0, 0), (-1, -1), 4 * mm),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm),
]))
story.append(scope_table)
story.append(Spacer(1, 3 * mm))
story.append(p("Brak tych automatyzacji nie uniemożliwia obsługi pierwszych klientów - odpowiednie działania są na start wykonywane ręcznie przez administratora.", "BodyMuted"))
story.append(PageBreak())

# Final summary
section(story, "11", "Podsumowanie oferty", "Pięć etapów prowadzących od fundamentów do pierwszej operacyjnej wersji platformy.")
story.append(Spacer(1, 3 * mm))
story.append(Callout(
    "Łączna cena: <b>15 000 zł netto</b>, płatne po odbiorze poszczególnych etapów. Końcowym rezultatem jest operacyjne MVP zdolne obsłużyć pierwszych prawdziwych klientów i producentów.",
    "blue", height=34 * mm,
))
story.append(Spacer(1, 8 * mm))
story.append(Paragraph("Co otrzymuje Zamawiający", styles["H2"]))
story.extend(bullets([
    "Konkretny, możliwy do sprawdzenia rezultat po każdym etapie.",
    "Pełną ścieżkę klienta, producenta i administratora.",
    "Prawdziwe konta, zapis danych, komunikację e-mail i pierwszą płatność.",
    "Operacyjny model ręcznej obsługi procesów, których nie warto automatyzować przed pierwszymi realizacjami.",
    "Fundament techniczny gotowy na dalsze języki, rynki i automatyzacje.",
], small=False))
story.append(Spacer(1, 7 * mm))
story.append(Paragraph("Następny krok", styles["H2"]))
story.append(p("Akceptacja zakresu oferty i ustalenie przed etapem 1: języka startowego, domeny kanonicznej oraz kolejności decyzji biznesowych potrzebnych do etapów 4 i 5.", "Lead"))
story.append(Spacer(1, 11 * mm))
sig = Table([
    ["", ""],
    [p("Data i podpis Zamawiającego", "BodyMuted"), p("Data i podpis Wykonawcy", "BodyMuted")],
], colWidths=[77 * mm, 77 * mm], hAlign="LEFT")
sig.setStyle(TableStyle([
    ("LINEABOVE", (0, 1), (-1, 1), .7, MIST),
    ("TOPPADDING", (0, 1), (-1, 1), 2 * mm),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (0, -1), 8 * mm),
    ("LEFTPADDING", (1, 0), (1, -1), 8 * mm),
]))
story.append(sig)

OUT.parent.mkdir(parents=True, exist_ok=True)
doc = OfferDoc(str(OUT))
doc.build(story)
print(OUT)
