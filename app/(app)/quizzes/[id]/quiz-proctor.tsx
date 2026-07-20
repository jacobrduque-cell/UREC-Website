"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Integrity Mode wrapper around the take-quiz form. A web page can't truly
 * lock a browser down, so this is honest deterrence + detection:
 *   - a "Begin" gate requests fullscreen (fullscreen needs a user gesture);
 *   - leaving the tab (visibilitychange) or exiting fullscreen is counted
 *     and written into the form's hidden focus_loss_count input, so the
 *     tally is submitted and shown to exec;
 *   - copy / cut / paste / right-click / text-selection are blocked inside.
 * The count is client-reported and therefore a soft signal, not proof.
 *
 * The hidden <input name="focus_loss_count"> lives inside the form (this
 * component's children); we find it by ref and keep its value in sync.
 */
export function QuizProctor({ children }: { children: React.ReactNode }) {
  const [started, setStarted] = useState(false);
  const [events, setEvents] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const finishingRef = useRef(false);

  // Mirror the running tally into the form's hidden input so it submits.
  useEffect(() => {
    const el = rootRef.current?.querySelector<HTMLInputElement>(
      'input[name="focus_loss_count"]',
    );
    if (el) el.value = String(events);
  }, [events, started]);

  useEffect(() => {
    if (!started) return;
    const root = rootRef.current;

    const onVisibility = () => {
      if (!finishingRef.current && document.visibilityState === "hidden") {
        setEvents((n) => n + 1);
      }
    };
    const onFullscreen = () => {
      if (!finishingRef.current && !document.fullscreenElement) {
        setEvents((n) => n + 1);
      }
    };
    const block = (e: Event) => e.preventDefault();
    // Submitting the quiz naturally blurs/exits fullscreen — don't count that.
    const onSubmit = () => {
      finishingRef.current = true;
    };

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    root?.addEventListener("copy", block);
    root?.addEventListener("cut", block);
    root?.addEventListener("paste", block);
    root?.addEventListener("contextmenu", block);
    root?.querySelector("form")?.addEventListener("submit", onSubmit);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      root?.removeEventListener("copy", block);
      root?.removeEventListener("cut", block);
      root?.removeEventListener("paste", block);
      root?.removeEventListener("contextmenu", block);
    };
  }, [started]);

  async function begin() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen can be refused/unavailable — proceed anyway; tab-switch
      // detection and the copy block still work.
    }
    setStarted(true);
  }

  if (!started) {
    return (
      <div className="mt-8 rounded-md border border-hair bg-white p-6">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-lg">🔒</span>
          <h2 className="font-display text-lg font-bold text-navy-deep">
            This is a proctored quiz
          </h2>
        </div>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm text-text">
          <li>• It opens in <strong>fullscreen</strong>.</li>
          <li>• If you <strong>leave the tab or exit fullscreen</strong>, it&rsquo;s counted and shared with the exec team.</li>
          <li>• <strong>Copy, paste, and right-click are disabled</strong> while you take it.</li>
        </ul>
        <p className="mt-3 text-xs text-muted">
          Close other tabs and apps before you begin. You have one attempt.
        </p>
        <button
          type="button"
          onClick={begin}
          className="mt-5 rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          Begin quiz
        </button>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      onContextMenu={(e) => e.preventDefault()}
      className="mt-6 select-none"
    >
      {events > 0 && (
        <div className="mb-4 rounded-md border border-[#B4531A]/40 bg-[#fff3e0] px-4 py-2.5 text-sm font-medium text-[#B4531A]">
          You&rsquo;ve left the quiz {events} time{events === 1 ? "" : "s"}. This is
          recorded and shared with the exec team.
        </div>
      )}
      {children}
    </div>
  );
}
