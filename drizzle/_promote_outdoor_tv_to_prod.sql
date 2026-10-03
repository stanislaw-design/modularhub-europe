-- Run this whole file against the PRODUCTION Neon project (modularhub / spring-rain-58383710).
-- Mirrors the product already live on modularhub-dev, id 19f6add0-0991-4737-852e-f3206b650775.
-- The `users` row for MirageVision and the `US` country row are already on prod (inserted
-- earlier this session) -- this file does everything still missing: the relaxed unique index,
-- the producer row, the product, its 3 variants, and the English translation.

DROP INDEX "product_variant_product_standard_unique";
CREATE UNIQUE INDEX "product_variant_product_standard_unique" ON "product_variant" USING btree ("product_id","completion_standard") WHERE "product_variant"."deleted_at" IS NULL AND "product_variant"."completion_standard" <> 'katalogowy';

BEGIN;

INSERT INTO producer (id, user_id, nip, name, country_code, description)
VALUES (
  '90e8bc66-e10a-4fba-9afe-b31544a37d40',
  'a8194cd4-e5fc-4a9f-81cb-d59dba54e2f0',
  'US-MIRAGEVISION-RESELLER',
  'MirageVision Outdoor TVs and Displays',
  'US',
  'Amerykański producent telewizorów i wyświetlaczy zewnętrznych odpornych na warunki atmosferyczne. Partner resellerski ModularHub Europe.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO product (
  id, producer_id, status, family, name, description, currency,
  cover_image_url, video_url, price_min_cents, technical_specs, faq
) VALUES (
  '19f6add0-0991-4737-852e-f3206b650775',
  '90e8bc66-e10a-4fba-9afe-b31544a37d40',
  'published',
  'outdoor-tv',
  'Econo Lift — szafka z podnośnikiem TV ogrodowego',
  'Zmotoryzowana szafka ogrodowa z ukrytym telewizorem 4K (seria Silver, marka bazowa TCL), który wysuwa się i chowa na pilota RF. Wersja Silver Series jest przeznaczona do zadaszonych/osłoniętych stref tarasowych — bez bezpośredniego kontaktu z deszczem i pełnym słońcem.',
  'EUR',
  '/images/outdoor-tv/projekt-testowy/telewizor1.webp',
  '/images/outdoor-tv/projekt-testowy/miragevision-lift-demo.mp4',
  233542,
  '{
    "hdr": "Tak, HDR10",
    "wifi": "Tak",
    "drzwi": "2 drzwi przednie — dostęp do TV i sprzętu",
    "montaż": "Fabrycznie złożona, pilot RF do podnośnika",
    "wejścia": "HDMI ×3, Composite, tuner, USB ×1, Ethernet",
    "wyjście": "Audio",
    "_features": [
      "Szafka wykonana z myślą o użytku zewnętrznym",
      "Fabrycznie złożona — Plug & Play, z pilotem RF",
      "Dwoje drzwi frontowych — łatwy dostęp do TV i sprzętu",
      "Lekka, a sztywna konstrukcja szafki z tworzywa UV",
      "Dodatkowe miejsce w szafce na odtwarzacz, soundbar lub dekoder"
    ],
    "jasność": "350 nit (typowa)",
    "wZestawie": "Pokrowiec na TV, pilot do telewizora, pilot RF do podnośnika, instrukcja",
    "_priceNote": "Cena orientacyjna — przelicznik z aktualnego cennika USD MirageVision (kurs NBP, 29.09.2026). Ostateczny cennik EUR do potwierdzenia na spotkaniu z MirageVision 2.10.2026.",
    "_usageNote": "Przystępna cenowo seria Silver Patio, dostosowana do zadaszonych i osłoniętych stref tarasowych — telewizor nie ma bezpośredniego kontaktu z deszczem, śniegiem ani ulewą. W środku smart TV 4K z Wi-Fi i aplikacjami, produkowany i objęty gwarancją wyłącznie do zastosowań mieszkaniowych.",
    "głośniki": "2-kanałowe, 8 W",
    "typSmartTv": "Roku",
    "clearMotion": "120",
    "gwarancjaTv": "1 rok wymiany, wyłącznie zastosowanie niekomercyjne",
    "wagaZestawu": "17 lbs (7,7 kg)",
    "markaBazowaTv": "TCL (donor brand)",
    "bluetoothAudio": "Nie",
    "liczbaKolorów": "1,07 mld",
    "wagaOpakowania": "25 lbs (11,3 kg)",
    "wymiaryZestawu": "38.2 × 22.4 × 3.5″ (97 × 57 × 9 cm)",
    "_extraImageUrls": [
      "/images/outdoor-tv/projekt-testowy/telewizor2.webp",
      "/images/outdoor-tv/projekt-testowy/telewizor3.webp",
      "/images/outdoor-tv/projekt-testowy/telewizor4.webp",
      "/images/outdoor-tv/projekt-testowy/telewizor5.webp"
    ],
    "rozdzielczość": "4K, 3840 × 2160",
    "przekątnaEkranu": "43″",
    "silnikUpscalingu": "Tak",
    "vesaRozmiarŚrub": "M6",
    "konstrukcjaSzafki": "Tworzywo UV, lekka i sztywna konstrukcja",
    "poborMocyCzuwanie": "0,5 W",
    "wymiaryOpakowania": "45 × 26 × 5.5″ (114 × 66 × 14 cm)",
    "zakresUżytkowania": "Strefa zadaszona/osłonięta — bez bezpośredniego deszczu i pełnego słońca (seria Silver)",
    "vesaRozstawOtworów": "100 × 100 mm",
    "dodatkowaPrzestrzeń": "Miejsce na odtwarzacz, soundbar lub dekoder"
  }'::jsonb,
  '[
    {"id": "co-nas-wyroznia", "question": "Co wyróżnia MirageVision na tle konkurencji?", "answer": "Telewizory MirageVision powstają na bazie znanych, markowych paneli (dziś: TCL) — kupując wiesz, kto faktycznie zrobił elektronikę w środku, nie tylko obudowę. Autorska kalibracja MPET (Mega-Picture Enhancement Technology) poprawia jakość obrazu w warunkach zewnętrznych. MirageVision produkuje w USA (Las Vegas, Nevada) od 2004 roku — jako pierwsza firma na świecie oferująca telewizory znanych marek dostosowane do użytku zewnętrznego."},
    {"id": "czy-wodoodporny", "question": "Czy ten telewizor jest wodoodporny?", "answer": "Nie — żaden telewizor MirageVision nie jest wodoodporny w sensie dosłownym (nie działa pod wodą). Jest za to odporny na warunki atmosferyczne: normalny deszcz, śnieg, kurz i wilgoć, z myślą o stałym montażu na zewnątrz. Popularne oznaczenie IP55 oznacza wysoką odporność na pył i strumienie wody, ale wciąż nie wodoszczelność. Dla wersji Silver Series (ten model) obowiązuje dodatkowe zastrzeżenie: instalacja w strefie zadaszonej/osłoniętej, bez bezpośredniego kontaktu z ulewnym deszczem."},
    {"id": "wilgoc-i-wilgotnosc", "question": "Czy wilgoć lub duża wilgotność powietrza uszkodzi telewizor?", "answer": "Wnętrze telewizora zabezpiecza autorska powłoka nanotechnologiczna KryptoShield, chroniąca podzespoły przed korozją i wilgocią. Modele Gold/Diamond Series mają dodatkowo aktywny system wentylatorów (RainGuard) wymuszający obieg powietrza — w wersji Silver Series (tu) ten układ jest celowo pominięty, dlatego wymaga ona zadaszonej, osłoniętej lokalizacji zamiast pełnej ekspozycji na warunki zewnętrzne."},
    {"id": "gwarancja-outdoor", "question": "Czy telewizor ma gwarancję na użytek zewnętrzny?", "answer": "Tak — 1 rok gwarancji na części i robociznę bezpośrednio od MirageVision (nie od producenta panelu), z opcją przedłużenia o kolejne 1–2 lata w zależności od modelu. Gwarancja obejmuje wyłącznie zastosowania mieszkaniowe (rezydencjalne), nie komercyjne."},
    {"id": "pelne-slonce", "question": "Czy mogę oglądać ten telewizor w pełnym słońcu?", "answer": "Nie w tej wersji. Silver Series jest myślana do stref zacienionych/zadaszonych, nie do pełnego, bezpośredniego słońca. Do pełnej ekspozycji słonecznej MirageVision oferuje osobną linię Platinum Series Full Sun (jasność do 3000 nitów)."}
  ]'::jsonb
);

