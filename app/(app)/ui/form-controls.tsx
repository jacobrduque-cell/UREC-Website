"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/**
 * The red banner that explains WHY a server action failed, shown inline
 * at the top of a form instead of bouncing the exec to the generic error
 * page. Pair with an action that returns `{ error }` (via useActionState)
 * rather than throwing, so the real message survives to the client —
 * Next redacts thrown server errors in production, but returned values
 * come through untouched. Renders nothing when there's no error.
 */
export function FormError({ error }: { error?: string | null }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-neg/30 bg-[#fdecea] px-4 py-2.5 text-sm font-medium text-neg"
    >
      {error}
    </p>
  );
}

/**
 * Small red note shown directly UNDER the field it belongs to, for
 * client-side validation that fires before the exec ever clicks the
 * submit button (a bad date range, a name that's already taken, …).
 * Renders nothing when there's no message, so it can sit in the JSX
 * unconditionally.
 */
export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-xs font-medium text-neg">{children}</p>;
}

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
  disabled = false,
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
  title?: string;
  /** Block submission while a client-side validation error stands. */
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
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
