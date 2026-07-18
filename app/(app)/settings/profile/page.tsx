import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { saveProfile } from "./actions";

type Profile = {
  full_name: string | null;
  email: string;
  major: string | null;
  grad_year: number | null;
  pronouns: string | null;
  bio: string | null;
  linkedin_url: string | null;
};

const field = "mt-1 w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue";
const label = "block text-xs font-semibold uppercase tracking-wide text-muted";

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

      <form action={saveProfile} className="mt-8 flex flex-col gap-5">
        <div>
          <label htmlFor="full_name" className={label}>Name</label>
          <input id="full_name" name="full_name" required defaultValue={p.full_name ?? ""} className={field} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="pronouns" className={label}>Pronouns</label>
            <input id="pronouns" name="pronouns" placeholder="she/her" defaultValue={p.pronouns ?? ""} className={field} />
          </div>
          <div>
            <label htmlFor="major" className={label}>Major</label>
            <input id="major" name="major" placeholder="Business + Econ" defaultValue={p.major ?? ""} className={field} />
          </div>
          <div>
            <label htmlFor="grad_year" className={label}>Grad year</label>
            <input
              id="grad_year"
              name="grad_year"
              type="number"
              min={2000}
              max={2100}
              placeholder="2027"
              defaultValue={p.grad_year ?? ""}
              className={field}
            />
          </div>
        </div>

        <div>
          <label htmlFor="linkedin_url" className={label}>LinkedIn</label>
          <input id="linkedin_url" name="linkedin_url" placeholder="linkedin.com/in/…" defaultValue={p.linkedin_url ?? ""} className={field} />
        </div>

        <div>
          <label htmlFor="bio" className={label}>Bio</label>
          <textarea id="bio" name="bio" rows={3} placeholder="A sentence or two about you." defaultValue={p.bio ?? ""} className={field} />
        </div>

        <p className="text-xs text-muted">Signed in as {p.email}</p>

        <button
          type="submit"
          className="self-start rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          Save profile
        </button>
      </form>
    </div>
  );
}
