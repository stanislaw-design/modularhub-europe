"use client";

import { useEffect } from "react";
import { markOfferDecisionViewedByProducer } from "@/lib/offer-actions";

interface MarkOfferDecisionViewedProps {
  inquiryId: string;
}

// Zeruje sygnał nieprzeczytane (spec 0033 AC-12) po faktycznym wejściu na
// /producer/panel/inquiries/[id] po decyzji klienta: efekt komponentu
// klienckiego uruchamia się wyłącznie po hydracji w przeglądarce, nigdy
// podczas prefetchu Next.js linku (Key invariants). Nic nie renderuje.
export function MarkOfferDecisionViewed({ inquiryId }: MarkOfferDecisionViewedProps) {
  useEffect(() => {
    markOfferDecisionViewedByProducer(inquiryId);
  }, [inquiryId]);

  return null;
}
