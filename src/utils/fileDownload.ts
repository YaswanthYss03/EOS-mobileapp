import { Platform } from "react-native";
import * as Sharing from "expo-sharing";
import { File } from "expo-file-system";
import { cacheDirectory, deleteAsync, downloadAsync } from "expo-file-system/legacy";
import { saveToAndroidDownloads } from "./pdfDownload";
import { fileExtension, mimeTypeFor, safeFileName, withoutExtension } from "./fileName";

export { fileExtension, isImageAttachment, mimeTypeFor, safeFileName } from "./fileName";

// Android's Storage Access Framework write goes through base64 in memory -
// above this, hand the file to the share sheet instead of risking an
// out-of-memory crash on low-end phones.
const MAX_IN_MEMORY_SAVE_BYTES = 40 * 1024 * 1024;

export type DownloadOutcome = "downloaded" | "shared" | "unavailable";

/**
 * Downloads a remote attachment to the phone.
 *
 * Android: saved straight into the user's download folder (picked once and
 * shared with every other download in the app - see pdfDownload.ts).
 * iOS (and Android if the folder permission is declined, or the file is
 * very large): the system share sheet, where "Save to Files" / "Save" puts
 * it on the device.
 *
 * Only https URLs are accepted. The temporary copy in the app cache is
 * always cleaned up.
 */
export async function downloadRemoteFile(url: string, fileName: string | null | undefined): Promise<DownloadOutcome> {
  if (!/^https:\/\//i.test(url)) {
    throw new Error("Only secure (https) downloads are allowed.");
  }
  if (!cacheDirectory) return "unavailable";

  const name = safeFileName(fileName, `attachment.${fileExtension(url) || "bin"}`);
  const mimeType = mimeTypeFor(name);
  const localUri = `${cacheDirectory}${Date.now()}-${name}`;

  // When handed to the share sheet, the receiving app may still be reading
  // the file after shareAsync resolves - keep it a while before cleaning up.
  let cleanupDelayMs = 0;
  try {
    const result = await downloadAsync(url, localUri);
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Download failed (HTTP ${result.status})`);
    }

    if (Platform.OS === "android") {
      const file = new File(result.uri);
      if (file.size <= MAX_IN_MEMORY_SAVE_BYTES) {
        const saved = await saveToAndroidDownloads(await file.base64(), withoutExtension(name), mimeType);
        if (saved) return "downloaded";
      }
    }

    if (await Sharing.isAvailableAsync()) {
      cleanupDelayMs = 5 * 60 * 1000;
      await Sharing.shareAsync(result.uri, { mimeType, dialogTitle: name });
      return "shared";
    }
    return "unavailable";
  } finally {
    setTimeout(() => {
      deleteAsync(localUri, { idempotent: true }).catch(() => {});
    }, cleanupDelayMs);
  }
}
