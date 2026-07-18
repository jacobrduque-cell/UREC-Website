"use client";

import { useActionState } from "react";
import { SubmitButton, FormError } from "../../ui/form-controls";

type FormState = { error?: string };

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

export function ProfileForm({
  action,
  profile,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  profile: Profile;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <FormError error={state?.error} />

      <div>
        <label htmlFor="full_name" className={label}>Name</label>
        <input id="full_name" name="full_name" required defaultValue={profile.full_name ?? ""} className={field} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="pronouns" className={label}>Pronouns</label>
          <input id="pronouns" name="pronouns" placeholder="she/her" defaultValue={profile.pronouns ?? ""} className={field} />
        </div>
        <div>
          <label htmlFor="major" className={label}>Major</label>
          <input id="major" name="major" placeholder="Business + Econ" defaultValue={profile.major ?? ""} className={field} />
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
            defaultValue={profile.grad_year ?? ""}
            className={field}
          />
        </div>
      </div>

      <div>
        <label htmlFor="linkedin_url" className={label}>LinkedIn</label>
        <input id="linkedin_url" name="linkedin_url" placeholder="linkedin.com/in/…" defaultValue={profile.linkedin_url ?? ""} className={field} />
      </div>

      <div>
        <label htmlFor="bio" className={label}>Bio</label>
        <textarea id="bio" name="bio" rows={3} placeholder="A sentence or two about you." defaultValue={profile.bio ?? ""} className={field} />
      </div>

      <p className="text-xs text-muted">Signed in as {profile.email}</p>

      <SubmitButton
        pendingText="Saving…"
        className="self-start rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
      >
        Save profile
      </SubmitButton>
    </form>
  );
}
