"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function GoogleSignInButton() {
  const [pending, setPending] = useState(false);

  async function handleSignIn() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // Browser redirects to Google; no need to unset `pending` on success.
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={pending}
      className="w-full rounded-full bg-navy px-6 py-3 font-ui text-sm font-medium tracking-wide text-white transition-colors hover:bg-blue disabled:opacity-60"
    >
      {pending ? "Redirecting to Google…" : "Sign in with Google"}
    </button>
  );
}
