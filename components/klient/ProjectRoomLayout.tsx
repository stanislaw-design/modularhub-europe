"use client";

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { ChevronDown, LayoutGrid, X, ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useId, useState } from "react";
import { DataText, Heading, Text } from "@/components/ui";
import type { ProjectDocument, RoomLayoutEntry } from "@/lib/data/types";

interface ProjectRoomLayoutProps {
  rooms: RoomLayoutEntry[];
  // Project.rooms/bathrooms (dedykowane kolumny produktu), nie policzone z
  // rooms.length — ta lista miesza pokoje z korytarzami/wiatrołapem/kotłownią,
  // więc "3 pomieszczenia" nic nie mówiło klientowi o realnej liczbie pokoi.
  roomCount: number;
  bathroomCount: number;
  projectName: string;
  coverImageUrl: string;
  // Rzut (purpose "product_floor_plan") pokazuje faktyczny rozkład
  // pomieszczeń zamiast wizualizacji elewacji — dokładniejsze dopełnienie
  // tabeli niż zdjęcie domu z zewnątrz, gdy producent je dostarczył (spec
  // 0042 Feature design: "tabela pomieszczeń plus istniejący rzut, gdy jest
  // dostępny"). Ignoruje przypisanie do wariantu — sam układ pomieszczeń
  // (Project.roomLayout) też jest polem na poziomie produktu, nie wariantu.
  documents?: ProjectDocument[];
}

function roomCountBucket(count: number): "one" | "few" | "many" {
  return count === 1 ? "one" : count >= 2 && count <= 4 ? "few" : "many";
}

// Tylko pierwsze 4 pomieszczenia widoczne od razu, reszta za "pokaż
// wszystkie" — im więcej pomieszczeń, tym dłuższa tabela zdominowałaby
// pierwszy ekran przed resztą sekcji strony (cena, działka, harmonogram).
const PREVIEW_ROOM_COUNT = 4;

interface RoomTableBodyProps {
  rooms: RoomLayoutEntry[];
  t: ReturnType<typeof useTranslations>;
  // Tylko prawdziwy ostatni wiersz całej (sklejonej z dwóch <table>) listy
  // traci dolną krechę — w tabeli podglądu to zależy od tego, czy w ogóle
  // jest druga tabela do sklejenia (spec niżej, hasMore).
  isLastGroup: boolean;
}

