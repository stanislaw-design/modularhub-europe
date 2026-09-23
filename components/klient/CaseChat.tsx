"use client";

import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button, Text, Textarea } from "@/components/ui";
import { markChannelRead, sendMessage } from "@/lib/case-actions";
import type { CaseMessageDto } from "@/lib/case-schemas";
import type { CaseFieldsByKey } from "@/lib/cases/cards";
import { nextPollDelay } from "@/lib/cases/poll";
import { NIE_WIEM } from "@/lib/cases/start-cards";
import { CaseCardHistoryEntry, CaseCardStack, isCardFieldAnswered } from "./CaseCardStack";

interface CaseChatProps {
  inquiryId: string;
  channelId: string;
  viewer: "client" | "advisor";
  initialMessages: CaseMessageDto[];
  // Stan kart startowych (AC-38 do AC-44). Tylko klient je odpowiada, ale
  // doradca też widzi odpowiedziane karty w historii, stąd prop nie jest
  // ograniczony do viewer === "client".
  initialCaseFields?: CaseFieldsByKey;
}

function questionCardFieldKey(message: CaseMessageDto): string | null {
  if (message.type !== "question_card") return null;
  const payload = message.payload as { fieldKey?: unknown } | null;
  return payload && typeof payload === "object" && typeof payload.fieldKey === "string" ? payload.fieldKey : null;
}

function mergeMessages(current: CaseMessageDto[], incoming: CaseMessageDto[]): CaseMessageDto[] {
  if (incoming.length === 0) return current;
  const known = new Set(current.map((message) => message.id));
  const fresh = incoming.filter((message) => !known.has(message.id));
  return fresh.length === 0 ? current : [...current, ...fresh];
}

