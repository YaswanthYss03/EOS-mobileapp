import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as Linking from "expo-linking";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { useRole } from "@/hooks/useRole";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getFolderResources,
  addFileResource,
  addLinkResource,
  deleteResource,
  type LmsResource,
} from "@/services/api/lms.api";

const fileIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  file: "document-text-outline",
  link: "link-outline",
};

export function FolderResourcesScreen({ folderId, title }: { folderId: number; title?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const role = useRole();
  const canManage = role === "employee" || role === "hod";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [resources, setResources] = useState<LmsResource[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
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

  function handleDelete(resource: LmsResource) {
    Alert.alert("Remove item", `Remove "${resource.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          deleteResource(resource.id)
            .then(load)
            .catch(() => toast.error("Couldn't remove the item"));
        },
      },
    ]);
  }

  function handleOpen(resource: LmsResource) {
    const url = resource.resource_type === "file" ? resource.file_url : resource.link_url;
    if (url) Linking.openURL(url).catch(() => toast.error("Couldn't open that item"));
  }

  async function handleCopyLink(url: string) {
    await Clipboard.setStringAsync(url);
    toast.success("Link copied");
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
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

      {status === "loading" && (
        <View style={styles.centerFill}>
          <ActivityIndicator color="#2F6FE0" />
        </View>
      )}

      {status === "error" && (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>Couldn't load this folder.</Text>
          <TouchableOpacity onPress={load} style={styles.retryButton} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "success" && (
        <FlatList
          data={resources}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>Nothing added to this folder yet.</Text>}
          renderItem={({ item }) => {
            const expanded = expandedId === item.id;
            return (
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  activeOpacity={0.85}
                  onPress={() => setExpandedId(expanded ? null : item.id)}
                >
                  <View style={styles.iconWrap}>
                    <Ionicons name={fileIcon[item.resource_type]} size={20} color="#2F6FE0" />
                  </View>
                  <View style={styles.textWrap}>
                    <Text style={styles.title} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.meta}>{item.resource_type === "file" ? "File" : "External link"}</Text>
                  </View>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{item.resource_type === "file" ? "FILE" : "LINK"}</Text>
                  </View>
                </TouchableOpacity>

                {expanded && (
                  <View style={styles.expandedBody}>
                    {item.description && <Text style={styles.description}>{item.description}</Text>}
                    <Text style={styles.openHint}>
                      {item.resource_type === "link" ? "Opens in the browser" : "Opens in your default viewer"}
                    </Text>
                    <View style={styles.buttonRow}>
                      <TouchableOpacity style={styles.primaryButton} onPress={() => handleOpen(item)} activeOpacity={0.85}>
                        <Text style={styles.primaryButtonText}>Open {item.resource_type === "link" ? "link" : "file"}</Text>
                      </TouchableOpacity>
                      {item.resource_type === "link" && item.link_url && (
                        <TouchableOpacity
                          style={styles.secondaryButton}
                          onPress={() => handleCopyLink(item.link_url!)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.secondaryButtonText}>Copy link</Text>
                        </TouchableOpacity>
                      )}
                      {canManage && (
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDelete(item)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="trash-outline" size={16} color="#DC2626" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          }}
        />
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
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#EAF0FD", alignItems: "center", justifyContent: "center" },
  textWrap: { flex: 1 },
  title: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  meta: { fontSize: 11.5, fontFamily: fonts.regular, color: "#9AA6B2", marginTop: 2 },
  typeBadge: { backgroundColor: "#E4EBFB", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  typeBadgeText: { fontSize: 10, fontFamily: fonts.bold, color: "#2F6FE0" },
  expandedBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
    paddingTop: 12,
    gap: 10,
  },
  description: { fontSize: 13, fontFamily: fonts.regular, color: "#374151", lineHeight: 19 },
  openHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    backgroundColor: "#F7F8FA",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  buttonRow: { flexDirection: "row", gap: 10 },
  primaryButton: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 11, borderRadius: 10, backgroundColor: "#2F6FE0" },
  primaryButtonText: { fontSize: 13, fontFamily: fonts.bold, color: "#fff" },
  secondaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2F6FE0",
  },
  secondaryButtonText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0" },
  deleteButton: { width: 40, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: "#FCA5A5" },
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
