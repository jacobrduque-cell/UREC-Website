"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Unlike announcements (exec-only), any enrolled member can start a
// discussion topic and reply — matches real Canvas Discussions and the
// scaffolded RLS (discussion_topics_insert_enrolled).
export async function createTopic(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title) return { error: "Give your topic a title." };
  if (!body) return { error: "Write something in the body." };

  let newId = "";
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return { error: "Your session expired — refresh the page and sign in again." };

    const course = await getCurrentCourse();
    if (!course)
      return { error: "No active course found. Refresh and try again." };

    const { data, error } = await supabase
      .from("discussion_topics")
      .insert({ course_id: course.id, author_id: user.id, title, body })
      .select("id")
      .single();
    if (error) return { error: `Couldn't post your topic: ${error.message}` };
    newId = data.id;
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Couldn't post your topic. Try again.",
    };
  }

  revalidatePath("/discussions");
  redirect(`/discussions/${newId}`);
}

export async function createDiscussionReply(
  topicId: string,
  parentReplyId: string | null,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a reply first." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return { error: "Your session expired — refresh the page and sign in again." };

    const { error } = await supabase.from("discussion_replies").insert({
      discussion_topic_id: topicId,
      parent_reply_id: parentReplyId,
      author_id: user.id,
      body,
    });
    if (error) return { error: `Couldn't post your reply: ${error.message}` };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Couldn't post your reply. Try again.",
    };
  }

  revalidatePath(`/discussions/${topicId}`);
  return {};
}
