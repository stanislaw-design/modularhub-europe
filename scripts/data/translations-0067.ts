// Tłumaczenia EN/DE/NL dla backfillu spec 0067 (scripts/backfill-translations-0067.ts).
// Klucz to dokładny polski tekst źródłowy z bazy (łącznie z literówkami źródła,
// np. "montaz"), dopasowanie w SQL jest po równości tekstu, nigdy po pozycji.
// Tłumaczenie wykonał agent bezpośrednio (nie Azure OpenAI), ten sam wybór co
// wcześniejsze backfille spec 0028. Bez danych kontaktowych (adres e-mail, www)
// w opisach producentów, patrz reguła "no producer contact in partner section".

export type Entry = readonly [pl: string, en: string, de: string, nl: string];

const KW_NOTE = {
  wifiEn: "SPA CONTROL WiFi controller",
  wifiDe: "WLAN-Steuerung SPA CONTROL",
  wifiNl: "SPA CONTROL wifi-besturing",
};

export const OPTION_GROUP_NAMES: Entry[] = [
  ["Aneks kuchenny", "Kitchenette", "Küchenzeile", "Kitchenette"],
  ["Klimatyzacja", "Air conditioning", "Klimaanlage", "Airconditioning"],
  ["Kolor impregnacji drewna", "Wood stain colour", "Farbton der Holzimprägnierung", "Kleur van de houtimpregnatie"],
  ["Konstrukcja", "Structure", "Konstruktion", "Constructie"],
  ["Pakiet świetlny DreamLight", "DreamLight lighting package", "DreamLight-Lichtpaket", "DreamLight-lichtpakket"],
  ["Panele podczerwieni", "Infrared panels", "Infrarotpaneele", "Infraroodpanelen"],
  ["Piec", "Stove", "Ofen", "Kachel"],
  ["Poziom ocieplenia", "Insulation level", "Dämmstufe", "Isolatieniveau"],
  ["Przeszklenie", "Glazing", "Verglasung", "Beglazing"],
  ["Roleta zewnętrzna", "External roller blind", "Außenrollo", "Buitenrolgordijn"],
  ["Sterowanie WiFi", "WiFi control", "WLAN-Steuerung", "Wifi-bediening"],
  ["System audio", "Audio system", "Audiosystem", "Audiosysteem"],
  ["WC", "Toilet", "WC", "Toilet"],
];

export const OPTION_LABELS: Entry[] = [
  ["Antracyt", "Anthracite", "Anthrazit", "Antraciet"],
  ["Bez pakietu DreamLight", "Without DreamLight package", "Ohne DreamLight-Paket", "Zonder DreamLight-pakket"],
  ["Bez paneli podczerwieni", "Without infrared panels", "Ohne Infrarotpaneele", "Zonder infraroodpanelen"],
  ["Bez sterowania WiFi", "Without WiFi control", "Ohne WLAN-Steuerung", "Zonder wifi-bediening"],
  ["Bez systemu audio", "Without audio system", "Ohne Audiosystem", "Zonder audiosysteem"],
  ["Brak", "None", "Keine", "Geen"],
  ["Dodatkowe wzmocnienie podłogi", "Additional floor reinforcement", "Zusätzliche Bodenverstärkung", "Extra vloerversterking"],
  [
    "EOS thermat 9kW (SPA Control wifi + kamienie)",
    "EOS thermat 9kW (SPA Control WiFi + stones)",
    "EOS thermat 9kW (SPA Control WLAN + Steine)",
    "EOS thermat 9kW (SPA Control wifi + stenen)",
  ],
  [
    "Harvia Cilindro PC90 E + Sterownik WiFi SPA CONTROL",
    `Harvia Cilindro PC90 E + ${KW_NOTE.wifiEn}`,
    `Harvia Cilindro PC90 E + ${KW_NOTE.wifiDe}`,
    `Harvia Cilindro PC90 E + ${KW_NOTE.wifiNl}`,
  ],
  [
    "Harvia Glow TRT90E 9kW (SPA Control wifi + kamienie)",
    "Harvia Glow TRT90E 9kW (SPA Control WiFi + stones)",
    "Harvia Glow TRT90E 9kW (SPA Control WLAN + Steine)",
    "Harvia Glow TRT90E 9kW (SPA Control wifi + stenen)",
  ],
  [
    "Harvia Legend czarny home 6,8 kW (SPA Control wifi + kamienie)",
    "Harvia Legend black home 6.8 kW (SPA Control WiFi + stones)",
    "Harvia Legend schwarz home 6,8 kW (SPA Control WLAN + Steine)",
    "Harvia Legend zwart home 6,8 kW (SPA Control wifi + stenen)",
  ],
  [
    "Harvia Linear 18kW (na drewno, komin + kamienie)",
    "Harvia Linear 18kW (wood-burning, chimney + stones)",
    "Harvia Linear 18kW (holzbefeuert, Schornstein + Steine)",
    "Harvia Linear 18kW (houtgestookt, schoorsteen + stenen)",
  ],
  ["Harvia M3 (na drewno)", "Harvia M3 (wood-burning)", "Harvia M3 (holzbefeuert)", "Harvia M3 (houtgestookt)"],
  ["Heban", "Ebony", "Ebenholz", "Ebbenhout"],
  [
    "Hive Mini 13kW (na drewno, komin + kamienie)",
    "Hive Mini 13kW (wood-burning, chimney + stones)",
    "Hive Mini 13kW (holzbefeuert, Schornstein + Steine)",
    "Hive Mini 13kW (houtgestookt, schoorsteen + stenen)",
  ],
  [
    "Huum Drop 9kW + Sterownik WiFi SPA CONTROL",
    `Huum Drop 9kW + ${KW_NOTE.wifiEn}`,
    `Huum Drop 9kW + ${KW_NOTE.wifiDe}`,
    `Huum Drop 9kW + ${KW_NOTE.wifiNl}`,
  ],
  [
    "Huum Hive Mini 9kW + Sterownik WiFi SPA CONTROL",
    `Huum Hive Mini 9kW + ${KW_NOTE.wifiEn}`,
    `Huum Hive Mini 9kW + ${KW_NOTE.wifiDe}`,
    `Huum Hive Mini 9kW + ${KW_NOTE.wifiNl}`,
  ],
  ["Jasny dąb", "Light oak", "Helle Eiche", "Licht eiken"],
  ["Komplet rolet", "Set of roller blinds", "Rollo-Set", "Set rolgordijnen"],
  ["Konstrukcja kątownikowa", "Angle-iron structure", "Winkelprofil-Konstruktion", "Hoekprofielconstructie"],
  ["Naturalna", "Natural", "Natur", "Naturel"],
  ["Nie", "No", "Nein", "Nee"],
  ["Orzech", "Walnut", "Nussbaum", "Walnoot"],
  ["Palisander", "Rosewood", "Palisander", "Palissander"],
  ["Panele podczerwieni 350W", "Infrared panels 350 W", "Infrarotpaneele 350 W", "Infraroodpanelen 350 W"],
  ["Pianka PIR 100mm", "PIR foam 100 mm", "PIR-Schaum 100 mm", "PIR-schuim 100 mm"],
  [
    "Pianka PIR 120/160mm (zalecane)",
    "PIR foam 120/160 mm (recommended)",
    "PIR-Schaum 120/160 mm (empfohlen)",
    "PIR-schuim 120/160 mm (aanbevolen)",
  ],
  ["Pianka PIR 160/160/120mm", "PIR foam 160/160/120 mm", "PIR-Schaum 160/160/120 mm", "PIR-schuim 160/160/120 mm"],
  [
    "Profil zamknięty (zalecane)",
    "Closed profile (recommended)",
    "Geschlossenes Profil (empfohlen)",
    "Gesloten profiel (aanbevolen)",
  ],
  ["Sinclair Keyon 3,4 kW", "Sinclair Keyon 3.4 kW", "Sinclair Keyon 3,4 kW", "Sinclair Keyon 3,4 kW"],
  ["Sinclair Keyon 4,6 kW", "Sinclair Keyon 4.6 kW", "Sinclair Keyon 4,6 kW", "Sinclair Keyon 4,6 kW"],
  ["Sinclair Terrel 3,5 kW", "Sinclair Terrel 3.5 kW", "Sinclair Terrel 3,5 kW", "Sinclair Terrel 3,5 kW"],
  ["Sinclair Terrel 5,3 kW", "Sinclair Terrel 5.3 kW", "Sinclair Terrel 5,3 kW", "Sinclair Terrel 5,3 kW"],
  ["Standardowe szyby + drzwi", "Standard glass + door", "Standardglas + Tür", "Standaardglas + deur"],
  ["Styropian 100mm", "EPS foam 100 mm", "EPS-Dämmung 100 mm", "EPS-isolatie 100 mm"],
  ["Tak", "Yes", "Ja", "Ja"],
  [
    "Tulikivi Naava Nobile 9kW (SPA Control wifi + kamienie)",
    "Tulikivi Naava Nobile 9kW (SPA Control WiFi + stones)",
    "Tulikivi Naava Nobile 9kW (SPA Control WLAN + Steine)",
    "Tulikivi Naava Nobile 9kW (SPA Control wifi + stenen)",
  ],
  [
    "Tulikivi Tuisku Rigata 9kW (SPA Control wifi + kamienie)",
    "Tulikivi Tuisku Rigata 9kW (SPA Control WiFi + stones)",
    "Tulikivi Tuisku Rigata 9kW (SPA Control WLAN + Steine)",
    "Tulikivi Tuisku Rigata 9kW (SPA Control wifi + stenen)",
  ],
  [
    "WK Legend 150 16kW (na drewno, komin + kamienie)",
    "WK Legend 150 16kW (wood-burning, chimney + stones)",
    "WK Legend 150 16kW (holzbefeuert, Schornstein + Steine)",
    "WK Legend 150 16kW (houtgestookt, schoorsteen + stenen)",
  ],
  [
    "Z pakietem świetlnym DreamLight",
    "With DreamLight lighting package",
    "Mit DreamLight-Lichtpaket",
    "Met DreamLight-lichtpakket",
  ],
  ["Z systemem audio", "With audio system", "Mit Audiosystem", "Met audiosysteem"],
  ["Ze sterowaniem WiFi", "With WiFi control", "Mit WLAN-Steuerung", "Met wifi-bediening"],
  [
    "Zmiana szyby na okno",
    "Replace glass panel with a window",
    "Austausch der Scheibe gegen ein Fenster",
    "Glaspaneel vervangen door een raam",
  ],
];

