import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getCurrentProfile } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
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

  const [profile, course, { count: unreadCount }] = await Promise.all([
    getCurrentProfile(),
    getCurrentCourse(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
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
            <Link
              href="/notifications"
              className="relative rounded-full border border-white/30 p-2 transition-colors hover:bg-white/10"
              aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-white stroke-[1.5]">
                <path d="M4 8a6 6 0 1 1 12 0c0 3.5 1.2 5 1.2 5H2.8S4 11.5 4 8Z" strokeLinejoin="round" />
                <path d="M8 16a2 2 0 0 0 4 0" strokeLinecap="round" />
              </svg>
              {!!unreadCount && unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-navy-deep">
                  {unreadCount}
                </span>
              )}
            </Link>
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
