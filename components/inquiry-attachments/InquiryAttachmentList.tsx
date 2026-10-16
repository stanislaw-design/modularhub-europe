"use client";

import { Download, EyeOff, FileText, RefreshCw, Trash2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { Button, Text } from "@/components/ui";
import {
  deleteInquiryAttachment,
  getInquiryAttachmentUrl,
  hideInquiryAttachment,
  unhideInquiryAttachment,
  type InquiryAttachmentItem,
} from "@/lib/inquiry-attachment-actions";
import { formatAttachmentSize, type AttachmentErrorCode } from "@/lib/inquiry-attachment-specs";
import { fillLabel, type InquiryAttachmentLabels } from "./labels";

export type AttachmentViewer = "client" | "producer" | "admin";

interface InquiryAttachmentListProps {
  items: InquiryAttachmentItem[];
  viewer: AttachmentViewer;
  labels: InquiryAttachmentLabels;
  locale: string;
  surface?: "v5" | "v3";
  // Klient i admin mogą usuwać pliki (klient tylko, dopóki zapytanie jest otwarte na zmiany).
  canRemove?: boolean;
  // Admin: ukrywanie i przywracanie z powodem.
  canModerate?: boolean;
  // "Zamień": panel otwiera wgrywanie i po udanym wgraniu usuwa wskazany plik.
  onReplace?: (attachmentId: string) => void;
}

// AC-30 do AC-33: lista plików zapytania. Pobranie idzie wyłącznie przez
// getInquiryAttachmentUrl (uprawnienie liczone za każdym razem, link na 10 minut,
// pobranie jako załącznik), nigdy przez stały adres pliku.
export function InquiryAttachmentList({
  items,
  viewer,
  labels,
  locale,
  surface = "v5",
  canRemove: canRemoveProp = false,
  canModerate: canModerateProp = false,
  onReplace,
}: InquiryAttachmentListProps) {
  // Producent tylko czyta, a ukrywa wyłącznie admin, niezależnie od przekazanych flag.
  const canRemove = canRemoveProp && viewer !== "producer";
  const canModerate = canModerateProp && viewer === "admin";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [hidingId, setHidingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const line = surface === "v5" ? "border-brand-v5-line" : "border-brand-steel";
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  function fail(code: AttachmentErrorCode | undefined, fallback: string) {
    setError(code ? labels.errors[code] : fallback);
  }

  function run(attachmentId: string, action: () => Promise<{ ok: boolean; errorCode?: AttachmentErrorCode }>) {
    setError(null);
    setBusyId(attachmentId);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          fail(result.errorCode, labels.errors.generic);
          return;
        }
        router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  }

  function download(attachmentId: string) {
    setError(null);
    setBusyId(attachmentId);
    startTransition(async () => {
      try {
        const result = await getInquiryAttachmentUrl(attachmentId);
        if (!result.ok || !result.url) {
          setError(labels.downloadError);
          return;
        }
        window.location.assign(result.url);
      } finally {
        setBusyId(null);
      }
    });
  }

  function submitHide(event: FormEvent, attachmentId: string) {
    event.preventDefault();
    if (!reason.trim()) {
      setError(labels.errors.reason_required);
      return;
    }
    run(attachmentId, async () => {
      const result = await hideInquiryAttachment(attachmentId, reason);
      if (result.ok) {
        setHidingId(null);
        setReason("");
      }
      return result;
    });
  }

  if (items.length === 0) {
    return (
      <Text tone="muted" surface={surface}>
        {labels.empty}
      </Text>
    );
  }

  return (
    <div className="flex flex-col gap-brand-2">
      <ul className="flex flex-col gap-brand-2">
        {items.map((item) => {
          const busy = isPending && busyId === item.id;
          return (
            <li
              key={item.id}
              className={`flex flex-col gap-brand-2 rounded-data border ${line} px-brand-3 py-brand-2 ${item.deleted ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-brand-2">
                <FileText className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 break-words text-body font-medium">{item.filename}</span>
                <span className="shrink-0 text-data">
                  {formatAttachmentSize(item.sizeBytes)} · {dateFormat.format(new Date(item.createdAt))}
                </span>
              </div>
              {(item.hidden || item.deleted || item.uploadedByKind) && (
                <div className="flex flex-wrap items-center gap-brand-2 text-data">
                  {item.uploadedByKind && <span>{labels.uploadedBy[item.uploadedByKind]}</span>}
                  {item.hidden && (
                    <span className="rounded-data border border-status-blocked/40 bg-status-blocked/10 px-brand-2 py-0.5 text-status-blocked">
                      {labels.hiddenBadge}
                    </span>
                  )}
                  {item.deleted && <span className="rounded-data border border-brand-steel px-brand-2 py-0.5">{labels.deletedBadge}</span>}
                  {item.hidden && item.hiddenReason && <span>{fillLabel(labels.hiddenReason, { reason: item.hiddenReason })}</span>}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-brand-2">
                <Button type="button" variant="secondary" surface={surface} size="sm" disabled={busy} onClick={() => download(item.id)}>
                  <Download className="size-4" aria-hidden="true" />
                  {labels.download}
                </Button>
                {canRemove && !item.deleted && (
                  <>
                    {onReplace && (
                      <Button type="button" variant="secondary" surface={surface} size="sm" disabled={busy} onClick={() => onReplace(item.id)}>
                        <RefreshCw className="size-4" aria-hidden="true" />
                        {labels.replace}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      surface={surface}
                      size="sm"
                      disabled={busy}
                      onClick={() => run(item.id, () => deleteInquiryAttachment(item.id))}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      {busy ? labels.removing : labels.remove}
                    </Button>
                  </>
                )}
                {canModerate && !item.deleted && !item.hidden && (
                  <Button
                    type="button"
                    variant="secondary"
                    surface={surface}
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setError(null);
                      setReason("");
                      setHidingId(item.id);
                    }}
                  >
                    <EyeOff className="size-4" aria-hidden="true" />
                    {labels.hide}
                  </Button>
                )}
                {canModerate && !item.deleted && item.hidden && (
                  <Button
                    type="button"
                    variant="secondary"
                    surface={surface}
                    size="sm"
                    disabled={busy}
                    onClick={() => run(item.id, () => unhideInquiryAttachment(item.id))}
                  >
                    <Undo2 className="size-4" aria-hidden="true" />
                    {labels.unhide}
                  </Button>
                )}
              </div>
              {hidingId === item.id && (
                <form onSubmit={(event) => submitHide(event, item.id)} className="flex flex-col gap-brand-2" noValidate>
                  <label className="flex flex-col gap-brand-1 text-data">
                    {labels.hideReasonLabel}
                    <input
                      type="text"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      maxLength={300}
                      className="focus-ring h-10 w-full rounded-data border border-brand-steel bg-brand-warm-white px-brand-2 text-body text-brand-foundation-navy"
                    />
                  </label>
                  <div className="flex gap-brand-2">
                    <Button type="submit" surface={surface} size="sm" disabled={busy}>
                      {labels.hideConfirm}
                    </Button>
                    <Button type="button" variant="secondary" surface={surface} size="sm" onClick={() => setHidingId(null)}>
                      {labels.cancel}
                    </Button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <p className="text-data text-status-blocked" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
