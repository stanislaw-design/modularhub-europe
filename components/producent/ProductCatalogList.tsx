"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, DataText, Heading, Stack, Text } from "@/components/ui";
import type { Country, SavedProduct } from "@/lib/data/types";
import { deleteProduct, listProducts } from "@/lib/producer-products";
import type { RegistrationDetails } from "@/lib/producer-registration";
import { loadRegistrationDetails } from "@/lib/producer-registration-storage";
import { DeleteProductDialog } from "./DeleteProductDialog";

interface ProductCatalogListProps {
  locale: string;
  nip: string;
  countries: Country[];
}

type LoadStatus = "loading" | "ready";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

function buildAddProductHref(locale: string, registration: RegistrationDetails): string {
  const params = new URLSearchParams({
    nip: registration.nip,
    countries: registration.countries.join(","),
    technology: registration.technology,
  });
  return `/${locale}/producent/projekt?${params.toString()}`;
}

// Stan ładowania jest konieczny (nie tylko kosmetyczny): dane katalogu żyją w
// localStorage tej przeglądarki, więc nie są znane przy pierwszym renderze
// serwerowym. Bez tego stanu producent bez zapisanych danych rejestracji zobaczyłby
// najpierw stan pusty, a dopiero potem redirect — spec 0016, AC-1, AC-2, Key invariants.
export function ProductCatalogList({ locale, nip, countries }: ProductCatalogListProps) {
  const t = useTranslations("ProductCatalogList");
  const router = useRouter();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [registration, setRegistration] = useState<RegistrationDetails | null>(null);
  const [products, setProducts] = useState<SavedProduct[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<SavedProduct | null>(null);

  useEffect(() => {
    const stored = loadRegistrationDetails(nip);
    if (stored === null) {
      // Brak zapisanych danych rejestracji: przekierowanie samo odmontuje ten
      // komponent, status zostaje "loading" (ten sam widok co w trakcie odczytu).
      router.replace(`/${locale}/producent`);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizacja z localStorage po hydracji
    setRegistration(stored);
    setProducts(listProducts(nip));
    setStatus("ready");
  }, [locale, nip, router]);

  if (status !== "ready" || registration === null) {
    return (
      <Stack gap={4}>
        <Heading level="h1">{t("heading")}</Heading>
        <Text tone="muted">{t("loading")}</Text>
      </Stack>
    );
  }

  const countryName = (code: string) => countries.find((country) => country.code === code)?.name ?? code;

  function handleDeleteConfirm() {
    if (deleteTarget === null) return;
    deleteProduct(nip, deleteTarget.id);
    setProducts((prev) => prev.filter((product) => product.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <Stack gap={4}>
      <div className="flex flex-wrap items-center justify-between gap-brand-2">
        <Stack gap={1}>
          <Heading level="h1">{t("heading")}</Heading>
          <Text tone="muted">{t("subtitle", { nip: registration.nip })}</Text>
        </Stack>
        <Button as="a" href={buildAddProductHref(locale, registration)} className="w-fit">
          {t("addProduct")}
        </Button>
      </div>

      {products.length === 0 ? (
        <Card as="div" padding="md">
          <Stack gap={2} align="start">
            <Text tone="muted">{t("emptyMessage")}</Text>
            <Button as="a" href={buildAddProductHref(locale, registration)} variant="secondary">
              {t("addFirstProduct")}
            </Button>
          </Stack>
        </Card>
      ) : (
        <Stack gap={3}>
          {products.map((product) => (
            <Card key={product.id} as="div" padding="md">
              <Stack gap={2} align="start">
                <div className="flex w-full flex-wrap items-baseline justify-between gap-brand-2">
                  <Heading level="h2">{product.name}</Heading>
                  <DataText tone="muted">
                    {t("addedOn", { date: dateFormatter.format(new Date(product.createdAt)) })}
                  </DataText>
                </div>
                <Text tone="muted">
                  {product.floorAreaM2} m² · {product.bedrooms}{" "}
                  {product.bedrooms === 1 ? t("bedroomsOne") : t("bedroomsOther")} ·{" "}
                  {countryName(product.countryOfProduction)}
                </Text>
                <Stack direction="row" gap={2}>
                  <Button
                    as="a"
                    href={`/${locale}/producent/produkty/${product.id}/edytuj?nip=${registration.nip}`}
                    variant="secondary"
                    size="sm"
                  >
                    {t("editButton")}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteTarget(product)}>
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
        productName={deleteTarget?.name ?? ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </Stack>
  );
}
