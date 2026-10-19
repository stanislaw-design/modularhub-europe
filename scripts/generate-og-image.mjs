// Jednorazowy skrypt (spec 0073 AC-15): kadruje hero do 1200x630 i zapisuje obrazek
// Open Graph. Wynik jest zatwierdzony w repo; skrypt służy tylko do powtórzenia.
// Uruchomienie: node scripts/generate-og-image.mjs
import sharp from "sharp";

await sharp("public/images/hero/klient-hero-bg.webp")
  .resize(1200, 630, { fit: "cover", position: "centre" })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile("public/images/og/home.jpg");

console.log("Zapisano public/images/og/home.jpg");
