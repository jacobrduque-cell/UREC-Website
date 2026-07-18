"use server";

import { createClient } from "@/lib/supabase/server";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // matches the content-images bucket cap
const OK_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

/**
 * Upload an inline content image (for an assignment description or a quiz
 * question) and return its public URL, ready to drop into markdown as
 * ![](url). Stored under the uploader's own folder in the public
 * content-images bucket.
 */
export async function uploadContentImage(formData: FormData): Promise<{ url: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Choose an image.");
  if (!OK_TYPES.has(file.type)) throw new Error("Only PNG, JPEG, GIF, or WebP images.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image is too large (max 5 MB).");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${user.id}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from("content-images")
    .upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("content-images").getPublicUrl(path);
  return { url: data.publicUrl };
}
