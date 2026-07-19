import Image from "next/image";
import { GoogleSignInButton } from "./google-sign-in-button";

const ERROR_MESSAGES: Record<string, string> = {
  domain_not_allowed:
    "That Google account isn't a @berkeley.edu address. Sign in with your Berkeley account instead.",
  auth_failed: "Something went wrong signing you in. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? ERROR_MESSAGES[error] : undefined;

  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-navy-deep via-navy to-blue px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-paper p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/urec-logo.png"
            alt="UREC — Undergraduate Real Estate Club"
            width={76}
            height={76}
            priority
          />
          <h1 className="mt-4 font-display text-2xl font-bold text-navy-deep">
            UREC Platform
          </h1>
          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky">
            Undergraduate Real Estate Club
          </p>
          <p className="mt-3 text-sm text-muted">
            Sign in with your @berkeley.edu Google account to continue.
          </p>
        </div>

        {message && (
          <p className="mt-5 rounded-md border border-neg/30 bg-neg/5 px-3 py-2 text-sm text-neg">
            {message}
          </p>
        )}

        <div className="mt-6">
          <GoogleSignInButton />
        </div>
      </div>
    </main>
  );
}
