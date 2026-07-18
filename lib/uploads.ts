// One source of truth for the upload size ceiling, matching the Supabase
// Storage bucket limits (submissions + course-files are both 25 MB) and
// next.config's serverActions.bodySizeLimit. Guarding in the action too
// turns an oversize upload into a clear message instead of the framework
// rejecting the request body and bouncing the user to the generic error
// page with no idea the file was simply too big.
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_UPLOAD_LABEL = "25 MB";

export function assertUploadSize(file: File) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`That file is too large — the limit is ${MAX_UPLOAD_LABEL}.`);
  }
}
