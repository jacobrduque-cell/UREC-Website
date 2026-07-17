import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already gates this route, but a Server Component should
  // never trust that alone — re-check here per the Data Access Layer
  // pattern (checks belong as close to the data as possible).
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex flex-1 flex-col bg-paper">
      <header className="border-b border-hair bg-navy-deep px-8 py-6 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <p className="font-display text-xl">UREC Platform</p>
            <p className="mt-1 text-sm text-white/60">
              UREC Analyst Program &middot; Fall 2026
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-full border border-white/30 px-4 py-2 text-xs font-medium tracking-wide text-white transition-colors hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-8 py-12">
        <h1 className="font-display text-2xl font-normal text-navy">
          Welcome, {user.email}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted">
          You&rsquo;re signed in with a verified @berkeley.edu account. This
          is the foundation of the Member Workspace &mdash; announcements,
          assignments, grades, and modules land here in the phases ahead.
        </p>
      </div>
    </main>
  );
}
