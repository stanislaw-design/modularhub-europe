// Jednorazowy skrypt backfillu (poza zakresem spec 0028/0041, znaleziony na
// żywo przez zamawiającego na stronie klienta w /nl — "co zawiera" na karcie
// projektu wciąż po polsku). Wypełnia nowy globalny słownik
// cost_line_item_label_translation (lib/db/schema.ts, migracja
// drizzle/0030_funny_paibok.sql): dopasowany po dokładnym tekście polskiej
// etykiety (label_pl), nie po id wiersza cost_line_item — ten sam tekst
// etykiety powtarza się dziś na setkach wierszy w wielu produktach/wariantach
// (125 unikalnych etykiet na 639 wierszy w żywym katalogu na dzień
// 2026-09-22), więc jeden wpis słownika obsługuje wszystkie wystąpienia.
//
// Tłumaczenie wykonał agent bezpośrednio (nie Azure OpenAI), ten sam wybór co
// wcześniejszy backfill product.description (scripts/backfill-ai-translations-
// 2026-09-22.ts) i product_variant.scope_summary (Neon MCP, ten sam dzień).
//
// Idempotentny: UNIQUE(label_pl, locale) na tabeli, ON CONFLICT DO NOTHING —
// uruchomienie ponowne nigdy nie nadpisuje ręcznej poprawki wpisanej później
// bezpośrednio w bazie.
//
// Użycie:
//   npx tsx --env-file=.env.local scripts/backfill-cost-line-item-label-translations-2026-09-22.ts             (dry run)
//   npx tsx --env-file=.env.local scripts/backfill-cost-line-item-label-translations-2026-09-22.ts -- --apply  (zapis)

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { costLineItemLabelTranslation } from "@/lib/db/schema";

interface LabelEntry {
  pl: string;
  en: string;
  nl: string;
  de: string;
}

