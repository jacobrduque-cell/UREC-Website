import { createClient } from "@/lib/supabase/server";

type DirectoryRow = {
  id: string;
  email: string;
  full_name: string | null;
  account_roles: { role: { name: string } | null }[];
  enrollments: { role: { name: string } | null }[];
};

export default async function DirectoryPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select(
      `id, email, full_name,
       account_roles(role:roles(name)),
       enrollments(role:roles(name))`,
    )
    .order("full_name", { ascending: true, nullsFirst: false });

  const members = (data ?? []) as unknown as DirectoryRow[];

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-12">
      <h1 className="font-display text-2xl font-normal text-navy">People</h1>
      <p className="mt-2 text-sm text-muted">
        Everyone who has signed in to the platform.
      </p>

      {error && (
        <p className="mt-6 text-sm text-neg">
          Couldn&rsquo;t load the directory right now.
        </p>
      )}

      <ul className="mt-8 divide-y divide-hair border-t border-hair">
        {members.map((member) => {
          const roleName =
            member.account_roles[0]?.role?.name ??
            member.enrollments[0]?.role?.name ??
            "Member";
          return (
            <li
              key={member.id}
              className="flex items-center justify-between py-3.5"
            >
              <div>
                <p className="text-sm font-medium text-text">
                  {member.full_name ?? member.email}
                </p>
                <p className="text-xs text-muted">{member.email}</p>
              </div>
              <span className="rounded-full border border-hair px-3 py-1 text-xs font-medium tracking-wide text-navy">
                {roleName}
              </span>
            </li>
          );
        })}
        {members.length === 0 && !error && (
          <li className="py-6 text-sm text-muted">
            No one has signed in yet.
          </li>
        )}
      </ul>
    </div>
  );
}
