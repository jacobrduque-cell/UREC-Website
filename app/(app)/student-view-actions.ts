"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIsRealExec, STUDENT_VIEW_COOKIE } from "@/lib/data/queries";

// Flip the exec into "view as student" mode. Only a real exec can enter;
// the cookie only softens the app-layer role checks (RLS is unchanged), so
// they keep their true identity underneath and can always switch back.
export async function enterStudentView() {
  if (!(await getIsRealExec())) return;
  const cookieStore = await cookies();
  cookieStore.set(STUDENT_VIEW_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect("/dashboard");
}

export async function exitStudentView() {
  const cookieStore = await cookies();
  cookieStore.delete(STUDENT_VIEW_COOKIE);
  redirect("/dashboard");
}
