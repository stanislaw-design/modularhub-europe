# Uzasadnienie decyzji dla spec 0047

## Context

Potrzebny jest import danych z ofertowych PDF projektów domów do istniejącego kreatora producenta. Priorytetami są stabilność, bezpieczeństwo, możliwość audytu i pełna kontrola człowieka. Koszt ma być przewidywalny przy skali do tysiąca analiz miesięcznie, ale nie jest ważniejszy od bezpieczeństwa i ciągłości działania.

Rozwiązanie nie może opierać się na założeniu, że model zawsze odpowie poprawnie. Model proponuje dane, natomiast reguły serwera sprawdzają plik, pochodzenie, typy, zakresy, konflikty, kompletność przeglądu i uprawnienia.

## Options considered

| Opcja | Zalety | Wady | Ocena dla projektu |
|---|---|---|---|
| Azure AI Document Intelligence, Azure OpenAI, Functions i Service Bus | dojrzały OCR dokumentów, spójna chmura operacyjna, Managed Identity, Key Vault, Private Link, kolejka błędów, europejski Data Zone | większa liczba zasobów, koszt stały workera i sieci, R2 pozostaje poza prywatną siecią Azure | wybrana, najlepiej odpowiada priorytetom stabilności i bezpieczeństwa |
| OpenAI API z natywnym wejściem PDF i workerem aplikacji | najmniej elementów, szybka implementacja, jeden model może czytać i strukturyzować dokument | słabsze rozdzielenie OCR od interpretacji, mniej deterministyczna geometria dokumentu, większa zależność od jednego wywołania | dobra dla prototypu, odrzucona dla pierwszej produkcyjnej wersji |
| Google Document AI, Gemini i Cloud Run | mocne narzędzia dokumentowe, europejskie regiony, dobre wsparcie kolejek i zadań | kolejna platforma operacyjna bez obecnego uzasadnienia w projekcie, osobne modele uprawnień i kosztów | technicznie poprawna alternatywa, bez przewagi nad Azure w tym kontekście |
| AWS Textract, Bedrock, Lambda i SQS | dojrzały IAM, kolejki i stabilność, dobre mechanizmy retencji i audytu | rozproszenie usług, mniej naturalne dopasowanie do wybranego stosu Azure, dodatkowa złożoność wielochmurowa obok R2 i Neon | dobra alternatywa dla organizacji działającej już na AWS, tutaj odrzucona |

## Rationale

Azure oddziela rozpoznanie układu dokumentu od interpretacji biznesowej. Document Intelligence Layout dostarcza tekst i strukturę stron, a Azure OpenAI odpowiada za mapowanie do schematu. Dzięki temu dowód strony i fragmentu może pochodzić z warstwy dokumentowej, a nie z pamięci modelu. To zmniejsza ryzyko fikcyjnych cytatów.

Azure zapewnia Managed Identity, Key Vault i prywatne punkty końcowe dla wewnętrznej części procesu. Oficjalna dokumentacja opisuje prywatność danych zarówno dla [Document Intelligence](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/document-intelligence/data-privacy-security), jak i [Azure OpenAI](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/data-privacy). Limity wejścia Document Intelligence muszą zostać ponownie sprawdzone podczas wdrożenia, ponieważ zależą od wersji i warstwy usługi. Źródłem jest oficjalna tabela [limitów Document Intelligence](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/service-limits?tabs=v30&view=doc-intel-3.0.0).

Service Bus został wybrany zamiast prostszej kolejki Storage, ponieważ projekt wymaga kontrolowanych ponowień, obserwacji oczekujących wiadomości i kolejki błędów. To dodatkowy koszt, ale usuwa potrzebę budowania krytycznych mechanizmów niezawodności od zera.

## Koszt orientacyjny

Założenie pojedynczej analizy:

1. Dwa dokumenty.
2. Czterdzieści stron łącznie.
3. Około 60 tysięcy tokenów wejściowych po OCR i 8 tysięcy tokenów wyjściowych.
4. Document Intelligence Layout około 10 USD za tysiąc stron.
5. GPT 5 mini Data Zone około 0,275 USD za milion tokenów wejściowych i 2,20 USD za milion tokenów wyjściowych.

Przy tych założeniach koszt zmienny wynosi około 0,43 USD za analizę. Około 0,40 USD przypada na czterdzieści stron Layout, około 0,017 USD na wejście modelu i około 0,018 USD na wyjście modelu. Kwoty są orientacyjne, nie zawierają podatków, różnic regionu, sieci, Service Bus, Functions Premium custom container potrzebnego do izolowanego preflightu i ClamAV, monitoringu ani zapasu na ponowienia.

| Analizy miesięcznie | Szacowany koszt zmienny |
|---:|---:|
| 100 | około 43 USD |
| 1 000 | około 434 USD |
| 10 000 | około 4 340 USD |

