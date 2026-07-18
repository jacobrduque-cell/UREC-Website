"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/**
 * A submit button that disables itself while its form's server action is
 * in flight (React's useFormStatus). Prevents the double-click that
 * otherwise posts a discussion reply / comment / submission twice on a
 * slow connection, and gives the "working…" feedback members were
 * missing. Drop-in replacement for a plain <button type="submit">.
 */
export function SubmitButton({
  children,
  pendingText = "Working…",
  className,
  title,
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      title={title}
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? pendingText : children}
    </button>
  );
}

/**
 * A submit button for a destructive action: pops a native confirm()
 * first (cancel stops the submit) and then disables while the action
 * runs. Stops an accidental single mis-click from deleting a member, a
 * module, an event, etc. with no undo.
 */
export function ConfirmSubmitButton({
  children,
  message,
  pendingText = "Working…",
  className,
  title,
}: {
  children: ReactNode;
  message: string;
  pendingText?: string;
  className?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      title={title}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
