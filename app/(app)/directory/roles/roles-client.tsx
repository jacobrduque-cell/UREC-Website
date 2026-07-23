"use client";

import { useMemo, useState, useTransition } from "react";
import { setAccountRole } from "./actions";

type Member = { id: string; full_name: string | null; email: string; role: string | null };

const OPTIONS = ["Member", "Director", "Exec", "President"];

export function RolesClient({ members, selfId }: { members: Member[]; selfId: string }) {
  const [query, setQuery] = useState("");
  const [rowState, setRowState] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => (m.full_name ?? "").toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [members, query]);

  function change(m: Member, value: string) {
    setError(null);
    setRowState((s) => ({ ...s, [m.id]: value }));
    start(async () => {
      const res = await setAccountRole(m.id, value);
      if (res.error) {
        setError(res.error);
        setRowState((s) => ({ ...s, [m.id]: m.role ?? "Member" })); // revert
      }
    });
  }

  return (
    <div className="mt-6">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search members…"
        className="w-full rounded-md border border-hair bg-white px-3 py-2 text-sm text-text outline-none focus:border-blue"
      />
      {error && <p className="mt-3 rounded-md bg-[#fdecee] px-3 py-2 text-sm text-neg">{error}</p>}

      <ul className="mt-4 flex flex-col divide-y divide-hair rounded-md border border-hair bg-white">
        {filtered.map((m) => {
          const value = rowState[m.id] ?? m.role ?? "Member";
          const isSelf = m.id === selfId;
          return (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">{m.full_name ?? m.email}</p>
                <p className="truncate text-xs text-muted">{m.email}</p>
              </div>
              <select
                value={value}
                disabled={isSelf || pending}
                onChange={(e) => change(m, e.target.value)}
                title={isSelf ? "You can't change your own role" : undefined}
                className="flex-shrink-0 rounded-md border border-hair bg-white px-2.5 py-1.5 text-sm text-text outline-none focus:border-blue disabled:opacity-60"
              >
                {OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
        {filtered.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">No members match.</li>}
      </ul>
    </div>
  );
}
