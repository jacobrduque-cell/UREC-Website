import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { saveProfile } from "./actions";
import { ProfileForm } from "./profile-form";

type Profile = {
  full_name: string | null;
  email: string;
  major: string | null;
  grad_year: number | null;
  pronouns: string | null;
  bio: string | null;
  linkedin_url: string | null;
};

export default async function ProfileSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("users")
    .select("full_name, email, major, grad_year, pronouns, bio, linkedin_url")
    .eq("id", user.id)
    .maybeSingle();
  const p = (data ?? { email: user.email ?? "" }) as Profile;

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-12">
      <h1 className="font-display text-2xl font-bold text-navy-deep">Your Profile</h1>
      <p className="mt-2 text-sm text-muted">
        This is what other members see in the Directory. Everything except your name is optional.
      </p>

      {saved && (
        <p className="mt-4 rounded-md border border-pos/30 bg-[#e6f4ea] px-4 py-2.5 text-sm font-medium text-pos">
          Profile saved.
        </p>
      )}

      <ProfileForm action={saveProfile} profile={p} />
    </div>
  );
}
