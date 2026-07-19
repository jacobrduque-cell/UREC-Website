import Link from "next/link";

// Canvas-style "Student View" banner. Shown at the top of a detail page
// when an exec is previewing it as a student (?preview=student). The
// `backHref` is the same path without the preview param, so the exec can
// drop back into the normal authoring/grading view.
export function PreviewBanner({ backHref }: { backHref: string }) {
  return (
    <div className="sticky top-0 z-10 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#B4531A]/30 bg-[#fff3e0] px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-[#B4531A]/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#B4531A]">
          Student View
        </span>
        <p className="text-sm font-medium text-[#B4531A]">
          You&rsquo;re viewing this as a student.
        </p>
      </div>
      <Link
        href={backHref}
        className="whitespace-nowrap rounded-md border border-[#B4531A]/40 px-4 py-1.5 text-xs font-medium text-[#B4531A] transition-colors hover:bg-[#ffe8c9]"
      >
        Back to normal view
      </Link>
    </div>
  );
}