export const PRODUCER_DESCRIPTIONS: Entry[] = [
  [
    "Amerykański producent telewizorów i wyświetlaczy zewnętrznych odpornych na warunki atmosferyczne. Partner resellerski ModularHub Europe.",
    "American manufacturer of weather resistant outdoor TVs and displays. Reseller partner of ModularHub Europe.",
    "US-amerikanischer Hersteller von wetterfesten Outdoor-Fernsehern und -Displays. Reseller-Partner von ModularHub Europe.",
    "Amerikaanse fabrikant van weerbestendige buitentelevisies en -displays. Reseller-partner van ModularHub Europe.",
  ],
  // Źródło PerfectCube kończy się zdaniem z adresem e-mail i www. Tłumaczenia
  // go celowo nie zawierają (kontakt tylko przez platformę), źródło nietknięte.
  [
    "Polski producent domów modułowych, obecny na rynku od 7 lat, z 30 zrealizowanymi projektami. Konstrukcja spawana ze stali, docieplenie PUR/styropian, elewacja z fasady strukturalnej. Domy budowane również w standardzie KfW-Effizienzhaus 40/40 Plus. Kontakt: kontakt@perfectcube.eu, www.perfectcube.eu.",
    "Polish manufacturer of modular homes, on the market for 7 years with 30 completed projects. Welded steel structure, PUR/polystyrene insulation, structural façade cladding. Homes are also built to the KfW Effizienzhaus 40/40 Plus standard.",
    "Polnischer Hersteller von Modulhäusern, seit 7 Jahren am Markt, mit 30 realisierten Projekten. Geschweißte Stahlkonstruktion, Dämmung aus PUR/Polystyrol, Fassade mit Strukturverkleidung. Die Häuser werden auch im Standard KfW-Effizienzhaus 40/40 Plus gebaut.",
    "Poolse fabrikant van modulaire woningen, al 7 jaar actief op de markt, met 30 gerealiseerde projecten. Gelaste staalconstructie, isolatie van PUR/polystyreen, gevel met structuurbekleding. De woningen worden ook gebouwd volgens de KfW-Effizienzhaus 40/40 Plus-standaard.",
  ],
  [
    "Polski producent saun zewnętrznych (m.in. model Qube), dostawa gotowa do użycia; fundament i przyłącze elektryczne po stronie klienta.",
    "Polish manufacturer of outdoor saunas (including the Qube model), delivered ready to use; foundation and electrical connection are the customer's responsibility.",
    "Polnischer Hersteller von Außensaunen (u. a. Modell Qube), Lieferung gebrauchsfertig; Fundament und Stromanschluss erfolgen durch den Kunden.",
    "Poolse fabrikant van buitensauna's (o.a. model Qube), gebruiksklaar geleverd; fundering en elektrische aansluiting zijn voor rekening van de klant.",
  ],
  [
    "Polski producent saun zewnętrznych (m.in. model Relax 550), łącznie z montażem; piec, kolor impregnacji drewna i panele podczerwieni dobierane osobno jako płatne opcje.",
    "Polish manufacturer of outdoor saunas (including the Relax 550 model), installation included; the stove, wood stain colour and infrared panels are chosen separately as paid options.",
    "Polnischer Hersteller von Außensaunen (u. a. Modell Relax 550), einschließlich Montage; Ofen, Farbton der Holzimprägnierung und Infrarotpaneele werden separat als kostenpflichtige Optionen gewählt.",
    "Poolse fabrikant van buitensauna's (o.a. model Relax 550), inclusief montage; kachel, kleur van de houtimpregnatie en infraroodpanelen worden apart gekozen als betaalde opties.",
  ],
  [
    "Producent kontenerów i pawilonów modułowych na bazie stalowej konstrukcji, Czekanów.",
    "Manufacturer of modular containers and pavilions on a steel frame, based in Czekanów.",
    "Hersteller von Modulcontainern und -pavillons auf Stahlkonstruktion, Sitz in Czekanów.",
    "Fabrikant van modulaire containers en paviljoens op een staalconstructie, gevestigd in Czekanów.",
  ],
];

export const CERTIFICATIONS: Entry[] = [
  [
    "Budowa Domów Całorocznych",
    "Year-round house construction",
    "Bau von Ganzjahreshäusern",
    "Bouw van vierseizoenenwoningen",
  ],
  [
    "Zgodność z Bbl (deklaracja producenta)",
    "Bbl compliance (manufacturer's declaration)",
    "Konformität mit Bbl (Herstellererklärung)",
    "Conformiteit met Bbl (verklaring van de fabrikant)",
  ],
];

