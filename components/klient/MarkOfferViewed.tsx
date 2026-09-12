"use client";

import { useEffect } from "react";
import { markOfferViewedByClient } from "@/lib/offer-actions";

interface MarkOfferViewedProps {
  inquiryId: string;
}

// Zeruje sygnał nieprzeczytane (spec 0033 AC-11) po faktycznym wejściu na
// /panel/inquiries/[id]: efekt komponentu klienckiego uruchamia się
// wyłącznie po hydracji w przeglądarce, nigdy podczas prefetchu Next.js
// linku (Key invariants). Nic nie renderuje.
export function MarkOfferViewed({ inquiryId }: MarkOfferViewedProps) {
  useEffect(() => {
    markOfferViewedByClient(inquiryId);
  }, [inquiryId]);

  return null;
}
