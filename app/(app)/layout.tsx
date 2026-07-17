import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getCurrentProfile } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { SidebarNav } from "./sidebar-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already gates every route in this group, but a Server
  // Component should never trust that alone — re-check here per the
  // Data Access Layer pattern (checks belong as close to the data as
  // possible, not just at the network edge).
  if (!user) {
    redirect("/login");
  }

  const [profile, course] = await Promise.all([
    getCurrentProfile(),
    getCurrentCourse(),
  ]);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="border-b border-hair bg-navy-deep px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-lg leading-none">UREC Platform</p>
            <p className="mt-1 text-xs text-white/60">
              {course?.name ?? "UREC Analyst Program"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/80">
              {profile?.full_name ?? user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-full border border-white/30 px-4 py-1.5 text-xs font-medium tracking-wide text-white transition-colors hover:bg-white/10"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-56 flex-shrink-0 border-r border-hair bg-paper-warm">
          <SidebarNav />
        </aside>
        <main className="flex-1 bg-paper">{children}</main>
      </div>
    </div>
  );
}
