"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card, DataText, Heading, Stack, Text } from "@/components/ui";
import { deleteProducerProduct } from "@/lib/producer-product-actions";
import { DeleteProductDialog } from "./DeleteProductDialog";

export interface ProducerProductListItem {
  id: string;
  name: string;
  family: "dom" | "spa-modulowe" | "kontenery-modulowe";
  status: "draft" | "published";
  createdAt: Date;
}

interface ProducerProductListProps {
  locale: string;
  products: ProducerProductListItem[];
}

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

// Lista własnego katalogu producenta (spec 0032 AC-3, AC-6): produkty
// dostarczone już przefiltrowane po producerId z sesji (strona serwerowa),
// usuwanie tym samym modalem co dawny mock (DeleteProductDialog, spec 0016 AC-10).
export function ProducerProductList({ locale, products }: ProducerProductListProps) {
  const t = useTranslations("ProducerProductList");
  const tOptions = useTranslations("ProjectOptions");
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<ProducerProductListItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const familyLabel = (family: ProducerProductListItem["family"]) => tOptions(`family.${family}`);
  const statusLabel = (status: ProducerProductListItem["status"]) =>
    status === "published" ? t("statusPublished") : t("statusDraft");

  function handleDeleteConfirm() {
    if (deleteTarget === null) return;
    const targetId = deleteTarget.id;
    setError(null);
    startTransition(async () => {
      const result = await deleteProducerProduct(targetId);
      setDeleteTarget(null);
      if (!result.ok) {
        setError(result.error ?? t("deleteError"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <Stack gap={4}>
      <div className="flex flex-wrap items-center justify-between gap-brand-2">
        <Heading level="h1">{t("heading")}</Heading>
        <div className="flex flex-wrap gap-brand-2">
          <Button as="a" href={`/${locale}/producer/panel/project`} className="w-fit">
            {t("addProduct")}
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-data bg-status-blocked/10 px-brand-2 py-1 text-body text-status-blocked">
          {error}
        </p>
      )}

      {products.length === 0 ? (
        <Card as="div" padding="md">
          <Stack gap={2} align="start">
            <Text tone="muted">{t("emptyMessage")}</Text>
            <div className="flex flex-wrap gap-brand-2">
              <Button as="a" href={`/${locale}/producer/panel/project`}>
                {t("addFirstProduct")}
              </Button>
            </div>
          </Stack>
        </Card>
      ) : (
        <Stack gap={3}>
          {products.map((productItem) => (
            <Card key={productItem.id} as="div" padding="md">
              <Stack gap={2} align="start">
                <div className="flex w-full flex-wrap items-baseline justify-between gap-brand-2">
                  <Heading level="h2">{productItem.name || t("unnamedProduct")}</Heading>
                  <DataText tone="muted">
                    {t("addedOn", { date: dateFormatter.format(productItem.createdAt) })}
                  </DataText>
                </div>
                <Text tone="muted">
                  {familyLabel(productItem.family)} · {statusLabel(productItem.status)}
                </Text>
                <Stack direction="row" gap={2}>
                  <Button
                    as="a"
                    href={`/${locale}/producer/panel/products/${productItem.id}/edit`}
                    variant="secondary"
                    size="sm"
                  >
                    {t("editButton")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setDeleteTarget(productItem)}
                  >
                    {t("deleteButton")}
                  </Button>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}

      <DeleteProductDialog
        open={deleteTarget !== null}
        productName={deleteTarget?.name || t("unnamedProduct")}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </Stack>
  );
}
