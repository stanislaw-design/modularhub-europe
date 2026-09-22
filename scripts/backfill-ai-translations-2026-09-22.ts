// Jednorazowy skrypt backfillu (spec 0028 Build plan zadanie 24, AC-17):
// uzupełnia brakujące tłumaczenia EN/NL/DE opisu produktu dla katalogu
// istniejącego na dzień 2026-09-22. Na wyraźną prośbę zamawiającego to
// tłumaczenie wykonał agent (Claude) bezpośrednio, nie Azure OpenAI —
// przyszłe produkty (i przyszłe zmiany tych) dalej idą przez
// generateMissingProductTranslations (lib/producer-product-actions.ts),
// wywoływaną automatycznie przez Azure OpenAI po każdym zapisie.
//
// Tłumaczy WYŁĄCZNIE description (nie name — zamawiający zdecydował
// 2026-09-22 zachować dotychczasową zasadę: nazwa modelu zostaje taka sama we
// wszystkich językach, ten sam precedens co backfill AC-7/AC-10). name/
// ai_generated_name/ai_translated_from_name zostają nietknięte (NULL), więc
// przyszła automatyczna generacja Azure OpenAI wciąż może je uzupełnić, gdyby
// kiedyś ta zasada się zmieniła.
//
// Idempotentny i bezpieczny: wypełnia kolumnę description WYŁĄCZNIE gdy jest
// dziś NULL (nigdy nie nadpisuje istniejącego tłumaczenia, ręcznego ani
// AI'owego). ai_generated_description/ai_translated_from_description
// ustawione tak, żeby wyglądały dokładnie jak świeże wygenerowanie (AC-17),
// więc reguła własności per pole (lib/producer-product-actions.ts) działa na
// tych wierszach tak samo jak na każdym przyszłym.
//
// Domyślnie tryb "na sucho" (tylko raport). Realny zapis wymaga --apply.
//
// Użycie:
//   npx tsx --env-file=.env.local scripts/backfill-ai-translations-2026-09-22.ts             (dry run)
//   npx tsx --env-file=.env.local scripts/backfill-ai-translations-2026-09-22.ts -- --apply   (zapis)

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { product, productTranslation } from "@/lib/db/schema";

interface TranslationEntry {
  productId: string;
  productName: string;
  en: string;
  nl: string;
  de: string;
}

