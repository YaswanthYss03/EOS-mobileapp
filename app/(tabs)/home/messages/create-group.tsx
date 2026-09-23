import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getEligibleStudents,
  createGroupConversation,
  uploadGroupImage,
  type MessagePerson,
} from "@/services/api/messaging.api";

function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("");
}

// "Create Group" - Faculty/HoD and Student both land here (see
// messages/index.tsx's CAN_CREATE_GROUP_ROLES). Members can be ANY active
// student in the college (see getEligibleStudents), server-enforced on
// create/add regardless of what this screen sends. The directory is too
// large (~3000+ students) to fetch in full, so this mirrors the DM search in
// messages/index.tsx: a debounced, server-side search plus a small default
// page shown before the caller types anything. What actually happens to a
// selected student differs by the CALLER's role, entirely server-side: a
// Faculty/HoD caller adds them immediately; a Student caller's selections
// become pending invitations the student must accept (see
// MessagingService.createGroupConversation) - this screen doesn't need to
// know which, since either way the creator sees the group right away.
export function CreateGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");

  const [students, setStudents] = useState<MessagePerson[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [filter, setFilter] = useState("");
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);

  const mountedRef = useRef(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = filter.trim();
    const isFirstRun = !mountedRef.current;
    mountedRef.current = true;

    setSearching(!isFirstRun);
    const run = () => {
      getEligibleStudents(trimmed || undefined)
        .then((rows) => {
          setStudents(rows);
          setStatus("success");
        })
        .catch(() => setStatus("error"))
        .finally(() => setSearching(false));
    };
    if (isFirstRun) {
      run();
    } else {
      debounceRef.current = setTimeout(run, 300);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filter]);

  const filteredStudents = students;

  function toggleStudent(userId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.warning("Allow photo library access to set a group image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setImageUri(asset.uri);
    setImageMimeType(asset.mimeType ?? "image/jpeg");
  }

  async function handleCreate() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.warning("Give this group a name");
      return;
    }
    if (selectedIds.size === 0) {
      toast.warning("Select at least one student");
      return;
    }
    setCreating(true);
    try {
      const conversation = await createGroupConversation(trimmedTitle, [...selectedIds]);
      if (imageUri) {
        try {
          await uploadGroupImage(conversation.id, {
            uri: imageUri,
            name: `group-${conversation.id}.jpg`,
            mimeType: imageMimeType,
          });
        } catch (error) {
          // The group itself was created successfully - a failed image
          // upload shouldn't block getting into it, just say so honestly.
          toast.error(getApiErrorMessage(error, "Group created, but the image couldn't be uploaded."));
        }
      }
      toast.success("Group created");
      router.replace({
        pathname: "/(tabs)/home/messages/[conversationId]",
        params: { conversationId: String(conversation.id), isGroup: "true" },
      } as never);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't create this group."));
    } finally {
      setCreating(false);
    }
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New group</Text>
      </LinearGradient>

      <View style={styles.form}>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          ) : (
            <Ionicons name="camera-outline" size={22} color="#2F6FE0" />
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.titleInput}
          placeholder="Group name"
          placeholderTextColor="#9AA6B2"
          value={title}
          onChangeText={setTitle}
          maxLength={150}
        />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color="#9AA6B2" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search students by name, roll no. or email"
          placeholderTextColor="#9AA6B2"
          value={filter}
          onChangeText={setFilter}
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color="#9AA6B2" />}
      </View>

      {selectedIds.size > 0 && (
        <Text style={styles.selectedCount}>{selectedIds.size} selected</Text>
      )}

      {status === "loading" ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#2F6FE0" />
        </View>
      ) : status === "error" ? (
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
          <Text style={styles.emptyText}>Couldn't load students.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => String(item.userId)}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.emptyText}>
                {filter.trim()
                  ? `No students match "${filter.trim()}"`
                  : "No students found."}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const selected = selectedIds.has(item.userId);
            return (
              <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => toggleStudent(item.userId)}>
                <View style={styles.avatar}>
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{initialsFromName(item.name)}</Text>
                  )}
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowSubtitle}>{item.roleLabel}</Text>
                </View>
                <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                  {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[styles.createButton, creating && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={creating}
          activeOpacity={0.85}
        >
          {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.createButtonText}>Create group</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default CreateGroupScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
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
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  form: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 14,
  },
  imagePicker: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#DCE6FB",
    borderStyle: "dashed",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  titleInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#111827",
    padding: 0,
  },
  selectedCount: {
    marginHorizontal: 16,
    marginTop: 10,
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  rowTextWrap: {
    flex: 1,
  },
  rowName: {
    fontSize: 13.5,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  rowSubtitle: {
    fontSize: 11.5,
    fontFamily: fonts.medium,
    color: "#7A828E",
    marginTop: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#EEF0F4",
  },
  createButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 14,
    paddingVertical: 14,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#fff",
  },
});
