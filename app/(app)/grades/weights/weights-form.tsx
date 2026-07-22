"use client";

import { useActionState, useState } from "react";
import { FormError, SubmitButton } from "../../ui/form-controls";

type Group = { id?: string; name: string; weight: number; kind: "standard" | "attendance" };
type State = { error?: string; ok?: boolean };

// Live category editor: add/remove/rename categories and set weights, with
// a running total. Weights normalize to whatever has grades, so a non-100
// total still computes — but the indicator nudges toward 100%.
export function WeightsForm({
  action,
  initialGroups,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  initialGroups: Group[];
}) {
  const [state, formAction] = useActionState(action, {});
  const [rows, setRows] = useState<Group[]>(
    initialGroups.length ? initialGroups : [{ name: "", weight: 0, kind: "standard" }],
  );

  const total = rows.reduce((s, r) => s + (Number(r.weight) || 0), 0);
  const hasAttendance = rows.some((r) => r.kind === "attendance");

  const update = (i: number, patch: Partial<Group>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));
  const addStandard = () => setRows((rs) => [...rs, { name: "", weight: 0, kind: "standard" }]);
  const addAttendance = () => setRows((rs) => [...rs, { name: "Attendance", weight: 0, kind: "attendance" }]);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <FormError error={state?.error} />
      {state?.ok && (
        <p className="rounded-md bg-[#eaf7ef] px-3 py-2 text-sm text-pos">
          Saved — every member&rsquo;s grade updated.
        </p>
      )}
      <input type="hidden" name="rows" value={JSON.stringify(rows)} />

      <div className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2 rounded-md border border-hair bg-white px-3 py-2">
            <input
              value={r.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Category name"
              className="min-w-0 flex-1 rounded-md border border-hair px-2.5 py-1.5 text-sm text-text outline-none focus:border-blue"
            />
            {r.kind === "attendance" && (
              <span className="whitespace-nowrap rounded-full bg-pale px-2 py-0.5 text-[11px] font-semibold text-blue">
                from attendance
              </span>
            )}
            <div className="relative flex-shrink-0">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={r.weight}
                onChange={(e) => update(i, { weight: e.target.value === "" ? 0 : Number(e.target.value) })}
                className="w-20 rounded-md border border-hair px-2.5 py-1.5 pr-6 text-right text-sm text-text outline-none focus:border-blue"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="flex-shrink-0 rounded-md px-2 py-1 text-muted transition-colors hover:text-neg"
              aria-label="Remove category"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addStandard}
          className="rounded-md border border-hair px-3 py-1.5 text-sm text-text transition-colors hover:bg-[#eef7ff]"
        >
          + Category
        </button>
        {!hasAttendance && (
          <button
            type="button"
            onClick={addAttendance}
            className="rounded-md border border-hair px-3 py-1.5 text-sm text-text transition-colors hover:bg-[#eef7ff]"
          >
            + Attendance
          </button>
        )}
        <span className={`ml-auto text-sm font-semibold ${total === 100 ? "text-pos" : "text-[#B4531A]"}`}>
          Total: {total}%{total !== 100 ? " (aim for 100%)" : ""}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-muted">
        The <strong>Attendance</strong> category scores each member by sessions attended &divide; sessions
        recorded (present, late, and excused all count). Quizzes count toward a category once you assign them
        one (in each quiz&rsquo;s settings). Removing a category just un-assigns its items — it never deletes
        an assignment or quiz.
      </p>

      <SubmitButton
        pendingText="Saving…"
        className="self-start rounded-md bg-blue px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-sky"
      >
        Save weights
      </SubmitButton>
    </form>
  );
}
