"use client";

import { type ChangeEvent, useRef } from "react";
import { FileText, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MockUploadedFile } from "@/lib/data/types";
import { Button } from "./Button";
import { Label } from "./Label";
import { Stack } from "./Stack";
import { Text } from "./Text";

interface FileUploadProps {
  id: string;
  label: string;
  files: MockUploadedFile[];
  onFilesChange: (files: MockUploadedFile[]) => void;
  nativeFiles?: File[];
  onNativeFilesChange?: (files: File[]) => void;
  accept?: string;
  required?: boolean;
  notice?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  id,
  label,
  files,
  onFilesChange,
  nativeFiles,
  onNativeFilesChange,
  accept,
  required,
  notice,
}: FileUploadProps) {
  const t = useTranslations("FileUpload");
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = `${id}-list`;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files;
    if (!selected || selected.length === 0) return;
    const next: MockUploadedFile[] = Array.from(selected).map((file) => ({
      name: file.name,
      sizeBytes: file.size,
    }));
    if (nativeFiles && onNativeFilesChange) {
      onNativeFilesChange([...nativeFiles, ...Array.from(selected)]);
    } else {
      onFilesChange([...files, ...next]);
    }
    event.target.value = "";
  }

  function handleRemove(index: number) {
    if (nativeFiles && onNativeFilesChange) {
      onNativeFilesChange(nativeFiles.filter((_, fileIndex) => fileIndex !== index));
    } else {
      onFilesChange(files.filter((_, fileIndex) => fileIndex !== index));
    }
  }

  return (
    <div className="flex flex-col gap-brand-1">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        multiple
        accept={accept}
        onChange={handleChange}
        className="sr-only"
        aria-describedby={listId}
      />
      <Stack direction="row" gap={2} align="center" className="flex">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-fit"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-4" aria-hidden="true" />
          {t("chooseFiles")}
        </Button>
        <Text as="span" variant="label" tone="muted">
          {notice ?? t("mockNotice")}
        </Text>
      </Stack>
      <ul id={listId} className="flex flex-col gap-1">
        {files.length === 0 && (
          <li>
            <Text as="span" tone="muted">
              {t("noFilesSelected")}
            </Text>
          </li>
        )}
        {files.map((file, index) => (
          <li
            key={`${file.name}-${index}`}
            className="flex items-center justify-between gap-brand-2 rounded-data border border-brand-steel px-brand-2 py-1"
          >
            <span className="flex min-w-0 items-center gap-brand-1">
              <FileText className="size-4 shrink-0 text-brand-technical-graphite" aria-hidden="true" />
              <Text as="span" className="truncate">
                {file.name}
              </Text>
              <Text as="span" variant="label" tone="muted">
                {formatFileSize(file.sizeBytes)}
              </Text>
            </span>
            <button
              type="button"
              onClick={() => handleRemove(index)}
              aria-label={t("removeFile", { name: file.name })}
              className="focus-ring flex size-6 shrink-0 items-center justify-center rounded-data text-brand-technical-graphite hover:text-status-blocked"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