export const FOUNDATION_OPTIONS: Entry[] = [
  [
    "Fundament i przyłącze elektryczne po stronie klienta",
    "Foundation and electrical connection provided by the customer",
    "Fundament und Stromanschluss durch den Kunden",
    "Fundering en elektrische aansluiting door de klant",
  ],
  [
    "Fundament żelbetowy, zbrojenie stal B500SP wg PN-H 93220:2018-02 (granica plastyczności 500–625 MPa, pręty Ø8–32 mm)",
    "Reinforced concrete foundation, B500SP steel reinforcement to PN-H 93220:2018-02 (yield strength 500–625 MPa, Ø8–32 mm bars)",
    "Stahlbetonfundament, Bewehrung aus Stahl B500SP nach PN-H 93220:2018-02 (Streckgrenze 500–625 MPa, Stäbe Ø8–32 mm)",
    "Gewapend betonnen fundering, wapening van staal B500SP volgens PN-H 93220:2018-02 (vloeigrens 500–625 MPa, staven Ø8–32 mm)",
  ],
  [
    "Platforma pływająca lub punktowe podpory na lądzie — bez tradycyjnego fundamentu",
    "Floating platform or point supports on land, no traditional foundation",
    "Schwimmende Plattform oder Punktstützen an Land, ohne klassisches Fundament",
    "Drijvend platform of puntondersteuningen op land, zonder traditionele fundering",
  ],
  [
    "Przygotowanie fundamentu i podłączenie zasilania po stronie klienta",
    "Foundation preparation and power supply connection by the customer",
    "Vorbereitung des Fundaments und Stromanschluss durch den Kunden",
    "Voorbereiding van de fundering en aansluiting van de stroomvoorziening door de klant",
  ],
  [
    "Przygotowanie podłoża po stronie klienta",
    "Ground preparation by the customer",
    "Untergrundvorbereitung durch den Kunden",
    "Voorbereiding van de ondergrond door de klant",
  ],
  [
    "Przygotowanie podłoża po stronie klienta, płyta lub punktowe posadowienie",
    "Ground preparation by the customer, slab or point foundation",
    "Untergrundvorbereitung durch den Kunden, Bodenplatte oder Punktfundamente",
    "Voorbereiding van de ondergrond door de klant, funderingsplaat of puntfundering",
  ],
  [
    "Punktowe fundamenty pod stalowe podpory, projektowane indywidualnie do warunków gruntowych",
    "Point foundations for steel supports, designed individually for the ground conditions",
    "Punktfundamente für Stahlstützen, individuell auf die Bodenverhältnisse ausgelegt",
    "Puntfunderingen voor stalen steunen, individueel ontworpen voor de grondomstandigheden",
  ],
  [
    "Punktowe podpory lub płyta fundamentowa po analizie gruntu",
    "Point supports or foundation slab after ground analysis",
    "Punktstützen oder Fundamentplatte nach Bodenanalyse",
    "Puntondersteuningen of funderingsplaat na grondonderzoek",
  ],
  ["Płyta fundamentowa", "Foundation slab", "Fundamentplatte", "Funderingsplaat"],
  [
    "Płyta fundamentowa lub punktowe podpory po analizie gruntu",
    "Foundation slab or point supports after ground analysis",
    "Fundamentplatte oder Punktstützen nach Bodenanalyse",
    "Funderingsplaat of puntondersteuningen na grondonderzoek",
  ],
  [
    "Płyta fundamentowa wyceniana indywidualnie; nie jest częścią opublikowanego zakresu domu",
    "Foundation slab priced individually; not part of the published scope of the house",
    "Fundamentplatte wird individuell kalkuliert; nicht Teil des veröffentlichten Leistungsumfangs des Hauses",
    "Funderingsplaat wordt individueel geprijsd; maakt geen deel uit van de gepubliceerde omvang van de woning",
  ],
  [
    "Płyta żelbetowa 200 mm na warstwach podbudowy i izolacji",
    "200 mm reinforced concrete slab on sub-base and insulation layers",
    "200 mm Stahlbetonplatte auf Schichten aus Unterbau und Dämmung",
    "200 mm gewapende betonplaat op lagen van fundering en isolatie",
  ],
  [
    "Sposób posadowienia dobierany do działki i uzgadniany z producentem",
    "Foundation method chosen to suit the plot and agreed with the manufacturer",
    "Gründungsart wird auf das Grundstück abgestimmt und mit dem Hersteller vereinbart",
    "De funderingswijze wordt afgestemd op het perceel en overeengekomen met de fabrikant",
  ],
  ["Twardy", "Hard", "Hart", "Hard"],
];

export const CONSTRUCTION_SYSTEMS: Entry[] = [
  [
    "Dom mobilny – moduł drewniany produkowany w całości w zakładzie, dostarczany na działkę gotowy do postawienia",
    "Mobile home – timber module built entirely in the factory, delivered to the plot ready to be placed",
    "Mobilheim – Holzmodul, vollständig im Werk gefertigt und gebrauchsfertig zum Aufstellen auf das Grundstück geliefert",
    "Mobiele woning – houten module die volledig in de fabriek wordt gebouwd en klaar om geplaatst te worden op het perceel wordt geleverd",
  ],
  [
    "Dom prefabrykowany – szkielet drewniany produkowany w module fabrycznym, montowany na działce z gotowych elementów",
    "Prefabricated house – timber frame produced as a factory module, assembled on the plot from ready-made elements",
    "Fertighaus – Holzrahmen, als Fabrikmodul gefertigt und auf dem Grundstück aus fertigen Elementen montiert",
    "Prefabwoning – houtskelet, vervaardigd als fabrieksmodule en op het perceel gemonteerd uit kant-en-klare elementen",
  ],
  [
    "Dom szkieletowy drewniany – elewacja drewniana, strop wygłuszony pokryty płytą MFP",
    "Timber frame house – timber façade, soundproofed ceiling covered with MFP board",
    "Holzrahmenhaus – Holzfassade, schallgedämmte Decke mit MFP-Platte",
    "Houtskeletbouwwoning – houten gevel, geluidsdempende vloer afgewerkt met MFP-plaat",
  ],
  [
    "Dwa prefabrykowane moduły CLT (drewno klejone krzyżowo) łączone na miejscu",
    "Two prefabricated CLT (cross-laminated timber) modules joined on site",
    "Zwei vorgefertigte CLT-Module (Brettsperrholz), vor Ort verbunden",
    "Twee geprefabriceerde CLT-modules (kruislaaghout), ter plaatse met elkaar verbonden",
  ],
  [
    "Dwa prefabrykowane moduły CLT (drewno klejone krzyżowo), druga kondygnacja wspornikowo na stalowych podporach",
    "Two prefabricated CLT (cross-laminated timber) modules, upper storey cantilevered on steel supports",
    "Zwei vorgefertigte CLT-Module (Brettsperrholz), zweites Geschoss auskragend auf Stahlstützen",
    "Twee geprefabriceerde CLT-modules (kruislaaghout), tweede verdieping uitkragend op stalen steunen",
  ],
  ["Konstrukcja stalowa", "Steel structure", "Stahlkonstruktion", "Staalconstructie"],
  [
    "Prefabrykowana konstrukcja drewniana C24/KVH z izolacją PUR zamkniętokomórkową",
    "Prefabricated C24/KVH timber structure with closed-cell PUR insulation",
    "Vorgefertigte Holzkonstruktion C24/KVH mit geschlossenzelliger PUR-Dämmung",
    "Geprefabriceerde houtconstructie C24/KVH met gesloten-cel PUR-isolatie",
  ],
  [
    "Prefabrykowany moduł drewniany, montowany na miejscu",
    "Prefabricated timber module, assembled on site",
    "Vorgefertigtes Holzmodul, vor Ort montiert",
    "Geprefabriceerde houten module, ter plaatse gemonteerd",
  ],
  [
    "Prefabrykowany moduł na szkielecie drewnianym",
    "Prefabricated module on a timber frame",
    "Vorgefertigtes Modul auf Holzrahmen",
    "Geprefabriceerde module op een houtskelet",
  ],
  [
    "Prefabrykowany pojedynczy moduł CLT (drewno klejone krzyżowo)",
    "Prefabricated single CLT (cross-laminated timber) module",
    "Vorgefertigtes einzelnes CLT-Modul (Brettsperrholz)",
    "Geprefabriceerde enkele CLT-module (kruislaaghout)",
  ],
  [
    "Prefabrykowany pojedynczy moduł CLT (drewno klejone krzyżowo) z przeszkleniem na całej długości",
    "Prefabricated single CLT (cross-laminated timber) module with glazing along its full length",
    "Vorgefertigtes einzelnes CLT-Modul (Brettsperrholz) mit Verglasung über die gesamte Länge",
    "Geprefabriceerde enkele CLT-module (kruislaaghout) met beglazing over de volledige lengte",
  ],
  [
    "Prefabrykowany szkielet drewniany z drewna konstrukcyjnego C24",
    "Prefabricated timber frame made of C24 structural timber",
    "Vorgefertigter Holzrahmen aus Konstruktionsholz C24",
    "Geprefabriceerd houtskelet van constructiehout C24",
  ],
  [
    "Płyta konstrukcyjna certyfikowana, okładzina ThermoWood",
    "Certified structural board, ThermoWood cladding",
    "Zertifizierte Konstruktionsplatte, ThermoWood-Verkleidung",
    "Gecertificeerde constructieplaat, ThermoWood-bekleding",
  ],
  [
    "Spawana konstrukcja szkieletu stalowego (moduły fabryczne)",
    "Welded steel frame structure (factory modules)",
    "Geschweißte Stahlskelettkonstruktion (Fabrikmodule)",
    "Gelaste staalskeletconstructie (fabrieksmodules)",
  ],
  [
    "Trzy prefabrykowane moduły CLT (drewno klejone krzyżowo) łączone na miejscu",
    "Three prefabricated CLT (cross-laminated timber) modules joined on site",
    "Drei vorgefertigte CLT-Module (Brettsperrholz), vor Ort verbunden",
    "Drie geprefabriceerde CLT-modules (kruislaaghout), ter plaatse met elkaar verbonden",
  ],
  [
    "stalowy szkielet z profili stalowych",
    "steel frame made of steel profiles",
    "Stahlskelett aus Stahlprofilen",
    "staalskelet van stalen profielen",
  ],
  [
    "stalowy szkielet z profili stalowych 80 mm",
    "steel frame made of 80 mm steel profiles",
    "Stahlskelett aus 80-mm-Stahlprofilen",
    "staalskelet van stalen profielen van 80 mm",
  ],
];

