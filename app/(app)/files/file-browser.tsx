import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import Link from "next/link";
import { createFolder, uploadFile, togglePublished } from "./actions";

type Folder = { id: string; name: string };
type FileRow = {
  id: string;
  filename: string;
  storage_path: string;
  size_bytes: number;
  published: boolean;
  mime_type: string | null;
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function getBreadcrumbs(folderId: string | null) {
  const supabase = await createClient();
  const trail: Folder[] = [];
  let currentId = folderId;
  while (currentId) {
    const { data } = await supabase
      .from("folders")
      .select("id, name, parent_folder_id")
      .eq("id", currentId)
      .maybeSingle();
    if (!data) break;
    trail.unshift({ id: data.id, name: data.name });
    currentId = data.parent_folder_id;
  }
  return trail;
}

export async function FileBrowser({ folderId }: { folderId: string | null }) {
  const [course, isExec, breadcrumbs] = await Promise.all([
    getCurrentCourse(),
    getIsExec(),
    getBreadcrumbs(folderId),
  ]);

  const supabase = await createClient();
  const foldersQuery = supabase
    .from("folders")
    .select("id, name")
    .eq("course_id", course?.id ?? "")
    .order("name");
  const filesQuery = supabase
    .from("files")
    .select("id, filename, storage_path, size_bytes, published, mime_type")
    .eq("course_id", course?.id ?? "")
    .order("filename");

  const [{ data: subfolders }, { data: files }] = await Promise.all([
    folderId
      ? foldersQuery.eq("parent_folder_id", folderId)
      : foldersQuery.is("parent_folder_id", null),
    folderId
      ? filesQuery.eq("folder_id", folderId)
      : filesQuery.is("folder_id", null),
  ]);

  const folders = (subfolders ?? []) as Folder[];
  const visibleFiles = ((files ?? []) as FileRow[]).filter(
    (f) => isExec || f.published,
  );

  // Batch-sign every file in this folder in ONE Storage call. Signing per
  // row (a fresh client + round trip apiece) meant a folder with 100+
  // files fired 100+ sequential sign requests before it could render.
  const signedUrlByPath = new Map<string, string>();
  if (visibleFiles.length > 0) {
    const { data: signed } = await supabase.storage
      .from("course-files")
      .createSignedUrls(
        visibleFiles.map((f) => f.storage_path),
        300,
      );
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) signedUrlByPath.set(entry.path, entry.signedUrl);
    }
  }

  const createFolderAction = createFolder.bind(null, folderId);
  const uploadFileAction = uploadFile.bind(null, folderId);

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-deep">
            Files
          </h1>
          <nav className="mt-2 flex flex-wrap items-center gap-1 text-sm text-muted">
            <Link href="/files" className="hover:text-blue hover:underline">
              {course?.name ?? "UREC Analyst Program"}
            </Link>
            {breadcrumbs.map((b) => (
              <span key={b.id} className="flex items-center gap-1">
                <span>/</span>
                <Link
                  href={`/files/${b.id}`}
                  className="hover:text-blue hover:underline"
                >
                  {b.name}
                </Link>
              </span>
            ))}
          </nav>
        </div>
      </div>

      {isExec && (
        <div className="mt-6 flex flex-wrap gap-3">
          <form action={createFolderAction} className="flex gap-2">
            <input
              name="name"
              placeholder="New folder name"
              required
              className="rounded-md border border-hair bg-white px-3 py-2 text-sm text-text outline-none focus:border-blue"
            />
            <button
              type="submit"
              className="rounded-md border border-navy px-4 py-2 text-xs font-medium text-navy transition-colors hover:bg-navy hover:text-white"
            >
              New Folder
            </button>
          </form>
          <form
            action={uploadFileAction}
            encType="multipart/form-data"
            className="flex gap-2"
          >
            <input
              name="file"
              type="file"
              required
              className="text-sm text-text file:mr-2 file:rounded-md file:border-0 file:bg-blue file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
            />
            <button
              type="submit"
              className="rounded-md bg-blue px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-sky"
            >
              Upload
            </button>
          </form>
        </div>
      )}

      <ul className="mt-8 divide-y divide-hair border-t border-hair">
        {folders.map((f) => (
          <li key={f.id}>
            <Link
              href={`/files/${f.id}`}
              className="flex items-center gap-2 py-3 text-sm font-medium text-text transition-colors hover:bg-hair/40"
            >
              <span aria-hidden>📁</span> {f.name}
            </Link>
          </li>
        ))}
        {visibleFiles.map((f) => (
          <FileRowItem
            key={f.id}
            file={f}
            folderId={folderId}
            isExec={isExec}
            url={signedUrlByPath.get(f.storage_path) ?? null}
          />
        ))}
        {folders.length === 0 && visibleFiles.length === 0 && (
          <li className="py-6 text-sm text-muted">This folder is empty.</li>
        )}
      </ul>
    </div>
  );
}

function FileRowItem({
  file,
  folderId,
  isExec,
  url,
}: {
  file: FileRow;
  folderId: string | null;
  isExec: boolean;
  url: string | null;
}) {
  const toggleAction = togglePublished.bind(null, file.id, folderId, file.published);

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-blue hover:underline"
        >
          {file.filename}
        </a>
      ) : (
        <span className="text-sm text-text">{file.filename}</span>
      )}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted">{fmtSize(file.size_bytes)}</span>
        {isExec && (
          <>
            {!file.published && (
              <span className="rounded-full border border-hair px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Unpublished
              </span>
            )}
            <form action={toggleAction}>
              <button
                type="submit"
                className="text-xs text-blue hover:underline"
              >
                {file.published ? "Unpublish" : "Publish"}
              </button>
            </form>
          </>
        )}
      </div>
    </li>
  );
}
