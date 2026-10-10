import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { useRole } from "@/hooks/useRole";
import { toast } from "@/utils/toast";
import { confirm } from "@/utils/confirm";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getFolderResources,
  addFileResource,
  addLinkResource,
  deleteResource,
  type LmsResource,
} from "@/services/api/lms.api";

// No mime_type is stored server-side for an uploaded file - detected here
// from the file's own extension (in its URL, falling back to the title)
// purely to pick the right icon; a video gets its own icon instead of the
// generic file one, a link keeps its own.
const VIDEO_EXTENSION_PATTERN = /\.(mp4|mov|m4v|webm|mkv|avi|3gp)(\?|#|$)/i;

function resourceIcon(item: LmsResource): keyof typeof Ionicons.glyphMap {
  if (item.resource_type === "link") return "link-outline";
  const source = item.file_url ?? item.title;
  return VIDEO_EXTENSION_PATTERN.test(source) ? "videocam-outline" : "document-text-outline";
}

export function FolderResourcesScreen({ folderId, title }: { folderId: number; title?: string }) {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const role = useRole();
  const canManage = role === "employee" || role === "hod";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [resources, setResources] = useState<LmsResource[]>([]);
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkDescription, setLinkDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const load = useCallback(() => {
    setStatus("loading");
    getFolderResources(folderId)
      .then((data) => {
        setResources(data);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [folderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // This screen renders its own full header below, so hide the shared
  // CollegeHeader (mounted at the Tabs level) while focused, restoring it
  // on blur. Deferred a tick so it reliably wins over a sibling screen's
  // own blur cleanup - see StudentAttendanceScreen's doc comment for the
  // exact race this avoids.
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        navigation.getParent()?.setOptions({ headerShown: false });
      }, 50);
      return () => {
        clearTimeout(timer);
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  function handleUploadFile() {
    DocumentPicker.getDocumentAsync({ type: "*/*" }).then((result) => {
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploadingFile(true);
      addFileResource(folderId, asset.name, undefined, {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? "application/octet-stream",
      })
        .then(() => {
          toast.success("File uploaded");
          load();
        })
        .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't upload the file.")))
        .finally(() => setUploadingFile(false));
    });
  }

  function handleAddLink() {
    const t = linkTitle.trim();
    const url = linkUrl.trim();
    if (!t || !url) {
      toast.warning("Enter both a title and a link");
      return;
    }
    setSaving(true);
    addLinkResource(folderId, { title: t, description: linkDescription.trim() || undefined, link_url: url })
      .then(() => {
        setAddLinkOpen(false);
        setLinkTitle("");
        setLinkDescription("");
        setLinkUrl("");
        load();
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't add the link.")))
      .finally(() => setSaving(false));
  }

  async function handleDelete(resource: LmsResource) {
    const ok = await confirm({
      title: "Remove item",
      message: `Remove "${resource.title}"?`,
      confirmText: "Remove",
      destructive: true,
    });
    if (!ok) return;
    deleteResource(resource.id)
      .then(load)
      .catch(() => toast.error("Couldn't remove the item"));
  }

  function handleOpen(resource: LmsResource) {
    const url = resource.resource_type === "file" ? resource.file_url : resource.link_url;
    if (!url) {
      toast.error("This item has no file or link attached yet");
      return;
    }
    Linking.openURL(url).catch(() => toast.error("Couldn't open that item"));
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title ?? "Folder"}
        </Text>
      </LinearGradient>

      {status === "success" && resources.length > 0 && (
        <View style={styles.folderMetaRow}>
          <Text style={styles.folderMetaText}>
            {resources.length} {resources.length === 1 ? "item" : "items"} in this folder
          </Text>
        </View>
      )}

      {canManage && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleUploadFile} activeOpacity={0.85} disabled={uploadingFile}>
            {uploadingFile ? (
              <ActivityIndicator size="small" color="#2F6FE0" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={16} color="#2F6FE0" />
                <Text style={styles.actionButtonText}>Upload file</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setAddLinkOpen(true)} activeOpacity={0.85}>
            <Ionicons name="link-outline" size={16} color="#2F6FE0" />
            <Text style={styles.actionButtonText}>Add link</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "loading" && <SkeletonListRows count={4} style={styles.list} />}

      {status === "error" && (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>Couldn't load this folder.</Text>
          <TouchableOpacity onPress={load} style={styles.retryButton} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "success" && (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {resources.length === 0 ? (
            <Text style={styles.emptyText}>Nothing added to this folder yet.</Text>
          ) : (
            <View style={styles.listCard}>
              {resources.map((item, index) => (
                <View key={item.id} style={[styles.row, index > 0 && styles.rowDivider]}>
                  <TouchableOpacity style={styles.rowHeader} activeOpacity={0.7} onPress={() => handleOpen(item)}>
                    <View style={styles.iconWrap}>
                      <Ionicons name={resourceIcon(item)} size={20} color="#2F6FE0" />
                    </View>
                    <View style={styles.textWrap}>
                      <Text style={styles.title} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.description && (
                        <Text style={styles.description} numberOfLines={1}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#C6CCD6" />
                  </TouchableOpacity>
                  {canManage && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(item)}
                      activeOpacity={0.85}
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={addLinkOpen} transparent animationType="fade" onRequestClose={() => setAddLinkOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAddLinkOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Add a link</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Title"
              placeholderTextColor="#9AA6B2"
              value={linkTitle}
              onChangeText={setLinkTitle}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Description (optional)"
              placeholderTextColor="#9AA6B2"
              value={linkDescription}
              onChangeText={setLinkDescription}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="https://…"
              placeholderTextColor="#9AA6B2"
              value={linkUrl}
              onChangeText={setLinkUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setAddLinkOpen(false)} activeOpacity={0.8}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={handleAddLink} activeOpacity={0.85} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSaveButtonText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,

    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontFamily: fonts.bold, flex: 1 },
  folderMetaRow: { paddingHorizontal: 16, paddingTop: 12 },
  folderMetaText: { fontSize: 11.5, fontFamily: fonts.bold, color: "#8A93A3", letterSpacing: 0.4 },
  actionsRow: { flexDirection: "row", gap: 10, padding: 16, paddingBottom: 8 },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#EAF0FD",
  },
  actionButtonText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  errorText: { fontSize: 13, fontFamily: fonts.regular, color: "#6B7280" },
  retryButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: "#2F6FE0" },
  retryButtonText: { color: "#fff", fontSize: 13, fontFamily: fonts.semibold },
  list: { padding: 16, paddingTop: 8 },
  emptyText: { fontSize: 13, fontFamily: fonts.regular, color: "#9AA6B2", textAlign: "center", marginTop: 32 },
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  rowHeader: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#EAF0FD", alignItems: "center", justifyContent: "center" },
  textWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  description: { fontSize: 12, fontFamily: fonts.regular, color: "#9AA6B2", marginTop: 2 },
  deleteButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: "#FCA5A5" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", backgroundColor: "#fff", borderRadius: 18, padding: 20 },
  modalTitle: { fontSize: 16, fontFamily: fonts.bold, color: "#111827", marginBottom: 14 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#111827",
    marginBottom: 12,
  },
  modalButtonRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancelButton: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  modalCancelButtonText: { fontSize: 14, fontFamily: fonts.semibold, color: "#6B7280" },
  modalSaveButton: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: "#2F6FE0" },
  modalSaveButtonText: { fontSize: 14, fontFamily: fonts.semibold, color: "#fff" },
});
