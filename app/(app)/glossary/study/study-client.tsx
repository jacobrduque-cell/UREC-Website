"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { SrsGrade } from "@/lib/srs";
import { reviewCard } from "../actions";

type Card = {
  id: string;
  term: string;
  definition: string;
  formula: string | null;
  category: string | null;
};

export function StudyClient({ cards, totalTerms }: { cards: Card[]; totalTerms: number }) {
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [, start] = useTransition();

  if (totalTerms === 0) {
    return (
      <div className="mt-10 rounded-md border border-hair bg-white p-8 text-center text-sm text-muted">
        No terms in the glossary yet.
      </div>
    );
  }

  if (cards.length === 0 || i >= cards.length) {
    return (
      <div className="mt-10 rounded-md border border-hair bg-white p-8 text-center">
        <p className="text-2xl">🎉</p>
        <p className="mt-2 font-medium text-navy-deep">
          {reviewed > 0 ? `Reviewed ${reviewed} card${reviewed === 1 ? "" : "s"} — you're caught up.` : "You're all caught up."}
        </p>
        <p className="mt-1 text-sm text-muted">Come back later and the cards you saw will resurface on schedule.</p>
        <Link
          href="/glossary"
          className="mt-5 inline-block rounded-md bg-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          Back to glossary
        </Link>
      </div>
    );
  }

  const card = cards[i];

  function rate(grade: SrsGrade) {
    const id = card.id;
    start(() => {
      void reviewCard(id, grade);
    });
    setReviewed((n) => n + 1);
    setRevealed(false);
    setI((n) => n + 1);
  }

  return (
    <div className="mt-6">
      {/* progress */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-hair">
        <div
          className="h-full rounded-full bg-blue transition-all"
          style={{ width: `${(i / cards.length) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-right text-xs text-muted">
        {i + 1} / {cards.length}
      </p>

      {/* card */}
      <div className="mt-3 min-h-[15rem] rounded-xl border border-hair bg-white p-8 shadow-sm">
        {card.category && (
          <span className="inline-block rounded-full bg-pale px-2 py-0.5 text-[11px] font-semibold text-blue">
            {card.category}
          </span>
        )}
        <h2 className="mt-2 font-display text-2xl font-bold text-navy-deep">{card.term}</h2>

        {revealed ? (
          <div className="mt-4 border-t border-hair pt-4">
            <p className="text-sm leading-relaxed text-text">{card.definition}</p>
            {card.formula && (
              <p className="mt-3 rounded bg-paper-warm px-3 py-2 font-mono text-xs text-navy-deep">
                {card.formula}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">Recall the definition, then reveal.</p>
        )}
      </div>

      {/* controls */}
      {revealed ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={() => rate("again")}
            className="rounded-md border border-neg/40 py-2.5 text-sm font-medium text-neg transition-colors hover:bg-[#fdecee]"
          >
            Again
          </button>
          <button
            onClick={() => rate("good")}
            className="rounded-md border border-hair py-2.5 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
          >
            Good
          </button>
          <button
            onClick={() => rate("easy")}
            className="rounded-md border border-pos/40 py-2.5 text-sm font-medium text-pos transition-colors hover:bg-[#eaf7ef]"
          >
            Easy
          </button>
        </div>
      ) : (
        <button
          onClick={() => setRevealed(true)}
          className="mt-4 w-full rounded-md bg-blue py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          Show answer
        </button>
      )}
    </div>
  );
}