export const ROOF_TYPES: Entry[] = [
  ["30°", "30°", "30°", "30°"],
  ["35°", "35°", "35°", "35°"],
  ["40°", "40°", "40°", "40°"],
  ["45°", "45°", "45°", "45°"],
  ["Dwuspadowy, 22°, 40%", "Gable, 22°, 40%", "Satteldach, 22°, 40 %", "Zadeldak, 22°, 40%"],
  [
    "Dwuspadowy, 31,4°, 61%; pokrycie blachą na rąbek",
    "Gable, 31.4°, 61%; standing seam metal roofing",
    "Satteldach, 31,4°, 61 %; Stehfalzblechdeckung",
    "Zadeldak, 31,4°, 61%; metalen dak met staande naad",
  ],
  ["Dwuspadowy, 35°, 70%", "Gable, 35°, 70%", "Satteldach, 35°, 70 %", "Zadeldak, 35°, 70%"],
  ["Dwuspadowy, nachylenie 40°", "Gable, 40° pitch", "Satteldach, Neigung 40°", "Zadeldak, helling 40°"],
  [
    "Dwuspadowy, pokrycie blachą na rąbek stojący",
    "Gable, standing seam metal roofing",
    "Satteldach, Stehfalzblechdeckung",
    "Zadeldak, metalen dak met staande naad",
  ],
  [
    "Dwuspadowy, pokrycie blachą trapezową T7",
    "Gable, T7 trapezoidal metal sheet roofing",
    "Satteldach, Trapezblech T7",
    "Zadeldak, trapeziumvormige metalen dakplaten T7",
  ],
  [
    "Dwuspadowy; blacha na rąbek lub dachówka zależnie od pakietu",
    "Gable; standing seam metal or roof tiles depending on the package",
    "Satteldach; Stehfalzblech oder Dachziegel je nach Paket",
    "Zadeldak; staande-naadmetaal of dakpannen afhankelijk van het pakket",
  ],
  ["Płaski", "Flat", "Flachdach", "Plat dak"],
  [
    "Płaski, z tarasem na dachu górnej kondygnacji",
    "Flat, with a roof terrace on the top storey",
    "Flachdach mit Dachterrasse auf dem obersten Geschoss",
    "Plat dak, met een dakterras op de bovenste verdieping",
  ],
  [
    "Płaski, zintegrowany z bryłą modułów",
    "Flat, integrated into the module volume",
    "Flachdach, in den Baukörper der Module integriert",
    "Plat dak, geïntegreerd in het volume van de modules",
  ],
  [
    "Płaski, zintegrowany z zaokrągloną bryłą modułu",
    "Flat, integrated into the rounded module volume",
    "Flachdach, in den abgerundeten Baukörper des Moduls integriert",
    "Plat dak, geïntegreerd in het afgeronde volume van de module",
  ],
  [
    "Płaski; papa w Basic, membrana EPDM w Comfort i Premium",
    "Flat; roofing felt in Basic, EPDM membrane in Comfort and Premium",
    "Flachdach; Dachpappe bei Basic, EPDM-Membran bei Comfort und Premium",
    "Plat dak; bitumen dakbedekking bij Basic, EPDM-membraan bij Comfort en Premium",
  ],
  [
    "blacha na rąbek stojący",
    "standing seam metal roofing",
    "Stehfalzblechdeckung",
    "metalen dak met staande naad",
  ],
  ["dwuspadowy", "gable", "Satteldach", "zadeldak"],
  [
    "dwuspadowy, blacha na rąbek stojący",
    "gable, standing seam metal roofing",
    "Satteldach, Stehfalzblech",
    "zadeldak, metalen dak met staande naad",
  ],
  ["dwuspadowy, blachodachówka", "gable, metal roof tiles", "Satteldach, Blechdachziegel", "zadeldak, metalen dakpannen"],
  ["jednospadowy", "mono-pitch", "Pultdach", "lessenaarsdak"],
  [
    "jednospadowy lub dwuspadowy (opcja)",
    "mono-pitch or gable (option)",
    "Pultdach oder Satteldach (Option)",
    "lessenaarsdak of zadeldak (optie)",
  ],
  ["płaski, membrana hydroizolacyjna", "flat, waterproofing membrane", "Flachdach, Abdichtungsbahn", "plat dak, waterdichte membraan"],
];

