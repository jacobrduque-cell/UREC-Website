// Derived submission status — pure, no I/O, so it's safe in both server
// and client components. Canvas shows the same three states on the
// student To-Do and the teacher gradebook; we derive them the same way
// from the due date, whether a submission exists, and when it came in.

export type SubmissionStatus = "graded" | "submitted" | "late" | "missing" | "upcoming";

export function submissionStatus(opts: {
  dueAt: string | null | undefined;
  submittedAt: string | null | undefined;
  graded: boolean;
  now?: Date;
}): SubmissionStatus {
  const now = opts.now ?? new Date();
  const due = opts.dueAt ? new Date(opts.dueAt) : null;

  if (opts.submittedAt) {
    if (opts.graded) return "graded";
    // Turned in after the deadline → late.
    if (due && new Date(opts.submittedAt) > due) return "late";
    return "submitted";
  }

  // Nothing submitted. Past the deadline → missing; otherwise still open.
  if (due && now > due) return "missing";
  return "upcoming";
}

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  graded: "Graded",
  submitted: "Submitted",
  late: "Late",
  missing: "Missing",
  upcoming: "Not submitted",
};

// Tailwind class pairs (bg + text) for a small status pill, using the
// existing palette tokens.
export const STATUS_PILL: Record<SubmissionStatus, string> = {
  graded: "bg-pale text-sky",
  submitted: "bg-[#e6f4ea] text-pos",
  late: "bg-[#fff3e0] text-[#B4531A]",
  missing: "bg-[#fdecea] text-neg",
  upcoming: "bg-hair text-muted",
};
