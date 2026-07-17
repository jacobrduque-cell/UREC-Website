import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getCurrentProfile, getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Home, CalendarDays, Bell, Settings, LogOut } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";

function initials(name: string | null | undefined, email: string | undefined) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

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

  const [profile, course, isExec, { count: unreadCount }] = await Promise.all([
    getCurrentProfile(),
    getCurrentCourse(),
    getIsExec(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
  ]);

  return (
    <div className="flex min-h-screen">
      {/* Global nav rail — Canvas's account-level nav (icons only, dark
          slate), separate from the course-specific menu below it. */}
      <nav className="flex w-[78px] flex-shrink-0 flex-col items-center bg-navy py-3 text-white">
        <Link
          href="/dashboard"
          className="mb-4 flex h-10 w-10 items-center justify-center rounded font-ui text-sm font-bold tracking-tight text-white"
        >
          UREC
        </Link>

        <Link
          href="/dashboard"
          className="flex w-full flex-col items-center gap-1 px-2 py-3 text-[10px] font-ui text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Home className="h-5 w-5" strokeWidth={1.75} />
          Dashboard
        </Link>
        <Link
          href="/calendar"
          className="flex w-full flex-col items-center gap-1 px-2 py-3 text-[10px] font-ui text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <CalendarDays className="h-5 w-5" strokeWidth={1.75} />
          Calendar
        </Link>
        <Link
          href="/notifications"
          className="relative flex w-full flex-col items-center gap-1 px-2 py-3 text-[10px] font-ui text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Bell className="h-5 w-5" strokeWidth={1.75} />
          Alerts
          {!!unreadCount && unreadCount > 0 && (
            <span className="absolute right-3 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </Link>
        {isExec && (
          <Link
            href="/courses"
            className="flex w-full flex-col items-center gap-1 px-2 py-3 text-[10px] font-ui text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Settings className="h-5 w-5" strokeWidth={1.75} />
            Courses
          </Link>
        )}

        <div className="mt-auto flex w-full flex-col items-center gap-2 pt-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue text-xs font-bold text-white"
            title={profile?.full_name ?? user.email}
          >
            {initials(profile?.full_name, user.email)}
          </div>
          <form action="/auth/signout" method="post" className="w-full">
            <button
              type="submit"
              className="flex w-full flex-col items-center gap-1 px-2 py-3 text-[10px] font-ui text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Sign out
            </button>
          </form>
        </div>
      </nav>

      {/* Course menu — Canvas's course-level nav, light background. */}
      <aside className="w-56 flex-shrink-0 border-r border-hair bg-white">
        <div className="border-b border-hair px-4 py-4">
          <p className="font-ui text-sm font-bold text-navy-deep">
            {course?.name ?? "UREC Analyst Program"}
          </p>
        </div>
        <SidebarNav />
      </aside>

      <div className="flex flex-1 flex-col bg-white">
        <header className="flex items-center justify-between border-b border-hair px-6 py-3">
          <p className="text-xs text-muted">
            {course?.name ?? "UREC Analyst Program"}
          </p>
          <p className="text-xs text-muted">
            {profile?.full_name ?? user.email}
          </p>
        </header>
        <main className="flex-1 bg-paper">{children}</main>
      </div>
    </div>
  );
}
