"use client";

import { useEffect } from "react";
import { setSessionHint } from "@/lib/session-hint";

// Spec 0078 AC-5: layouty prywatne (panel, panel producenta, panel admina) i tak
// znają sesję, więc odświeżają ciasteczko wskazówkę. Naprawia to zalogowanego, który
// wszedł linkiem na innym urządzeniu i nie ma jeszcze wskazówki.
export function SessionHint() {
  useEffect(() => {
    setSessionHint();
  }, []);
  return null;
}
