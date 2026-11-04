import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAttachmentDownloadUrl } from "@/lib/conversations/attachments";
import { isActiveAdmin } from "@/lib/conversations/mutations";
import { captureError } from "@/lib/observability";

// Pobranie załącznika wpisu (spec 0080 AC-14, AC-1): tylko dla administratora. Odpowiada
// przekierowaniem na świeży, krótko ważny podpisany adres (nagłówek pobierania i zapisany typ MIME
// ustawia podpis). Żaden publiczny adres pliku nie powstaje, a odpowiedź nigdy nie trafia do cache.
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return new NextResponse("Wymagane logowanie", { status: 401, headers: NO_STORE });
  if (session.user.role !== "admin" || !(await isActiveAdmin(session.user.id))) {
    return new NextResponse("Brak dostępu", { status: 403, headers: NO_STORE });
  }

  try {
    const url = await getAttachmentDownloadUrl(id);
    if (!url) return new NextResponse("Nie znaleziono pliku", { status: 404, headers: NO_STORE });
    return new NextResponse(null, { status: 302, headers: { Location: url, ...NO_STORE } });
  } catch (error) {
    // AC-3: awaria podpisania linku dotyczy tylko tego pliku.
    captureError(error, { path: "conversations:attachmentDownload" });
    return new NextResponse("Plik jest chwilowo niedostępny", { status: 503, headers: NO_STORE });
  }
}
