import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { assignGroup, createGroup } from "../actions";

type Group = {
  id: string;
  name: string;
  group_memberships: { user_id: string; user: { full_name: string | null; email: string } | null }[];
};
type Member = { id: string; full_name: string | null; email: string };

export default async function GroupsPage() {
  const isExec = await getIsExec();
  if (!isExec) redirect("/directory");

  const course = await getCurrentCourse();
  const supabase = await createClient();
  const [{ data: groupsData }, { data: membersData }] = await Promise.all([
    course
      ? supabase
          .from("groups")
          .select("id, name, group_memberships(user_id, user:users(full_name, email))")
          .eq("course_id", course.id)
          .order("name")
      : Promise.resolve({ data: [] }),
    course
      ? supabase
          .from("enrollments")
          .select("user:users(id, full_name, email)")
          .eq("course_id", course.id)
      : Promise.resolve({ data: [] }),
  ]);

  const groups = (groupsData ?? []) as unknown as Group[];
  const members = ((membersData ?? []) as unknown as { user: Member }[])
    .map((e) => e.user)
    .filter(Boolean)
    .sort((a, b) => (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email));

  const memberGroup = new Map<string, { groupId: string; groupName: string }>();
  for (const g of groups) {
    for (const gm of g.group_memberships) {
      memberGroup.set(gm.user_id, { groupId: g.id, groupName: g.name });
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-10">
      <Link href="/directory" className="text-sm text-blue hover:underline">
        &larr; Back to People
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-navy-deep">
        Groups
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Case-comp teams. An assignment marked for group submission uses
        these to submit and grade once per team instead of once per
        person.
      </p>

      <div className="mt-8 flex flex-col gap-2">
        {members.map((m) => {
          const current = memberGroup.get(m.id);
          const action = assignGroup.bind(null, m.id, current?.groupId ?? null);
          return (
            <div
              key={m.id}
              className="flex items-center justify-between gap-4 rounded border border-hair bg-white px-4 py-2.5"
            >
              <div>
                <p className="text-sm text-text">{m.full_name ?? m.email}</p>
                <p className="text-xs text-muted">{m.email}</p>
              </div>
              <form action={action} className="flex items-center gap-2">
                <select
                  name="group_id"
                  defaultValue={current?.groupId ?? ""}
                  className="rounded-md border border-hair bg-white px-2.5 py-1.5 text-xs text-text outline-none focus:border-blue"
                >
                  <option value="">No group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-md border border-hair px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
                >
                  Save
                </button>
              </form>
            </div>
          );
        })}
        {members.length === 0 && (
          <p className="text-sm text-muted">No members enrolled yet.</p>
        )}
      </div>

      <div className="mt-10 border-t border-hair pt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          New Group
        </h2>
        <form action={createGroup} className="mt-4 flex gap-3">
          <input
            name="name"
            required
            placeholder="e.g. Team Alpha"
            className="flex-1 rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
          />
          <button
            type="submit"
            className="whitespace-nowrap rounded-md bg-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
          >
            Create Group
          </button>
        </form>
      </div>
    </div>
  );
}
