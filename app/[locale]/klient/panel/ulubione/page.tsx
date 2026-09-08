import { getTranslations } from "next-intl/server";
import { FavoritesGrid } from "@/components/klient/FavoritesGrid";
import { PanelEmptyState } from "@/components/klient/PanelEmptyState";
import { Heading, Stack } from "@/components/ui";
import { getFavoritesForClient } from "@/lib/data/projects";
import { getClientIdForUser } from "@/lib/db/queries";
import { requirePanelClientSession } from "@/lib/panel-session";

const MAX_COMPARE = 3;

function buildSelfHref(
  locale: string,
  searchParams: { [key: string]: string | string[] | undefined }
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  const query = params.toString();
  return `/${locale}/klient/panel/ulubione${query ? `?${query}` : ""}`;
}

export default async function UlubionePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ locale }, rawSearchParams, t] = await Promise.all([
    params,
    searchParams,
    getTranslations("KlientPanelUlubionePage"),
  ]);
  const selfHref = buildSelfHref(locale, rawSearchParams);
  const session = await requirePanelClientSession(locale, selfHref);

  const clientId = await getClientIdForUser(session.user.id);
  const favorites = clientId ? await getFavoritesForClient(clientId) : [];

  if (favorites.length === 0) {
    return (
      <Stack gap={4}>
        <Heading level="h1" surface="v5">
          {t("heading")}
        </Heading>
        <PanelEmptyState locale={locale} title={t("emptyTitle")} description={t("emptyDescription")} />
      </Stack>
    );
  }

  // Parametr compare (spec 0024 AC-6, Key invariants): tylko id spośród
  // własnych ulubionych klienta, bez duplikatów, maksymalnie 3. Niepoprawna
  // lub pusta wartość po walidacji łagodnie pokazuje samą listę, nie błąd.
  const rawCompare = rawSearchParams.compare;
  const favoriteIds = new Set(favorites.map((entry) => entry.project.id));
  const selectedIds =
    typeof rawCompare === "string"
      ? [...new Set(rawCompare.split(","))].filter((id) => favoriteIds.has(id)).slice(0, MAX_COMPARE)
      : [];

  return (
    <Stack gap={4}>
      <Heading level="h1" surface="v5">
        {t("heading")}
      </Heading>
      <FavoritesGrid locale={locale} favorites={favorites} selectedIds={selectedIds} maxSelected={MAX_COMPARE} />
    </Stack>
  );
}
