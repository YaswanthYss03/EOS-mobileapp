import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Sharing from "expo-sharing";
import { File } from "expo-file-system";
import { StorageAccessFramework, EncodingType } from "expo-file-system/legacy";

// Shared across every "download a generated/fetched PDF" flow in the app
// (fee receipts, the digital ID card, ...) - one granted folder for all of
// them, so a user only ever gets the one-time folder picker once, not once
// per feature.
const ANDROID_DOWNLOAD_DIR_KEY = "pdf_download_dir_uri";

async function saveToAndroidDownloads(base64: string, filename: string): Promise<boolean> {
  const writeInto = async (dirUri: string) => {
    const destUri = await StorageAccessFramework.createFileAsync(dirUri, filename, "application/pdf");
    await StorageAccessFramework.writeAsStringAsync(destUri, base64, { encoding: EncodingType.Base64 });
  };

  const savedDirUri = await SecureStore.getItemAsync(ANDROID_DOWNLOAD_DIR_KEY);
  if (savedDirUri) {
    try {
      await writeInto(savedDirUri);
      return true;
    } catch {
      // The saved folder permission may have been revoked since last time
      // (cleared storage, folder deleted, ...) - forget it and re-prompt below.
      await SecureStore.deleteItemAsync(ANDROID_DOWNLOAD_DIR_KEY);
    }
  }

  const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) return false;
  await SecureStore.setItemAsync(ANDROID_DOWNLOAD_DIR_KEY, permission.directoryUri);
  await writeInto(permission.directoryUri);
  return true;
}

/**
 * Saves a local PDF (already on disk at `uri` - printed, or downloaded from
 * the backend) as a real download rather than only a share-sheet detour.
 *
 * Android: writes it straight into a user-picked folder via Storage Access
 * Framework - the folder is only ever picked once, then every later call
 * just saves silently into it.
 *
 * iOS has no equivalent - Apple only exposes a document to the user via the
 * share sheet's own "Save to Files" action, there is no way for an app to
 * write into a user-visible folder directly - so it falls back to sharing
 * there (and anywhere Android's folder permission gets declined).
 *
 * Returns what actually happened so the caller can toast accordingly.
 */
export async function downloadPdf(
  uri: string,
  // Without extension - Android's Storage Access Framework derives it from
  // the mime type and appends its own; a ".pdf" here would double up.
  filename: string,
  dialogTitle: string,
): Promise<"downloaded" | "shared" | "unavailable"> {
  if (Platform.OS === "android") {
    const base64 = await new File(uri).base64();
    const saved = await saveToAndroidDownloads(base64, filename);
    if (saved) return "downloaded";
    // User declined the one-time folder permission - fall through to sharing.
  }

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle, UTI: "com.adobe.pdf" });
    return "shared";
  }

  return "unavailable";
}