// Wpisy dla 43 produktów bez jakiegokolwiek tłumaczenia (potwierdzone
// zapytaniem Neon MCP 2026-09-22: `desc_en`/`desc_nl`/`desc_de` wszystkie
// false), plus jeden częściowy wpis (Kabina wellness 3000, brakuje tylko NL).
const ENTRIES: TranslationEntry[] = [
  {
    productId: "4edb2d6b-e105-494c-b0ab-34114253a9d0",
    productName: "Cas 105 Murawki",
    en: "A classic house with a porch and a terrace wrapping around the building — three bedrooms, traditional style.",
    nl: "Een klassiek huis met een veranda en een terras rondom het gebouw — drie slaapkamers, traditionele stijl.",
    de: "Ein klassisches Haus mit Veranda und einer das Gebäude umlaufenden Terrasse — drei Schlafzimmer, traditioneller Stil.",
  },
  {
    productId: "9f0d3b64-80cf-4a24-995b-7b2c3f94ce5e",
    productName: "Cas 106 Pisz",
    en: "A house with a porch and an upstairs balcony — a regional roof shape typical of the Masuria region.",
    nl: "Een huis met een veranda en een balkon op de verdieping — een regionaal, Mazurisch dakprofiel.",
    de: "Ein Haus mit Veranda und Balkon im Obergeschoss — eine regionale, für Masuren typische Dachform.",
  },
  {
    productId: "571e068d-700a-4536-8bac-ca291caaf154",
    productName: "Cas 123 Olecko",
    en: "A timber-frame house with a usable attic — three bedrooms, a living room with a kitchenette on the ground floor.",
    nl: "Een houtskeletbouw huis met een bruikbare zolderverdieping — drie slaapkamers, een woonkamer met keukenhoek op de begane grond.",
    de: "Ein Holzrahmenhaus mit ausgebautem Dachgeschoss — drei Schlafzimmer, ein Wohnzimmer mit Küchenzeile im Erdgeschoss.",
  },
  {
    productId: "748c0c40-ab5d-4e29-98ba-0972cf939b41",
    productName: "Cas 164 Modern",
    en: "The largest house in the Castor catalogue — a study on the ground floor, four bedrooms upstairs, two terraces.",
    nl: "Het grootste huis in de Castor-catalogus — een werkkamer op de begane grond, vier slaapkamers op de verdieping, twee terrassen.",
    de: "Das größte Haus im Castor-Katalog — ein Arbeitszimmer im Erdgeschoss, vier Schlafzimmer im Obergeschoss, zwei Terrassen.",
  },
  {
    productId: "1bab6d34-6af8-4528-b430-a11de2d8daf8",
    productName: "Cas 70 Modern",
    en: "The smallest house in the Modern series — a steep, modern 45° form with two ground-floor terraces.",
    nl: "Het kleinste huis uit de Modern-serie — een steile, moderne vorm van 45° met twee terrassen op de begane grond.",
    de: "Das kleinste Haus der Modern-Serie — eine steile, moderne 45°-Form mit zwei Terrassen im Erdgeschoss.",
  },
  {
    productId: "122a9cd1-7f36-42e4-9144-2ede53d77ee7",
    productName: "Cas 88 Modern",
    en: "A Modern house with a full glass gable wall and a large 18 m² terrace — a modern timber barn.",
    nl: "Een Modern-huis met een volledig glazen kopgevel en een groot terras van 18 m² — een moderne houten schuur.",
    de: "Ein Modern-Haus mit voll verglaster Giebelwand und einer großen Terrasse von 18 m² — eine moderne Holzscheune.",
  },
  {
    productId: "f2aff92c-7190-47c4-8db8-ed527a3029e3",
    productName: "Cas 98 Mikołajki",
    en: "A timber-frame house with a mezzanine above the living room — priced from shell-and-core to full finish.",
    nl: "Een houtskeletbouw huis met een mezzanine boven de woonkamer — geprijsd van ruwbouw dicht tot volledig afgewerkt.",
    de: "Ein Holzrahmenhaus mit Empore über dem Wohnzimmer — Preis vom geschlossenen Rohbau bis zum vollständig ausgebauten Zustand.",
  },
  {
    productId: "cb6bd4d3-79d4-4ca6-9527-9c1dd92ae096",
    productName: "DA-30 Dom Apartamentowiec",
    en: "A compact apartment-style mobile home with two bedrooms — fully equipped, ready to be placed on point foundations.",
    nl: "Een compact mobiel appartementhuis met twee slaapkamers — volledig uitgerust, klaar om op puntfundamenten te worden geplaatst.",
    de: "Ein kompaktes mobiles Apartmenthaus mit zwei Schlafzimmern — voll ausgestattet, bereit zur Aufstellung auf Punktfundamenten.",
  },
  {
    productId: "8025831f-a880-4dcf-9dd3-507c929ebc61",
    productName: "DI-42 Dom Idealny",
    en: "An elongated mobile home with two bedrooms and a mezzanine — the living room sits centrally between the two sleeping zones.",
    nl: "Een langwerpig mobiel huis met twee slaapkamers en een mezzanine — de woonkamer ligt centraal tussen de twee slaapzones.",
    de: "Ein längliches mobiles Haus mit zwei Schlafzimmern und einer Empore — das Wohnzimmer liegt zentral zwischen den beiden Schlafbereichen.",
  },
  {
    productId: "2f55438f-73bb-46cd-b658-49d31278843b",
    productName: "DI-44 Dom Idealny",
    en: "A variant of Dom Idealny with a pergola along the facade and two uncovered terraces — a bright, glazed front.",
    nl: "Een variant van Dom Idealny met een pergola langs de gevel en twee onoverdekte terrassen — een lichte, glazen gevel.",
    de: "Eine Variante von Dom Idealny mit einer Pergola entlang der Fassade und zwei unüberdachten Terrassen — eine helle, verglaste Fassade.",
  },
  {
    productId: "11d253c1-bd91-4cde-bfa5-bf47dee62b22",
    productName: "DL-35 Dom Letni",
    en: "A summer house with a mezzanine — an open living room with a kitchenette and a bedroom on the mezzanine, delivered ready-made from the factory.",
    nl: "Een zomerhuis met een mezzanine — een open woonkamer met keukenhoek en een slaapkamer op de mezzanine, kant-en-klaar vanaf de fabriek geleverd.",
    de: "Ein Sommerhaus mit Empore — ein offenes Wohnzimmer mit Küchenzeile und ein Schlafzimmer auf der Empore, fertig ab Werk geliefert.",
  },
  {
    productId: "c54054e3-bbac-4da3-a48b-ab9644aae574",
    productName: "DL-35 Dom Letni na wodzie",
    en: "A version of Dom Letni on a 12×5 m floating platform — a houseboat ready to be moored on the water.",
    nl: "Een versie van Dom Letni op een drijvend platform van 12×5 m — een woonboot klaar om op het water af te meren.",
    de: "Eine Version von Dom Letni auf einer schwimmenden Plattform von 12×5 m — ein hausbootfertiges Modell zum Anlegen auf dem Wasser.",
  },
  {
    productId: "c0240000-0000-4000-8000-000000000024",
    productName: "DomiHaus CUBE24",
    en: "A compact module with 17.81 m² of usable floor area, suited for use as a small year-round house, a recreational cabin, an office, or a service unit. Its simple form makes good use of a narrow plot, and the interior can be tailored to the investor's needs. The producer offers Basic, Comfort, and Premium variants, plus a choice of joinery, colour scheme, facade, and roof covering. The stated construction assembly time is up to two days.",
    nl: "Een compacte module met een bruikbare oppervlakte van 17,81 m², geschikt als klein huis voor heel het jaar, recreatiewoning, kantoor of bedrijfsruimte. De eenvoudige vorm benut een smal perceel goed, en het interieur kan worden aangepast aan de wensen van de investeerder. De producent biedt de varianten Basic, Comfort en Premium, plus een keuze in schrijnwerk, kleurstelling, gevel en dakbedekking. De opgegeven montagetijd van de constructie bedraagt maximaal twee dagen.",
    de: "Ein kompaktes Modul mit 17,81 m² Nutzfläche, geeignet als kleines Ganzjahreshaus, Freizeithaus, Büro oder Gewerberaum. Die einfache Form nutzt ein schmales Grundstück gut aus, und das Innere lässt sich an die Bedürfnisse des Investors anpassen. Der Hersteller bietet die Varianten Basic, Comfort und Premium sowie eine Auswahl an Fenstern und Türen, Farbgestaltung, Fassade und Dacheindeckung. Die angegebene Montagezeit der Konstruktion beträgt bis zu zwei Tage.",
  },
  {
    productId: "c0280000-0000-4000-8000-000000000028",
    productName: "DomiHaus CUBE28",
    en: "An elongated CUBE module with 22.43 m² of usable floor area, combining compact dimensions with more layout freedom than the smallest model in the series. It can serve as a year-round or recreational house, an office, a study, or a service unit. Three equipment levels are available, along with personalisation of joinery, colour scheme, and roof. The producer states a construction assembly time of two days.",
    nl: "Een langwerpige CUBE-module met een bruikbare oppervlakte van 22,43 m², die compacte afmetingen combineert met meer indelingsvrijheid dan het kleinste model uit de serie. Ze kan dienstdoen als huis voor heel het jaar, recreatiewoning, kantoor, werkkamer of bedrijfsruimte. Er zijn drie uitrustingsniveaus beschikbaar, evenals personalisatie van schrijnwerk, kleurstelling en dak. De producent geeft een montagetijd van twee dagen op.",
    de: "Ein längliches CUBE-Modul mit 22,43 m² Nutzfläche, das kompakte Abmessungen mit mehr Gestaltungsfreiheit verbindet als das kleinste Modell der Serie. Es kann als Ganzjahres- oder Freizeithaus, Büro, Arbeitszimmer oder Gewerberaum dienen. Drei Ausstattungsstufen sowie die Personalisierung von Fenstern und Türen, Farbgestaltung und Dach stehen zur Verfügung. Der Hersteller gibt eine Montagezeit der Konstruktion von zwei Tagen an.",
  },
  {
    productId: "c0340000-0000-4000-8000-000000000034",
    productName: "DomiHaus CUBE34",
    en: "The largest variant of the linear CUBE series offers 27.09 m² of usable floor area at a width of 2.94 m. Its longer form allows more flexibility in dividing the interior and works well as a small house, a recreational unit, an office, or a commercial space. The model can be ordered in Basic, Comfort, and Premium packages, with a choice of joinery, facade, and roof. According to the producer, construction assembly takes up to two days.",
    nl: "De grootste variant van de lineaire CUBE-serie biedt 27,09 m² bruikbare oppervlakte bij een breedte van 2,94 m. De langere vorm geeft meer mogelijkheden om het interieur in te delen en is geschikt als klein huis, recreatieobject, kantoor of commerciële ruimte. Het model kan worden besteld in de pakketten Basic, Comfort en Premium, met een keuze in schrijnwerk, gevel en dak. Volgens de producent duurt de montage van de constructie maximaal twee dagen.",
    de: "Die größte Variante der linearen CUBE-Serie bietet 27,09 m² Nutzfläche bei einer Breite von 2,94 m. Die längere Form bietet mehr Möglichkeiten zur Raumaufteilung und eignet sich als kleines Haus, Freizeitobjekt, Büro oder Gewerbefläche. Das Modell kann in den Paketen Basic, Comfort und Premium bestellt werden, mit Auswahl an Fenstern und Türen, Fassade und Dach. Laut Hersteller dauert die Montage der Konstruktion bis zu zwei Tage.",
  },
  {
    productId: "d1100000-0000-4000-8000-000000000110",
    productName: "DomiHaus DH110",
    en: "A modern single-storey family house with a spacious living room, three bedrooms, and a kitchen with a pantry. Two bathrooms and a large utility room organise the household functions, and the single-level layout makes for comfortable, stair-free living. The C24-grade timber structure and extensive insulation are available in several energy and finishing standards.",
    nl: "Een modern gelijkvloers gezinshuis met een ruime woonkamer, drie slaapkamers en een keuken met bijkeuken. Twee badkamers en een grote technische ruimte regelen de huishoudelijke functies, en de indeling op één niveau maakt comfortabel gebruik zonder trappen mogelijk. De houtconstructie van klasse C24 en de uitgebreide isolatie zijn beschikbaar in verschillende energie- en afwerkingsniveaus.",
    de: "Ein modernes eingeschossiges Familienhaus mit geräumigem Wohnzimmer, drei Schlafzimmern und einer Küche mit Speisekammer. Zwei Badezimmer und ein großer Hauswirtschaftsraum ordnen die Nebenfunktionen, und die eingeschossige Anordnung ermöglicht komfortables Wohnen ohne Treppen. Die Holzkonstruktion der Klasse C24 und die umfangreiche Dämmung sind in mehreren Energie- und Ausbaustandards erhältlich.",
  },
  {
    productId: "d1150000-0000-4000-8000-000000000115",
    productName: "DomiHaus DH115",
    en: "A single-storey family house with a 23.66 m² living room, a kitchen with a pantry, and two bathrooms. Bedrooms, a large walk-in wardrobe, and a utility room round out the programme, so every everyday function fits on one level. The C24 timber structure with modern insulation combines thermal comfort with a choice of finishing variant.",
    nl: "Een gelijkvloers gezinshuis met een woonkamer van 23,66 m², een keuken met bijkeuken en twee badkamers. Slaapkamers, een grote inloopkast en een technische ruimte vullen het programma aan, zodat alle dagelijkse functies op één niveau samenkomen. De houten C24-constructie met moderne isolatie combineert thermisch comfort met een keuze in afwerkingsvariant.",
    de: "Ein eingeschossiges Familienhaus mit einem 23,66 m² großen Wohnzimmer, einer Küche mit Speisekammer sowie zwei Badezimmern. Schlafzimmer, eine große Ankleide und ein Hauswirtschaftsraum ergänzen das Programm, sodass alle Alltagsfunktionen auf einer Ebene liegen. Die Holzkonstruktion C24 mit moderner Dämmung verbindet thermischen Komfort mit der Wahl einer Ausbauvariante.",
  },
  {
    productId: "d1270000-0000-4000-8000-000000000127",
    productName: "DomiHaus DH127",
    en: "A spacious single-storey house with a daytime zone centred on a 31 m² living room with a kitchenette. The main bedroom has its own bathroom and walk-in wardrobe, and an additional room can serve as a child's room or a guest room. A second bathroom, a pantry, and a utility room add to the house's functionality; its C24 timber structure is built for year-round use.",
    nl: "Een ruim gelijkvloers huis met een dagzone rond een woonkamer met keukenhoek van 31 m². De hoofdslaapkamer heeft een eigen badkamer en inloopkast, en een extra kamer kan dienen als kinderkamer of logeerkamer. Een tweede badkamer, bijkeuken en technische ruimte vergroten de functionaliteit van het huis, waarvan de houten C24-constructie geschikt is voor gebruik het hele jaar door.",
    de: "Ein geräumiges eingeschossiges Haus mit einem Wohnbereich rund um ein 31 m² großes Wohnzimmer mit Küchenzeile. Das Hauptschlafzimmer verfügt über ein eigenes Bad und eine Ankleide, und ein zusätzliches Zimmer kann als Kinder- oder Gästezimmer dienen. Ein zweites Bad, eine Speisekammer und ein Hauswirtschaftsraum erhöhen die Funktionalität des Hauses, dessen Holzkonstruktion C24 für die ganzjährige Nutzung ausgelegt ist.",
  },
  {
    productId: "d1271000-0000-4000-8000-000000001271",
    productName: "DomiHaus DH127U z garażem dwustanowiskowym",
    en: "An extended single-storey house with a two-car garage. The heart of the interior is a 31.01 m² living room with a kitchenette, while the private part comprises three bedrooms, including a main bedroom with its own walk-in wardrobe. Two bathrooms and a laundry room combined with a utility room provide a complete functional programme for a family on a single level.",
    nl: "Een uitgebreid gelijkvloers huis met een garage voor twee auto's. Het hart van het interieur is een woonkamer met keukenhoek van 31,01 m², terwijl het privégedeelte drie slaapkamers omvat, waaronder een hoofdslaapkamer met eigen inloopkast. Twee badkamers en een wasruimte gecombineerd met een technische ruimte bieden een compleet functioneel programma voor een gezin op één niveau.",
    de: "Ein erweitertes eingeschossiges Haus mit einer Doppelgarage. Den zentralen Teil des Innenraums bildet ein 31,01 m² großes Wohnzimmer mit Küchenzeile, während der private Bereich drei Schlafzimmer umfasst, darunter ein Hauptschlafzimmer mit eigener Ankleide. Zwei Badezimmer sowie ein mit dem Hauswirtschaftsraum verbundener Waschraum bieten ein vollständiges Funktionsprogramm für eine Familie auf einer Ebene.",
  },
  {
    productId: "d1740000-0000-4000-8000-000000000174",
    productName: "DomiHaus DH174",
    en: "A large year-round house with a minimalist form, a gabled roof, and a facade combining slate and wood. An open, generously glazed daytime zone occupies the ground floor, while the upper storey is given over to the private sleeping area. An integrated two-car garage is topped with a spacious terrace, so the design combines a full family-house programme with modern architecture.",
    nl: "Een groot huis voor heel het jaar met een minimalistische vorm, een zadeldak en een gevel die leisteen en hout combineert. Een open, ruim beglaasde dagzone beslaat de begane grond, terwijl de verdieping is bestemd voor het privé slaapgedeelte. Een geïntegreerde garage voor twee auto's wordt bekroond met een ruim terras, waardoor het ontwerp een compleet gezinshuisprogramma combineert met moderne architectuur.",
    de: "Ein großes Ganzjahreshaus mit minimalistischer Form, einem Satteldach und einer Fassade, die Schiefer und Holz kombiniert. Ein offener, großzügig verglaster Wohnbereich nimmt das Erdgeschoss ein, während das Obergeschoss dem privaten Schlafbereich vorbehalten ist. Eine integrierte Doppelgarage wird von einer geräumigen Terrasse gekrönt, sodass der Entwurf ein vollständiges Familienhausprogramm mit moderner Architektur verbindet.",
  },
  {
    productId: "d0351000-0000-4000-8000-000000000351",
    productName: "DomiHaus DH35-1",
    en: "A small house with a clearly separated daytime and private zone. The layout comprises a living room combined with a kitchen, a bedroom, and a bathroom, with large glazing bringing light into the compact interior. A prefabricated timber structure and three finishing variants let the scope of the build be matched to budget and to year-round or recreational use.",
    nl: "Een klein huis met een duidelijk gescheiden dag- en privézone. De indeling omvat een woonkamer gecombineerd met een keuken, een slaapkamer en een badkamer, waarbij grote beglazing licht in het compacte interieur brengt. Een geprefabriceerde houtconstructie en drie afwerkingsvarianten maken het mogelijk de omvang van de bouw af te stemmen op budget en op gebruik het hele jaar door of recreatief gebruik.",
    de: "Ein kleines Haus mit klar getrenntem Wohn- und Privatbereich. Die Aufteilung umfasst ein mit der Küche verbundenes Wohnzimmer, ein Schlafzimmer und ein Bad, wobei große Verglasungen das kompakte Innere mit Licht versorgen. Eine vorgefertigte Holzkonstruktion und drei Ausbauvarianten ermöglichen es, den Umfang der Ausführung an Budget sowie an ganzjährige oder Freizeitnutzung anzupassen.",
  },
  {
    productId: "d0352000-0000-4000-8000-000000000352",
    productName: "DomiHaus DH35-2",
    en: "A compact house with a usable attic, offering 38.06 m² of usable floor area despite a small building footprint. The ground floor holds an open daytime zone with a kitchenette and a bathroom, while the private part occupies the upper level. Large windows accentuate the contemporary form, and a choice of three standards lets the scope of finishing and installations be scaled.",
    nl: "Een compact huis met een bruikbare zolderverdieping, met 38,06 m² bruikbare oppervlakte ondanks een kleine bebouwde oppervlakte. De begane grond herbergt een open dagzone met keukenhoek en een badkamer, terwijl het privégedeelte het bovenniveau gebruikt. Grote ramen benadrukken de eigentijdse vorm, en een keuze uit drie standaarden maakt het mogelijk de omvang van afwerking en installaties te schalen.",
    de: "Ein kompaktes Haus mit ausgebautem Dachgeschoss, das trotz einer geringen bebauten Fläche 38,06 m² Nutzfläche bietet. Das Erdgeschoss beherbergt einen offenen Wohnbereich mit Küchenzeile und ein Bad, während der private Bereich die obere Ebene nutzt. Große Fenster betonen die zeitgemäße Form, und die Wahl aus drei Standards ermöglicht eine Abstufung des Ausbau- und Installationsumfangs.",
  },
  {
    productId: "d0353000-0000-4000-8000-000000000353",
    productName: "DomiHaus DH35-3",
    en: "A compact house with a traditional form and a tall roof, offering a living room with a kitchenette, a bedroom, and a bathroom. Glazing opens the daytime zone to its surroundings, and the small building footprint makes it easy to fit the design onto a smaller plot. A timber-frame structure, several thermal-insulation options, and three finishing packages prepare it for year-round use.",
    nl: "Een compact huis met een traditionele vorm en een hoog dak, met een woonkamer met keukenhoek, een slaapkamer en een badkamer. Beglazing opent de dagzone naar de omgeving, en de kleine bebouwde oppervlakte maakt het eenvoudig het ontwerp op een kleiner perceel te plaatsen. Een houtskeletconstructie, verschillende varianten thermische isolatie en drie afwerkingspakketten bereiden het voor op gebruik het hele jaar door.",
    de: "Ein kompaktes Haus mit traditioneller Form und hohem Dach, das ein Wohnzimmer mit Küchenzeile, ein Schlafzimmer und ein Bad bietet. Verglasungen öffnen den Wohnbereich zur Umgebung, und die geringe bebaute Fläche erleichtert die Anpassung des Entwurfs an ein kleineres Grundstück. Eine Holzrahmenkonstruktion, mehrere Wärmedämmvarianten und drei Ausbaupakete bereiten es auf die ganzjährige Nutzung vor.",
  },
  {
    productId: "d0440000-0000-4000-8000-000000000044",
    productName: "DomiHaus DH44",
    en: "A compact house with a 10.90 m² mezzanine that can serve as a bedroom, a study, or a relaxation area. The open layout allows the interior to be flexibly adapted to residents' lifestyle, and the C24-grade timber structure combines prefabrication with extensive insulation. The design is available in three finishing and installation variants.",
    nl: "Een compact huis met een mezzanine van 10,90 m², die kan dienen als slaapkamer, werkkamer of ontspanningszone. De open indeling maakt het mogelijk het interieur flexibel aan te passen aan de levensstijl van de bewoners, en de houtconstructie van klasse C24 combineert prefabricatie met uitgebreide isolatie. Het ontwerp is beschikbaar in drie afwerkings- en installatievarianten.",
    de: "Ein kompaktes Haus mit einer 10,90 m² großen Empore, die als Schlafzimmer, Arbeitszimmer oder Ruhebereich genutzt werden kann. Die offene Aufteilung ermöglicht eine flexible Anpassung des Innenraums an den Lebensstil der Bewohner, und die Holzkonstruktion der Klasse C24 verbindet Vorfertigung mit umfangreicher Dämmung. Der Entwurf ist in drei Ausbau- und Installationsvarianten erhältlich.",
  },
  {
    productId: "d0470000-0000-4000-8000-000000000047",
    productName: "DomiHaus DH47",
    en: "A modern single-family house designed for a small family. Large glazing lights the daytime area and visually enlarges it, while an extra room can be arranged as a bedroom, a study, or a child's room. Its compact form suits smaller plots and can serve as either a year-round house or a comfortable recreational property.",
    nl: "Een modern eengezinshuis ontworpen voor een klein gezin. Grote beglazing verlicht de dagzone en vergroot deze optisch, terwijl een extra kamer kan worden ingericht als slaapkamer, werkkamer of kinderkamer. De compacte vorm is geschikt voor kleinere percelen en kan zowel als huis voor heel het jaar als comfortabel recreatieobject dienen.",
    de: "Ein modernes Einfamilienhaus, entworfen für eine kleine Familie. Große Verglasungen beleuchten den Wohnbereich und vergrößern ihn optisch, während ein zusätzliches Zimmer als Schlafzimmer, Arbeitszimmer oder Kinderzimmer eingerichtet werden kann. Die kompakte Form eignet sich für kleinere Grundstücke und kann sowohl als Ganzjahreshaus als auch als komfortables Freizeitobjekt dienen.",
  },
  {
    productId: "d0472000-0000-4000-8000-000000000472",
    productName: "DomiHaus DH47-2P z przedsionkiem",
    en: "A development of the DH47 model with a convenient 4.05 m² vestibule. The ground floor holds a living room with a kitchenette and a bathroom, and an extra room can serve as a study, a child's room, or a guest space. The design keeps the compact form of the base house but offers a more practical entrance zone for year-round use.",
    nl: "Een doorontwikkeling van het model DH47 met een praktisch voorportaal van 4,05 m². Op de begane grond bevinden zich een woonkamer met keukenhoek en een badkamer, en een extra kamer kan dienen als werkkamer, kinderkamer of logeerruimte. Het ontwerp behoudt de compacte vorm van het basishuis, maar biedt een praktischere entreezone voor gebruik het hele jaar door.",
    de: "Eine Weiterentwicklung des Modells DH47 mit einem praktischen Vorraum von 4,05 m². Im Erdgeschoss befinden sich ein Wohnzimmer mit Küchenzeile sowie ein Bad, und ein zusätzliches Zimmer kann als Arbeitszimmer, Kinderzimmer oder Gästebereich dienen. Der Entwurf behält die kompakte Form des Basishauses bei, bietet jedoch einen praktischeren Eingangsbereich für die ganzjährige Nutzung.",
  },
  {
    productId: "d0550000-0000-4000-8000-000000000055",
    productName: "DomiHaus DH55",
    en: "A flexible modular house with a mezzanine and room to expand. A dedicated connector lets the module be integrated with an existing building, and the open daytime zone can be supplemented with a workspace, a relaxation area, or an extra bedroom on the mezzanine. This is a proposal for investors who want their house to grow along with changing needs.",
    nl: "Een flexibel modulair huis met een mezzanine en uitbreidingsmogelijkheden. Een speciale verbindingsschakel maakt het mogelijk de module te integreren met een bestaand gebouw, en de open dagzone kan worden aangevuld met een werkplek, ontspanningszone of extra slaapkamer op de mezzanine. Dit is een voorstel voor investeerders die hun huis willen laten meegroeien met veranderende behoeften.",
    de: "Ein flexibles Modulhaus mit Empore und Erweiterungsmöglichkeit. Ein spezielles Verbindungselement ermöglicht die Integration des Moduls in ein bestehendes Gebäude, und der offene Wohnbereich kann um einen Arbeitsplatz, einen Ruhebereich oder ein zusätzliches Schlafzimmer auf der Empore ergänzt werden. Dies ist ein Angebot für Investoren, die ihr Haus mit sich ändernden Bedürfnissen mitwachsen lassen möchten.",
  },
  {
    productId: "d0600000-0000-4000-8000-000000000060",
    productName: "DomiHaus DH60",
    en: "A compact single-storey house with a clear division of functions. A living room with a kitchenette and dining area forms the centre of the interior, and a pantry accessible directly from the kitchen makes everyday use easier. The design comprises two bedrooms, a centrally placed bathroom, and a utility room, making it well suited as an economical house for a couple or a small family.",
    nl: "Een compact gelijkvloers huis met een heldere functieverdeling. Een woonkamer met keukenhoek en eetruimte vormt het centrum van het interieur, en een bijkeuken die rechtstreeks vanuit de keuken toegankelijk is, vergemakkelijkt het dagelijks gebruik. Het ontwerp omvat twee slaapkamers, een centraal geplaatste badkamer en een technische ruimte, waardoor het geschikt is als economisch huis voor een stel of een klein gezin.",
    de: "Ein kompaktes eingeschossiges Haus mit klarer Funktionstrennung. Ein Wohnzimmer mit Küchenzeile und Essbereich bildet das Zentrum des Innenraums, und eine direkt von der Küche zugängliche Speisekammer erleichtert die tägliche Nutzung. Der Entwurf umfasst zwei Schlafzimmer, ein zentral gelegenes Bad und einen Hauswirtschaftsraum, weshalb es sich als wirtschaftliches Haus für ein Paar oder eine kleine Familie eignet.",
  },
  {
    productId: "d0701000-0000-4000-8000-000000000701",
    productName: "DomiHaus DH70-1",
    en: "A two-storey house with a gabled roof, an open daytime zone on the ground floor, and a private sleeping area on the upper level. Large glazing brings in natural light and opens the interior to its surroundings, while timber accents warm up the contemporary form. An ergonomic kitchen, a dining area, and a bathroom with a shower create a functional space for a family.",
    nl: "Een huis met verdieping, een zadeldak, een open dagzone op de begane grond en een privé slaapgedeelte op de bovenverdieping. Grote beglazing brengt natuurlijk licht binnen en opent het interieur naar de omgeving, terwijl houten accenten de eigentijdse vorm verwarmen. Een ergonomische keuken, eetruimte en badkamer met douche vormen een functionele ruimte voor een gezin.",
    de: "Ein zweigeschossiges Haus mit Satteldach, einem offenen Wohnbereich im Erdgeschoss und einem privaten Schlafbereich im Obergeschoss. Große Verglasungen bringen natürliches Licht herein und öffnen das Innere zur Umgebung, während Holzakzente die zeitgemäße Form erwärmen. Eine ergonomische Küche, ein Essbereich und ein Bad mit Dusche schaffen einen funktionalen Raum für eine Familie.",
  },
  {
    productId: "d0702000-0000-4000-8000-000000000702",
    productName: "DomiHaus DH70-2",
    en: "A two-storey family house with a bright, open zone for the living room, dining area, and kitchen on the ground floor. The gabled form with large glazing combines a modern look with natural accents, while the upstairs bedrooms provide privacy. The design includes a bathroom with a shower and several levels of thermal insulation and finish.",
    nl: "Een gezinshuis met verdieping en een lichte, open zone voor woonkamer, eetruimte en keuken op de begane grond. De zadelvorm met grote beglazing combineert een moderne uitstraling met natuurlijke accenten, terwijl de slaapkamers op de verdieping privacy bieden. Het ontwerp voorziet in een badkamer met douche en verschillende niveaus van thermische isolatie en afwerking.",
    de: "Ein zweigeschossiges Familienhaus mit einem hellen, offenen Bereich für Wohnzimmer, Essbereich und Küche im Erdgeschoss. Die Satteldachform mit großen Verglasungen verbindet eine moderne Optik mit natürlichen Akzenten, während die Schlafzimmer im Obergeschoss Privatsphäre bieten. Der Entwurf sieht ein Bad mit Dusche sowie mehrere Stufen der Wärmedämmung und des Ausbaus vor.",
  },
  {
    productId: "d0703000-0000-4000-8000-000000000703",
    productName: "DomiHaus DH70-3",
    en: "A slender two-storey house with 74.60 m² of usable floor area and striking glazing in its gabled form. The ground floor is an open space combining the living room, dining area, and an ergonomic kitchen with a bathroom, while the upper storey holds the private sleeping zone. Timber facade elements and large windows underline the blend of contemporary architecture with its natural surroundings.",
    nl: "Een slank huis met verdieping, met 74,60 m² bruikbare oppervlakte, met representatieve beglazing in de zadelvorm. De begane grond vormt een open ruimte met woonkamer, eetruimte en een ergonomische keuken met badkamer, terwijl de verdieping het privé slaapgedeelte herbergt. Houten gevelelementen en grote ramen benadrukken de combinatie van eigentijdse architectuur met de natuurlijke omgeving.",
    de: "Ein schlankes zweigeschossiges Haus mit 74,60 m² Nutzfläche und repräsentativer Verglasung in Satteldachform. Das Erdgeschoss bildet einen offenen Raum aus Wohnzimmer, Essbereich und ergonomischer Küche mit Bad, während das Obergeschoss den privaten Schlafbereich beherbergt. Holzelemente an der Fassade und große Fenster unterstreichen die Verbindung zeitgemäßer Architektur mit der natürlichen Umgebung.",
  },
  {
    productId: "d0704000-0000-4000-8000-000000000704",
    productName: "DomiHaus DH70-4",
    en: "A functional two-storey house whose ground floor combines a spacious living room with a kitchenette, a separate dining area, and a bathroom with a shower. The upper storey is given over to a bright, private sleeping zone. A gabled roof, large windows, and timber facade elements give the form a timeless character, and three finishing packages let the scope of installations and thermal insulation be chosen.",
    nl: "Een functioneel huis met verdieping, waarvan de begane grond een ruime woonkamer met keukenhoek, een aparte eetruimte en een badkamer met douche combineert. De verdieping is bestemd voor een lichte, privé slaapzone. Een zadeldak, grote ramen en houten gevelelementen geven de vorm een tijdloos karakter, en drie afwerkingspakketten maken het mogelijk de omvang van installaties en thermische isolatie te kiezen.",
    de: "Ein funktionales zweigeschossiges Haus, dessen Erdgeschoss ein geräumiges Wohnzimmer mit Küchenzeile, einen separaten Essbereich und ein Bad mit Dusche verbindet. Das Obergeschoss ist einem hellen, privaten Schlafbereich vorbehalten. Ein Satteldach, große Fenster und Holzelemente an der Fassade verleihen der Form einen zeitlosen Charakter, und drei Ausbaupakete ermöglichen die Wahl des Installations- und Dämmumfangs.",
  },
  {
    productId: "d0705000-0000-4000-8000-000000000705",
    productName: "DomiHaus DH70-5",
    en: "A family variant of the DH70 series with an open daytime zone on the ground floor and bedrooms upstairs. A living room with a kitchenette and a separate dining area form a comfortable heart of the house, and a bathroom with a shower rounds out the lower storey. Large glazing lights both zones, while the prefabricated timber structure is available in three finishing standards.",
    nl: "Een gezinsvariant van de DH70-serie met een open dagzone op de begane grond en slaapkamers op de verdieping. Een woonkamer met keukenhoek en een aparte eetruimte vormen een comfortabel hart van het huis, en een badkamer met douche vervolledigt de onderste verdieping. Grote beglazing verlicht beide zones, terwijl de geprefabriceerde houtconstructie beschikbaar is in drie afwerkingsstandaarden.",
    de: "Eine Familienvariante der Serie DH70 mit offenem Wohnbereich im Erdgeschoss und Schlafzimmern im Obergeschoss. Ein Wohnzimmer mit Küchenzeile und ein separater Essbereich bilden ein komfortables Herzstück des Hauses, und ein Bad mit Dusche ergänzt das untere Geschoss. Große Verglasungen beleuchten beide Bereiche, während die vorgefertigte Holzkonstruktion in drei Ausbaustandards erhältlich ist.",
  },
  {
    productId: "d0706000-0000-4000-8000-000000000706",
    productName: "DomiHaus DH70-6",
    en: "A year-round house with 83.74 m² of usable floor area, designed for comfortable family life. The ground floor holds a living room with a kitchenette, a bedroom with a walk-in wardrobe, a bathroom, a vestibule, and a utility room; the upper storey extends the house's private area. A minimalist form, a gabled roof, and large glazing provide a bright interior and close contact with the surroundings.",
    nl: "Een huis voor heel het jaar met 83,74 m² bruikbare oppervlakte, ontworpen voor comfortabel gezinsleven. De begane grond herbergt een woonkamer met keukenhoek, een slaapkamer met inloopkast, een badkamer, een windvang en een technische ruimte; de bovenverdieping breidt het privégedeelte van het huis uit. Een minimalistische vorm, een zadeldak en grote beglazing zorgen voor een licht interieur en nauw contact met de omgeving.",
    de: "Ein Ganzjahreshaus mit 83,74 m² Nutzfläche, konzipiert für komfortables Familienleben. Das Erdgeschoss beherbergt ein Wohnzimmer mit Küchenzeile, ein Schlafzimmer mit Ankleide, ein Bad, einen Windfang und einen Hauswirtschaftsraum; das Obergeschoss erweitert den privaten Bereich des Hauses. Eine minimalistische Form, ein Satteldach und große Verglasungen sorgen für ein helles Interieur und engen Kontakt zur Umgebung.",
  },
  {
    productId: "d0707000-0000-4000-8000-000000000707",
    productName: "DomiHaus DH70-7",
    en: "The largest variant in the DH70 family combines a compact form with an extensive interior programme. An open, well-lit daytime zone adjoins an extra room on the ground floor, while two bedrooms occupy the attic. A simple gabled roof favours economical construction and energy efficiency while keeping a modern, timeless look.",
    nl: "De grootste variant van de DH70-familie combineert een compacte vorm met een uitgebreid interieurprogramma. Een open en goed verlichte dagzone grenst aan een extra kamer op de begane grond, terwijl op de zolderverdieping twee slaapkamers liggen. Een eenvoudig zadeldak bevordert een economische bouw en energiezuinigheid, met behoud van een modern, tijdloos uiterlijk.",
    de: "Die größte Variante der Familie DH70 verbindet eine kompakte Form mit einem umfangreichen Raumprogramm. Ein offener, gut beleuchteter Wohnbereich grenzt an ein zusätzliches Zimmer im Erdgeschoss, während sich im Dachgeschoss zwei Schlafzimmer befinden. Ein einfaches Satteldach begünstigt eine wirtschaftliche Bauweise und Energieeffizienz bei gleichzeitig modernem, zeitlosem Erscheinungsbild.",
  },
  {
    productId: "71b2b907-e62d-4e10-ba2c-26feda216da3",
    productName: "N2-48 Dom Łączony",
    en: "A mobile home with a modern, asymmetrical form and a wooden pergola sheltering the entrance.",
    nl: "Een mobiel huis met een moderne, asymmetrische vorm en een houten pergola die de ingang beschut.",
    de: "Ein mobiles Haus mit moderner, asymmetrischer Form und einer hölzernen Pergola, die den Eingang schützt.",
  },
  {
    productId: "f828a683-0668-4b28-8535-ab8db067e03c",
    productName: "Optimo 100P1",
    en: "A single-storey family house with three bedrooms and two bathrooms — a utility room is included in the floor plan.",
    nl: "Een gelijkvloers gezinshuis met drie slaapkamers en twee badkamers — een technische ruimte is opgenomen in de plattegrond.",
    de: "Ein eingeschossiges Familienhaus mit drei Schlafzimmern und zwei Badezimmern — ein Technikraum ist im Grundriss enthalten.",
  },
  {
    productId: "058578b9-c9a8-46df-b175-5f280964b289",
    productName: "Optimo 100P2",
    en: "A variant of the 100P1 with a covered 16.4 m² terrace — the same three-bedroom layout on a larger plot.",
    nl: "Een variant van de 100P1 met een overdekt terras van 16,4 m² — dezelfde indeling met drie slaapkamers op een groter perceel.",
    de: "Eine Variante der 100P1 mit einer überdachten Terrasse von 16,4 m² — derselbe Grundriss mit drei Schlafzimmern auf einem größeren Grundstück.",
  },
  {
    productId: "de4203f6-b253-459a-9935-583bf7e77c0b",
    productName: "Optimo 35",
    en: "A compact prefabricated house with a mezzanine — a living room with a kitchenette, a room, and a spacious terrace, priced at the finished-shell standard.",
    nl: "Een compact geprefabriceerd huis met een mezzanine — een woonkamer met keukenhoek, een kamer en een ruim terras, geprijsd op afwerkingsniveau.",
    de: "Ein kompaktes Fertighaus mit Empore — ein Wohnzimmer mit Küchenzeile, ein Zimmer und eine geräumige Terrasse, zum Preis des Ausbaustandards.",
  },
  {
    productId: "73f9ca8d-7343-42f3-a463-b2f8d37da703",
    productName: "Optimo 70P1",
    en: "A single-storey prefabricated two-room house with a living room open to the kitchenette, in a finished shell ready for fit-out.",
    nl: "Een gelijkvloers geprefabriceerd huis met twee kamers en een woonkamer die open is naar de keukenhoek, in afgewerkte staat klaar voor inrichting.",
    de: "Ein eingeschossiges Fertighaus mit zwei Zimmern und einem zur Küchenzeile hin offenen Wohnzimmer, im ausgebauten Zustand bereit zur Einrichtung.",
  },
  {
    productId: "46190c94-8c82-4cf0-9e46-6313df7f993d",
    productName: "Optimo 70P2",
    en: "A variant of Optimo 70 with a covered 11.4 m² terrace — a larger building plot at the same usable floor area.",
    nl: "Een variant van Optimo 70 met een overdekt terras van 11,4 m² — een groter bouwperceel bij dezelfde bruikbare oppervlakte.",
    de: "Eine Variante von Optimo 70 mit einer überdachten Terrasse von 11,4 m² — ein größeres Baugrundstück bei gleicher Nutzfläche.",
  },
  {
    productId: "e4e52ee3-ea28-475d-82b3-fa597448d79a",
    productName: "Optimo 70PP",
    en: "A two-storey prefabricated house with a usable attic — a study/room on the ground floor and three rooms upstairs.",
    nl: "Een geprefabriceerd huis met verdieping en bruikbare zolderverdieping — een werkkamer/kamer op de begane grond en drie kamers op de verdieping.",
    de: "Ein zweigeschossiges Fertighaus mit ausgebautem Dachgeschoss — ein Arbeitszimmer/Zimmer im Erdgeschoss und drei Zimmer im Obergeschoss.",
  },
  {
    productId: "ba2baefd-b175-4601-a39f-05ee4ca590f4",
    productName: "Optimo 82P1",
    en: "The largest single-storey variant in the series, with an 82 m² footprint — two rooms, a spacious living room with a kitchenette.",
    nl: "De grootste gelijkvloerse variant in de serie, met een bebouwde oppervlakte van 82 m² — twee kamers, een ruime woonkamer met keukenhoek.",
    de: "Die größte eingeschossige Variante der Serie mit 82 m² bebauter Fläche — zwei Zimmer, ein geräumiges Wohnzimmer mit Küchenzeile.",
  },
];

