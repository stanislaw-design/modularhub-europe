"""Collect a Budman project page and its linked PDFs into a reviewable JSON report.

Usage: python scripts/extract-budman-project.py URL --output docs/research/project.json
Dependencies: requests, beautifulsoup4, PyMuPDF (fitz).
PDFs and optional page previews are kept under tmp/pdfs, outside the catalog.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

import fitz
import requests
from bs4 import BeautifulSoup


HOSTS = {"budman.house", "www.budman.house"}
MAX_BYTES = 15_000_000
TIMEOUT = 30


def allowed(url: str, *, pdf: bool = False) -> bool:
    parsed = urlparse(url)
    return (
        parsed.scheme == "https"
        and parsed.hostname in HOSTS
        and (not pdf or parsed.path.lower().startswith("/wp-content/uploads/"))
    )


def fetch(session: requests.Session, url: str, *, pdf: bool = False) -> bytes:
    if not allowed(url, pdf=pdf):
        raise ValueError(f"URL poza dozwoloną domeną lub katalogiem: {url}")
    with session.get(url, timeout=TIMEOUT, stream=True) as response:
        response.raise_for_status()
        if not allowed(response.url, pdf=pdf):
            raise ValueError(f"Przekierowanie poza dozwoloną domenę: {response.url}")
        chunks = []
        size = 0
        for chunk in response.iter_content(65_536):
            size += len(chunk)
            if size > MAX_BYTES:
                raise ValueError(f"Plik przekracza limit {MAX_BYTES} bajtów: {url}")
            chunks.append(chunk)
        data = b"".join(chunks)
        if pdf and not data.startswith(b"%PDF-"):
            raise ValueError(f"Pod podanym adresem nie ma PDF: {url}")
        return data


def polish_number(value: str) -> float:
    return float(value.replace(" ", "").replace("\u00a0", "").replace(".", "").replace(",", "."))


def match_number(pattern: str, text: str) -> float | None:
    match = re.search(pattern, text, re.IGNORECASE)
    return polish_number(match.group(1)) if match else None


def page_candidates(soup: BeautifulSoup) -> dict:
    heading = soup.find("h1")
    text = soup.get_text(" ", strip=True)
    description = next(
        (
            p.get_text(" ", strip=True)
            for p in soup.find_all("p")
            if "powierzchni zabudowy" in p.get_text(" ", strip=True).lower()
        ),
        None,
    )
    return {
        "name": re.split(r"\s*\|\s*|\s+Cennik od\s+", heading.get_text(" ", strip=True))[0] if heading else None,
        "description": description,
        "builtUpAreaM2": match_number(r"powierzchni zabudowy\s+([\d,.]+)\s*m", text),
        "floorAreaM2": match_number(r"powierzchnia podłóg(?: to aż)?\s+([\d,.]+)\s*m", text)
        or match_number(r"Pow\.\s*podłóg\s+([\d,.]+)\s*M", text),
        "rooms": int(match_number(r"LICZBA\s+POKOI\s+(\d+)", text) or 0) or None,
        "bathrooms": int(match_number(r"LICZBA\s+ŁAZIENEK\s+(\d+)", text) or 0) or None,
        "storeysShownByProducer": int(match_number(r"LICZBA\s+PIĘTER\s+(\d+)", text) or 0) or None,
        "roofPitchDegrees": match_number(r"Kąt\s+nachylenia\s+dachu\s+(\d+)", text),
        "priceFromPln": match_number(r"Cennik od\s+([\d\s.,]+)\s*zł", heading.get_text(" ", strip=True) if heading else ""),
        "priceVariantKnown": False,
    }


def pdf_candidates(text: str) -> dict:
    def get(pattern: str) -> float | None:
        return match_number(pattern, text)

    variants = []
    for match in re.finditer(
        r"WERSJA\s+(PREMIUM|STANDARD PLUS|STANDARD)\s*[-–]\s*STAN DEWELOPERSKI\s+Zawiera:\s*(.*?)\s*\*\s*Nie zawiera:\s*(.*?)(?=\n|WERSJA|$)",
        text,
        re.IGNORECASE | re.DOTALL,
    ):
        variants.append({
            "label": match.group(1).strip().title(),
            "scopeSummary": " ".join(match.group(2).split()),
            "excludes": " ".join(match.group(3).split()),
            "price": None,
        })
    return {
        "reportedUValues_Wm2K": [polish_number(value) for value in re.findall(r"(?<![A-Za-z])U\s*=\s*(0[,\.]\d+)\s*W/\(m2\*K\)", text)],
        "windowUw_Wm2K": get(r"Uw\s*=\s*([\d,.]+)\s*W/\(m2\*K\)"),
        "grossPlnDisclaimer": bool(re.search(r"ceny są cenami brutto PLN", text, re.IGNORECASE)),
        "variants": variants,
        "hasMechanicalVentilation": "Wentylacja mechaniczna" in text,
        "hasHeatRecovery": "rekuperac" in text.lower(),
    }


def collect(url: str, download_dir: Path, render_image_pdfs: bool, download_images: bool) -> dict:
    session = requests.Session()
    session.headers["User-Agent"] = "ModularHubEurope-CatalogResearch/1.0"
    html = fetch(session, url).decode("utf-8", errors="replace")
    soup = BeautifulSoup(html, "html.parser")
    download_dir.mkdir(parents=True, exist_ok=True)

    images = []
    for img in soup.find_all("img"):
        src = urljoin(url, img.get("src", ""))
        image_path = unquote(urlparse(src).path).lower()
        if (
            allowed(src)
            and re.search(r"/wp-content/uploads/\d{4}/\d{2}/", image_path)
            and "emblemat" not in image_path
            and src not in [x["url"] for x in images]
        ):
            images.append({"url": src, "alt": img.get("alt", "").strip()})

    if download_images:
        downloaded: dict[str, tuple[bytes, Path]] = {}
        for index, item in enumerate(images, 1):
            original = re.sub(r"-\d+x\d+(?=\.[^.]+$)", "", item["url"])
            image_url = original
            if image_url in downloaded:
                data, image_path = downloaded[image_url]
            else:
                try:
                    data = fetch(session, image_url)
                except requests.RequestException:
                    image_url = item["url"]
                    data = fetch(session, image_url)
                if not (
                    data.startswith((b"\xff\xd8\xff", b"\x89PNG\r\n\x1a\n"))
                    or (data.startswith(b"RIFF") and data[8:12] == b"WEBP")
                ):
                    raise ValueError(f"Niepoprawny format obrazu: {image_url}")
                filename = f"image-{index:02d}-{Path(unquote(urlparse(image_url).path)).name}"
                image_path = download_dir / filename
                image_path.write_bytes(data)
                downloaded[image_url] = (data, image_path)
            item.update({
                "downloadedUrl": image_url,
                "sha256": hashlib.sha256(data).hexdigest(),
                "localReviewPath": str(image_path),
            })

    pdf_links = {}
    for link in soup.find_all("a", href=True):
        href = urljoin(url, link["href"])
        if allowed(href, pdf=True) and urlparse(href).path.lower().endswith(".pdf"):
            pdf_links.setdefault(href, []).append(link.get_text(" ", strip=True))

    pdfs = []
    all_text = []
    for index, (pdf_url, labels) in enumerate(pdf_links.items(), 1):
        data = fetch(session, pdf_url, pdf=True)
        filename = f"{index:02d}-{Path(unquote(urlparse(pdf_url).path)).name}"
        pdf_path = download_dir / filename
        pdf_path.write_bytes(data)
        document = fitz.open(stream=data, filetype="pdf")
        page_texts = [page.get_text() for page in document]
        has_text = any(value.strip() for value in page_texts)
        if render_image_pdfs and not has_text:
            for page_number, page in enumerate(document, 1):
                page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(download_dir / f"{index:02d}-page-{page_number}.png")
        pdfs.append({
            "url": pdf_url,
            "labels": labels,
            "sha256": hashlib.sha256(data).hexdigest(),
            "pages": len(document),
            "textExtractable": has_text,
            "localReviewPath": str(pdf_path),
        })
        all_text.extend(page_texts)

    return {
        "sourceUrl": url,
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "pageSha256": hashlib.sha256(html.encode("utf-8")).hexdigest(),
        "productCandidates": page_candidates(soup),
        "pdfCandidates": pdf_candidates("\n".join(all_text)),
        "images": images,
        "pdfs": pdfs,
        "reviewRequired": [
            "Powiąż cenę z konkretnym wariantem i sprawdź aktualność cennika.",
            "Zweryfikuj PDF bez warstwy tekstowej na podglądzie stron i wpisz metraże pomieszczeń.",
            "Potwierdź prawa do publikacji materiałów producenta.",
            "Potwierdź dane logistyczne, gwarancję i klasy odporności, jeśli są potrzebne.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--download-dir", type=Path, default=None)
    parser.add_argument("--render-image-pdfs", action="store_true")
    parser.add_argument("--download-images", action="store_true")
    args = parser.parse_args()
    slug = urlparse(args.url).path.strip("/").split("/")[-1]
    download_dir = args.download_dir or Path("tmp/pdfs") / slug
    report = collect(args.url, download_dir, args.render_image_pdfs, args.download_images)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Zapisano {args.output}: {len(report['pdfs'])} PDF, {len(report['images'])} obrazów")


if __name__ == "__main__":
    main()
