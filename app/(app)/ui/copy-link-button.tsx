"use client";

import { useState } from "react";

/**
 * Copies the current page URL to the clipboard — a small share affordance
 * for exec passing an assignment/announcement link to members. Falls back
 * silently if the clipboard API is unavailable (older browsers / non-HTTPS).
 */
export function CopyLinkButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked — no-op rather than throw.
        }
      }}
      className={className}
    >
      {copied ? "Link copied ✓" : "Copy link"}
    </button>
  );
}
