"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Unlike announcements (exec-only), any enrolled member can start a
// discussion topic and reply — matches real Canvas Discussions and the
// scaffolded RLS (discussion_topics_insert_enrolled).
export async function createTopic(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) throw new Error("Title and body are required.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const course = await getCurrentCourse();
  if (!course) throw new Error("No active course found.");

  const { data, error } = await supabase
    .from("discussion_topics")
    .insert({ course_id: course.id, author_id: user.id, title, body })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/discussions");
  redirect(`/discussions/${data.id}`);
}

export async function createDiscussionReply(
  topicId: string,
  parentReplyId: string | null,
  formData: FormData,
) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("discussion_replies").insert({
    discussion_topic_id: topicId,
    parent_reply_id: parentReplyId,
    author_id: user.id,
    body,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/discussions/${topicId}`);
}
