// Pure file-name helpers (no React Native imports) - shared by the
// download utility and unit-testable on their own.

// Extension -> MIME type for attachments the app lets people download.
// Unknown types still download (as application/octet-stream).
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
};

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "heic"]);

/** Lower-case extension from a file name or URL path (query string ignored), or "". */
export function fileExtension(nameOrUrl: string | null | undefined): string {
  if (!nameOrUrl) return "";
  const path = nameOrUrl.split(/[?#]/)[0];
  const match = /\.([A-Za-z0-9]{1,8})$/.exec(path);
  return match ? match[1].toLowerCase() : "";
}

/** True when the attachment is an image - by its file name first, then its URL. */
export function isImageAttachment(fileName: string | null | undefined, url: string | null | undefined): boolean {
  const ext = fileExtension(fileName) || fileExtension(url);
  return IMAGE_EXTENSIONS.has(ext);
}

export function mimeTypeFor(fileName: string): string {
  return MIME_BY_EXTENSION[fileExtension(fileName)] ?? "application/octet-stream";
}

/** Strips path separators and control/reserved characters so a server-supplied name can't escape the target folder. */
export function safeFileName(name: string | null | undefined, fallback = "attachment"): string {
  const cleaned = (name ?? "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 120);
  return cleaned || fallback;
}

export function withoutExtension(name: string): string {
  return name.replace(/\.[A-Za-z0-9]{1,8}$/, "");
}
