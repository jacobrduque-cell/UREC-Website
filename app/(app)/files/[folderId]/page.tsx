import { FileBrowser } from "../file-browser";

export default async function FolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  const { folderId } = await params;
  return <FileBrowser folderId={folderId} />;
}
