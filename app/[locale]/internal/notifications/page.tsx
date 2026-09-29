import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { render } from "@react-email/render";
import { auth } from "@/auth";
import { Heading, Stack, Text } from "@/components/ui";
import { shortReference } from "@/lib/notifications/templates/reference";
import { TransactionalEmail } from "@/lib/notifications/templates/TransactionalEmail";
import type { TransactionalEmailProps } from "@/lib/notifications/templates/types";

// Widok wewnętrzny dla roli administratora (spec 0051 AC-12, AC-13), ten sam
// wzorzec auth co /internal/products: podgląd wszystkich pięciu szablonów e
// mail na fikcyjnych, na sztywno wpisanych danych. Nigdy nie czyta prawdziwego
// rekordu z bazy i nie ma przycisku "wyślij naprawdę" — tylko do odczytu.
const SAMPLE_INQUIRY_ID = "przyklad-zapytania-0000";
const SAMPLE_LINK = (path: string) => `https://modularhub.eu/pl/${path}`;

async function buildPreviews(): Promise<Array<{ name: string; subject: string; html: string }>> {
  const [login, newInquiry, newOffer, orderStatus, payment, fulfillmentStage] = await Promise.all([
    getTranslations({ locale: "pl", namespace: "LoginLinkEmail" }),
    getTranslations({ locale: "pl", namespace: "NewInquiryConfirmationEmail" }),
    getTranslations({ locale: "pl", namespace: "NewOfferEmail" }),
    getTranslations({ locale: "pl", namespace: "OrderStatusChangedEmail" }),
    getTranslations({ locale: "pl", namespace: "PaymentConfirmedEmail" }),
    getTranslations({ locale: "pl", namespace: "FulfillmentStage" }),
  ]);

  const entries: Array<{ name: string; subject: string; content: TransactionalEmailProps }> = [
    {
      name: "Logowanie (magic link)",
      subject: login("subject"),
      content: {
        preview: login("subject"),
        heading: login("heading"),
        body: login("body"),
        ctaLabel: login("cta"),
        ctaHref: SAMPLE_LINK("auth/verify?token=przyklad"),
      },
    },
    {
      name: "Potwierdzenie nowego zapytania",
      subject: newInquiry("subject"),
      content: {
        preview: newInquiry("subject"),
        heading: newInquiry("heading"),
        body: newInquiry("body"),
        ctaLabel: newInquiry("cta"),
        ctaHref: SAMPLE_LINK(`panel/inquiries/${SAMPLE_INQUIRY_ID}`),
        reference: shortReference(SAMPLE_INQUIRY_ID),
      },
    },
    {
      name: "Nowa oferta",
      subject: newOffer("subject"),
      content: {
        preview: newOffer("subject"),
        heading: newOffer("heading"),
        body: newOffer("body"),
        ctaLabel: newOffer("cta"),
        ctaHref: SAMPLE_LINK(`panel/inquiries/${SAMPLE_INQUIRY_ID}`),
        reference: shortReference(SAMPLE_INQUIRY_ID),
      },
    },
    {
      name: "Zmiana statusu realizacji (zaprojektowane, niepodłączone)",
      subject: orderStatus("subject"),
      content: {
        preview: orderStatus("subject"),
        heading: orderStatus("heading"),
        body: orderStatus("body", { stage: fulfillmentStage("montaz") }),
        ctaLabel: orderStatus("cta"),
        ctaHref: SAMPLE_LINK(`panel/inquiries/${SAMPLE_INQUIRY_ID}`),
        badge: fulfillmentStage("montaz"),
        reference: shortReference(SAMPLE_INQUIRY_ID),
      },
    },
    {
      name: "Potwierdzenie płatności (zaprojektowane, niepodłączone)",
      subject: payment("subject"),
      content: {
        preview: payment("subject"),
        heading: payment("heading"),
        body: payment("body", { amount: "12 500,00 EUR" }),
        ctaLabel: payment("cta"),
        ctaHref: SAMPLE_LINK("panel"),
        reference: shortReference(SAMPLE_INQUIRY_ID),
      },
    },
  ];

  return Promise.all(
    entries.map(async (entry) => ({
      name: entry.name,
      subject: entry.subject,
      html: await render(TransactionalEmail(entry.content)),
    })),
  );
}

export default async function InternalNotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  const selfHref = `/${locale}/internal/notifications`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  const previews = await buildPreviews();

  return (
    <Stack gap={5}>
      <Stack gap={1}>
        <Heading level="h1">Podgląd szablonów e mail</Heading>
        <Text tone="muted">
          Wszystkie pięć szablonów renderowane na przykładowych, fikcyjnych danych. Tylko do odczytu — nic tu nie
          wysyła prawdziwego e maila.
        </Text>
      </Stack>
      {previews.map((preview) => (
        <Stack key={preview.name} gap={2} className="rounded-card border border-brand-steel p-brand-4">
          <Stack gap={1}>
            <Text as="span" variant="label" tone="muted">
              {preview.name}
            </Text>
            <Text as="span" className="font-medium">
              Temat: {preview.subject}
            </Text>
          </Stack>
          <iframe
            title={preview.name}
            srcDoc={preview.html}
            className="h-[520px] w-full rounded-data border border-brand-steel"
          />
        </Stack>
      ))}
    </Stack>
  );
}