// Polskie źródło (product.description) dla powyższych — czytane bezpośrednio
// z bazy w skrypcie (nie duplikowane tu ręcznie), patrz main().

// Kabina wellness 3000: jedyny częściowy przypadek (desc_en/desc_de już
// istnieją, brakuje tylko NL) — obsłużony osobno niżej, ten sam mechanizm
// "tylko gdy NULL" chroni pozostałe kolumny.
const KABINA_PRODUCT_ID = "5c20123c-cb97-4923-a340-281feb549f00";
const KABINA_NL = "Zeer moderne wellnesscabine.";

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "APPLY mode: writing to the database." : "DRY RUN: no writes (pass --apply to write).");

  let filled = 0;
  let skippedAlreadyTranslated = 0;
  let skippedNotFound = 0;

  for (const entry of ENTRIES) {
    const [productRow] = await db
      .select({ description: product.description })
      .from(product)
      .where(eq(product.id, entry.productId));
    if (!productRow) {
      console.warn(`SKIP (product not found): ${entry.productName} (${entry.productId})`);
      skippedNotFound++;
      continue;
    }
    const sourceDescription = productRow.description;
    if (!sourceDescription) {
      console.warn(`SKIP (no Polish source description): ${entry.productName}`);
      continue;
    }

    for (const [locale, description] of [
      ["en", entry.en],
      ["nl", entry.nl],
      ["de", entry.de],
    ] as const) {
      const [existing] = await db
        .select({ description: productTranslation.description })
        .from(productTranslation)
        .where(and(eq(productTranslation.productId, entry.productId), eq(productTranslation.locale, locale)));

      if (existing?.description) {
        skippedAlreadyTranslated++;
        continue;
      }

      console.log(`${apply ? "WRITE" : "WOULD WRITE"} [${locale}] ${entry.productName}`);
      if (!apply) continue;

      if (existing) {
        await db
          .update(productTranslation)
          .set({
            description,
            aiGeneratedDescription: description,
            aiTranslatedFromDescription: sourceDescription,
            updatedAt: new Date(),
          })
          .where(and(eq(productTranslation.productId, entry.productId), eq(productTranslation.locale, locale)));
      } else {
        await db.insert(productTranslation).values({
          productId: entry.productId,
          locale,
          description,
          aiGeneratedDescription: description,
          aiTranslatedFromDescription: sourceDescription,
        });
      }
      filled++;
    }
  }

  // Kabina wellness 3000: NL only.
  const [kabinaProduct] = await db
    .select({ description: product.description })
    .from(product)
    .where(eq(product.id, KABINA_PRODUCT_ID));
  if (kabinaProduct?.description) {
    const [existingNl] = await db
      .select({ description: productTranslation.description })
      .from(productTranslation)
      .where(and(eq(productTranslation.productId, KABINA_PRODUCT_ID), eq(productTranslation.locale, "nl")));
    if (!existingNl?.description) {
      console.log(`${apply ? "WRITE" : "WOULD WRITE"} [nl] Kabina wellness 3000`);
      if (apply) {
        if (existingNl) {
          await db
            .update(productTranslation)
            .set({
              description: KABINA_NL,
              aiGeneratedDescription: KABINA_NL,
              aiTranslatedFromDescription: kabinaProduct.description,
              updatedAt: new Date(),
            })
            .where(and(eq(productTranslation.productId, KABINA_PRODUCT_ID), eq(productTranslation.locale, "nl")));
        } else {
          await db.insert(productTranslation).values({
            productId: KABINA_PRODUCT_ID,
            locale: "nl",
            description: KABINA_NL,
            aiGeneratedDescription: KABINA_NL,
            aiTranslatedFromDescription: kabinaProduct.description,
          });
        }
        filled++;
      }
    } else {
      skippedAlreadyTranslated++;
    }
  }

  console.log(
    `\nDone. ${apply ? "Filled" : "Would fill"}: ${filled}. Already translated (skipped): ${skippedAlreadyTranslated}. Products not found: ${skippedNotFound}.`,
  );
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
