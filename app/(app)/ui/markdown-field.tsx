"use client";

import { useRef, useState, useTransition } from "react";
import { uploadContentImage } from "./image-actions";

/**
 * A markdown textarea with an "Insert image" button. Uploads the picked
 * image to the content-images bucket and drops ![name](url) at the cursor,
 * so exec can embed a rent roll / site map / chart inline in an assignment
 * description or quiz question. Submits its text under `name` like a plain
 * textarea, so it's a drop-in replacement inside existing forms.
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

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-3">
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
      </div>
      <textarea
        ref={ref}
        name={name}
        required={required}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={
          className ??
          "w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
        }
      />
      {error && <p className="mt-1 text-xs text-neg">{error}</p>}
    </div>
  );
}
