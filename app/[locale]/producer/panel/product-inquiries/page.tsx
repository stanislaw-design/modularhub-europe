import { redirect } from "next/navigation";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// Spec 0074 AC-8: zapytania o produkt żyją teraz na wspólnej liście /inquiries.
// Szczegóły (`/product-inquiries/[id]`) zostają bez zmian.
export default async function ProducerProductInquiriesRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/producer/panel/inquiries`);
}