INSERT INTO product_variant (id, product_id, completion_standard, variant_label, price_min_cents, price_on_request, is_default, sort_order) VALUES
  ('bd7208fe-9e6b-4bea-838b-89a44b2bf714', '19f6add0-0991-4737-852e-f3206b650775', 'katalogowy', '43″, 4K', 233542, false, true, 1),
  ('4574d996-dde9-4ea3-8e86-9c03a2924875', '19f6add0-0991-4737-852e-f3206b650775', 'katalogowy', '50″, 4K', 263946, false, false, 2),
  ('f699505f-6ee8-4afd-923c-8ae3e1e6ec43', '19f6add0-0991-4737-852e-f3206b650775', 'katalogowy', 'Sama szafka, bez telewizora', 175817, false, false, 3);

INSERT INTO product_translation (product_id, locale, name, description, technical_specs, faq) VALUES (
  '19f6add0-0991-4737-852e-f3206b650775',
  'en',
  'Econo Lift — Motorized Outdoor TV Cabinet',
  'A motorized outdoor cabinet with a hidden 4K TV (Silver Series, TCL donor panel) that lifts and lowers on an RF remote. The Silver Series is built for shaded, covered patio areas — not for direct rain or full sun exposure.',
  '{
    "specs": {
      "konstrukcjaSzafki": {"label": "Cabinet construction", "value": "UV-molded plastic, lightweight yet sturdy construction"},
      "montaż": {"label": "Assembly", "value": "Factory-assembled, RF remote for the lift"},
      "drzwi": {"label": "Doors", "value": "2 front doors — access to TV and equipment"},
      "dodatkowaPrzestrzeń": {"label": "Extra space", "value": "Room for a media player, sound bar or set-top box"},
      "zakresUżytkowania": {"label": "Intended use", "value": "Shaded/covered area — no direct rain or full sun exposure (Silver Series)"},
      "przekątnaEkranu": {"label": "Screen size", "value": "43″"},
      "rozdzielczość": {"label": "Resolution", "value": "4K, 3840 × 2160"},
      "wymiaryZestawu": {"label": "Set dimensions", "value": "38.2 × 22.4 × 3.5″ (97 × 57 × 9 cm)"},
      "wymiaryOpakowania": {"label": "Packaging dimensions", "value": "45 × 26 × 5.5″ (114 × 66 × 14 cm)"},
      "wagaZestawu": {"label": "Set weight", "value": "17 lbs (7.7 kg)"},
      "wagaOpakowania": {"label": "Packaging weight", "value": "25 lbs (11.3 kg)"},
      "poborMocyCzuwanie": {"label": "Standby power consumption", "value": "0.5 W"},
      "jasność": {"label": "Brightness", "value": "350 nits (typical)"},
      "silnikUpscalingu": {"label": "Upscale engine", "value": "Yes"},
      "clearMotion": {"label": "Clear Motion", "value": "120"},
      "hdr": {"label": "HDR", "value": "Yes, HDR10"},
      "liczbaKolorów": {"label": "Color display", "value": "1.07 billion"},
      "głośniki": {"label": "Speakers", "value": "2-channel, 8 W"},
      "bluetoothAudio": {"label": "Bluetooth Audio", "value": "No"},
      "wejścia": {"label": "Inputs", "value": "HDMI ×3, Composite, tuner, USB ×1, Ethernet"},
      "wyjście": {"label": "Output", "value": "Audio"},
      "wifi": {"label": "Wi-Fi", "value": "Yes"},
      "vesaRozmiarŚrub": {"label": "VESA screw size", "value": "M6"},
      "vesaRozstawOtworów": {"label": "VESA hole pattern", "value": "100 × 100 mm"},
      "typSmartTv": {"label": "Smart TV platform", "value": "Roku"},
      "markaBazowaTv": {"label": "Donor brand", "value": "TCL (donor brand)"},
      "gwarancjaTv": {"label": "TV warranty", "value": "1-year replacement, residential use only"},
      "wZestawie": {"label": "In the box", "value": "TV cover, TV remote, RF remote for the lift, manual"}
    },
    "features": [
      "Cabinet built for outdoor use",
      "Comes fully assembled — plug & play, with RF remote",
      "Two front doors — easy access to the TV and equipment",
      "Lightweight yet sturdy UV-molded plastic cabinet",
      "Extra room in the cabinet for a media player, sound bar or set-top box"
    ],
    "usageNote": "Affordable Silver Patio Series, built for shaded and covered patio areas — the TV has no direct contact with rain, snow or downpours. Inside: a 4K smart TV with Wi-Fi and apps, manufactured and warranted for residential use only.",
    "priceNote": "Indicative price — converted from MirageVision current USD list price (NBP exchange rate, 2026-09-29). Final EUR pricing to be confirmed at the MirageVision meeting on 2026-10-02."
  }'::jsonb,
  '[
    {"id": "co-nas-wyroznia", "question": "What sets MirageVision apart from the competition?", "answer": "MirageVision TVs are built on name-brand donor panels (today: TCL) — so you always know who actually made the electronics inside, not just the cabinet. Our proprietary MPET (Mega-Picture Enhancement Technology) calibration improves picture quality outdoors. MirageVision has manufactured in the USA (Las Vegas, Nevada) since 2004 — the first company in the world to offer name-brand TVs adapted for outdoor use."},
    {"id": "czy-wodoodporny", "question": "Is this TV waterproof?", "answer": "No — no MirageVision TV is waterproof in the literal sense (it will not operate underwater). It is weather-resistant instead: built for permanent outdoor installation, resisting normal rain, snow, dust and humidity. The common IP55 rating means strong resistance to dust and water jets, but still not waterproof. For the Silver Series (this model), there is an additional caveat: install it in a shaded, covered area, out of direct contact with heavy rain."},
    {"id": "wilgoc-i-wilgotnosc", "question": "Will moisture or high humidity damage the TV?", "answer": "The internal electronics are protected by our proprietary KryptoShield nano-coating, which guards against corrosion and moisture. Gold/Diamond Series models add an active fan system (RainGuard) for forced airflow — the Silver Series (this model) deliberately omits that system, which is why it needs a shaded, covered location instead of full outdoor exposure."},
    {"id": "gwarancja-outdoor", "question": "Is the TV warranted for outdoor use?", "answer": "Yes — one year of parts and labor warranty directly from MirageVision (not the panel manufacturer), with an optional extension of one to two more years depending on the model. The warranty covers residential use only, not commercial applications."},
    {"id": "pelne-slonce", "question": "Can I watch this TV in full sunlight?", "answer": "Not in this version. The Silver Series is designed for shaded, covered areas, not full direct sunlight. For full sun exposure, MirageVision offers a separate Platinum Series Full Sun line (up to 3,000 nits of brightness)."}
  ]'::jsonb
);

INSERT INTO product_variant_translation (product_variant_id, locale, variant_label) VALUES
  ('bd7208fe-9e6b-4bea-838b-89a44b2bf714', 'en', '43″, 4K'),
  ('4574d996-dde9-4ea3-8e86-9c03a2924875', 'en', '50″, 4K'),
  ('f699505f-6ee8-4afd-923c-8ae3e1e6ec43', 'en', 'Cabinet only, no TV');

COMMIT;
