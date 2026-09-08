"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";
import { Button, Card, DataText, Heading, Stack, Text } from "@/components/ui";
import type { Project } from "@/lib/data/types";
import { getBindingOfferPriceEur } from "@/lib/pricing";

interface BindingOfferViewProps {
  locale: string;
  project: Project;
  address: string;
}

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

export function BindingOfferView({ locale, project, address }: BindingOfferViewProps) {
  const t = useTranslations("BindingOfferView");
  const [acceptedAt, setAcceptedAt] = useState<Date | null>(null);
  const finalPriceEur = getBindingOfferPriceEur(project);
  const dzialkaHref = `/${locale}/klient/dzialka?projects=${project.id}`;
  const bedroomsLabel = t(`bedroomsLabel.${project.bedrooms === 1 ? "one" : "other"}`);

  return (
    <Stack gap={4}>
      <Heading level="h1" surface="v5">
        {t("heading", { name: project.name })}
      </Heading>
      <Text tone="muted" surface="v5" measure>
        {t("intro")}
      </Text>

      <Card as="article" padding="none" surface="v5" className="overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          <div className="relative aspect-[3/2] w-full shrink-0 overflow-hidden sm:w-64">
            <Image
              src={project.coverImageUrl}
              alt=""
              fill
              sizes="(min-width: 640px) 16rem, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-1 flex-col gap-brand-3 p-brand-3">
            <div>
              <Heading level="h2" surface="v5" className="text-h3">
                {project.name}
              </Heading>
              <Text tone="muted" surface="v5">
                {project.producerName} · {project.floorAreaM2} m² · {project.bedrooms} {bedroomsLabel}
              </Text>
            </div>

            <dl className="grid gap-brand-3 sm:grid-cols-2">
              <div>
                <Text as="dt" variant="label" tone="muted" surface="v5">
                  {t("addressLabel")}
                </Text>
                <dd>
                  <Text surface="v5">{address}</Text>
                </dd>
              </div>
              <div>
                <Text as="dt" variant="label" tone="muted" surface="v5">
                  {t("finalPriceLabel")}
                </Text>
                <dd>
                  <DataText surface="v5" className="text-h2">
                    {priceFormatter.format(finalPriceEur)} €
                  </DataText>
                </dd>
              </div>
            </dl>

            <Text tone="muted" surface="v5" className="text-label normal-case tracking-normal">
              {t("disclaimer")}
            </Text>

            {acceptedAt === null ? (
              <Button type="button" onClick={() => setAcceptedAt(new Date())} surface="v5" className="w-fit">
                {t("acceptOffer")}
              </Button>
            ) : (
              <div aria-live="polite">
                <Stack gap={2} align="start">
                  <span className="inline-flex w-fit items-center gap-brand-1 rounded-data border border-status-approved/30 bg-status-approved/10 px-brand-2 py-1 text-label font-medium uppercase tracking-[0.1em] text-status-approved">
                    <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
                    {t("acceptedAt", { date: dateFormatter.format(acceptedAt) })}
                  </span>
                  <Text tone="muted" surface="v5">
                    {t("acceptedThanks")}
                  </Text>
                  <Button
                    as="a"
                    href={`/${locale}/klient/realizacja?project=${project.id}`}
                    surface="v5"
                    className="w-fit"
                  >
                    {t("trackFulfillment")}
                  </Button>
                </Stack>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Button as="a" href={dzialkaHref} variant="secondary" surface="v5" className="w-fit">
        {t("backToPlot")}
      </Button>
    </Stack>
  );
}