export const CUSTOMIZATION_SCOPES: Entry[] = [
  [
    "Dostępny w stanie deweloperskim z szerokim wachlarzem opcji dodatkowych (katalog, strony 14–28).",
    "Available in developer's shell condition with a wide range of additional options (catalogue, pages 14–28).",
    "Im Rohbauzustand (Developer-Standard) erhältlich, mit einer breiten Palette an Zusatzoptionen (Katalog, Seiten 14–28).",
    "Beschikbaar in ruwbouwstaat (ontwikkelaarsstandaard) met een breed scala aan extra opties (catalogus, pagina's 14–28).",
  ],
  [
    "Układ drugiego piętra (dostępne warianty rozkładu), wykończenie, przeszklenia, taras na dachu",
    "Layout of the second floor (available layout variants), finish, glazing, roof terrace",
    "Aufteilung der zweiten Etage (verfügbare Grundrissvarianten), Ausbau, Verglasung, Dachterrasse",
    "Indeling van de tweede verdieping (beschikbare indelingsvarianten), afwerking, beglazing, dakterras",
  ],
  [
    "Układ wnętrza (strefa dzienna/sypialnia), wykończenie, kolor elewacji",
    "Interior layout (living area/bedroom), finish, façade colour",
    "Raumaufteilung (Wohnbereich/Schlafzimmer), Ausbau, Fassadenfarbe",
    "Indeling van het interieur (woonruimte/slaapkamer), afwerking, gevelkleur",
  ],
  [
    "Układ wnętrza strefy dziennej, wykończenie, liczba jednostek klimatyzacji",
    "Living area interior layout, finish, number of air conditioning units",
    "Raumaufteilung des Wohnbereichs, Ausbau, Anzahl der Klimageräte",
    "Indeling van de woonruimte, afwerking, aantal airconditioningunits",
  ],
  [
    "Układ wnętrza, wykończenie, liczba jednostek klimatyzacji",
    "Interior layout, finish, number of air conditioning units",
    "Raumaufteilung, Ausbau, Anzahl der Klimageräte",
    "Indeling van het interieur, afwerking, aantal airconditioningunits",
  ],
  [
    "Wersja lądowa lub pływająca, wykończenie wnętrza, kolor elewacji",
    "Land or floating version, interior finish, façade colour",
    "Landversion oder schwimmende Version, Innenausbau, Fassadenfarbe",
    "Landversie of drijvende versie, afwerking van het interieur, gevelkleur",
  ],
  [
    "Wybór wariantu ogrzewania; opcjonalne lustrzane odbicie, dwustronny kolor antracyt stolarki, drzwi przesuwne, taras z pergolą",
    "Choice of heating variant; optional mirror-image layout, anthracite joinery colour on both sides, sliding door, terrace with pergola",
    "Wahl der Heizungsvariante; optional spiegelverkehrter Grundriss, beidseitig anthrazitfarbene Fenster und Türen, Schiebetür, Terrasse mit Pergola",
    "Keuze van de verwarmingsvariant; optioneel spiegelbeeld, tweezijdig antracietkleurig houtwerk, schuifdeur, terras met pergola",
  ],
  [
    "Zmiany projektu, stolarka, elewacja, dach, instalacje, termoizolacja i standard wykończenia zależnie od wybranego pakietu",
    "Design changes, joinery, façade, roof, installations, thermal insulation and finishing standard depending on the chosen package",
    "Planänderungen, Fenster und Türen, Fassade, Dach, Installationen, Wärmedämmung und Ausbaustandard je nach gewähltem Paket",
    "Wijzigingen aan het ontwerp, kozijnen en deuren, gevel, dak, installaties, thermische isolatie en afwerkingsniveau afhankelijk van het gekozen pakket",
  ],
];

