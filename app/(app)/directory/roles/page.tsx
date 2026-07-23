import { createClient } from "@/lib/supabase/server";
import { getIsExec, oneOrFirst } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "../../ui/breadcrumbs";
import { RolesClient } from "./roles-client";

type Member = { id: string; full_name: string | null; email: string; role: string | null };

// Which account role each user holds, normalized to the current vocabulary
// (legacy Co-President → President, VP → Exec) for display.
const DISPLAY: Record<string, string> = {
  "Co-President": "President",
  VP: "Exec",
  Admin: "Admin",
  President: "President",
  Exec: "Exec",
  Director: "Director",
};

export default async function ManageRolesPage() {
  if (!(await getIsExec())) redirect("/directory");

  const supabase = await createClient();
  const {
    data: { user: me },
  } = await supabase.auth.getUser();

  const [{ data: userData }, { data: roleData }] = await Promise.all([
    supabase.from("users").select("id, full_name, email").order("full_name", { ascending: true }),
    supabase
      .from("account_roles")
      .select("user_id, role:roles!inner(name, scope)")
      .eq("role.scope", "account"),
  ]);

  const roleByUser = new Map<string, string>();
  for (const r of (roleData ?? []) as {
    user_id: string;
    role: { name: string } | { name: string }[] | null;
  }[]) {
    const name = oneOrFirst(r.role)?.name;
    if (name) roleByUser.set(r.user_id, DISPLAY[name] ?? name);
  }

  const members: Member[] = ((userData ?? []) as { id: string; full_name: string | null; email: string }[]).map(
    (u) => ({ id: u.id, full_name: u.full_name, email: u.email, role: roleByUser.get(u.id) ?? null }),
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      <Breadcrumbs items={[{ label: "People", href: "/directory" }, { label: "Manage roles" }]} />
      <h1 className="mt-4 font-display text-2xl font-bold text-navy-deep">Manage roles</h1>
      <p className="mt-1 text-sm text-muted">
        Grant staff access. <strong>President</strong> and <strong>Exec</strong> have full power;{" "}
        <strong>Director</strong> can grade, take attendance, and see submissions, but can&rsquo;t manage roles,
        restructure courses, or edit grade weights. Membership (Analyst / DeCal / General) is set separately when
        you add people to a course.
      </p>
      <RolesClient members={members} selfId={me?.id ?? ""} />
    </div>
  );
}
