import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getMyProfile,
  uploadMyResume,
  addMySocialLink,
  removeMySocialLink,
  type MyProfile,
  type SocialLink,
} from "@/services/api/profile.api";

function initialsFromName(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Purely cosmetic — picks a recognizable icon when the user's own free-text
// title happens to match a well-known platform. Falls back to a generic
// link icon for anything else. Never affects what's stored/sent.
function iconForLinkTitle(title: string): keyof typeof Ionicons.glyphMap {
  const key = title.toLowerCase();
  if (key.includes("linkedin")) return "logo-linkedin";
  if (key.includes("github")) return "logo-github";
  if (key.includes("twitter") || key.includes(" x ") || key === "x") return "logo-twitter";
  if (key.includes("instagram")) return "logo-instagram";
  if (key.includes("scholar") || key.includes("research")) return "school-outline";
  if (key.includes("orcid")) return "finger-print-outline";
  if (key.includes("scopus") || key.includes("publication")) return "document-text-outline";
  if (key.includes("leetcode") || key.includes("hackerrank") || key.includes("codeforces") || key.includes("code"))
    return "code-slash-outline";
  if (key.includes("portfolio") || key.includes("website")) return "globe-outline";
  return "link-outline";
}

export function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [savingLink, setSavingLink] = useState(false);

  const load = useCallback(() => {
    setStatus("loading");
    getMyProfile()
      .then((data) => {
        setProfile(data);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, []);

  // Load once per screen focus, not on every render — avoids hammering the
  // backend since this data rarely changes within a session.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  async function handleUploadResume() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploadingResume(true);
    uploadMyResume({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? "application/pdf",
    })
      .then((res) => {
        setProfile((prev) => (prev ? { ...prev, resume_url: res.resume_url } : prev));
        toast.success("Resume uploaded");
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't upload your resume.")))
      .finally(() => setUploadingResume(false));
  }

  function handleViewResume() {
    if (!profile?.resume_url) return;
    Linking.openURL(profile.resume_url).catch(() =>
      toast.error("Couldn't open the resume"),
    );
  }

  function handleAddLink() {
    const title = linkTitle.trim();
    const url = linkUrl.trim();
    if (!title || !url) {
      toast.warning("Enter both a title and a link");
      return;
    }

    setSavingLink(true);
    addMySocialLink(title, url)
      .then((link) => {
        setProfile((prev) => (prev ? { ...prev, social_links: [...prev.social_links, link] } : prev));
        setAddLinkOpen(false);
        setLinkTitle("");
        setLinkUrl("");
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't add that link.")))
      .finally(() => setSavingLink(false));
  }

  function handleRemoveLink(link: SocialLink) {
    Alert.alert("Remove link", `Remove "${link.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setProfile((prev) =>
            prev ? { ...prev, social_links: prev.social_links.filter((l) => l.id !== link.id) } : prev,
          );
          removeMySocialLink(link.id).catch(() => {
            toast.error("Couldn't remove the link");
            load();
          });
        },
      },
    ]);
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
        <View>
          <Text style={styles.headerTitle}>Profile & Resume</Text>
          {profile && <Text style={styles.headerSubtitle}>{profile.id_no}</Text>}
        </View>
      </LinearGradient>

      {status === "loading" && (
        <View style={styles.centerFill}>
          <ActivityIndicator color="#2F6FE0" size="large" />
        </View>
      )}

      {status === "error" && (
        <View style={styles.centerFill}>
          <Ionicons name="cloud-offline-outline" size={40} color="#B0B7C3" />
          <Text style={styles.errorText}>Couldn't load your profile.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "success" && profile && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile card */}
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                {profile.photo_url ? (
                  <Image source={{ uri: profile.photo_url }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initialsFromName(profile.name)}</Text>
                )}
              </View>
              <View style={styles.profileTextWrap}>
                <Text style={styles.name}>{profile.name}</Text>
                <Text style={styles.designation}>{profile.designation}</Text>
                {profile.department && <Text style={styles.department}>{profile.department}</Text>}
              </View>
            </View>
          </View>

          {profile.role !== "parent" && (
            <>
              {/* Resume row */}
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={profile.resume_url ? handleViewResume : handleUploadResume}
                disabled={uploadingResume}
              >
                <View style={styles.resumeRow}>
                  <Ionicons name="document-text-outline" size={20} color="#2F6FE0" />
                  <Text style={styles.resumeText}>
                    {uploadingResume
                      ? "Uploading resume…"
                      : profile.resume_url
                        ? "View Resume"
                        : "Upload Resume"}
                  </Text>
                  {uploadingResume ? (
                    <ActivityIndicator size="small" color="#2F6FE0" />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color="#B0B7C3" />
                  )}
                </View>
              </TouchableOpacity>
              {profile.resume_url && (
                <TouchableOpacity onPress={handleUploadResume} disabled={uploadingResume} style={styles.replaceRow}>
                  <Text style={styles.replaceRowText}>Replace resume</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* My children (parent only) */}
          {profile.role === "parent" && (
            <>
              <Text style={styles.sectionTitle}>My Children</Text>
              <View style={styles.card}>
                {(!profile.children || profile.children.length === 0) && (
                  <Text style={styles.emptyLinksText}>No linked student records found.</Text>
                )}
                {profile.children?.map((child, index) => (
                  <View
                    key={child.id}
                    style={[styles.childRow, index < profile.children!.length - 1 && styles.linkRowDivider]}
                  >
                    <View style={styles.childAvatar}>
                      <Text style={styles.childAvatarText}>{initialsFromName(child.name)}</Text>
                    </View>
                    <View style={styles.linkTextWrap}>
                      <Text style={styles.linkLabel}>
                        {child.name} · {child.relationship}
                      </Text>
                      <Text style={styles.childMeta}>
                        {child.student_id_no} · {child.course}
                        {child.section ? ` · Section ${child.section}` : ""}
                      </Text>
                      {child.department && <Text style={styles.childMeta}>{child.department}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Social / academic links */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Links</Text>
            <TouchableOpacity
              onPress={() => setAddLinkOpen(true)}
              style={styles.addLinkButton}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#2F6FE0" />
              <Text style={styles.addLinkButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {profile.social_links.length === 0 && (
              <Text style={styles.emptyLinksText}>
                No links added yet. Tap "Add" to share your LinkedIn, GitHub, portfolio, or anything else.
              </Text>
            )}
            {profile.social_links.map((link, index) => (
              <View
                key={link.id}
                style={[styles.linkRow, index < profile.social_links.length - 1 && styles.linkRowDivider]}
              >
                <TouchableOpacity
                  style={styles.linkTouchable}
                  activeOpacity={0.8}
                  onPress={() => Linking.openURL(link.url).catch(() => toast.error("Couldn't open that link"))}
                >
                  <View style={styles.linkIconWrap}>
                    <Ionicons name={iconForLinkTitle(link.title)} size={18} color="#2F6FE0" />
                  </View>
                  <View style={styles.linkTextWrap}>
                    <Text style={styles.linkLabel}>{link.title}</Text>
                    <Text style={styles.linkValue} numberOfLines={1}>
                      {link.url}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleRemoveLink(link)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.linkRemoveButton}
                >
                  <Ionicons name="close-circle-outline" size={19} color="#B0B7C3" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Service record */}
          <Text style={styles.sectionTitle}>Service Record</Text>
          <View style={styles.card}>
            {profile.date_of_joining && (
              <View style={styles.serviceRow}>
                <Text style={styles.serviceLabel}>
                  {profile.role === "student" ? "Date of Admission" : "Date of Joining"}
                </Text>
                <Text style={styles.serviceValue}>{profile.date_of_joining}</Text>
              </View>
            )}
            {profile.reporting_to && (
              <View style={[styles.serviceRow, profile.date_of_joining && styles.serviceRowDivider]}>
                <Text style={styles.serviceLabel}>Reporting to</Text>
                <Text style={styles.serviceValue}>{profile.reporting_to}</Text>
              </View>
            )}
            <View
              style={[
                styles.serviceRow,
                (profile.date_of_joining || profile.reporting_to) && styles.serviceRowDivider,
              ]}
            >
              <Text style={styles.serviceLabel}>{profile.role === "student" ? "Email" : "Work Email"}</Text>
              <Text style={styles.serviceValue}>{profile.work_email}</Text>
            </View>
          </View>

          {/* Digital ID card */}
          {profile.role !== "parent" && (
            <TouchableOpacity
              style={styles.idCardButton}
              activeOpacity={0.85}
              onPress={() => router.push("/id-card")}
            >
              <Ionicons name="card-outline" size={20} color="#fff" />
              <View style={styles.idCardTextWrap}>
                <Text style={styles.idCardTitle}>Digital ID Card</Text>
                <Text style={styles.idCardSubtitle}>Tap to generate & download</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D7E2FA" />
            </TouchableOpacity>
          )}

          {/* Logout */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal visible={addLinkOpen} transparent animationType="fade" onRequestClose={() => setAddLinkOpen(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddLinkOpen(false)}
        >
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Add a link</Text>
            <Text style={styles.modalFieldLabel}>Title</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. LinkedIn, GitHub, Portfolio"
              placeholderTextColor="#9AA6B2"
              value={linkTitle}
              onChangeText={setLinkTitle}
            />
            <Text style={styles.modalFieldLabel}>Link</Text>
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
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setAddLinkOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleAddLink}
                activeOpacity={0.85}
                disabled={savingLink}
              >
                {savingLink ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

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
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  headerSubtitle: {
    color: "#D7E2FA",
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#2F6FE0",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: fonts.semibold,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarText: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  profileTextWrap: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  designation: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 3,
  },
  department: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  resumeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  resumeText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  replaceRow: {
    alignItems: "flex-end",
    marginTop: -10,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  replaceRowText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  addLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#E4EBFB",
    marginBottom: 8,
  },
  addLinkButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  emptyLinksText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    lineHeight: 19,
    paddingVertical: 4,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  linkRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  childRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  childAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  childAvatarText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  childMeta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 2,
  },
  linkTouchable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  linkIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  linkTextWrap: {
    flex: 1,
  },
  linkLabel: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  linkValue: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#2F6FE0",
    marginTop: 2,
  },
  linkRemoveButton: {
    paddingLeft: 10,
  },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  serviceRowDivider: {
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  serviceLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
  },
  serviceValue: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  idCardButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#2F6FE0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#2F6FE0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  idCardTextWrap: {
    flex: 1,
  },
  idCardTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  idCardSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#D7E2FA",
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingVertical: 14,
  },
  logoutButtonText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#DC2626",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 14,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#6B7280",
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#111827",
    marginBottom: 14,
  },
  modalButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  modalSaveButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#2F6FE0",
  },
  modalSaveButtonText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#fff",
  },
});
