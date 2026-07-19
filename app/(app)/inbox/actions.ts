"use server";

import { createClient } from "@/lib/supabase/server";
import { notifyUsers } from "@/lib/notifications";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Start a new conversation with one or more members. The
// participant-scoped RLS allows the FIRST participant insert on an empty
// conversation, so we add ourselves first, then (now a participant) add
// the recipients, then the opening message.
export async function startConversation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const recipientIds = formData.getAll("recipient_ids").map(String).filter(Boolean);
  if (!body) throw new Error("Write a message.");
  const others = [...new Set(recipientIds)].filter((id) => id !== user.id);
  if (others.length === 0) throw new Error("Pick at least one recipient.");

  const { data: convo, error: cErr } = await supabase
    .from("conversations")
    .insert({ subject: subject || null, created_by: user.id })
    .select("id")
    .single();
  if (cErr) throw new Error(cErr.message);

  const { error: selfErr } = await supabase
    .from("conversation_participants")
    .insert({ conversation_id: convo.id, user_id: user.id });
  if (selfErr) throw new Error(selfErr.message);

  const { error: partErr } = await supabase
    .from("conversation_participants")
    .insert(others.map((id) => ({ conversation_id: convo.id, user_id: id })));
  if (partErr) throw new Error(partErr.message);

  const { error: msgErr } = await supabase
    .from("messages")
    .insert({ conversation_id: convo.id, author_id: user.id, body });
  if (msgErr) throw new Error(msgErr.message);

  await notifyUsers(others, {
    type: "new_message",
    title: subject ? `New message: ${subject}` : "New message",
    body: body.slice(0, 140),
    relatedEntityType: "conversation",
    relatedEntityId: convo.id,
  });

  revalidatePath("/inbox");
  redirect(`/inbox/${convo.id}`);
}

// Record that the current user has read `conversationId` up to now.
// last_read_at ships in a separate migration (see
// 20260717003400_conversation_read_state.sql); if the column isn't there
// yet the update errors harmlessly and we swallow it — read tracking is a
// nicety, never a reason to fail the request.
export async function markConversationRead(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  try {
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
  } catch {
    // Column missing pre-migration (or any transient failure) — ignore.
  }
  revalidatePath("/inbox");
}

// Mark every conversation the current user participates in as read.
export async function markAllConversationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  try {
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("user_id", user.id);
  } catch {
    // Column missing pre-migration (or any transient failure) — ignore.
  }
  revalidatePath("/inbox");
}

export async function sendMessage(conversationId: string, formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, author_id: user.id, body });
  if (error) throw new Error(error.message);

  const [{ data: parts }, { data: convo }] = await Promise.all([
    supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId),
    supabase.from("conversations").select("subject").eq("id", conversationId).maybeSingle(),
  ]);
  const others = ((parts ?? []) as { user_id: string }[])
    .map((p) => p.user_id)
    .filter((id) => id !== user.id);
  if (others.length > 0) {
    await notifyUsers(others, {
      type: "new_message",
      title: convo?.subject ? `New message: ${convo.subject}` : "New message",
      body: body.slice(0, 140),
      relatedEntityType: "conversation",
      relatedEntityId: conversationId,
    });
  }

  // The sender has by definition seen the thread — mark it read for them.
  // Guarded so a pre-migration missing column can't fail the send.
  try {
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
  } catch {
    // Ignore — read tracking is best-effort.
  }

  revalidatePath(`/inbox/${conversationId}`);
  revalidatePath("/inbox");
}