// Czat sprawy doradczej (spec 0048 AC-6): odświeżanie co 5 s w aktywnej karcie,
// co 30 s w karcie w tle, przy błędzie odstęp rośnie. Wiadomości nie da się
// edytować ani usunąć. Odstępy liczy czysta funkcja nextPollDelay.
export function CaseChat({ inquiryId, channelId, viewer, initialMessages, initialCaseFields }: CaseChatProps) {
  const t = useTranslations("CaseChat");
  const locale = useLocale();
  const [messages, setMessages] = useState(initialMessages);
  const [caseFields, setCaseFields] = useState<CaseFieldsByKey>(initialCaseFields ?? {});
  const [cardsDismissed, setCardsDismissed] = useState(false);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState(false);
  const [pollFailing, setPollFailing] = useState(false);
  const [isPending, startTransition] = useTransition();
  // Klucz idempotencji dla bieżącej wersji roboczej: ponowienie po błędzie
  // wysyła ten sam klucz, nowa wiadomość dostaje nowy.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const cursorRef = useRef(initialMessages.at(-1)?.cursor ?? null);
  const logRef = useRef<HTMLDivElement>(null);

  const appendMessages = useCallback((incoming: CaseMessageDto[]) => {
    setMessages((current) => {
      const merged = mergeMessages(current, incoming);
      const last = merged.at(-1);
      if (last) cursorRef.current = last.cursor;
      return merged;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;

    async function poll() {
      try {
        const query = cursorRef.current ? `?after=${encodeURIComponent(cursorRef.current)}` : "";
        const response = await fetch(`/api/cases/${inquiryId}/channels/${channelId}/messages${query}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`poll ${response.status}`);
        const data = (await response.json()) as { messages: CaseMessageDto[] };
        if (cancelled) return;
        failures = 0;
        setPollFailing(false);
        if (data.messages.length > 0) {
          appendMessages(data.messages);
          if (document.visibilityState === "visible") void markChannelRead(inquiryId, channelId);
        }
      } catch {
        failures += 1;
        if (!cancelled) setPollFailing(true);
      }
      schedule();
    }

    function schedule() {
      if (cancelled) return;
      timer = setTimeout(poll, nextPollDelay({ visible: document.visibilityState === "visible", failures }));
    }

    function handleVisibility() {
      // Powrót do karty odświeża od razu, zamiast czekać na wolniejszy odstęp.
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void poll();
      }
    }

    void markChannelRead(inquiryId, channelId);
    schedule();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [inquiryId, channelId, appendMessages]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages.length]);

  function authorLabel(message: CaseMessageDto): string {
    if (message.authorKind === "system") return t("authorSystem");
    if (message.authorKind === "producer") return t("authorProducer");
    if (message.authorKind === viewer) return t("authorYou");
    return message.authorKind === "advisor" ? t("authorAdvisor") : t("authorClient");
  }

  function handleCardAnswered(key: string, value: string) {
    const isUnsure = value === NIE_WIEM;
    setCaseFields((current) => ({
      ...current,
      [key]: { value: isUnsure ? null : value, state: isUnsure ? "missing" : "confirmed" },
    }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || isPending) return;
    setSendError(false);

    startTransition(async () => {
      const result = await sendMessage({ inquiryId, channelId, body, locale, idempotencyKey });
      if (!result.ok || !result.message) {
        setSendError(true);
        return;
      }
      appendMessages([result.message]);
      setDraft("");
      setIdempotencyKey(crypto.randomUUID());
    });
  }

  return (
    <section aria-labelledby="case-chat-heading" className="flex flex-col gap-brand-2">
      <h2 id="case-chat-heading" className="font-sans text-h3 font-medium text-brand-v5-ink">
        {t("heading")}
      </h2>
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label={t("heading")}
        className="flex max-h-[28rem] min-h-40 flex-col gap-brand-2 overflow-y-auto rounded-v5-card border border-brand-v5-line p-brand-2"
      >
        {messages.length === 0 && (
          <Text tone="muted" surface="v5">
            {t("empty")}
          </Text>
        )}
        {messages.map((message) => {
          const mine = message.authorKind === viewer;
          const cardFieldKey = questionCardFieldKey(message);
          // U klienta karta nieodpowiedziana i sekwencja nie pominięta:
          // pokazuje ją CaseCardStack poniżej, nie zwykła historia (AC-43).
          // Doradca widzi wszystkie karty w historii od razu, bez sekwencji.
          if (viewer === "client" && cardFieldKey && !cardsDismissed && !isCardFieldAnswered(caseFields[cardFieldKey])) {
            return null;
          }

          return (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-data px-brand-2 py-brand-1 ${
                message.authorKind === "system"
                  ? "self-center bg-brand-v5-line/20 text-center"
                  : mine
                    ? "self-end bg-brand-v5-amber-strong/15"
                    : "self-start bg-brand-v5-line/20"
              }`}
            >
              {cardFieldKey ? (
                <CaseCardHistoryEntry fieldKey={cardFieldKey} caseFields={caseFields} />
              ) : (
                <>
                  <Text as="p" surface="v5" className="text-data font-medium">
                    {authorLabel(message)}
                  </Text>
                  <Text as="p" surface="v5" className="whitespace-pre-wrap break-words">
                    {message.redacted || message.body === null ? t("redacted") : message.body}
                  </Text>
                </>
              )}
            </div>
          );
        })}
      </div>
      {viewer === "client" && (
        <CaseCardStack
          inquiryId={inquiryId}
          cardMessages={messages.filter((message) => message.type === "question_card")}
          caseFields={caseFields}
          dismissed={cardsDismissed}
          onDismiss={() => setCardsDismissed(true)}
          onAnswered={handleCardAnswered}
        />
      )}
      {pollFailing && (
        <p className="font-sans text-body text-status-blocked" role="status">
          {t("pollError")}
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-brand-1">
        <label htmlFor="case-chat-draft" className="sr-only">
          {t("draftLabel")}
        </label>
        <Textarea
          id="case-chat-draft"
          surface="v5"
          value={draft}
          maxLength={4000}
          onChange={(event) => setDraft(event.target.value)}
        />
        {sendError && (
          <p className="font-sans text-body text-status-blocked" role="alert">
            {t("sendError")}
          </p>
        )}
        <Button type="submit" surface="v5" disabled={isPending || draft.trim().length === 0} className="w-fit">
          {isPending ? t("sending") : sendError ? t("retry") : t("send")}
        </Button>
      </form>
    </section>
  );
}
