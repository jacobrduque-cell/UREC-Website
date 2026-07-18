"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Save the signed-in member's own profile. RLS (users_update_self)
// restricts the update to their own row on top of the id filter here.
export async function saveProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const str = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v.length ? v : null;
  };

  const fullName = str("full_name");
  if (!fullName) throw new Error("Name is required.");

  const gradRaw = String(formData.get("grad_year") ?? "").trim();
  let gradYear: number | null = null;
  if (gradRaw) {
    gradYear = Number(gradRaw);
    if (!Number.isInteger(gradYear) || gradYear < 2000 || gradYear > 2100) {
      throw new Error("Enter a valid graduation year.");
    }
  }

  let linkedin = str("linkedin_url");
  if (linkedin && !/^https?:\/\//i.test(linkedin)) linkedin = `https://${linkedin}`;

  const { error } = await supabase
    .from("users")
    .update({
      full_name: fullName,
      major: str("major"),
      grad_year: gradYear,
      pronouns: str("pronouns"),
      bio: str("bio"),
      linkedin_url: linkedin,
    })
    .eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/settings/profile");
  revalidatePath("/directory");
}