const ENTRIES: LabelEntry[] = [
  { pl: "3 łazienki i 4 jednostki klimatyzacji", en: "3 bathrooms and 4 air conditioning units", nl: "3 badkamers en 4 airconditioningunits", de: "3 Badezimmer und 4 Klimageräte" },
  { pl: "Docieplenie i wykończenie elewacji (styropian 40 mm, tynk silikonowy / deska elewacyjna świerkowa)", en: "Facade insulation and finish (40 mm EPS foam, silicone render / spruce facade board)", nl: "Gevelisolatie en -afwerking (40 mm EPS-schuim, silicone pleister / vurenhouten gevelbekleding)", de: "Fassadendämmung und -verkleidung (40 mm EPS-Dämmung, Silikonputz / Fichten-Fassadenschalung)" },
  { pl: "Drzwi wejściowe stalowe w kolorze antracytowym", en: "Steel entrance door in anthracite", nl: "Stalen voordeur in antracietkleur", de: "Stahl-Eingangstür in Anthrazit" },
  { pl: "Drzwi wewnętrzne w kolorze białym", en: "White interior doors", nl: "Witte binnendeuren", de: "Weiße Innentüren" },
  { pl: "Drzwi zewnętrzne stalowe, antywłamaniowe", en: "Steel exterior door, burglar-resistant", nl: "Stalen buitendeur, inbraakwerend", de: "Stahl-Außentür, einbruchhemmend" },
  { pl: "Drzwi zewnętrzne stalowe, zamek z 3-punktowym ryglowaniem", en: "Steel exterior door, lock with 3-point locking", nl: "Stalen buitendeur, slot met 3-puntsvergrendeling", de: "Stahl-Außentür, Schloss mit 3-Punkt-Verriegelung" },
  { pl: "Elewacja Vinylit / naturalna deska drewniana / termodrewno (zamiast sidingu VOX)", en: "Vinylit / natural wood board / thermowood facade (instead of VOX siding)", nl: "Vinylit-gevel / natuurlijke houten plank / thermohout (in plaats van VOX-gevelbekleding)", de: "Vinylit-Fassade / Naturholzbrett / Thermoholz (anstelle von VOX-Verkleidung)" },
  { pl: "Fundamenty", en: "Foundations", nl: "Funderingen", de: "Fundamente" },
  { pl: "Geodezyjne wytyczenie budynku na działce", en: "Geodetic staking-out of the building on the plot", nl: "Landmeetkundige uitzetting van het gebouw op het perceel", de: "Geodätisches Abstecken des Gebäudes auf dem Grundstück" },
  { pl: "Grzejniki stalowe (alternatywa dla ogrzewania podłogowego)", en: "Steel radiators (alternative to underfloor heating)", nl: "Stalen radiatoren (alternatief voor vloerverwarming)", de: "Stahlheizkörper (Alternative zur Fußbodenheizung)" },
  { pl: "Grzejniki stalowe płytowe z zaworami termostatycznymi (Wariant 2, alternatywa)", en: "Steel panel radiators with thermostatic valves (Variant 2, alternative)", nl: "Stalen paneelradiatoren met thermostaatkranen (Variant 2, alternatief)", de: "Stahl-Flachheizkörper mit Thermostatventilen (Variante 2, Alternative)" },
  { pl: "Gwarancja 2 lata: pozostałe elementy budynku", en: "2-year warranty: remaining building elements", nl: "2 jaar garantie: overige onderdelen van het gebouw", de: "2 Jahre Garantie: übrige Gebäudeelemente" },
  { pl: "Gwarancja 25 lat: konstrukcja, dach, izolacja", en: "25-year warranty: structure, roof, insulation", nl: "25 jaar garantie: constructie, dak, isolatie", de: "25 Jahre Garantie: Konstruktion, Dach, Dämmung" },
  { pl: "Gwarancja 5 lat: elewacja", en: "5-year warranty: facade", nl: "5 jaar garantie: gevel", de: "5 Jahre Garantie: Fassade" },
  { pl: "Gładkie ściany wewnętrzne: płyty FORESTIA lub boazeria drewniana (zamiast STRAMA)", en: "Smooth interior walls: FORESTIA panels or wood panelling (instead of STRAMA)", nl: "Gladde binnenwanden: FORESTIA-platen of houten lambrisering (in plaats van STRAMA)", de: "Glatte Innenwände: FORESTIA-Platten oder Holzverkleidung (anstelle von STRAMA)" },
  { pl: "Instalacja elektryczna", en: "Electrical installation", nl: "Elektrische installatie", de: "Elektroinstallation" },
  { pl: "Instalacja wodno-kanalizacyjna (przewody zimnej/ciepłej wody i kanalizacji)", en: "Water and sewage installation (cold/hot water pipes and drainage)", nl: "Water- en rioolinstallatie (leidingen voor koud/warm water en riolering)", de: "Wasser- und Abwasserinstallation (Kalt-/Warmwasserleitungen und Kanalisation)" },
  { pl: "Instalacja wodno-kanalizacyjna (rozprowadzenie rur)", en: "Water and sewage installation (pipe distribution)", nl: "Water- en rioolinstallatie (leidingverdeling)", de: "Wasser- und Abwasserinstallation (Rohrverteilung)" },
  { pl: "Instalacja wodno-kanalizacyjna w strefie pod domkiem", en: "Water and sewage installation in the zone under the house", nl: "Water- en rioolinstallatie in de zone onder het huis", de: "Wasser- und Abwasserinstallation im Bereich unter dem Haus" },
  { pl: "Izolacja PUR zamknięto-komórkowa wtryskiwana w ścianach i dachu (160/195 mm)", en: "Closed-cell PUR foam insulation, spray-injected in the walls and roof (160/195 mm)", nl: "Gesloten-cellige PUR-schuimisolatie, ingespoten in wanden en dak (160/195 mm)", de: "Geschlossenzellige PUR-Schaumdämmung, eingespritzt in Wände und Dach (160/195 mm)" },
  { pl: "Izolacja przeciwwilgociowa fundamentu (membrana EPDM) i wykończenie cokołu", en: "Foundation damp-proofing (EPDM membrane) and plinth finish", nl: "Vochtwering van de fundering (EPDM-membraan) en plintafwerking", de: "Feuchtigkeitsisolierung des Fundaments (EPDM-Folie) und Sockelverkleidung" },
  { pl: "Izolacja ścian i dachu pianą otwartokomórkową PUR", en: "Wall and roof insulation with open-cell PUR foam", nl: "Wand- en dakisolatie met open-cellig PUR-schuim", de: "Wand- und Dachdämmung mit offenzelligem PUR-Schaum" },
  { pl: "Konstrukcja szkieletowa z drewna klejonego C24 (ściany, dach, strop)", en: "Timber-frame structure of C24 glue-laminated wood (walls, roof, ceiling)", nl: "Houtskeletconstructie van C24-gelamineerd hout (wanden, dak, vloer)", de: "Holzrahmenkonstruktion aus C24-Brettschichtholz (Wände, Dach, Decke)" },
  { pl: "Konstrukcja szkieletowa z drewna klejonego C24/KVH (ściany, strop, dach)", en: "Timber-frame structure of C24/KVH glue-laminated wood (walls, ceiling, roof)", nl: "Houtskeletconstructie van C24/KVH-gelamineerd hout (wanden, vloer, dak)", de: "Holzrahmenkonstruktion aus C24/KVH-Brettschichtholz (Wände, Decke, Dach)" },
  { pl: "Membrany dachowe (strukturalna i wodoodporna)", en: "Roof membranes (structural and waterproof)", nl: "Dakfolies (structureel en waterdicht)", de: "Dachfolien (strukturell und wasserdicht)" },
  { pl: "Odwodnienie połaci dachu (rynny i rury spustowe)", en: "Roof drainage (gutters and downpipes)", nl: "Dakontwatering (dakgoten en regenpijpen)", de: "Dachentwässerung (Dachrinnen und Fallrohre)" },
  { pl: "Ogrzewanie podłogowe", en: "Underfloor heating", nl: "Vloerverwarming", de: "Fußbodenheizung" },
  { pl: "Ogrzewanie podłogowe (Wariant 1 dystrybucji ciepła)", en: "Underfloor heating (heat distribution Variant 1)", nl: "Vloerverwarming (warmteverdeling Variant 1)", de: "Fußbodenheizung (Wärmeverteilung Variante 1)" },
  { pl: "Okna PCV 3-szybowe i drzwi tarasowe", en: "Triple-glazed PVC windows and terrace doors", nl: "PVC-ramen met triple glas en terrasdeuren", de: "PVC-Fenster mit Dreifachverglasung und Terrassentüren" },
  { pl: "Okna PCV 3-szybowe i drzwi tarasowe FIX+R+RU", en: "Triple-glazed PVC windows and FIX+R+RU terrace doors", nl: "PVC-ramen met triple glas en FIX+R+RU-terrasdeuren", de: "PVC-Fenster mit Dreifachverglasung und FIX+R+RU-Terrassentüren" },
  { pl: "Okna PCV Aluplast, 5-komorowe, do wyboru z 2 kolorów", en: "Aluplast PVC windows, 5-chamber, choice of 2 colours", nl: "Aluplast PVC-ramen, 5-kamers, keuze uit 2 kleuren", de: "Aluplast-PVC-Fenster, 5-Kammer-System, Auswahl aus 2 Farben" },
  { pl: "Osprzęt elektryczny (60 punktów: oświetlenie, gniazda, przełączniki na pomieszczenie)", en: "Electrical fittings (60 points: lighting, sockets, switches per room)", nl: "Elektrische armaturen (60 punten: verlichting, stopcontacten, schakelaars per ruimte)", de: "Elektroausstattung (60 Punkte: Beleuchtung, Steckdosen, Schalter pro Raum)" },
  { pl: "Osprzęt elektryczny (60 punktów: oświetlenie, gniazda, przełączniki)", en: "Electrical fittings (60 points: lighting, sockets, switches)", nl: "Elektrische armaturen (60 punten: verlichting, stopcontacten, schakelaars)", de: "Elektroausstattung (60 Punkte: Beleuchtung, Steckdosen, Schalter)" },
  { pl: "Osprzęt elektryczny i oświetleniowy", en: "Electrical and lighting fittings", nl: "Elektrische en verlichtingsarmaturen", de: "Elektro- und Beleuchtungsausstattung" },
  { pl: "Parapety zewnętrzne metalowe", en: "External metal window sills", nl: "Metalen buitenvensterbanken", de: "Außenfensterbänke aus Metall" },
  { pl: "Podejścia wodne do punktów sanitarnych", en: "Water supply connections to sanitary fixtures", nl: "Wateraansluitingen naar sanitaire punten", de: "Wasseranschlüsse zu den Sanitärpunkten" },
  { pl: "Podejścia wodne i kanalizacyjne do punktów sanitarnych", en: "Water and sewage connections to sanitary fixtures", nl: "Water- en rioolaansluitingen naar sanitaire punten", de: "Wasser- und Abwasseranschlüsse zu den Sanitärpunkten" },
  { pl: "Podejścia wodne i kanalizacyjne do punktów sanitarnych (piony w przekroju ścian)", en: "Water and sewage connections to sanitary fixtures (risers within wall sections)", nl: "Water- en rioolaansluitingen naar sanitaire punten (stijgleidingen in de wanddoorsnede)", de: "Wasser- und Abwasseranschlüsse zu den Sanitärpunkten (Steigleitungen im Wandquerschnitt)" },
  { pl: "Podłoga: panele laminowane", en: "Flooring: laminate panels", nl: "Vloer: laminaatpanelen", de: "Boden: Laminatpaneele" },
  { pl: "Pokrycie dachowe (blachodachówka / blacha na rąbek, kolor antracyt)", en: "Roof covering (metal roof tiles / standing-seam sheet metal, anthracite colour)", nl: "Dakbedekking (metalen dakpannen / staande-naad plaatstaal, antracietkleur)", de: "Dacheindeckung (Blechdachziegel / Stehfalzblech, Farbe Anthrazit)" },
  { pl: "Pokrycie dachowe (blachodachówka) i membrany dachowe", en: "Roof covering (metal roof tiles) and roof membranes", nl: "Dakbedekking (metalen dakpannen) en dakfolies", de: "Dacheindeckung (Blechdachziegel) und Dachfolien" },
  { pl: "Posadzka i izolacja termiczna podłogi parteru", en: "Ground floor slab and thermal insulation", nl: "Vloerplaat en thermische isolatie van de begane grondvloer", de: "Bodenplatte und Wärmedämmung des Erdgeschossbodens" },
  { pl: "Posadzka i izolacja termiczna podłogi parteru (styropian EPS 20, 120 mm)", en: "Ground floor slab and thermal insulation (EPS 20 foam, 120 mm)", nl: "Vloerplaat en thermische isolatie van de begane grondvloer (EPS 20-schuim, 120 mm)", de: "Bodenplatte und Wärmedämmung des Erdgeschossbodens (EPS-20-Dämmung, 120 mm)" },
  { pl: "Przesuwne drzwi tarasowe (zamiast rozwieralno-uchylnych)", en: "Sliding terrace doors (instead of tilt-and-turn)", nl: "Schuifpui op het terras (in plaats van draai-kiepdeuren)", de: "Schiebe-Terrassentüren (anstelle von Dreh-Kipp-Türen)" },
  { pl: "Przyłącza zewnętrzne mediów (prąd, woda, kanalizacja, gaz, telefon)", en: "External utility connections (electricity, water, sewage, gas, telephone)", nl: "Externe nutsaansluitingen (elektriciteit, water, riolering, gas, telefoon)", de: "Externe Medienanschlüsse (Strom, Wasser, Abwasser, Gas, Telefon)" },
  { pl: "Rurarz pod instalację elektryczną (bez okablowania)", en: "Conduit for electrical installation (without wiring)", nl: "Leidingsysteem voor elektrische installatie (zonder bekabeling)", de: "Leerrohrsystem für Elektroinstallation (ohne Verkabelung)" },
  { pl: "Rurarz pod instalację elektryczną wewnątrz prefabrykatów (bez okablowania)", en: "Conduit for electrical installation inside the prefabricated elements (without wiring)", nl: "Leidingsysteem voor elektrische installatie binnen de prefab-elementen (zonder bekabeling)", de: "Leerrohrsystem für Elektroinstallation innerhalb der Fertigbauteile (ohne Verkabelung)" },
  { pl: "Siding VOX na ścianach bocznych (dowolny wzór z oferty VOX)", en: "VOX siding on side walls (any pattern from the VOX range)", nl: "VOX-gevelbekleding op de zijwanden (elk patroon uit het VOX-assortiment)", de: "VOX-Verkleidung an den Seitenwänden (beliebiges Muster aus dem VOX-Sortiment)" },
  { pl: "Stalowy szkielet nośny z profili stalowych 140×80×5, 80×80×3, 80×40×4 mm", en: "Load-bearing steel frame made of 140×80×5, 80×80×3, 80×40×4 mm steel profiles", nl: "Dragend stalen skelet van stalen profielen 140×80×5, 80×80×3, 80×40×4 mm", de: "Tragendes Stahlgerüst aus Stahlprofilen 140×80×5, 80×80×3, 80×40×4 mm" },
  { pl: "Sufit podwieszany z płyt G-K nad parterem", en: "Suspended plasterboard ceiling above the ground floor", nl: "Verlaagd gipsplaatplafond boven de begane grond", de: "Abgehängte Gipskartondecke über dem Erdgeschoss" },
  { pl: "Szafka bezpiecznikowa (dostawa i montaż)", en: "Fuse box (supply and installation)", nl: "Zekeringkast (levering en montage)", de: "Sicherungskasten (Lieferung und Montage)" },
  { pl: "Szafka licznikowa", en: "Meter cabinet", nl: "Meterkast", de: "Zählerschrank" },
  { pl: "Tynk silikonowy / okładzina elewacyjna", en: "Silicone render / facade cladding", nl: "Silicone pleister / gevelbekleding", de: "Silikonputz / Fassadenverkleidung" },
  { pl: "Urządzenia sanitarne (WC, umywalka, wanna, prysznic)", en: "Sanitary fixtures (toilet, washbasin, bathtub, shower)", nl: "Sanitaire voorzieningen (toilet, wastafel, bad, douche)", de: "Sanitäreinrichtungen (WC, Waschbecken, Badewanne, Dusche)" },
  { pl: "Urządzenia sanitarne (WC, umywalka, wanna/prysznic wg konfiguratora)", en: "Sanitary fixtures (toilet, washbasin, bathtub/shower per configurator)", nl: "Sanitaire voorzieningen (toilet, wastafel, bad/douche volgens configurator)", de: "Sanitäreinrichtungen (WC, Waschbecken, Badewanne/Dusche gemäß Konfigurator)" },
  { pl: "VAT — ceny źródłowe są cenami netto", en: "VAT — source prices are net prices", nl: "Btw — bronprijzen zijn nettoprijzen", de: "MwSt. — Ausgangspreise sind Nettopreise" },
  { pl: "Wentylacja mechaniczna", en: "Mechanical ventilation", nl: "Mechanische ventilatie", de: "Mechanische Lüftung" },
  { pl: "Wentylacja mechaniczna z odzyskiem ciepła (rekuperacja)", en: "Mechanical ventilation with heat recovery", nl: "Mechanische ventilatie met warmteterugwinning", de: "Mechanische Lüftung mit Wärmerückgewinnung" },
  { pl: "Zaplecze budowy (kontener na odpady, prąd, sanitariat)", en: "Construction site facilities (waste container, power, sanitary facility)", nl: "Bouwplaatsvoorzieningen (afvalcontainer, stroom, sanitaire voorziening)", de: "Baustelleneinrichtung (Abfallcontainer, Strom, Sanitäranlage)" },
  { pl: "Zgłoszenie budowy / pozwolenie na budowę i użytkowanie", en: "Building notification / building and occupancy permit", nl: "Bouwmelding / bouw- en gebruiksvergunning", de: "Bauanzeige / Bau- und Nutzungsgenehmigung" },
  { pl: "Zgłoszenie budowy / pozwolenie na budowę, użytkowanie i odbiór kominiarski", en: "Building notification / building, occupancy, and chimney sweep acceptance permit", nl: "Bouwmelding / bouw-, gebruiks- en schoorsteenvegerskeuring", de: "Bauanzeige / Bau-, Nutzungs- und Schornsteinfegerabnahme" },
  { pl: "adaptację projektu i indywidualne zmiany", en: "project adaptation and individual changes", nl: "projectaanpassing en individuele wijzigingen", de: "Projektanpassung und individuelle Änderungen" },
  { pl: "dach dwuspadowy pokryty blachodachówką", en: "gable roof covered with metal roof tiles", nl: "zadeldak bedekt met metalen dakpannen", de: "Satteldach mit Blechdachziegeln gedeckt" },
  { pl: "dach dwuspadowy pokryty blachą na rąbek stojący", en: "gable roof covered with standing-seam sheet metal", nl: "zadeldak bedekt met staande-naad plaatstaal", de: "Satteldach mit Stehfalzblech gedeckt" },
  { pl: "dach jednospadowy pokryty blachą na rąbek stojący", en: "single-pitch roof covered with standing-seam sheet metal", nl: "lessenaarsdak bedekt met staande-naad plaatstaal", de: "Pultdach mit Stehfalzblech gedeckt" },
  { pl: "dach płaski pokryty membraną hydroizolacyjną", en: "flat roof covered with a waterproofing membrane", nl: "plat dak bedekt met een waterdichte folie", de: "Flachdach mit einer Abdichtungsfolie gedeckt" },
  { pl: "dostawę do 100 km według deklaracji producenta", en: "delivery up to 100 km per the producer's declaration", nl: "levering tot 100 km volgens opgave van de producent", de: "Lieferung bis zu 100 km gemäß Angabe des Herstellers" },
  { pl: "drewniana konstrukcja budynku z elewacją drewnianą", en: "timber building structure with a wood facade", nl: "houten gebouwconstructie met een houten gevel", de: "hölzerne Gebäudekonstruktion mit Holzfassade" },
  { pl: "drzwi wejściowe stalowe, antywłamaniowe", en: "steel entrance door, burglar-resistant", nl: "stalen voordeur, inbraakwerend", de: "Stahl-Eingangstür, einbruchhemmend" },
  { pl: "dwa moduły CLT na dwóch kondygnacjach w standardzie deweloperskim", en: "two CLT modules on two storeys in developer standard", nl: "twee CLT-modules op twee verdiepingen in ontwikkelaarsstandaard", de: "zwei CLT-Module auf zwei Geschossen im Bauträgerstandard" },
  { pl: "dwa moduły CLT w standardzie deweloperskim", en: "two CLT modules in developer standard", nl: "twee CLT-modules in ontwikkelaarsstandaard", de: "zwei CLT-Module im Bauträgerstandard" },
  { pl: "dźwig do rozładunku", en: "crane for unloading", nl: "kraan voor het lossen", de: "Kran zum Abladen" },
  { pl: "elementy nieoznaczone jako zawarte w wybranym pakiecie", en: "elements not marked as included in the chosen package", nl: "elementen die niet zijn aangeduid als inbegrepen in het gekozen pakket", de: "Elemente, die nicht als im gewählten Paket enthalten gekennzeichnet sind" },
  { pl: "foliowanie domu na czas transportu", en: "wrapping the house in foil for transport", nl: "het huis in folie verpakken voor transport", de: "Folienverpackung des Hauses für den Transport" },
  { pl: "fundament punktowy", en: "point foundation", nl: "puntfundering", de: "Punktfundament" },
  { pl: "fundamenty", en: "foundations", nl: "funderingen", de: "Fundamente" },
  { pl: "instalacja elektryczna i hydrauliczna", en: "electrical and plumbing installation", nl: "elektrische en loodgietersinstallatie", de: "Elektro- und Sanitärinstallation" },
  { pl: "instalacje elektryczne", en: "electrical installations", nl: "elektrische installaties", de: "Elektroinstallationen" },
  { pl: "instalacje wodno-kanalizacyjne", en: "water and sewage installations", nl: "water- en rioolinstallaties", de: "Wasser- und Abwasserinstallationen" },
  { pl: "konstrukcja budynku z elewacją drewnianą", en: "building structure with a wood facade", nl: "gebouwconstructie met een houten gevel", de: "Gebäudekonstruktion mit Holzfassade" },
  { pl: "konstrukcja budynku z elewacją z płyt włóknowo-cementowych", en: "building structure with a fibre-cement panel facade", nl: "gebouwconstructie met een vezelcementplaten-gevel", de: "Gebäudekonstruktion mit Faserzementplatten-Fassade" },
  { pl: "konstrukcję, stolarkę i instalacje przewidziane w wybranym wariancie", en: "the structure, joinery, and installations included in the chosen variant", nl: "de constructie, het schrijnwerk en de installaties voorzien in de gekozen variant", de: "die im gewählten Variante vorgesehene Konstruktion, Fenster/Türen und Installationen" },
  { pl: "moduł CLT w standardzie deweloperskim", en: "CLT module in developer standard", nl: "CLT-module in ontwikkelaarsstandaard", de: "CLT-Modul im Bauträgerstandard" },
  { pl: "montaż budynku na działce", en: "assembly of the building on the plot", nl: "montage van het gebouw op het perceel", de: "Montage des Gebäudes auf dem Grundstück" },
  { pl: "montaż na miejscu", en: "on-site assembly", nl: "montage ter plaatse", de: "Montage vor Ort" },
  { pl: "ocieplenie dachu w stropie wełną mineralną gr. 30 cm", en: "roof insulation in the ceiling with 30 cm mineral wool", nl: "dakisolatie in de vloer met 30 cm minerale wol", de: "Dachdämmung in der Decke mit 30 cm Mineralwolle" },
  { pl: "ocieplenie dachu wełną mineralną gr. 30 cm", en: "roof insulation with 30 cm mineral wool", nl: "dakisolatie met 30 cm minerale wol", de: "Dachdämmung mit 30 cm Mineralwolle" },
  { pl: "ocieplenie ścian wełną mineralną gr. 20 cm", en: "wall insulation with 20 cm mineral wool", nl: "wandisolatie met 20 cm minerale wol", de: "Wanddämmung mit 20 cm Mineralwolle" },
  { pl: "ocieplenie ścian wełną mineralną gr. 29 cm", en: "wall insulation with 29 cm mineral wool", nl: "wandisolatie met 29 cm minerale wol", de: "Wanddämmung mit 29 cm Mineralwolle" },
  { pl: "ocieplenie ścian, dachu i podłogi wełną mineralną", en: "wall, roof, and floor insulation with mineral wool", nl: "wand-, dak- en vloerisolatie met minerale wol", de: "Wand-, Dach- und Bodendämmung mit Mineralwolle" },
  { pl: "okna PVC trzyszybowe", en: "triple-glazed PVC windows", nl: "PVC-ramen met triple glas", de: "PVC-Fenster mit Dreifachverglasung" },
  { pl: "okna i drzwi wejściowe PVC trzyszybowe", en: "triple-glazed PVC windows and entrance door", nl: "PVC-ramen en voordeur met triple glas", de: "PVC-Fenster und Eingangstür mit Dreifachverglasung" },
  { pl: "oświetlenie zewnętrzne i wewnętrzne", en: "exterior and interior lighting", nl: "buiten- en binnenverlichting", de: "Außen- und Innenbeleuchtung" },
  { pl: "panel winylowy na podłodze", en: "vinyl flooring panel", nl: "vinylpaneel op de vloer", de: "Vinylpaneel auf dem Boden" },
  { pl: "panoramiczne przeszklenie", en: "panoramic glazing", nl: "panoramische beglazing", de: "Panoramaverglasung" },
  { pl: "pergole i tarasy", en: "pergolas and terraces", nl: "pergola's en terrassen", de: "Pergolen und Terrassen" },
  { pl: "pergole, tarasy i basen", en: "pergolas, terraces, and pool", nl: "pergola's, terrassen en zwembad", de: "Pergolen, Terrassen und Pool" },
  { pl: "platforma pływająca", en: "floating platform", nl: "drijvend platform", de: "Schwimmende Plattform" },
  { pl: "prace fundamentowe", en: "foundation works", nl: "funderingswerkzaamheden", de: "Fundamentarbeiten" },
  { pl: "prace fundamentowe lub platforma pływająca", en: "foundation works or floating platform", nl: "funderingswerkzaamheden of drijvend platform", de: "Fundamentarbeiten oder schwimmende Plattform" },
  { pl: "projekty domu: architektoniczno-budowlany (do adaptacji) i techniczny", en: "house designs: architectural-construction (for adaptation) and technical", nl: "huisontwerpen: architectonisch-bouwkundig (voor aanpassing) en technisch", de: "Hausentwürfe: architektonisch-baulich (zur Anpassung) und technisch" },
  { pl: "przygotowanie działki oraz przyłącza", en: "plot preparation and connections", nl: "perceelvoorbereiding en aansluitingen", de: "Grundstücksvorbereitung und Anschlüsse" },
  { pl: "przygotowanie podłoża", en: "ground preparation", nl: "voorbereiding van de ondergrond", de: "Untergrundvorbereitung" },
  { pl: "przyłącza mediów (energia elektryczna, woda, kanalizacja, internet)", en: "utility connections (electricity, water, sewage, internet)", nl: "nutsaansluitingen (elektriciteit, water, riolering, internet)", de: "Medienanschlüsse (Strom, Wasser, Abwasser, Internet)" },
  { pl: "puszki i peszle pod elektrykę", en: "junction boxes and conduits for electrical wiring", nl: "aansluitdozen en mantelbuizen voor elektra", de: "Abzweigdosen und Leerrohre für die Elektrik" },
  { pl: "scalenie modułów na miejscu", en: "on-site joining of the modules", nl: "koppeling van de modules ter plaatse", de: "Zusammenfügen der Module vor Ort" },
  { pl: "stalowa konstrukcja wsporcza i montaż bryły", en: "steel support structure and assembly of the shell", nl: "stalen draagconstructie en montage van het bouwvolume", de: "Stahltragkonstruktion und Montage des Baukörpers" },
  { pl: "strop wygłuszony, pokryty płytą MFP", en: "soundproofed ceiling, covered with MFP board", nl: "geluidsgeïsoleerde vloer, bedekt met MFP-plaat", de: "schallgedämmte Decke, mit MFP-Platte verkleidet" },
  { pl: "transport", en: "transport", nl: "transport", de: "Transport" },
  { pl: "transport powyżej 100 km", en: "transport over 100 km", nl: "transport boven 100 km", de: "Transport über 100 km" },
  { pl: "trzy moduły CLT w standardzie deweloperskim", en: "three CLT modules in developer standard", nl: "drie CLT-modules in ontwikkelaarsstandaard", de: "drei CLT-Module im Bauträgerstandard" },
  { pl: "wykończenie wnętrza deską obiciową malowaną", en: "interior finish with painted panelling boards", nl: "interieurafwerking met geschilderde lambriseringsplanken", de: "Innenausbau mit gestrichenen Verkleidungsbrettern" },
  { pl: "wykończenie wnętrza płytą włóknowo-gipsową", en: "interior finish with fibre-gypsum board", nl: "interieurafwerking met vezelgipsplaat", de: "Innenausbau mit Gipsfaserplatte" },
  { pl: "wyposażona łazienka (prysznic, WC, umywalka, szafka, lustro)", en: "equipped bathroom (shower, toilet, washbasin, cabinet, mirror)", nl: "uitgeruste badkamer (douche, toilet, wastafel, kastje, spiegel)", de: "ausgestattetes Badezimmer (Dusche, WC, Waschbecken, Schrank, Spiegel)" },
  { pl: "zakres wybranego pakietu Basic, Comfort lub Premium zgodnie z tabelą producenta", en: "scope of the chosen Basic, Comfort, or Premium package per the producer's table", nl: "omvang van het gekozen pakket Basic, Comfort of Premium volgens de tabel van de producent", de: "Umfang des gewählten Pakets Basic, Comfort oder Premium gemäß Hersteller-Tabelle" },
  { pl: "Łazienka: podłoga i ściany wykończone płytkami VOX Villo", en: "Bathroom: floor and walls finished with VOX Villo tiles", nl: "Badkamer: vloer en wanden afgewerkt met VOX Villo-tegels", de: "Badezimmer: Boden und Wände mit VOX-Villo-Fliesen verkleidet" },
  { pl: "łazienka i 1 jednostka klimatyzacji", en: "bathroom and 1 air conditioning unit", nl: "badkamer en 1 airconditioningunit", de: "Badezimmer und 1 Klimagerät" },
  { pl: "łazienka i 3 jednostki klimatyzacji", en: "bathroom and 3 air conditioning units", nl: "badkamer en 3 airconditioningunits", de: "Badezimmer und 3 Klimageräte" },
  { pl: "Ściany boczne i dach: blacha na rąbek stojący (Pruszyński)", en: "Side walls and roof: Pruszyński standing-seam sheet metal", nl: "Zijwanden en dak: Pruszyński staande-naad plaatstaal", de: "Seitenwände und Dach: Pruszyński-Stehfalzblech" },
  { pl: "Ściany wewnętrzne działowe (płyty G-K, izolacja akustyczna z wełny mineralnej)", en: "Interior partition walls (plasterboard, acoustic insulation with mineral wool)", nl: "Binnenscheidingswanden (gipsplaat, akoestische isolatie met minerale wol)", de: "Innentrennwände (Gipskartonplatten, Schalldämmung mit Mineralwolle)" },
  { pl: "Ściany wewnętrzne: wykończenie płytami STRAMA", en: "Interior walls: finished with STRAMA panels", nl: "Binnenwanden: afgewerkt met STRAMA-panelen", de: "Innenwände: mit STRAMA-Paneelen verkleidet" },
  { pl: "Ściany wewnętrzne: wzmacniane, ognioodporne płyty GK 15 mm (bez szpachlowania i malowania) lub płyty OSB", en: "Interior walls: reinforced, fire-resistant 15 mm plasterboard (without filling and painting) or OSB board", nl: "Binnenwanden: versterkte, brandwerende gipsplaat 15 mm (zonder plamuren en schilderen) of OSB-plaat", de: "Innenwände: verstärkte, feuerbeständige Gipskartonplatten 15 mm (ohne Spachteln und Streichen) oder OSB-Platten" },
  { pl: "ścianki działowe z izolacją", en: "partition walls with insulation", nl: "scheidingswanden met isolatie", de: "Trennwände mit Dämmung" },
  { pl: "Źródło ciepła (Wariant 1: pompa ciepła powietrze-woda z kotłownią / Wariant 2: kocioł gazowy jednofunkcyjny)", en: "Heat source (Variant 1: air-to-water heat pump with boiler room / Variant 2: single-function gas boiler)", nl: "Warmtebron (Variant 1: lucht-waterwarmtepomp met stookruimte / Variant 2: enkelvoudige gasketel)", de: "Wärmequelle (Variante 1: Luft-Wasser-Wärmepumpe mit Heizraum / Variante 2: Einzweck-Gaskessel)" },
  { pl: "Źródło ciepła (pompa ciepła lub kocioł gazowy)", en: "Heat source (heat pump or gas boiler)", nl: "Warmtebron (warmtepomp of gasketel)", de: "Wärmequelle (Wärmepumpe oder Gaskessel)" },
];

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "APPLY mode: writing to the database." : "DRY RUN: no writes (pass --apply to write).");

  let written = 0;
  let skipped = 0;

  for (const entry of ENTRIES) {
    for (const [locale, translatedLabel] of [
      ["en", entry.en],
      ["nl", entry.nl],
      ["de", entry.de],
    ] as const) {
      const [existing] = await db
        .select({ id: costLineItemLabelTranslation.id })
        .from(costLineItemLabelTranslation)
        .where(
          and(eq(costLineItemLabelTranslation.labelPl, entry.pl), eq(costLineItemLabelTranslation.locale, locale)),
        );
      if (existing) {
        skipped++;
        continue;
      }
      console.log(`${apply ? "WRITE" : "WOULD WRITE"} [${locale}] ${entry.pl.slice(0, 50)}...`);
      written++;
      if (!apply) continue;
      await db.insert(costLineItemLabelTranslation).values({ labelPl: entry.pl, locale, translatedLabel });
    }
  }

  console.log(`\nDone. ${apply ? "Written" : "Would write"}: ${written}. Already present (skipped): ${skipped}.`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
