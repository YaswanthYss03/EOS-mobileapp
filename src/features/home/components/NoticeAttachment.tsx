import { useState } from "react";
import { View, Text, Image, TouchableOpacity, Modal, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { downloadRemoteFile, fileExtension, isImageAttachment } from "@/utils/fileDownload";

// Shared rendering of a notice's single attachment:
//  - image: shown in full (never cropped) above the notice text; tap for a
//    full-screen view with a download button;
//  - any other file (PDF, DOC, ...): a row below the text; tap to download
//    it to the phone.
// Callers decide placement - see isNoticeImage().

export function isNoticeImage(fileName: string | null | undefined, url: string | null | undefined): boolean {
  return !!url && isImageAttachment(fileName, url);
}

// Very tall/wide images are letterboxed rather than cropped.
const MIN_ASPECT = 0.5;
const MAX_ASPECT = 2.5;

function useAttachmentDownload(url: string, fileName: string | null | undefined) {
  const [downloading, setDownloading] = useState(false);
  async function download() {
    if (downloading) return;
    setDownloading(true);
    try {
      const outcome = await downloadRemoteFile(url, fileName);
      if (outcome === "downloaded") toast.success("Downloaded to your chosen folder");
      else if (outcome === "unavailable") toast.error("Downloading isn't available on this device.");
    } catch {
      toast.error("Couldn't download the file. Please try again.");
    } finally {
      setDownloading(false);
    }
  }
  return { downloading, download };
}

export function NoticeImage({ url, fileName }: { url: string; fileName: string | null | undefined }) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  // If the image can't be shown, still let people get the file.
  if (failed) return <NoticeFileRow url={url} fileName={fileName} />;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setViewerOpen(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel="Open image"
        style={[styles.imageBox, { aspectRatio: aspectRatio ?? 4 / 3 }]}
      >
        <Image
          source={{ uri: url }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          onLoad={(e) => {
            const { width, height } = e.nativeEvent.source ?? {};
            if (width && height) setAspectRatio(Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, width / height)));
          }}
          onError={() => setFailed(true)}
        />
        {aspectRatio === null && (
          <View style={styles.imageLoading} pointerEvents="none">
            <ActivityIndicator color="#2F6FE0" />
          </View>
        )}
        <View style={styles.expandBadge} pointerEvents="none">
          <Ionicons name="expand-outline" size={14} color="#fff" />
        </View>
      </TouchableOpacity>
      <ImageViewer visible={viewerOpen} url={url} fileName={fileName} onClose={() => setViewerOpen(false)} />
    </>
  );
}

function ImageViewer({
  visible,
  url,
  fileName,
  onClose,
}: {
  visible: boolean;
  url: string;
  fileName: string | null | undefined;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { downloading, download } = useAttachmentDownload(url, fileName);
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar style="light" />
      <View style={styles.viewer}>
        <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="contain" />
        <View style={[styles.viewerBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose} style={styles.viewerButton} hitSlop={8} accessibilityLabel="Close">
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={download}
            style={styles.viewerButton}
            hitSlop={8}
            disabled={downloading}
            accessibilityLabel="Download image"
          >
            {downloading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="download-outline" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function fileIcon(ext: string): { name: keyof typeof Ionicons.glyphMap; color: string; bg: string } {
  if (ext === "pdf") return { name: "document-text", color: "#DC2626", bg: "#FEF2F2" };
  if (ext === "doc" || ext === "docx") return { name: "document-text", color: "#2563EB", bg: "#EFF6FF" };
  if (ext === "xls" || ext === "xlsx" || ext === "csv") return { name: "grid", color: "#16A34A", bg: "#F0FDF4" };
  if (ext === "ppt" || ext === "pptx") return { name: "easel", color: "#EA580C", bg: "#FFF7ED" };
  return { name: "document-attach", color: "#4B5563", bg: "#F3F4F6" };
}

export function NoticeFileRow({ url, fileName }: { url: string; fileName: string | null | undefined }) {
  const { downloading, download } = useAttachmentDownload(url, fileName);
  const ext = fileExtension(fileName) || fileExtension(url);
  const icon = fileIcon(ext);
  const typeLabel = ext ? ext.toUpperCase() : "File";

  return (
    <TouchableOpacity
      style={styles.fileRow}
      onPress={download}
      activeOpacity={0.8}
      disabled={downloading}
      accessibilityRole="button"
      accessibilityLabel={`Download ${fileName ?? "attachment"}`}
    >
      <View style={[styles.fileIcon, { backgroundColor: icon.bg }]}>
        <Ionicons name={icon.name} size={20} color={icon.color} />
      </View>
      <View style={styles.fileTextWrap}>
        <Text style={styles.fileName} numberOfLines={1}>
          {fileName ?? "Attachment"}
        </Text>
        <Text style={styles.fileMeta}>{downloading ? "Downloading…" : `${typeLabel} · Tap to download`}</Text>
      </View>
      <View style={styles.fileAction}>
        {downloading ? (
          <ActivityIndicator color="#2F6FE0" size="small" />
        ) : (
          <Ionicons name="download-outline" size={18} color="#2F6FE0" />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  imageBox: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    marginTop: 12,
  },
  imageLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  expandBadge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewer: {
    flex: 1,
    backgroundColor: "#000",
  },
  viewerBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  viewerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E9F0",
    backgroundColor: "#FAFBFC",
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fileTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: 13.5,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  fileMeta: {
    fontSize: 11.5,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 2,
  },
  fileAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
});
