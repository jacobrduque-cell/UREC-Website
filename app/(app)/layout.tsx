import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getCurrentProfile, getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutGrid, BookOpen, Users, CalendarDays, Bell, Settings, Menu } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { PageCrumb } from "./page-crumb";

function initials(name: string | null | undefined, email: string | undefined) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

// Global-rail item — icon stacked over a small label, bCourses style.
function RailLink({
  href,
  label,
  children,
  badge,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="relative flex w-full flex-col items-center gap-1 px-1 py-3 text-[10px] font-ui leading-tight text-white/75 transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
      <span className="text-center">{label}</span>
      {badge != null && badge > 0 && (
        <span className="absolute right-4 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
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

  const term = (course as { term?: { name?: string } } | null)?.term?.name ?? "Current Term";
  const courseLabel = course?.code
    ? `${course.code} · ${course.name}`
    : (course?.name ?? "UREC Analyst Program");

  return (
    <div className="flex min-h-screen">
      {/* Hidden peer checkbox drives the CSS-only nav collapse — the
          hamburger in the header is its <label>. No JS needed. */}
      <input type="checkbox" id="nav-toggle" className="peer hidden" />

      {/* Global nav rail — bCourses account-level nav: dark slate,
          icon-over-label, always visible. */}
      <nav className="flex w-[76px] flex-shrink-0 flex-col items-center bg-navy pb-3 text-white">
        <Link
          href="/dashboard"
          className="flex h-14 w-full items-center justify-center bg-navy-deep font-ui text-sm font-bold tracking-tight text-white"
        >
          UREC
        </Link>
        <div className="mt-1 flex flex-col items-center self-stretch">
          <RailLink href="/dashboard" label="Dashboard">
            <LayoutGrid className="h-5 w-5" strokeWidth={1.75} />
          </RailLink>
          <RailLink href="/modules" label="Courses">
            <BookOpen className="h-5 w-5" strokeWidth={1.75} />
          </RailLink>
          <RailLink href="/directory" label="People">
            <Users className="h-5 w-5" strokeWidth={1.75} />
          </RailLink>
          <RailLink href="/calendar" label="Calendar">
            <CalendarDays className="h-5 w-5" strokeWidth={1.75} />
          </RailLink>
          <RailLink href="/notifications" label="Alerts" badge={unreadCount ?? 0}>
            <Bell className="h-5 w-5" strokeWidth={1.75} />
          </RailLink>
          {isExec && (
            <RailLink href="/courses" label="Admin">
              <Settings className="h-5 w-5" strokeWidth={1.75} />
            </RailLink>
          )}
        </div>

        <div className="mt-auto flex w-full flex-col items-center gap-1.5 pt-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/70 bg-blue text-xs font-bold text-white"
            title={profile?.full_name ?? user.email}
          >
            {initials(profile?.full_name, user.email)}
          </div>
          <form action="/auth/signout" method="post" className="w-full">
            <button
              type="submit"
              className="w-full px-1 py-2 text-[10px] font-ui text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>

      {/* Course menu — bCourses course-level nav: term label, then plain
          text links. Collapses when the header hamburger is toggled. */}
      <aside className="w-56 flex-shrink-0 overflow-hidden border-r border-hair bg-white peer-checked:hidden">
        <p className="px-4 pt-4 text-xs italic text-muted">{term}</p>
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-white">
        <header className="flex items-center gap-3 border-b border-hair px-5 py-3.5">
          <label
            htmlFor="nav-toggle"
            className="cursor-pointer rounded p-1 text-muted transition-colors hover:bg-hair hover:text-text"
            aria-label="Toggle course navigation"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </label>
          <nav className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-medium">
            <Link href="/dashboard" className="truncate text-navy-deep hover:underline">
              {courseLabel}
            </Link>
            <PageCrumb />
          </nav>
        </header>
        <main className="flex-1 bg-paper">{children}</main>
      </div>
    </div>
  );
}
