"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Save the signed-in member's own profile. RLS (users_update_self)
// restricts the update to their own row on top of the id filter here.
export async function saveProfile(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Your session expired — refresh the page and sign in again." };
    }

    const str = (k: string) => {
      const v = String(formData.get(k) ?? "").trim();
      return v.length ? v : null;
    };

    const fullName = str("full_name");
    if (!fullName) return { error: "Add your name — it's the one required field." };

    const gradRaw = String(formData.get("grad_year") ?? "").trim();
    let gradYear: number | null = null;
    if (gradRaw) {
      gradYear = Number(gradRaw);
      if (!Number.isInteger(gradYear) || gradYear < 2000 || gradYear > 2100) {
        return { error: "Enter your graduation year as a 4-digit year, e.g. 2027." };
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
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't save your profile. Try again." };
  }

  revalidatePath("/settings/profile");
  revalidatePath("/directory");
  // Bounce back with a flag so the page can confirm the save — an
  // in-place server action otherwise just re-renders identical fields and
  // leaves the member unsure whether it worked.
  redirect("/settings/profile?saved=1");
}
