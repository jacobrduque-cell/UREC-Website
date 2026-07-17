import "server-only";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

/**
 * Wiki pages are exec-authored (write access gated by wiki_pages_write_exec
 * in RLS), so this is a trusted-content render like assignment
 * descriptions — no HTML sanitizer needed on top of marked's own escaping
 * of raw input text.
 */
export function renderMarkdown(markdown: string): string {
  return marked.parse(markdown, { async: false });
}