Docelowy budżet operacyjny dla tysiąca analiz powinien mieć zapas ponad koszt zmienny. Rekomendowany punkt startowy to 600 USD miesięcznie z alertami przy 70, 90 i 100 procentach. Alert nie zatrzymuje usługi automatycznie. Rzeczywiste stawki należy pobierać z [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices) oraz sprawdzić na stronach [Document Intelligence pricing](https://azure.microsoft.com/en-us/pricing/details/document-intelligence/) i [Azure OpenAI pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/).

Cloudflare R2 ma relatywnie mały udział w koszcie dla dokumentów tej wielkości. Aktualne stawki i darmowy próg należy sprawdzić w oficjalnym [cenniku R2](https://developers.cloudflare.com/r2/pricing/). Koszt retencji może jednak rosnąć szybciej niż koszt bieżącego miesiąca, dlatego zadanie czyszczące jest częścią definicji gotowości.

## Dlaczego nie bezpośredni import przez OpenAI

OpenAI API upraszcza architekturę i obsługuje pliki, ale w tym projekcie ważne jest odseparowanie dowodu dokumentowego od interpretacji. Oficjalne materiały opisują [Files API](https://developers.openai.com/api/reference/resources/files), [zasady danych](https://developers.openai.com/api/docs/guides/your-data) i [GPT 5 mini](https://developers.openai.com/api/docs/models/gpt-5-mini). Ta opcja pozostaje rozsądnym runner up, gdyby koszt utrzymania infrastruktury Azure okazał się nieproporcjonalny. Nie powinna być automatycznym fallbackiem, ponieważ zmiana dostawcy w środku sesji utrudniłaby porównywalność wyników i audyt.

## Alternatywy Google i AWS

Google ma porównywalny zestaw usług. Punktem odniesienia są oficjalne materiały o [cenach Document AI](https://cloud.google.com/products/document-ai/pricing), [bezpieczeństwie Document AI](https://docs.cloud.google.com/document-ai/docs/security), [limitach](https://docs.cloud.google.com/document-ai/limits) i [cenach Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/pricing). Nie znaleziono przewagi uzasadniającej wprowadzenie kolejnej platformy do wybranego rozwiązania.

AWS zapewnia dojrzały model uprawnień i kolejek. Oficjalne źródła opisują [limity Textract](https://docs.aws.amazon.com/textract/latest/dg/limits-document.html) i [retencję danych Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html). Opcja byłaby szczególnie atrakcyjna, gdyby główna infrastruktura projektu była już utrzymywana na AWS. W obecnym układzie zwiększałaby liczbę platform bez korzyści odpowiadającej kosztowi operacyjnemu.

## Materialnie prostszy zakres

Prostsza pierwsza wersja mogłaby przyjmować jeden tekstowy PDF, odrzucać skany, przygotowywać tłumaczenia poza importem i nie dawać wsparciu dostępu do dokumentu. Usunęłoby to OCR skanów, część preflightu prywatności, wielodokumentowe konflikty i granty administracyjne. Ten wariant nie został wybrany, ponieważ przeczy potwierdzonym wymaganiom obsługi skanów, wielu dokumentów, tłumaczeń oraz audytowanego wsparcia. Jeżeli budżet lub termin wymusi redukcję zakresu, należy wrócić do kryteriów akceptacji zamiast po cichu upraszczać implementację.

## Granice bezpieczeństwa

Najważniejsza granica biegnie między systemem produktu a workerem AI. Worker nie ma prawa zmieniać produktu. Może zapisać kandydatów i dowody, ale dopiero użytkownik tworzy decyzje, a aplikacja Next.js wywołuje kontrolowaną funkcję zastosowania.

Drugą granicą jest dokument. PDF jest niezaufanym wejściem niezależnie od producenta. Skan antymalware, parser limitujący zasoby i ochrona przed bombą dekompresyjną działają przed OCR. Instrukcje znalezione w treści nie mają mocy sterującej. Model nie dostaje narzędzi ani sieci, a wynik jest tylko danymi do walidacji.

Trzecią granicą jest operator wsparcia. Dostęp administracyjny jest możliwy, ponieważ bez niego diagnoza części awarii byłaby niepraktyczna, ale jest jawny, ograniczony rolą, wymaga uzasadnienia i pozostawia nieusuwalny ślad audytowy.

## Ograniczenie skanów i danych osobowych

Warunek „zablokuj dane osobowe przed wysłaniem do chmury” można spełnić dla osadzonego tekstu, metadanych i prostych sekretów widocznych lokalnemu parserowi. Nie można go zagwarantować dla treści widocznej wyłącznie na obrazie bez wcześniejszego OCR. Wykonanie lokalnego OCR tylko na potrzeby filtra zwiększyłoby powierzchnię ataku, koszt obliczeniowy i liczbę komponentów, a następnie dokument i tak byłby ponownie analizowany w Azure.

Dlatego pierwsza wersja stosuje deklarację i instrukcję dla producenta, lokalny preflight tego, co technicznie widoczne, europejskie przetwarzanie u dostawcy oraz minimalną retencję. Jeśli organizacja przyjmie zasadę, że żaden niezweryfikowany obraz nie może trafić do procesora, lokalny OCR jest warunkiem wejścia i wymaga osobnej architektury. To nie jest detal implementacyjny.

## Stabilność i jakość

Model jest przypięty do konkretnego snapshotu. Aktualizacja wymaga przejścia złotego zestawu PDF oraz zaakceptowanych progów jakości dla najważniejszych pól. Rekomendowane metryki to precyzja pola, odsetek pól z poprawnym dowodem, odsetek konfliktów wykrytych zamiast ukrytych, odsetek wartości niepoprawnie oznaczonych jako pewne i średni czas potrzebny producentowi na przegląd.

Trzy ponowienia z wykładniczym opóźnieniem dotyczą błędów przejściowych Azure i sieci. Błąd walidacji odpowiedzi modelu dostaje tylko jedną próbę naprawy formatu z opisem naruszeń schematu. Kolejne próby mogłyby zwiększać koszt i produkować różne odpowiedzi bez lepszej gwarancji jakości.

Jedna aktywna sesja na konto producenta upraszcza obciążenie i unika wyścigu między dwoma importami tego samego szkicu. Limit pięciu uruchomień w kroczącym oknie 24 godzin chroni przed przypadkową pętlą oraz nadużyciem bez potrzeby ustalania strefy czasowej konta. Oba limity powinny być możliwe do zmiany administracyjnej bez wdrożenia kodu, ale zmiana musi być audytowana.

## Cena netto przeliczana do EUR

Rozważono zapis brutto jako `priceMaxCents`, zachowanie ceny netto w walucie dokumentu oraz przeliczenie ceny netto do EUR podczas importu. Brutto nie jest górną granicą ceny, a stawka VAT zależy od kraju i warunków dostawy. Zachowanie wielu walut upraszcza import, ale komplikuje porównywanie ofert i obecny interfejs platformy.

Wybrano przeliczenie jawnej ceny netto do EUR po najnowszym opublikowanym dziennym kursie referencyjnym EBC dostępnym podczas normalizacji. Jest to cena orientacyjna do katalogu, którą producent może poprawić przed zastosowaniem. Kursy referencyjne EBC są publikowane w dni robocze i służą celom informacyjnym, dlatego wynik nie jest przedstawiany jako gwarantowany kurs transakcyjny.

Snapshot obejmuje kwotę i walutę źródłową, kurs, datę kursu, czas pobrania, serię EBC i regułę zaokrąglenia. Zapobiega to zmianie wyniku przy późniejszym otwarciu tej samej sesji. Siedmiodniowy limit wieku obsługuje weekendy i dni zamknięcia TARGET, ale nie pozwala użyć dowolnie starej wartości podczas dłuższej awarii. Arytmetyka dziesiętna i zaokrąglenie half up do eurocenta eliminują różnice wynikające z liczb zmiennoprzecinkowych. Cena brutto i VAT pozostają poza importem.

Źródłem jest oficjalny [ECB Data API](https://data.ecb.europa.eu/help/api/data) i dzienna seria referencyjna `EXR.D.{SOURCE}.EUR.SP00.A`. EBC publikuje kursy zwykle około 16:00 CET w dni robocze i zaznacza, że mają charakter informacyjny. To odpowiada zastosowaniu jako edytowalna cena katalogowa, ale nie jako kurs rozliczeniowy transakcji.

## Narzędzia wdrożeniowe

Oficjalny [Azure MCP Server](https://learn.microsoft.com/en-us/azure/developer/azure-mcp-server/) może pomóc implementatorowi sprawdzać zasoby, konfigurację i diagnostykę. Powinien zostać podłączony dopiero po utworzeniu tożsamości z minimalnym zakresem. Nie należy dawać mu roli właściciela subskrypcji ani wykorzystywać go jako niekontrolowanej ścieżki zmian produkcyjnych.

Nie znaleziono wystarczająco wiarygodnej, gotowej umiejętności społecznościowej obejmującej ten konkretny stos Azure. Wybór oficjalnej dokumentacji jest celowy. Nie oznacza to rezygnacji z automatyzacji, tylko unikanie niezweryfikowanych instrukcji dla warstwy bezpieczeństwa.

## Podsumowanie decyzji

Azure jest rekomendacją dla tego projektu, ponieważ użytkownik przedłożył stabilność i bezpieczeństwo nad minimalny koszt oraz szybkość prototypu. Najważniejszą właściwością projektu nie jest sam wybór modelu, lecz ograniczenie jego roli. Model tworzy kandydatów. Serwer weryfikuje strukturę i pochodzenie. Producent podejmuje decyzję. Baza atomowo aktualizuje szkic. Publikacja pozostaje osobnym, istniejącym procesem.
