# Budman House: Mary z antresolą — pakiet do uzupełnienia danych

Sprawdzone 17.09.2026. Identyfikator istniejącego produktu: `3c4d9557-bf0a-4b61-9f0d-6dbebf7c27aa`. Skrypt nie zapisuje niczego do bazy. Automatyczny odczyt i sumy kontrolne plików są w `2026-09-17-budman-mary-extraction.json`; mapa pól do aktualnego modelu w `2026-09-17-budman-mary-mapped.json`.

## Powtarzalne pobieranie

```powershell
python -m pip install requests beautifulsoup4 pymupdf
python scripts/extract-budman-project.py https://budman.house/projekty/mary-z-antresola-35m2/ --output docs/research/2026-09-17-budman-mary-extraction.json --render-image-pdfs --download-images
```

Podając inny adres projektu Budman i ścieżkę `--output`, dostajemy analogiczny raport. Skrypt ogranicza żądania do `budman.house`, pobiera linkowane PDF-y, wykrywa obrazy projektu, próbuje pobrać oryginały zamiast miniaturek, zapisuje sumy SHA-256 i renderuje strony PDF bez warstwy tekstowej. Pliki źródłowe trafiają do `tmp/pdfs/` i nie są katalogowymi mediami do publikacji. Rzuty obrazowe wymagają jeszcze odczytu wzrokowego lub OCR; w tym przykładzie zostały odczytane ręcznie.

## Potwierdzone dane

| Pole | Wartość | Źródło |
| --- | --- | --- |
| Powierzchnia zabudowy | 35 m² | Strona projektu |
| Powierzchnia podłóg | 51,65 m² = parter 28,17 + antresola 23,48 | Strona i rzut PDF, s. 1–2 |
| Wymiary obrysu | 6,47 × 5,37 m | Rzut PDF, s. 1 |
| Pomieszczenia | salon z aneksem 17,55; sypialnia 6,72; łazienka 3,90; antresola 23,48 m² | Rzut PDF, s. 1–2 |
| Pokoje / łazienki | 3 / 1 | Strona projektu |
| Dach | dwuspadowy, 40°; U = 0,16 W/(m²·K) | Strona i specyfikacja PDF, s. 1 |
| Ściana zewnętrzna | szkielet C24/KVH, PIR/PUR, U = 0,18 W/(m²·K) | Specyfikacja PDF, s. 1 |
| Okna / drzwi | pakiet trzyszybowy Uw = 0,8; drzwi Ud ≤ 1,0 W/(m²·K) | Specyfikacja PDF, s. 1 |
| Wentylacja | mechaniczna z odzyskiem ciepła we wszystkich opisanych wariantach | Specyfikacja PDF, s. 2 |
| Cena widoczna na stronie | od 171 500 zł, bez przypisanego wariantu | Strona projektu |

PDF specyfikacji opisuje trzy warianty stanu deweloperskiego: Standard (grzejniki przypodłogowe), Standard Plus (sufitowe grzejniki na podczerwień) i Premium (klimatyzacja multisplit do ogrzewania i chłodzenia). Każdy ma rekuperację; płyta fundamentowa jest poza zakresem. Dokument rozróżnia prace standardowo zawarte i niezawarte, podaje też opcje oraz obowiązki inwestora. Pełne mapowanie pozycji jest w JSON.

## Blokady bezpiecznego importu

1. Indeks `product_variant_product_standard_unique` dopuszcza tylko jeden aktywny wariant `deweloperski` na produkt. Trzech wariantów Mary nie da się zapisać bez zmiany modelu albo utraty znaczenia oferty.
2. Cena ze strony i zakresy z PDF ze stycznia 2022 mogą pochodzić z różnych wersji oferty. PDF mówi o cenach brutto PLN, ale nie dowodzi, że bieżące „od 171 500 zł” ma ten sam zakres i VAT. Brak ceny przypisanej do każdego wariantu i kursu do EUR.
3. `floorAreaM2` przyjmuje tu **powierzchnię podłóg**, podczas gdy aktualna strona porównania nazywa to pole „powierzchnią użytkową”. Przed pokazaniem tej liczby w porównaniu trzeba poprawić etykietę albo rozdzielić pojęcia w modelu.
4. `document.purpose` nie zawiera typu „specyfikacja techniczna”; jej PDF pozostaje załącznikiem źródłowym poza bieżącym widokiem karty.
5. Manifest `_docs/budmanhouse-import-manifest.json` wymaga potwierdzenia praw do publikacji zdjęć, rzutów i opisów. Pozyskane pliki są wyłącznie materiałem do opracowania danych.

Źródła: [strona projektu](https://budman.house/projekty/mary-z-antresola-35m2/), [rzut PDF](https://budman.house/wp-content/uploads/2021/02/Parter-scalone.pdf), [specyfikacja PDF](https://budman.house/wp-content/uploads/2021/02/Specyfikacja-techniczna-MaryA-stycze%C5%84-2022.pdf).