function RoomTableBody({ rooms, t, isLastGroup }: RoomTableBodyProps) {
  return (
    <tbody>
      {rooms.map((room, index) => (
        <tr
          key={`${room.name}-${index}`}
          className={`border-b border-brand-v5-line/50 ${isLastGroup ? "last:border-b-0" : ""}`}
        >
          <td className="p-brand-2">
            <Text as="span" surface="v5" className="font-medium">
              {room.name}
            </Text>
            {room.floorLevel && room.floorLevel !== "parter" && (
              <Text as="span" tone="muted" surface="v5" className="ml-brand-1 text-data">
                {t(`floorLevelBadge.${room.floorLevel}`)}
              </Text>
            )}
          </td>
          <td className="p-brand-2">
            {room.areaM2 !== undefined ? (
              <DataText surface="v5">{t("areaValue", { area: room.areaM2 })}</DataText>
            ) : (
              <Text tone="muted" surface="v5">
                —
              </Text>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  );
}

// Zdjęcie po lewej, po prawej sam rozkład: metraż i liczba pomieszczeń jako
// jedna zwięzła linijka (nie cztery duże, identyczne liczby, wzorzec z listy
// zakazów PRODUCT.md), a zaraz pod nią pełna lista pomieszczeń — klient
// ocenia dopasowanie domu do swojego życia patrząc na nazwy i metraże
// wprost, bez klikania w modal po drugą połowę informacji (spec 0042 AC-4,
// historyjka "zanim przejdę do specyfikacji technicznej"). Powyżej
// PREVIEW_ROOM_COUNT reszta rozwija się płynnie (siatka CSS 0fr→1fr, jedyny
// sposób na animowaną wysokość realnego <table>, bo `tr` nie animuje
// `height` wprost) — jedyny powód, dla którego to jednak komponent
// kliencki, ten sam wzorzec lokalnego stanu co checkbox w
// ProjectCostComparisonTable.
// Sekcja renderuje się zawsze, żeby klient widział cały nowy układ strony od
// razu: bez listy pomieszczeń pokazuje jawny placeholder zamiast znikać
// (świadome odejście od pierwotnego AC-4 "brak danych, brak sekcji", ten sam
// wzorzec placeholdera co już zakładka Realizacje, AC-8).
export function ProjectRoomLayout({
  rooms,
  roomCount,
  bathroomCount,
  projectName,
  coverImageUrl,
  documents = [],
}: ProjectRoomLayoutProps) {
  const t = useTranslations("ProjectRoomLayout");
  const [expanded, setExpanded] = useState(false);
  // Osobny, jednoobrazkowy modal, nie GalleryLightboxProvider (spec 0042
  // AC-7/AC-8): ten obraz (rzut albo, w jego braku, okładka) żyje poza
  // zestawem "wizualizacje" z zakładek galerii, bez potrzeby przewijania
  // strzałkami między nimi — jedno zdjęcie, samo powiększenie wystarczy.
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const extraRoomsId = useId();
  const floorPlanUrl = documents.find((doc) => doc.purpose === "product_floor_plan")?.url;

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col gap-brand-3">
        <Heading level="h2" surface="v5" className="text-h3">
          {t("heading")}
        </Heading>
        <div className="flex flex-col items-center gap-brand-2 rounded-v5-card border border-dashed border-brand-v5-line p-brand-6 text-center">
          <LayoutGrid className="size-8 text-brand-v5-muted" aria-hidden="true" />
          <Text tone="muted" surface="v5">
            {t("emptyHint")}
          </Text>
        </div>
      </div>
    );
  }

  // Zaokrąglone do 2 miejsc, żeby suma zmiennoprzecinkowa kilkunastu wartości
  // (np. 5.71 + 9.03 + ...) nie pokazała klientowi 140.23999999999998.
  const totalAreaM2 = Math.round(rooms.reduce((sum, room) => sum + (room.areaM2 ?? 0), 0) * 100) / 100;
  const previewRooms = rooms.slice(0, PREVIEW_ROOM_COUNT);
  const extraRooms = rooms.slice(PREVIEW_ROOM_COUNT);
  const hasMore = extraRooms.length > 0;

  return (
    <div className="flex flex-col gap-brand-3">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("heading")}
      </Heading>
      <div className="grid grid-cols-1 gap-brand-4 lg:grid-cols-12 lg:items-start lg:gap-brand-6">
        <div className="lg:col-span-5">
          <button
            type="button"
            onClick={() => setIsZoomOpen(true)}
            aria-label={t("zoomOpenLabel")}
            className={`focus-ring relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-v5-card border-0 p-0 ${floorPlanUrl ? "border border-brand-v5-line bg-brand-v5-surface" : ""}`}
          >
            <Image
              src={floorPlanUrl ?? coverImageUrl}
              alt={floorPlanUrl ? t("floorPlanAlt", { name: projectName }) : t("imageAlt", { name: projectName })}
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className={floorPlanUrl ? "object-contain p-brand-2" : "object-cover"}
            />
            <span className="absolute bottom-brand-2 right-brand-2 flex size-9 items-center justify-center rounded-full bg-brand-v5-night/60 text-brand-v5-paper">
              <ZoomIn className="size-5" aria-hidden="true" />
            </span>
          </button>
        </div>
        <div className="flex flex-col gap-brand-3 lg:col-span-7">
          <div className="flex flex-wrap items-baseline gap-x-brand-3 gap-y-1 border-b border-brand-v5-line pb-brand-3">
            <div className="flex items-baseline gap-brand-2">
              <DataText surface="v5" className="text-h3 font-black">
                {t("areaValue", { area: totalAreaM2 })}
              </DataText>
              <Text tone="muted" surface="v5" className="font-semibold">
                {t("totalAreaLabel")}
              </Text>
            </div>
            <div className="flex items-baseline gap-brand-2">
              <span className="text-brand-v5-muted" aria-hidden="true">
                &middot;
              </span>
              <DataText surface="v5" className="text-h3 font-black">
                {roomCount}
              </DataText>
              <Text tone="muted" surface="v5" className="font-semibold">
                {t(`roomsLabel.${roomCountBucket(roomCount)}`)}
              </Text>
            </div>
            <div className="flex items-baseline gap-brand-2">
              <span className="text-brand-v5-muted" aria-hidden="true">
                &middot;
              </span>
              <DataText surface="v5" className="text-h3 font-black">
                {bathroomCount}
              </DataText>
              <Text tone="muted" surface="v5" className="font-semibold">
                {t(`bathroomsLabel.${roomCountBucket(bathroomCount)}`)}
              </Text>
            </div>
          </div>

          {/* Jedna, wspólna ramka i zaokrąglenie dla obu tabel naraz
              (overflow-hidden przycina oba fragmenty), zamiast osobnej ramki
              na każdą — inaczej tabela wyglądała na "otwartą" u dołu w
              stanie zwiniętym, a po rozwinięciu między fragmentami było
              widać przerwę (odstęp `gap-brand-3` z rodzica plus podwójna
              ramka). Druga tabela dokleja się bez własnej ramki/zaokrąglenia. */}
          <div className="overflow-hidden rounded-v5-card border border-brand-v5-line">
            <div className="overflow-x-auto">
              {/* table-fixed + colgroup: bez tego kolumny dwóch osobnych
                  <table> (podgląd i rozwinięcie) liczyłyby szerokość z
                  własnej treści osobno — "Pokój dzienny + jadalnia" w drugiej
                  tabeli przesunąłby jej kolumnę "Powierzchnia" względem
                  pierwszej, więc wartości przestałyby się pionowo zgadzać. */}
              <table className="w-full min-w-[20rem] table-fixed border-collapse text-left">
                <caption className="sr-only">{t("tableCaption")}</caption>
                <colgroup>
                  <col className="w-[65%]" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="border-b border-brand-v5-line bg-brand-v5-line/10">
                    <th scope="col" className="p-brand-2 text-label font-semibold text-brand-v5-muted">
                      {t("nameColumn")}
                    </th>
                    <th scope="col" className="p-brand-2 text-label font-semibold text-brand-v5-muted">
                      {t("areaColumn")}
                    </th>
                  </tr>
                </thead>
                <RoomTableBody rooms={previewRooms} t={t} isLastGroup={!hasMore} />
              </table>
            </div>

            {hasMore && (
              <div
                id={extraRoomsId}
                className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none"
                style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[20rem] table-fixed border-collapse text-left">
                      <caption className="sr-only">{t("tableCaption")}</caption>
                      <colgroup>
                        <col className="w-[65%]" />
                        <col />
                      </colgroup>
                      <RoomTableBody rooms={extraRooms} t={t} isLastGroup />
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              aria-controls={extraRoomsId}
              className="focus-ring flex w-fit items-center gap-brand-1 rounded-data text-body font-semibold text-brand-v5-ink underline underline-offset-2"
            >
              {expanded ? t("showFewerRooms") : t("showAllRooms", { count: extraRooms.length })}
              <ChevronDown
                className={`size-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      </div>

      <Dialog open={isZoomOpen} onClose={() => setIsZoomOpen(false)} transition className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-brand-v5-night/80 backdrop-blur-md transition duration-200 ease-out data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex items-center justify-center p-brand-2">
          <DialogPanel
            transition
            className="relative flex h-full w-full max-w-6xl items-center justify-center transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            <button
              type="button"
              onClick={() => setIsZoomOpen(false)}
              aria-label={t("zoomCloseLabel")}
              className="focus-ring absolute right-0 top-0 z-10 flex size-11 items-center justify-center rounded-full border-0 bg-brand-v5-night/60 text-brand-v5-paper transition hover:bg-brand-v5-night/80 sm:right-brand-2 sm:top-brand-2"
            >
              <X className="size-6" aria-hidden="true" />
            </button>
            <div className="relative h-[80vh] w-full">
              <Image
                src={floorPlanUrl ?? coverImageUrl}
                alt={floorPlanUrl ? t("floorPlanAlt", { name: projectName }) : t("imageAlt", { name: projectName })}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
