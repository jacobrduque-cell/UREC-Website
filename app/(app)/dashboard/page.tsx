import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-12">
      <h1 className="font-display text-2xl font-normal text-navy">
        Welcome, {user.email}
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        You&rsquo;re signed in with a verified @berkeley.edu account.
        Announcements are live &mdash; assignments, grades, and modules land
        in the phases ahead.
      </p>
    </div>
  );
}
