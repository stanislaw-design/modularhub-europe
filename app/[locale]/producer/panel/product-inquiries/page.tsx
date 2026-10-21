import { redirect } from "next/navigation";

// Spec 0074 AC-8: zapytania o produkt żyją teraz na wspólnej liście /inquiries.
// Szczegóły (`/product-inquiries/[id]`) zostają bez zmian.
export default async function ProducerProductInquiriesRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/producer/panel/inquiries`);
}