// Powody decyzji zgodności (product_country_eligibility.reason i
// product_compliance_assessment.reason), trafiają do słownika
// reference_text_translation.
export const REFERENCE_TEXTS: Entry[] = [
  [
    "Dwumodułowa konstrukcja CLT spełnia standardowe wymagania krajów związkowych.",
    "The two-module CLT structure meets the standard requirements of the German federal states.",
    "Die zweimodulige CLT-Konstruktion erfüllt die Standardanforderungen der Bundesländer.",
    "De CLT-constructie met twee modules voldoet aan de standaardeisen van de Duitse deelstaten.",
  ],
  [
    "Format zgodny z powszechną w Holandii praktyką zabudowy pływającej nad wodą.",
    "The format matches common Dutch practice for floating buildings on water.",
    "Das Format entspricht der in den Niederlanden üblichen Praxis für schwimmende Bauten auf dem Wasser.",
    "Het formaat komt overeen met de in Nederland gangbare praktijk voor drijvende bouw op het water.",
  ],
  [
    "Katalog producenta nie podaje odporności ogniowej wymaganej do pełnej weryfikacji w tej jurysdykcji.",
    "The manufacturer's catalogue does not state the fire resistance required for full verification in this jurisdiction.",
    "Der Herstellerkatalog gibt die für eine vollständige Prüfung in dieser Rechtsordnung erforderliche Feuerwiderstandsfähigkeit nicht an.",
    "De catalogus van de fabrikant vermeldt niet de brandwerendheid die nodig is voor volledige verificatie in dit rechtsgebied.",
  ],
  [
    "Katalog producenta nie podaje współczynników przenikania ciepła okien wymaganych do weryfikacji BENG.",
    "The manufacturer's catalogue does not state the window heat transfer coefficients required for BENG verification.",
    "Der Herstellerkatalog gibt die für die BENG-Prüfung erforderlichen Wärmedurchgangskoeffizienten der Fenster nicht an.",
    "De catalogus van de fabrikant vermeldt niet de warmtedoorgangscoëfficiënten van de ramen die nodig zijn voor BENG-verificatie.",
  ],
  [
    "Katalog producenta nie zawiera obliczeń dla stalowej konstrukcji wspornikowej wymaganych przy holenderskich warunkach gruntowych i wietrznych.",
    "The manufacturer's catalogue does not include calculations for the cantilevered steel structure required for Dutch ground and wind conditions.",
    "Der Herstellerkatalog enthält keine Berechnungen für die auskragende Stahlkonstruktion, die für die niederländischen Boden- und Windverhältnisse erforderlich sind.",
    "De catalogus van de fabrikant bevat geen berekeningen voor de uitkragende staalconstructie die vereist zijn voor de Nederlandse grond- en windomstandigheden.",
  ],
  [
    "Kompaktowy moduł mieści się w wymaganiach dla obiektów tymczasowych/rekreacyjnych.",
    "The compact module fits the requirements for temporary/recreational structures.",
    "Das kompakte Modul erfüllt die Anforderungen für temporäre bzw. Freizeitbauten.",
    "De compacte module voldoet aan de eisen voor tijdelijke/recreatieve bouwwerken.",
  ],
  [
    "Konstrukcja i standard wykończenia zgodne z wymaganiami DIN dla budynków jednorodzinnych.",
    "The structure and finishing standard comply with DIN requirements for single-family houses.",
    "Konstruktion und Ausbaustandard entsprechen den DIN-Anforderungen für Einfamilienhäuser.",
    "Constructie en afwerkingsniveau voldoen aan de DIN-eisen voor eengezinswoningen.",
  ],
  [
    "Metraż i konstrukcja zgodne z powszechną w Holandii praktyką zabudowy modułowej.",
    "Floor area and structure match common Dutch modular building practice.",
    "Wohnfläche und Konstruktion entsprechen der in den Niederlanden üblichen Praxis der Modulbauweise.",
    "Oppervlakte en constructie komen overeen met de in Nederland gangbare praktijk voor modulaire bouw.",
  ],
  [
    "Metraż poniżej progu zgłoszeniowego, zgodny z warunkami technicznymi dla zabudowy rekreacyjnej.",
    "Floor area below the notification threshold, compliant with technical conditions for recreational buildings.",
    "Fläche unterhalb der Anzeigeschwelle, entspricht den technischen Bedingungen für Freizeitbauten.",
    "Oppervlakte onder de meldingsdrempel, in overeenstemming met de technische voorwaarden voor recreatiebouw.",
  ],
  [
    "Możliwość realizacji i wymagania formalne zależą od konkretnej działki oraz lokalnych ustaleń.",
    "Feasibility and formal requirements depend on the specific plot and local regulations.",
    "Realisierbarkeit und formale Anforderungen hängen vom konkreten Grundstück und den örtlichen Vorgaben ab.",
    "Haalbaarheid en formele vereisten zijn afhankelijk van het specifieke perceel en de lokale voorschriften.",
  ],
  ["Producent krajowy", "Domestic manufacturer", "Inländischer Hersteller", "Binnenlandse fabrikant"],
  [
    "Producent krajowy, montaz na miejscu",
    "Domestic manufacturer, on-site assembly",
    "Inländischer Hersteller, Montage vor Ort",
    "Binnenlandse fabrikant, montage ter plaatse",
  ],
  [
    "Produkcja krajowa, konstrukcja stalowa modułowa zgodna z warunkami technicznymi dla obiektów całorocznych w Polsce.",
    "Domestic production, modular steel structure compliant with the technical conditions for year-round buildings in Poland.",
    "Inländische Produktion, modulare Stahlkonstruktion gemäß den technischen Bedingungen für Ganzjahresgebäude in Polen.",
    "Binnenlandse productie, modulaire staalconstructie conform de technische voorwaarden voor vierseizoensgebouwen in Polen.",
  ],
  [
    "Spełnia holenderskie wymagania BENG dla budynków mieszkalnych.",
    "Meets the Dutch BENG requirements for residential buildings.",
    "Erfüllt die niederländischen BENG-Anforderungen für Wohngebäude.",
    "Voldoet aan de Nederlandse BENG-eisen voor woongebouwen.",
  ],
  [
    "Spełnia holenderskie wymagania konstrukcyjne dla budynków modułowych tej wielkości.",
    "Meets the Dutch structural requirements for modular buildings of this size.",
    "Erfüllt die niederländischen statischen Anforderungen für Modulgebäude dieser Größe.",
    "Voldoet aan de Nederlandse constructie-eisen voor modulaire gebouwen van deze omvang.",
  ],
  [
    "Stalowa konstrukcja wsporcza spełnia standardowe wymagania krajów związkowych dla konstrukcji wspornikowych.",
    "The steel support structure meets the standard requirements of the federal states for cantilevered structures.",
    "Die Stahltragkonstruktion erfüllt die Standardanforderungen der Bundesländer für auskragende Konstruktionen.",
    "De stalen draagconstructie voldoet aan de standaardeisen van de deelstaten voor uitkragende constructies.",
  ],
  [
    "Stałe zamieszkanie wymaga pełnej dokumentacji technicznej (Bauantrag) zależnej od landu; sama konstrukcja modułowa spełnia standardowe wymagania.",
    "Permanent residence requires full technical documentation (Bauantrag) that depends on the federal state; the modular structure itself meets the standard requirements.",
    "Dauerhaftes Wohnen erfordert vollständige technische Unterlagen (Bauantrag), die vom Bundesland abhängen; die Modulkonstruktion selbst erfüllt die Standardanforderungen.",
    "Permanente bewoning vereist volledige technische documentatie (Bauantrag) die afhankelijk is van de deelstaat; de modulaire constructie zelf voldoet aan de standaardeisen.",
  ],
  ["Test", "Test", "Test", "Test"],
  [
    "Trzymodułowy układ spełnia holenderskie wymagania konstrukcyjne dla tej klasy budynków.",
    "The three-module layout meets the Dutch structural requirements for this class of buildings.",
    "Die dreimodulige Anordnung erfüllt die niederländischen statischen Anforderungen für diese Gebäudeklasse.",
    "De opstelling met drie modules voldoet aan de Nederlandse constructie-eisen voor deze gebouwklasse.",
  ],
  [
    "Wersja pływająca wymaga odrębnej zgody wodnoprawnej; wersja lądowa na podporach nie podlega temu ograniczeniu.",
    "The floating version requires a separate water permit; the land version on supports is not subject to this restriction.",
    "Die schwimmende Version erfordert eine gesonderte wasserrechtliche Genehmigung; die Landversion auf Stützen unterliegt dieser Einschränkung nicht.",
    "De drijvende versie vereist een aparte watervergunning; de landversie op steunen valt niet onder deze beperking.",
  ],
  [
    "Zadeklarowane przez producenta jako kraj dostawy.",
    "Declared by the manufacturer as a delivery country.",
    "Vom Hersteller als Lieferland angegeben.",
    "Door de fabrikant opgegeven als leveringsland.",
  ],
  [
    "Zgodne z warunkami technicznymi dla budynków całorocznych w Polsce.",
    "Compliant with the technical conditions for year-round buildings in Poland.",
    "Entspricht den technischen Bedingungen für Ganzjahresgebäude in Polen.",
    "Voldoet aan de technische voorwaarden voor vierseizoensgebouwen in Polen.",
  ],
  [
    "Zgodne z warunkami technicznymi dla budynków dwukondygnacyjnych w Polsce.",
    "Compliant with the technical conditions for two-storey buildings in Poland.",
    "Entspricht den technischen Bedingungen für zweigeschossige Gebäude in Polen.",
    "Voldoet aan de technische voorwaarden voor gebouwen met twee bouwlagen in Polen.",
  ],
  [
    "Zgodne z warunkami technicznymi obowiązującymi w Polsce.",
    "Compliant with the technical conditions in force in Poland.",
    "Entspricht den in Polen geltenden technischen Bedingungen.",
    "Voldoet aan de in Polen geldende technische voorwaarden.",
  ],
  [
    "Zgodne z wymaganiami dla małych budynków modułowych w większości krajów związkowych.",
    "Compliant with requirements for small modular buildings in most federal states.",
    "Entspricht den Anforderungen für kleine Modulgebäude in den meisten Bundesländern.",
    "Voldoet aan de eisen voor kleine modulaire gebouwen in de meeste deelstaten.",
  ],
  [
    "Zmotoryzowana szafka z telewizorem to produkt ruchomy (wyposażenie, nie budynek) — nie podlega przepisom budowlanym dotyczącym domów modułowych, dostawa i montaż nie wymagają zgód budowlanych.",
    "A motorised TV cabinet is a movable product (equipment, not a building), so it is not subject to building regulations for modular houses; delivery and installation do not require building permits.",
    "Ein motorisierter TV-Schrank ist ein bewegliches Produkt (Ausstattung, kein Gebäude) und unterliegt nicht den Bauvorschriften für Modulhäuser; Lieferung und Montage erfordern keine Baugenehmigung.",
    "Een gemotoriseerde tv-kast is een verplaatsbaar product (inrichting, geen gebouw) en valt niet onder de bouwvoorschriften voor modulaire woningen; levering en montage vereisen geen bouwvergunning.",
  ],
  ["Zgodny z przepisami", "Compliant with regulations", "Entspricht den Vorschriften", "Voldoet aan de regelgeving"],
];

