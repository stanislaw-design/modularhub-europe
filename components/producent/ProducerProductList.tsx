"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card, Heading, Stack, Text } from "@/components/ui";
import { deleteProducerProduct } from "@/lib/producer-product-actions";
import { DeleteProductDialog } from "./DeleteProductDialog";

export type ProducerProductMissing = "draft" | "photo" | "price" | "translation";

export interface ProducerProductListItem {
  id: string;
  name: string;
  family: "dom" | "spa-modulowe" | "kontenery-modulowe" | "outdoor-tv";
  status: "draft" | "published";
  createdAt: Date;
  // Braki według AC-10 (spec 0074), w kolejności: szkic, zdjęcie, cena, tłumaczenie. Pusta lista = kompletny.
  missing: ProducerProductMissing[];
}

interface ProducerProductListProps {
  locale: string;
  products: ProducerProductListItem[];
}

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

const MISSING_KEY: Record<ProducerProductMissing, string> = {
  draft: "missingDraft",
  photo: "missingPhoto",
  price: "missingPrice",
  translation: "missingTranslation",
};

// Lista własnego katalogu producenta (spec 0032 AC-3, AC-6; spec 0074 AC-10): produkty
// dostarczone już przefiltrowane po producerId z sesji i posortowane (braki na górze),
// z kolumną "Kompletność" i podsumowaniem. Usuwanie tym samym modalem co dawny mock
// (DeleteProductDialog, spec 0016 AC-10).
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
  const publishedCount = products.filter((item) => item.status === "published").length;
  const incompleteCount = products.filter((item) => item.status === "published" && item.missing.length > 0).length;

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

      {products.length > 0 && (
        <Text tone="muted">{t("summary", { published: publishedCount, incomplete: incompleteCount })}</Text>
      )}

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
        <div className="overflow-x-auto rounded-data border border-brand-steel">
          <table className="w-full min-w-[44rem] border-collapse text-body">
            <thead>
              <tr className="border-b border-brand-steel bg-brand-steel/20 text-left">
                {(["columnProduct", "columnStatus", "columnCompleteness", "columnAdded", "columnActions"] as const).map(
                  (column) => (
                    <Text key={column} as="th" className="p-brand-2 font-medium">
                      {t(column)}
                    </Text>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {products.map((productItem) => {
                const firstMissing = productItem.missing[0];
                const editHref = `/${locale}/producer/panel/products/${productItem.id}/edit`;
                return (
                  <tr key={productItem.id} className="border-b border-brand-steel/50 align-middle last:border-b-0">
                    <td className="p-brand-2">
                      <Text className="font-medium">{productItem.name || t("unnamedProduct")}</Text>
                      <Text tone="muted" className="text-label">
                        {familyLabel(productItem.family)}
                      </Text>
                    </td>
                    <Text as="td" className="p-brand-2">
                      {statusLabel(productItem.status)}
                    </Text>
                    <td className="p-brand-2">
                      {firstMissing ? (
                        <>
                          <Text className="font-medium text-status-conditional">{t(MISSING_KEY[firstMissing])}</Text>
                          {productItem.missing.length > 1 && (
                            <Text tone="muted" className="text-label">
                              {t("missingMore", { count: productItem.missing.length - 1 })}
                            </Text>
                          )}
                        </>
                      ) : (
                        <Text className="text-status-approved">{t("complete")}</Text>
                      )}
                    </td>
                    <Text as="td" className="p-brand-2">
                      {dateFormatter.format(productItem.createdAt)}
                    </Text>
                    <td className="p-brand-2">
                      <div className="flex flex-wrap gap-brand-2">
                        <Button
                          as="a"
                          href={editHref}
                          variant={firstMissing ? "primary" : "secondary"}
                          size="md"
                        >
                          {firstMissing ? t("completeButton") : t("editButton")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          disabled={isPending}
                          onClick={() => setDeleteTarget(productItem)}
                        >
                          {t("deleteButton")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
