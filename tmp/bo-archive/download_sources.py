from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urljoin
from html.parser import HTMLParser

ROOT = Path(__file__).parent

URLS = {
    2015: "https://bo.gdynia.pl/wp-content/uploads/2021/05/wynikibo2015-1.pdf",
    2016: "https://bo.gdynia.pl/wp-content/uploads/2021/05/WYNIKI-GLOSOWANIA-III-EDYCJI-BUDZETU-OBYWATELSKIEGO_1-1.pdf",
    2017: "https://bo.gdynia.pl/wp-content/uploads/2021/05/Wyniki-Budzet-Obywatelski-2017-1.pdf",
    2018: "https://bo.gdynia.pl/wp-content/uploads/2022/05/BO18_wyniki_3.pdf",
    2019: "https://bo.gdynia.pl/wp-content/uploads/2021/08/PROJEKTY-DZIELNICOWE_wyniki_BO-2019.pdf",
    2020: "https://bo.gdynia.pl/wp-content/uploads/2021/05/2020-09-16-Zaktualizowane-wyniki-glosowania-BO2020.pdf",
    2022: "https://bo.gdynia.pl/wp-content/uploads/2022/12/WYNIKI-GLOSOWANIA-_na-strone.pdf",
    2023: "https://bo.gdynia.pl/wp-content/uploads/2023/12/WYNIKI-GLOSOWANIA-NA-PROJEKTY-DZIELNICOWE-I-MIEJSKIE.pdf",
    2024: "https://bo.gdynia.pl/wp-content/uploads/2024/09/WYNIKI-GLOSOWANIA-NA-PROJEKTY-DZIELNICOWE-I-MIEJSKIE-BO2024-1.pdf",
    2025: "https://bo.gdynia.pl/wp-content/uploads/2025/09/wyniki-glosowania.pdf",
    2026: "https://lis.gdynia.pl/wp-content/uploads/2026/09/WYNIKI-GLOSOWANIA-NA-PROJEKTY-MIEJSKIE-I-DZIELNICOWE.pdf",
}

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.items = []
        self._href = None
        self._text = []
    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self._href = dict(attrs).get("href")
            self._text = []
    def handle_data(self, data):
        if self._href:
            self._text.append(data)
    def handle_endtag(self, tag):
        if tag == "a" and self._href:
            self.items.append((self._href, " ".join(self._text)))
            self._href = None

def fetch(url):
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req, timeout=45) as response:
        return response.read()

page_url = "https://bo.gdynia.pl/poprzednie/budzet-obywatelski-2021-2/"
parser = Links()
parser.feed(fetch(page_url).decode("utf-8", errors="ignore"))
for href, label in parser.items:
    if "wyniki głosowania" in label.lower() or "wyniki glosowania" in label.lower():
        URLS[2021] = urljoin(page_url, href)
        break

if 2021 not in URLS:
    raise RuntimeError("Nie znaleziono linku do wyników BO2021")

for year, url in sorted(URLS.items()):
    target = ROOT / f"wyniki-{year}.pdf"
    target.write_bytes(fetch(url))
    print(year, target.stat().st_size, url)
