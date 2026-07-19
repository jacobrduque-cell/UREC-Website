"use client";

import { useRouter } from "next/navigation";

/**
 * A small labelled dropdown that drives a list page's `?param=` value. The
 * server page reads the chosen value and does the actual work (sort /
 * filter); this control just navigates on change. Selecting the default
 * option drops its own param for a clean URL. `preserve` carries any OTHER
 * query params (e.g. keep `filter` while changing `sort`) so a page can
 * show a sort control and a filter control side by side without one
 * clobbering the other.
 */
export function SortSelect({
  options,
  current,
  basePath,
  label = "Sort by",
  paramName = "sort",
  preserve = {},
}: {
  options: { value: string; label: string }[];
  current: string;
  basePath: string;
  label?: string;
  paramName?: string;
  preserve?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const defaultValue = options[0]?.value ?? "";
  return (
    <label className="flex items-center gap-2 whitespace-nowrap text-xs text-muted">
      <span>{label}</span>
      <select
        value={current}
        onChange={(e) => {
          const params = new URLSearchParams();
          for (const [k, val] of Object.entries(preserve)) {
            if (val) params.set(k, val);
          }
          const v = e.target.value;
          if (v && v !== defaultValue) params.set(paramName, v);
          const qs = params.toString();
          router.push(qs ? `${basePath}?${qs}` : basePath);
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
