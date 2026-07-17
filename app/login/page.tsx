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
    <main className="flex flex-1 items-center justify-center bg-navy-deep px-6 py-16">
      <div className="w-full max-w-sm rounded-lg bg-paper p-8 shadow-2xl">
        <h1 className="font-display text-3xl font-bold text-navy-deep">
          UREC Platform
        </h1>
        <p className="mt-2 text-sm text-muted">
          Sign in with your @berkeley.edu Google account to continue.
        </p>

        {message && (
          <p className="mt-4 rounded-md border border-neg/30 bg-neg/5 px-3 py-2 text-sm text-neg">
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
