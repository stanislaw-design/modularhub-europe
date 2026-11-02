import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { sessionHintSetCookie, setsSessionToken } from "@/lib/session-hint";

// Spec 0078 AC-5: każda odpowiedź Auth.js, która zakłada sesję (kliknięcie linku
// logowania), dokłada ciasteczko wskazówkę `has_session`, żeby nagłówek strony
// publicznej wiedział, że ma pobrać konto. Wskazówka nie jest dowodem tożsamości.
async function withSessionHint(request: NextRequest, handler: (request: NextRequest) => Promise<Response>) {
  const response = await handler(request);
  if (!setsSessionToken(response.headers.getSetCookie())) return response;
  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", sessionHintSetCookie(request.nextUrl.protocol === "https:"));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function GET(request: NextRequest) {
  return withSessionHint(request, handlers.GET);
}

export function POST(request: NextRequest) {
  return withSessionHint(request, handlers.POST);
}
