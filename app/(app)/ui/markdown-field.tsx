"use client";

import { useRef, useState, useTransition } from "react";
import { marked } from "marked";
import { uploadContentImage } from "./image-actions";

marked.setOptions({ gfm: true, breaks: true });

/**
 * A markdown textarea with an "Insert image" button and a live
 * "Write | Preview" toggle (Canvas/Piazza style). Uploads the picked
 * image to the content-images bucket and drops ![name](url) at the cursor,
 * so exec can embed a rent roll / site map / chart inline in an assignment
 * description or quiz question. Preview renders the current text client-side
 * with `marked` into a `rich-content` div — the same class and options the
 * server render uses — so it looks identical to the published page.
 * Submits its text under `name` like a plain textarea (the textarea stays
 * mounted, just visually hidden in Preview), so it's a drop-in replacement
 * inside existing forms.
 */
export function MarkdownField({
  name,
  defaultValue = "",
  rows = 6,
  required = false,
  placeholder,
  className,
}: {
  name: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [uploading, startUpload] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  function insertAtCursor(snippet: string) {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    setValue(value.slice(0, start) + snippet + value.slice(end));
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be picked again later
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    startUpload(async () => {
      try {
        const { url } = await uploadContentImage(fd);
        insertAtCursor(`\n![${file.name}](${url})\n`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      }
    });
  }

  const tabBase =
    "cursor-pointer rounded-md border border-hair px-3 py-1.5 text-xs text-muted transition-colors";
  const tabActive = "border-blue bg-pale font-medium text-sky";

  const previewHtml =
    tab === "preview" && value.trim()
      ? marked.parse(value, { async: false })
      : "";

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-3">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setTab("write")}
            className={`${tabBase} ${tab === "write" ? tabActive : ""}`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={`${tabBase} ${tab === "preview" ? tabActive : ""}`}
          >
            Preview
          </button>
        </div>
        {tab === "write" && (
          <>
            <label className="cursor-pointer text-xs font-medium text-blue hover:underline">
              {uploading ? "Uploading…" : "+ Insert image"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={onFile}
                disabled={uploading}
              />
            </label>
            <span className="text-xs text-muted">Markdown supported</span>
          </>
        )}
      </div>

      {/*
        The textarea stays mounted in both modes (hidden in Preview) so the
        form still submits its value under `name`. Do NOT unmount it.
      */}
      <textarea
        ref={ref}
        name={name}
        // Apply native `required` only in Write mode: a `required` control
        // hidden with display:none in Preview would make the browser block
        // submit with a non-focusable "invalid form control" and no message.
        required={required && tab === "write"}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={
          tab === "preview"
            ? "hidden"
            : className ??
              "w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
        }
      />

      {tab === "preview" &&
        (value.trim() ? (
          <div
            className="rich-content rounded-md border border-hair bg-white px-3.5 py-2.5"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <div className="rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-muted">
            Nothing to preview yet.
          </div>
        ))}

      {error && <p className="mt-1 text-xs text-neg">{error}</p>}
    </div>
  );
}
