import Link from "next/link";

// Canvas/bCourses-style breadcrumb trail shown at the top of deep pages so
// members always know where they are (e.g. "Assignments › HW1 › Edit"). Each
// item with an `href` is a link back up the tree; the last item (or any item
// without an href) is the current page, rendered plain. This replaces the
// ad-hoc "← Back to X" links some pages used — the first crumb is the back
// target.
export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1.5 text-sm"
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="max-w-[16rem] truncate text-blue hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="max-w-[16rem] truncate text-muted"
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
            {!isLast && (
              <span aria-hidden className="text-muted">
                ›
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
