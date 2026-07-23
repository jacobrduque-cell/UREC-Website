"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { FormError, SubmitButton } from "../ui/form-controls";
import type { Term } from "./page";

type State = { error?: string };
type AddAction = (prev: State, formData: FormData) => Promise<State>;
type UpdateAction = (termId: string, prev: State, formData: FormData) => Promise<State>;
type DeleteAction = (termId: string) => Promise<void>;

export function GlossaryClient({
  terms,
  isExec,
  addAction,
  updateAction,
  deleteAction,
}: {
  terms: Term[];
  isExec: boolean;
  addAction: AddAction;
  updateAction: UpdateAction;
  deleteAction: DeleteAction;
}) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(terms.map((t) => t.category).filter(Boolean))] as string[],
    [terms],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return terms.filter((t) => {
      if (activeCat && t.category !== activeCat) return false;
      if (!q) return true;
      return (
        t.term.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q) ||
        (t.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [terms, query, activeCat]);

  return (
    <div className="mt-6">
      {/* search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terms, definitions…"
          className="min-w-0 flex-1 rounded-md border border-hair bg-white px-3 py-2 text-sm text-text outline-none focus:border-blue"
        />
        {isExec && (
          <button
            onClick={() => setShowAdd((s) => !s)}
            className="rounded-md border border-hair px-3 py-2 text-sm text-text transition-colors hover:bg-[#eef7ff]"
          >
            {showAdd ? "Close" : "+ Add term"}
          </button>
        )}
      </div>

      {categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <FilterChip label="All" active={activeCat === null} onClick={() => setActiveCat(null)} />
          {categories.map((c) => (
            <FilterChip key={c} label={c} active={activeCat === c} onClick={() => setActiveCat(c)} />
          ))}
        </div>
      )}

      {isExec && showAdd && (
        <div className="mt-4">
          <TermForm action={addAction} onDone={() => setShowAdd(false)} submitLabel="Add term" />
        </div>
      )}

      {/* term list */}
      <ul className="mt-5 flex flex-col gap-3">
        {filtered.map((t) =>
          editingId === t.id ? (
            <li key={t.id} className="rounded-md border border-blue bg-white p-4">
              <TermForm
                action={updateAction.bind(null, t.id)}
                initial={t}
                submitLabel="Save"
                onDone={() => setEditingId(null)}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={t.id} className="rounded-md border border-hair bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-navy-deep">{t.term}</h3>
                  {t.category && (
                    <span className="mt-0.5 inline-block rounded-full bg-pale px-2 py-0.5 text-[11px] font-semibold text-blue">
                      {t.category}
                    </span>
                  )}
                </div>
                {isExec && (
                  <div className="flex flex-shrink-0 gap-2 text-xs">
                    <button
                      onClick={() => setEditingId(t.id)}
                      className="text-muted transition-colors hover:text-blue"
                    >
                      Edit
                    </button>
                    <DeleteButton onDelete={() => deleteAction(t.id)} />
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-text">{t.definition}</p>
              {t.formula && (
                <p className="mt-2 rounded bg-paper-warm px-3 py-1.5 font-mono text-xs text-navy-deep">
                  {t.formula}
                </p>
              )}
            </li>
          ),
        )}
        {filtered.length === 0 && (
          <li className="py-6 text-center text-sm text-muted">No terms match your search.</li>
        )}
      </ul>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active ? "bg-navy-deep text-white" : "border border-hair text-muted hover:border-blue hover:text-blue"
      }`}
    >
      {label}
    </button>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => Promise<void> }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this term? This also clears members' flashcard progress for it.")) {
          start(() => {
            void onDelete();
          });
        }
      }}
      className="text-muted transition-colors hover:text-neg disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

function TermForm({
  action,
  initial,
  submitLabel,
  onDone,
  onCancel,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  initial?: Term;
  submitLabel: string;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction] = useActionState(async (prev: State, fd: FormData) => {
    const res = await action(prev, fd);
    if (!res.error) onDone?.();
    return res;
  }, {});

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-md border border-hair bg-white p-4">
      <FormError error={state?.error} />
      <div className="flex flex-wrap gap-2">
        <input
          name="term"
          defaultValue={initial?.term ?? ""}
          placeholder="Term (e.g. Cap Rate)"
          className="min-w-0 flex-1 rounded-md border border-hair px-2.5 py-1.5 text-sm outline-none focus:border-blue"
        />
        <input
          name="category"
          defaultValue={initial?.category ?? ""}
          placeholder="Category (e.g. Returns)"
          className="w-44 rounded-md border border-hair px-2.5 py-1.5 text-sm outline-none focus:border-blue"
        />
      </div>
      <input
        name="formula"
        defaultValue={initial?.formula ?? ""}
        placeholder="Formula (optional, e.g. Cap Rate = NOI ÷ Price)"
        className="rounded-md border border-hair px-2.5 py-1.5 font-mono text-xs outline-none focus:border-blue"
      />
      <textarea
        name="definition"
        defaultValue={initial?.definition ?? ""}
        placeholder="Definition"
        rows={3}
        className="rounded-md border border-hair px-2.5 py-1.5 text-sm outline-none focus:border-blue"
      />
      <div className="flex gap-2">
        <SubmitButton
          pendingText="Saving…"
          className="rounded-md bg-blue px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          {submitLabel}
        </SubmitButton>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-hair px-4 py-1.5 text-sm text-text transition-colors hover:bg-[#eef7ff]"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
