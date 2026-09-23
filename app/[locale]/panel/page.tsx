import { redirect } from "next/navigation";

// Wejście na /panel przekierowuje bezpośrednio do /panel/inquiries
export default async function PanelRootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/panel/inquiries`);
}
