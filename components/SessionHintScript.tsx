import { SESSION_HINT_ATTRIBUTE, SESSION_HINT_COOKIE } from "@/lib/session-hint";

// Spec 0078 AC-5: skrypt w <head> ustawia na <html> atrybut, gdy istnieje
// ciasteczko wskazówka, więc CSS pokazuje szkielet przycisku konta zamiast
// "Zaloguj" już od pierwszego malowania, bez czytania ciasteczek na serwerze.
const SCRIPT = `try{if(document.cookie.split("; ").indexOf("${SESSION_HINT_COOKIE}=1")>-1)document.documentElement.setAttribute("${SESSION_HINT_ATTRIBUTE}","")}catch(e){}`;

export function SessionHintScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
