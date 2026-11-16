// Kod przeglądarki dla bezpośredniego wgrywania do R2 (spec 0085). Bez importów serwerowych.
// `fetch` nie raportuje postępu wysyłania, więc PUT idzie przez XMLHttpRequest.

export type PutResult = { ok: true } | { ok: false; reason: "upload_failed" };

// Wysyła plik prosto pod podpisany adres. Nagłówek Content-Type musi być dokładnie ten, na który
// adres jest podpisany (typ zadeklarowany przy prośbie), a Content-Length ustawia przeglądarka.
// Błąd sieci albo brak reguły CORS dają to samo `upload_failed`: przeglądarka ich nie rozróżnia.
export function putFileToSignedUrl(
  uploadUrl: string,
  file: File,
  mimeType: string,
  onProgress?: (fraction: number) => void,
): Promise<PutResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", mimeType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300 ? { ok: true } : { ok: false, reason: "upload_failed" });
    xhr.onerror = () => resolve({ ok: false, reason: "upload_failed" });
    xhr.onabort = () => resolve({ ok: false, reason: "upload_failed" });
    xhr.ontimeout = () => resolve({ ok: false, reason: "upload_failed" });
    xhr.send(file);
  });
}

// Typ MIME deklarowany serwerowi. Przeglądarka czasem zostawia `file.type` puste (np. dla .webp na
// starszych systemach), więc w razie braku wnioskujemy z rozszerzenia; serwer i tak sprawdza zawartość.
export function declaredMimeType(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}
