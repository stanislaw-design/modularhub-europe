-- Krok 1 na PROD: kontrola wstępna (musi przejść bez błędu). Nic nie zapisuje.
DO $$
BEGIN
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public'
        AND ((table_name = 'product_option' AND column_name = 'price_note')
          OR (table_name = 'product_option_translation' AND column_name = 'price_note'))) <> 2 THEN
    RAISE EXCEPTION 'Brak kolumn price_note (najpierw wdróż aplikację z migracją 0065_product_option_price_note), przerywam';
  END IF;
  IF (SELECT count(*) FROM product WHERE producer_id = 'e0030000-0000-4000-8000-000000000103') <> 4 THEN
    RAISE EXCEPTION 'Producent Wencela nie ma na tej bazie 4 produktów, przerywam';
  END IF;
END $$;
