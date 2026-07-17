import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * "Enter this course" — sets the active_course_id cookie and redirects
 * into the course. Every course-scoped page reads the active course via
 * getCurrentCourse(), so setting this cookie re-scopes the whole
 * second-sidebar experience (assignments, files, modules, people, …) to
 * the chosen course at once.
 *
 * Access is validated through RLS: the course lookup returns nothing if
 * the user isn't enrolled (and isn't exec), in which case we bounce back
 * to the dashboard without setting the cookie.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .maybeSingle();

  const to = new URL(request.url).searchParams.get("to") ?? "/announcements";
  const dest = course ? to : "/dashboard";
  const response = NextResponse.redirect(new URL(dest, request.url));

  if (course) {
    response.cookies.set("active_course_id", courseId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  return response;
}
