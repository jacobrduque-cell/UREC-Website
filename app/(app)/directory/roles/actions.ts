"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getIsExec } from "@/lib/data/queries";
import { revalidatePath } from "next/cache";

// The staff roles an exec can assign from the UI. "Member" (or anything
// else) means "no account role" — power comes only from course enrollment.
export const ASSIGNABLE_ROLES = ["Director", "Exec", "President"] as const;

// Set a member's account (staff) role. Only a full-power exec may do this,
// and never to their own account (prevents locking yourself out). Runs
// under the service-role client after the exec check, mirroring enrollMembers.
export async function setAccountRole(userId: string, roleName: string): Promise<{ error?: string }> {
  if (!(await getIsExec())) return { error: "Only exec can change roles." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && user.id === userId) {
    return { error: "You can't change your own role — ask another exec." };
  }

  const admin = createAdminClient();
  const { data: roles } = await admin.from("roles").select("id, name").eq("scope", "account");
  const accountRoles = (roles ?? []) as { id: string; name: string }[];
  const accountRoleIds = accountRoles.map((r) => r.id);

  // Clear any existing account (staff) role, then set the new one.
  if (accountRoleIds.length) {
    const { error } = await admin
      .from("account_roles")
      .delete()
      .eq("user_id", userId)
      .in("role_id", accountRoleIds);
    if (error) return { error: "Could not update the role." };
  }

  if ((ASSIGNABLE_ROLES as readonly string[]).includes(roleName)) {
    const roleId = accountRoles.find((r) => r.name === roleName)?.id;
    if (!roleId) return { error: `Role "${roleName}" not found.` };
    const { error } = await admin.from("account_roles").insert({ user_id: userId, role_id: roleId });
    if (error) return { error: "Could not assign the role." };
  }

  revalidatePath("/directory/roles");
  return {};
}
