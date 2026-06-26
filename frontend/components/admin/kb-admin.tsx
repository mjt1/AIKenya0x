"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select";
import { TextAreaField } from "@/components/ui/textarea";
import { Text } from "@/components/ui/text";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useKbDocuments } from "@/hooks/queries/use-kb-documents";
import { useUploadKbDocument } from "@/hooks/mutations/use-upload-kb-document";
import { useUploadKbFile } from "@/hooks/mutations/use-upload-kb-file";
import { useDeleteKbDocument } from "@/hooks/mutations/use-delete-kb-document";
import { ApiError } from "@/lib/api";
import type { UploadDocumentInput } from "@/lib/types";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".text",
];
const ACCEPT_ATTR =
  ".pdf,.txt,.md,.markdown,.csv,.text,application/pdf,text/*,application/json";

/** US-18 — Admin knowledge-base management: upload + embed + curate sources. */
export function KbAdmin() {
  const docs = useKbDocuments();
  const upload = useUploadKbDocument();
  const fileUpload = useUploadKbFile();
  const remove = useDeleteKbDocument();

  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [enterprise, setEnterprise] = useState("");
  const [text, setText] = useState("");
  const [uploaded, setUploaded] = useState<number | null>(null);

  // Paste vs file-upload input modes.
  const [mode, setMode] = useState<"paste" | "upload">("paste");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pending = upload.isPending || fileUpload.isPending;
  const activeMutation = mode === "upload" ? fileUpload : upload;

  const canSubmit =
    title.trim().length > 0 &&
    source.trim().length > 0 &&
    (mode === "upload" ? file !== null : text.trim().length >= 20);

  /** Validate + stash a chosen file (server extracts the text on upload). */
  function selectFile(f: File) {
    setFileError(null);
    const name = f.name.toLowerCase();
    const okExt = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
    const okType =
      f.type === "application/pdf" ||
      f.type.startsWith("text/") ||
      f.type === "application/json" ||
      f.type === "";
    if (!okExt && !okType) {
      setFileError("Unsupported file. Upload a PDF, .txt, .md, or .csv.");
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError("File is larger than 20 MB. Split it, or paste the text.");
      return;
    }
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) selectFile(f);
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) selectFile(f);
    e.target.value = ""; // allow re-picking the same file
  }

  function resetForm() {
    setTitle("");
    setSource("");
    setEnterprise("");
    setText("");
    setFile(null);
    setFileError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || pending) return;
    const ent =
      enterprise === "dairy" || enterprise === "sugarcane"
        ? enterprise
        : undefined;
    const onSuccess = (res: { chunkCount: number }) => {
      setUploaded(res.chunkCount);
      resetForm();
    };

    if (mode === "upload") {
      if (!file) return;
      fileUpload.mutate(
        {
          file,
          title: title.trim(),
          source: source.trim(),
          ...(ent ? { enterprise: ent } : {}),
        },
        { onSuccess },
      );
      return;
    }

    const input: UploadDocumentInput = {
      title: title.trim(),
      source: source.trim(),
      text: text.trim(),
      ...(ent ? { enterprise: ent } : {}),
    };
    upload.mutate(input, { onSuccess });
  }

  const uploadError =
    activeMutation.error instanceof ApiError
      ? activeMutation.error.message
      : activeMutation.error
        ? "Upload failed."
        : undefined;

  const documents = docs.data ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-foreground">Knowledge base</h1>
        <Text variant="caption">
          Upload reference manuals (KALRO sugarcane, veterinary). The server
          chunks and embeds each document so advisory answers can cite it.
        </Text>
      </header>

      <form
        onSubmit={submit}
        className="space-y-4 rounded-card border border-outline bg-surface p-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Title"
            name="title"
            placeholder="KALRO Sugarcane Manual"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={pending}
          />
          <Field
            label="Source"
            name="source"
            placeholder="KALRO, 2019"
            hint="Shown in answer citations."
            value={source}
            onChange={(e) => setSource(e.target.value)}
            disabled={pending}
          />
        </div>
        <SelectField
          label="Enterprise (optional)"
          name="enterprise"
          hint="Scopes retrieval to dairy or sugarcane."
          value={enterprise}
          onChange={(e) => setEnterprise(e.target.value)}
          disabled={pending}
        >
          <option value="">Both / unspecified</option>
          <option value="dairy">Dairy</option>
          <option value="sugarcane">Sugarcane</option>
        </SelectField>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Document</span>
            <div className="inline-flex overflow-hidden rounded-md border border-outline-strong">
              <button
                type="button"
                onClick={() => setMode("paste")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  mode === "paste"
                    ? "bg-primary text-on-primary"
                    : "bg-surface text-muted hover:bg-surface-muted",
                )}
              >
                Paste text
              </button>
              <button
                type="button"
                onClick={() => setMode("upload")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  mode === "upload"
                    ? "bg-primary text-on-primary"
                    : "bg-surface text-muted hover:bg-surface-muted",
                )}
              >
                Upload file
              </button>
            </div>
          </div>

          {mode === "paste" ? (
            <TextAreaField
              label=""
              name="kb-text"
              rows={8}
              placeholder="Paste the full document body..."
              hint="Minimum 20 characters. The server splits this into embedded chunks."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={pending}
            />
          ) : (
            <div className="space-y-2">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed px-4 py-10 text-center transition-colors",
                  dragging
                    ? "border-primary bg-primary-container/30"
                    : "border-outline-strong bg-surface",
                )}
              >
                <p className="text-sm text-muted">
                  Drag &amp; drop a file here
                </p>
                <p className="text-xs text-faint">
                  PDF, .txt, .md, .csv &mdash; up to 20 MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_ATTR}
                  className="hidden"
                  onChange={onFilePicked}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pending}
                >
                  Choose file
                </Button>
                {file ? (
                  <p className="text-xs text-foreground">
                    Selected {file.name} ({(file.size / 1024).toFixed(0)} KB)
                  </p>
                ) : null}
              </div>
              <p className="text-xs text-faint">
                Text-based PDFs work best. Scanned / image-only PDFs can&apos;t
                be read &mdash; paste the text for those.
              </p>
              {fileError ? (
                <p className="text-sm text-danger">{fileError}</p>
              ) : null}
            </div>
          )}
        </div>

        {uploadError ? <p className="text-sm text-danger">{uploadError}</p> : null}
        {uploaded !== null && !pending && !activeMutation.isError ? (
          <p className="text-sm text-primary">
            Uploaded &mdash; {uploaded} chunk{uploaded === 1 ? "" : "s"} embedded.
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="submit"
            loading={pending}
            disabled={!canSubmit || pending}
          >
            Upload &amp; embed
          </Button>
        </div>
      </form>

      <section className="space-y-2">
        <Text variant="overline">Documents</Text>
        {docs.isPending ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-5 w-5 animate-spin" />
          </div>
        ) : docs.isError ? (
          <p className="text-sm text-danger">Couldn&apos;t load documents.</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted">
            No documents yet. Upload one above to ground advisory answers.
          </p>
        ) : (
          <ul className="divide-y divide-outline rounded-card border border-outline bg-surface">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {d.title}
                  </p>
                  <p className="text-xs text-muted">{d.source}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {d.enterprise ? (
                      <Badge tone="neutral">{d.enterprise}</Badge>
                    ) : null}
                    <Badge tone="neutral">
                      {d.chunkCount} chunk{d.chunkCount === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={remove.isPending && remove.variables === d.id}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(d.id)}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