// Etykiety pozycji kosztowych brakujące w cost_line_item_label_translation
// (12 luk, spec 0067 AC-8).
export const COST_LINE_LABELS: Entry[] = [
  [
    "Dach pokryty blachą na rąbek",
    "Roof covered with standing seam metal",
    "Dach mit Stehfalzblech gedeckt",
    "Dak bedekt met metaal met staande naad",
  ],
  [
    "Drzwi wejściowe do budynku stalowe w kolorze antracytowym",
    "Steel entrance door in anthracite",
    "Stahl-Eingangstür in Anthrazit",
    "Stalen voordeur in antraciet",
  ],
  [
    "Elewacja Vinylit w dowolnie wybranym kolorze, naturalna deska drewniana lub termodrewno (zamiast sidingu VOX)",
    "Vinylit façade in any chosen colour, natural wooden boards or thermowood (instead of VOX siding)",
    "Vinylit-Fassade in frei wählbarer Farbe, Naturholzbretter oder Thermoholz (anstelle von VOX-Siding)",
    "Vinylit-gevel in een vrij gekozen kleur, natuurlijke houten planken of thermohout (in plaats van VOX-gevelbekleding)",
  ],
  [
    "Instalacja wod.-kan. w strefie pod domkiem",
    "Water and sewage installation in the area beneath the house",
    "Wasser- und Abwasserinstallation im Bereich unter dem Haus",
    "Water- en rioleringsinstallatie in de zone onder het huis",
  ],
  [
    "Izolacja z piany otwartokomórkowej PUR",
    "Open-cell PUR foam insulation",
    "Dämmung aus offenzelligem PUR-Schaum",
    "Isolatie van open-cel PUR-schuim",
  ],
  [
    "Okna PCV wykonane z profilu Aluplast, 5 komorowe, 2 kolory",
    "PVC windows made of Aluplast profile, 5-chamber, 2 colours",
    "PVC-Fenster aus Aluplast-Profil, 5-Kammer, 2 Farben",
    "PVC-ramen van Aluplast-profiel, 5 kamers, 2 kleuren",
  ],
  [
    "Podłoga pokryta panelami laminowanymi",
    "Floor covered with laminate panels",
    "Boden mit Laminatpaneelen belegt",
    "Vloer bedekt met laminaatpanelen",
  ],
  [
    "Stalowy szkielet wykonany z bardzo wytrzymałych profili",
    "Steel frame made of very strong profiles",
    "Stahlskelett aus sehr widerstandsfähigen Profilen",
    "Staalskelet van zeer sterke profielen",
  ],
  [
    "Łazienka - podłoga i ściany wykończone płytkami VOX Villo",
    "Bathroom – floor and walls finished with VOX Villo tiles",
    "Badezimmer – Boden und Wände mit VOX-Villo-Fliesen gestaltet",
    "Badkamer – vloer en wanden afgewerkt met VOX Villo-tegels",
  ],
  [
    "Ściany boczne pokryte sidingiem VOX oraz blachą na rąbek",
    "Side walls covered with VOX siding and standing seam metal",
    "Seitenwände mit VOX-Siding und Stehfalzblech verkleidet",
    "Zijwanden bekleed met VOX-gevelbekleding en metaal met staande naad",
  ],
  [
    "Ściany wewnętrzne wykończone płytami STRAMA",
    "Internal walls finished with STRAMA boards",
    "Innenwände mit STRAMA-Platten verkleidet",
    "Binnenwanden afgewerkt met STRAMA-platen",
  ],
  [
    "Ściany wewnętrzne wykończone wzmacnianymi oraz ognioodpornymi płytami GK 15mm bez szpachlowania i malowania lub płytami OSB",
    "Internal walls finished with reinforced, fire resistant 15 mm plasterboard without filling and painting, or OSB boards",
    "Innenwände mit verstärkten, feuerbeständigen 15-mm-Gipskartonplatten ohne Spachteln und Streichen oder mit OSB-Platten",
    "Binnenwanden afgewerkt met versterkte, brandwerende gipsplaten van 15 mm zonder stucwerk en schilderwerk, of met OSB-platen",
  ],
];

