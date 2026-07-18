import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { saveSyllabus } from "../actions";
import { SyllabusForm } from "./syllabus-form";

export default async function EditSyllabusPage() {
  const isExec = await getIsExec();
  if (!isExec) redirect("/syllabus");

  const course = await getCurrentCourse();
  const supabase = await createClient();
  const { data } = course
    ? await supabase
        .from("wiki_pages")
        .select("body_markdown")
        .eq("course_id", course.id)
        .eq("slug", "syllabus")
        .maybeSingle()
    : { data: null };

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-10">
      <h1 className="font-display text-2xl font-bold text-navy-deep">
        Edit Syllabus
      </h1>

      <SyllabusForm action={saveSyllabus} defaultBody={data?.body_markdown ?? ""} />
    </div>
  );
}
