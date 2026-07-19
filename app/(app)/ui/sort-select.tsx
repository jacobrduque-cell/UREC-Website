"use client";

import { useRouter } from "next/navigation";

/**
 * A small "Sort by …" dropdown for list pages. The server page reads the
 * chosen value from `?sort=` and does the actual ordering; this control
 * just navigates to the new URL on change (no other query params are in
 * play on these lists, so a bare `?sort=` is enough). Selecting the
 * default option drops the param for a clean URL.
 */
export function SortSelect({
  options,
  current,
  basePath,
  label = "Sort by",
}: {
  options: { value: string; label: string }[];
  current: string;
  basePath: string;
  label?: string;
}) {
  const router = useRouter();
  const defaultValue = options[0]?.value ?? "";
  return (
    <label className="flex items-center gap-2 whitespace-nowrap text-xs text-muted">
      <span>{label}</span>
      <select
        value={current}
        onChange={(e) => {
          const v = e.target.value;
          router.push(v && v !== defaultValue ? `${basePath}?sort=${v}` : basePath);
        }}
        className="rounded-md border border-hair bg-white px-2.5 py-1.5 text-xs text-text outline-none focus:border-blue"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