// Opisy produktów bez tłumaczenia (nieopublikowane wcześniej backfille).
// Dopasowanie po nazwie produktu, bo opis jest unikalny per produkt.
export const PRODUCT_DESCRIPTIONS: Entry[] = [
  [
    "Smukła i elegancka bryła domu Gotland to symetryczna architektura wzbogacona dyskretnymi detalami. Drewno naturalne, szkło i metal nadają budynkowi charakter, a zbliżenie do natury i wkomponowanie w otoczenie są jego głównym celem. Dom o powierzchni zabudowy 35 m² i użytkowej 27 m², z jedną sypialnią, dostępny w stanie deweloperskim z szerokim wachlarzem opcji dodatkowych.",
    "The slim, elegant Gotland house is symmetrical architecture enriched with subtle details. Natural wood, glass and metal give the building its character, and closeness to nature and blending into the surroundings are its main goal. A house with a 35 m² footprint and 27 m² of usable area, with one bedroom, available in developer's shell condition with a wide range of additional options.",
    "Der schlanke, elegante Baukörper des Hauses Gotland ist eine symmetrische Architektur mit dezenten Details. Naturholz, Glas und Metall verleihen dem Gebäude Charakter, und die Nähe zur Natur sowie die Einbindung in die Umgebung stehen im Mittelpunkt. Haus mit 35 m² Grundfläche und 27 m² Nutzfläche, mit einem Schlafzimmer, erhältlich im Rohbauzustand (Developer-Standard) mit einer breiten Palette an Zusatzoptionen.",
    "De slanke, elegante vorm van het huis Gotland is symmetrische architectuur verrijkt met subtiele details. Natuurlijk hout, glas en metaal geven het gebouw karakter, en de nabijheid van de natuur en de inpassing in de omgeving zijn het belangrijkste doel. Woning met een bebouwde oppervlakte van 35 m² en een gebruiksoppervlakte van 27 m², met één slaapkamer, beschikbaar in ruwbouwstaat (ontwikkelaarsstandaard) met een breed scala aan extra opties.",
  ],
  [
    "Dom FJORD 35 m² to mobilny dom całoroczny na konstrukcji stalowej, który w pełni wykorzystuje powierzchnię zabudowy. Układ wnętrz bazuje na japońskim minimalizmie, a dom można ustawić w dowolnym miejscu na zgłoszenie. Wariant z jedną sypialnią, dostępny w stanie deweloperskim z szerokim wachlarzem opcji dodatkowych.",
    "The FJORD 35 m² house is a mobile year-round house on a steel structure that makes full use of its footprint. The interior layout is based on Japanese minimalism, and the house can be placed anywhere subject to notification. One-bedroom variant, available in developer's shell condition with a wide range of additional options.",
    "Das Haus FJORD 35 m² ist ein mobiles Ganzjahreshaus auf Stahlkonstruktion, das die Grundfläche voll ausnutzt. Die Raumaufteilung basiert auf japanischem Minimalismus, und das Haus kann nach Anzeige an beliebiger Stelle aufgestellt werden. Variante mit einem Schlafzimmer, erhältlich im Rohbauzustand (Developer-Standard) mit einer breiten Palette an Zusatzoptionen.",
    "De woning FJORD 35 m² is een mobiele vierseizoenenwoning op een staalconstructie die de bebouwde oppervlakte volledig benut. De indeling van het interieur is gebaseerd op Japans minimalisme en de woning kan na melding op elke locatie worden geplaatst. Variant met één slaapkamer, beschikbaar in ruwbouwstaat (ontwikkelaarsstandaard) met een breed scala aan extra opties.",
  ],
  [
    "Dom FJORD 35 m² to mobilny dom całoroczny na konstrukcji stalowej, który w pełni wykorzystuje powierzchnię zabudowy. Układ wnętrz bazuje na japońskim minimalizmie, a dom można ustawić w dowolnym miejscu na zgłoszenie. Wariant z dwiema sypialniami, dostępny w stanie deweloperskim z szerokim wachlarzem opcji dodatkowych.",
    "The FJORD 35 m² house is a mobile year-round house on a steel structure that makes full use of its footprint. The interior layout is based on Japanese minimalism, and the house can be placed anywhere subject to notification. Two-bedroom variant, available in developer's shell condition with a wide range of additional options.",
    "Das Haus FJORD 35 m² ist ein mobiles Ganzjahreshaus auf Stahlkonstruktion, das die Grundfläche voll ausnutzt. Die Raumaufteilung basiert auf japanischem Minimalismus, und das Haus kann nach Anzeige an beliebiger Stelle aufgestellt werden. Variante mit zwei Schlafzimmern, erhältlich im Rohbauzustand (Developer-Standard) mit einer breiten Palette an Zusatzoptionen.",
    "De woning FJORD 35 m² is een mobiele vierseizoenenwoning op een staalconstructie die de bebouwde oppervlakte volledig benut. De indeling van het interieur is gebaseerd op Japans minimalisme en de woning kan na melding op elke locatie worden geplaatst. Variant met twee slaapkamers, beschikbaar in ruwbouwstaat (ontwikkelaarsstandaard) met een breed scala aan extra opties.",
  ],
  [
    "Nowoczesny dom FJORD o powierzchni zabudowy 48 m² z dużymi przeszkleniami, które wpuszczają do wnętrza dużo światła dziennego. Bryła w stylu nowoczesnej stodoły z dwuspadowym dachem pokrytym blachą na rąbek. Przestrzeń dostosowana do potrzeb rodzin, z dwiema sypialniami, pozwala na wygodne korzystanie z domu przez cały rok.",
    "A modern FJORD house with a 48 m² footprint and large glazing that lets plenty of daylight into the interior. Modern barn style with a gable roof covered with standing seam metal. The space is adapted to the needs of families, with two bedrooms, and allows comfortable use of the house all year round.",
    "Modernes FJORD-Haus mit 48 m² Grundfläche und großen Verglasungen, die viel Tageslicht ins Innere lassen. Baukörper im Stil einer modernen Scheune mit Satteldach, gedeckt mit Stehfalzblech. Der Raum ist auf die Bedürfnisse von Familien ausgelegt, mit zwei Schlafzimmern, und ermöglicht eine bequeme Nutzung des Hauses das ganze Jahr über.",
    "Een moderne FJORD-woning met een bebouwde oppervlakte van 48 m² en grote beglazing die veel daglicht in het interieur laat. Vorm in de stijl van een moderne schuur met een zadeldak bedekt met metaal met staande naad. De ruimte is afgestemd op de behoeften van gezinnen, met twee slaapkamers, en maakt comfortabel gebruik van de woning het hele jaar door mogelijk.",
  ],
  [
    "Przestronny dom FJORD 56 m² nawiązuje prostotą do kształtu barnhouse. Przeszklona ściana szczytowa i otwarta forma wnętrza sprawiają, że dom jest wypełniony dziennym światłem. Strefa dzienna z otwartą kuchnią, łazienka i dwie sypialnie; salon można powiększyć o taras połączony z wnętrzem dużymi przesuwnymi oknami.",
    "The spacious FJORD 56 m² house references the shape of a barnhouse in its simplicity. The glazed gable wall and open interior make the house full of daylight. Living area with an open kitchen, a bathroom and two bedrooms; the living room can be extended with a terrace connected to the interior by large sliding windows.",
    "Das geräumige Haus FJORD 56 m² nimmt in seiner Schlichtheit die Form eines Barnhouse auf. Die verglaste Giebelwand und der offene Grundriss lassen das Haus voller Tageslicht sein. Wohnbereich mit offener Küche, Badezimmer und zwei Schlafzimmer; das Wohnzimmer lässt sich um eine Terrasse erweitern, die über große Schiebefenster mit dem Innenraum verbunden ist.",
    "De ruime woning FJORD 56 m² verwijst met zijn eenvoud naar de vorm van een barnhouse. De beglaasde gevelwand en de open indeling zorgen ervoor dat de woning vol daglicht is. Woonruimte met open keuken, badkamer en twee slaapkamers; de woonkamer kan worden uitgebreid met een terras dat met grote schuiframen met het interieur is verbonden.",
  ],
  [
    "Opisowy tekst do testu wyszukiwania.",
    "Descriptive text for the search test.",
    "Beschreibender Text für den Suchtest.",
    "Beschrijvende tekst voor de zoektest.",
  ],
  [
    "Najjaśniejsza linia telewizorów ogrodowych MirageVision, do montażu w miejscach z pełnym, bezpośrednim nasłonecznieniem przez cały dzień. Technologia RGB Mini-LED z niezależnym sterowaniem każdym subpikselem, autorska kalibracja M.P.E.T. pod kątem czytelności obrazu w słońcu, szczelna obudowa (IP55) z powłoką KryptoShield i wymuszonym obiegiem powietrza. Dostępne w pięciu rozmiarach — od 55″ do 100″.",
    "The brightest line of MirageVision garden TVs, for installation in places with full, direct sunlight all day. RGB Mini-LED technology with independent control of every subpixel, proprietary M.P.E.T. calibration for picture legibility in sunlight, sealed enclosure (IP55) with KryptoShield coating and forced air circulation. Available in five sizes, from 55″ to 100″.",
    "Die hellste Linie der MirageVision-Gartenfernseher, für die Montage an Orten mit vollem, direktem Sonnenlicht den ganzen Tag. RGB-Mini-LED-Technologie mit unabhängiger Steuerung jedes Subpixels, eigene M.P.E.T.-Kalibrierung für gute Bildlesbarkeit in der Sonne, dichtes Gehäuse (IP55) mit KryptoShield-Beschichtung und erzwungener Luftzirkulation. In fünf Größen erhältlich, von 55″ bis 100″.",
    "De helderste lijn tuintelevisies van MirageVision, bedoeld voor montage op plaatsen met de hele dag volle, directe zon. RGB Mini-LED-technologie met onafhankelijke aansturing van elke subpixel, eigen M.P.E.T.-kalibratie voor een goed leesbaar beeld in de zon, afgesloten behuizing (IP55) met KryptoShield-coating en geforceerde luchtcirculatie. Verkrijgbaar in vijf formaten, van 55″ tot 100″.",
  ],
  [
    "Zmotoryzowana szafka ogrodowa z ukrytym telewizorem 4K (seria Silver, marka bazowa TCL), który wysuwa się i chowa na pilota RF. Wersja Silver Series jest przeznaczona do zadaszonych/osłoniętych stref tarasowych — bez bezpośredniego kontaktu z deszczem i pełnym słońcem.",
    "A motorised garden cabinet with a hidden 4K TV (Silver series, base brand TCL) that rises and retracts with an RF remote. The Silver Series version is intended for covered/sheltered terrace areas, without direct contact with rain and full sun.",
    "Motorisierter Gartenschrank mit verstecktem 4K-Fernseher (Serie Silver, Basismarke TCL), der sich per RF-Fernbedienung aus- und einfährt. Die Version Silver Series ist für überdachte bzw. geschützte Terrassenbereiche vorgesehen, ohne direkten Kontakt mit Regen und voller Sonne.",
    "Een gemotoriseerde tuinkast met verborgen 4K-televisie (Silver-serie, basismerk TCL) die met een RF-afstandsbediening omhoog komt en wegklapt. De Silver Series-versie is bedoeld voor overdekte/beschutte terrasruimtes, zonder direct contact met regen en volle zon.",
  ],
];
