"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse } from "@/lib/data/queries";
import { assertUploadSize } from "@/lib/uploads";
import { revalidatePath } from "next/cache";

export async function createFolder(
  parentFolderId: string | null,
  formData: FormData,
) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Folder name is required.");

  const supabase = await createClient();
  const course = await getCurrentCourse();
  if (!course) throw new Error("No active course found.");

  const { error } = await supabase.from("folders").insert({
    course_id: course.id,
    parent_folder_id: parentFolderId,
    name,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/files");
  if (parentFolderId) revalidatePath(`/files/${parentFolderId}`);
}

export async function uploadFile(folderId: string | null, formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Choose a file to upload.");
  assertUploadSize(file);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const course = await getCurrentCourse();
  if (!course) throw new Error("No active course found.");

  const path = `${course.id}/${folderId ?? "root"}/${Date.now()}-${file.name}`;
  const { error: upErr } = await supabase.storage
    .from("course-files")
    .upload(path, file, { contentType: file.type });
  if (upErr) throw new Error(upErr.message);

  const { error: insErr } = await supabase.from("files").insert({
    course_id: course.id,
    folder_id: folderId,
    uploaded_by: user.id,
    storage_path: path,
    filename: file.name,
    size_bytes: file.size,
    mime_type: file.type,
    published: true,
  });
  if (insErr) throw new Error(insErr.message);

  revalidatePath("/files");
  if (folderId) revalidatePath(`/files/${folderId}`);
}

export async function togglePublished(
  fileId: string,
  folderId: string | null,
  currentlyPublished: boolean,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("files")
    .update({ published: !currentlyPublished })
    .eq("id", fileId);
  if (error) throw new Error(error.message);

  revalidatePath("/files");
  if (folderId) revalidatePath(`/files/${folderId}`);
}
