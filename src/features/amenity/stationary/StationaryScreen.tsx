import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RazorpayCheckout from "react-native-razorpay";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { confirm } from "@/utils/confirm";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/services/api/client";
import { createStationaryOrder, verifyStationaryPayment } from "@/services/api/stationary.api";

type Tab = "request" | "draft";
type Orientation = "portrait" | "landscape";
type ColorMode = "color" | "bw";
type PageSelection = "all" | "even" | "odd";

// Only ever a draft-in-progress - a request that's actually gone to
// checkout is submitted straight to the backend (see handleSaveAndPay) and
// is no longer this device's problem to track, same reasoning
// stationary_requests only ever gets a row once payment starts.
type StationaryDraft = {
  id: string;
  fileName: string | null;
  fileUri: string | null;
  fileMimeType: string | null;
  copies: string;
  orientation: Orientation | null;
  colorMode: ColorMode | null;
  pages: PageSelection | null;
  createdAt: string;
  updatedAt: string;
};

const DOCUMENT_TYPES = [
  "application/pdf",
  "image/*",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function emptyForm(): Omit<StationaryDraft, "id" | "createdAt" | "updatedAt"> {
  return {
    fileName: null,
    fileUri: null,
    fileMimeType: null,
    copies: "",
    orientation: null,
    colorMode: null,
    pages: null,
  };
}

function summaryLine(item: StationaryDraft): string {
  const parts: string[] = [];
  if (item.copies) parts.push(`${item.copies} ${Number(item.copies) === 1 ? "copy" : "copies"}`);
  if (item.orientation) parts.push(item.orientation === "portrait" ? "Portrait" : "Landscape");
  if (item.colorMode) parts.push(item.colorMode === "color" ? "Color" : "Black & white");
  if (item.pages) parts.push(item.pages === "all" ? "All pages" : item.pages === "even" ? "Even pages" : "Odd pages");
  return parts.length > 0 ? parts.join(" · ") : "No details yet";
}

function formatSavedAt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    " · " +
    new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// Xerox/print-shop request form, reachable from the Amenity tab's
// "Stationary" tile for every role that has one (see AmenityHomeScreen -
// every role except Principal). Drafts are kept in this device's own
// AsyncStorage, namespaced per signed-in user id - there's no backend
// concept of a draft, only of a submitted-and-paid request (see
// EOSbackend1/src/modules/stationary/stationary.service.ts). "Save and
// pay" runs a real Razorpay order-then-verify flow, same as Pay Fees/
// wallet top-up - see @/services/api/stationary.api.ts.
export function StationaryScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const storageKey = `stationary_drafts_${user?.id ?? "guest"}`;

  const [tab, setTab] = useState<Tab>("request");
  const [drafts, setDrafts] = useState<StationaryDraft[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (raw) setDrafts(JSON.parse(raw) as StationaryDraft[]);
      })
      .catch(() => {
        // Local-only storage - a read failure just means an empty list, not
        // worth a toast the user can't act on.
      })
      .finally(() => setLoaded(true));
  }, [storageKey]);

  const persist = useCallback(
    async (next: StationaryDraft[]) => {
      setDrafts(next);
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        toast.error("Couldn't save that on this device. Please try again.");
      }
    },
    [storageKey],
  );

  function resetForm() {
    setForm(emptyForm());
    setEditingId(null);
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({ type: DOCUMENT_TYPES });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setForm((prev) => ({ ...prev, fileName: asset.name, fileUri: asset.uri, fileMimeType: asset.mimeType ?? null }));
  }

  function clearFile() {
    setForm((prev) => ({ ...prev, fileName: null, fileUri: null, fileMimeType: null }));
  }

  function toggleOrientation(value: Orientation) {
    setForm((prev) => ({ ...prev, orientation: prev.orientation === value ? null : value }));
  }

  function toggleColorMode(value: ColorMode) {
    setForm((prev) => ({ ...prev, colorMode: prev.colorMode === value ? null : value }));
  }

  function togglePages(value: PageSelection) {
    setForm((prev) => ({ ...prev, pages: prev.pages === value ? null : value }));
  }

  async function handleSaveDraft() {
    setSaving(true);
    const now = new Date().toISOString();
    const next = editingId
      ? drafts.map((r) => (r.id === editingId ? { ...r, ...form, updatedAt: now } : r))
      : [{ id: `${Date.now()}`, ...form, createdAt: now, updatedAt: now }, ...drafts];
    await persist(next);
    setSaving(false);
    toast.success("Saved to your drafts");
    resetForm();
    setTab("draft");
  }

  async function handleSaveAndPay() {
    if (!form.fileName) {
      toast.warning("Upload a file to print");
      return;
    }
    if (!form.copies.trim() || Number(form.copies) < 1) {
      toast.warning("Enter the number of copies");
      return;
    }
    if (!form.orientation) {
      toast.warning("Choose portrait or landscape");
      return;
    }
    if (!form.colorMode) {
      toast.warning("Choose color or black & white");
      return;
    }
    if (!form.pages) {
      toast.warning("Choose which pages to print");
      return;
    }

    setSaving(true);
    // Same Razorpay order-then-verify flow as Pay Fees / wallet top-up -
    // see stationary.api.ts. The amount is computed server-side from
    // copies/color_mode (see StationaryService.PRICING), never trusted
    // from the client.
    try {
      const order = await createStationaryOrder({
        file_name: form.fileName ?? undefined,
        copies: Number(form.copies),
        orientation: form.orientation,
        color_mode: form.colorMode,
        pages: form.pages,
      });

      const checkoutResult = await RazorpayCheckout.open({
        key: order.key_id,
        order_id: order.order_id,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: "EOS Stationary",
        description: `${form.copies} ${Number(form.copies) === 1 ? "copy" : "copies"} · ${form.fileName ?? "print job"}`,
        prefill: user?.email ? { email: user.email } : undefined,
        theme: { color: "#2F6FE0" },
      });

      await verifyStationaryPayment({
        razorpay_order_id: checkoutResult.razorpay_order_id,
        razorpay_payment_id: checkoutResult.razorpay_payment_id,
        razorpay_signature: checkoutResult.razorpay_signature,
      });

      // Paid requests live on the backend now, not this device's draft
      // list - if this was resumed from a draft, that draft is done with.
      if (editingId) {
        await persist(drafts.filter((r) => r.id !== editingId));
      }
      toast.success(`Payment successful - ₹${order.amount} paid`);
      resetForm();
    } catch (error: any) {
      // RazorpayCheckout's own cancel/failure rejection shape ({code,
      // description}) is distinct from our axios error shape - only the
      // latter has getApiErrorMessage's expected response.data.message.
      // Logged + surfaced verbatim in the fallback branch (rather than a
      // fixed "didn't go through" string) since that branch is exactly
      // where an unexpected shape - e.g. RazorpayCheckout itself throwing
      // because the native module isn't available outside a custom dev
      // client - would otherwise hide what actually happened.
      console.error("Stationary payment failed:", error);
      if (error?.response) {
        toast.error(getApiErrorMessage(error, "Payment verification failed"));
      } else if (error?.description) {
        toast.info(error.description);
      } else {
        const detail = error?.message || error?.code || JSON.stringify(error) || "unknown error";
        toast.error(`Payment didn't go through: ${detail}`);
      }
    } finally {
      setSaving(false);
    }
  }

  function resumeDraft(item: StationaryDraft) {
    setForm({
      fileName: item.fileName,
      fileUri: item.fileUri,
      fileMimeType: item.fileMimeType,
      copies: item.copies,
      orientation: item.orientation,
      colorMode: item.colorMode,
      pages: item.pages,
    });
    setEditingId(item.id);
    setTab("request");
  }

  async function deleteDraft(id: string) {
    const ok = await confirm({
      title: "Delete draft?",
      message: "This draft will be removed from your device.",
      confirmText: "Delete",
      destructive: true,
    });
    if (!ok) return;
    await persist(drafts.filter((r) => r.id !== id));
    if (editingId === id) resetForm();
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
        <Text style={styles.headerTitle}>Stationary</Text>
      </LinearGradient>

      <View style={styles.tabSwitch}>
        <TouchableOpacity
          style={[styles.tabButton, tab === "request" && styles.tabButtonActive]}
          onPress={() => setTab("request")}
        >
          <Text style={[styles.tabButtonText, tab === "request" && styles.tabButtonTextActive]}>Request</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, tab === "draft" && styles.tabButtonActive]}
          onPress={() => setTab("draft")}
        >
          <Text style={[styles.tabButtonText, tab === "draft" && styles.tabButtonTextActive]}>
            Draft {drafts.length > 0 ? `(${drafts.length})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === "request" ? (
          <View style={styles.card}>
            {editingId && (
              <View style={styles.editingBanner}>
                <Ionicons name="create-outline" size={14} color="#2F6FE0" />
                <Text style={styles.editingBannerText}>Editing a saved draft</Text>
                <TouchableOpacity onPress={resetForm} hitSlop={8}>
                  <Text style={styles.editingBannerClear}>Start new</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.fieldLabel}>Upload file</Text>
            {form.fileName ? (
              <View style={styles.fileRow}>
                <Ionicons name="document-text-outline" size={18} color="#2F6FE0" />
                <Text style={styles.fileName} numberOfLines={1}>
                  {form.fileName}
                </Text>
                <TouchableOpacity onPress={clearFile} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#B0B7C3" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadButton} onPress={pickFile} activeOpacity={0.8}>
                <Ionicons name="cloud-upload-outline" size={18} color="#2F6FE0" />
                <Text style={styles.uploadButtonText}>Tap to upload a file</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.fieldLabel}>Copies</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2"
              placeholderTextColor="#9AA6B2"
              keyboardType="number-pad"
              value={form.copies}
              onChangeText={(text) => setForm((prev) => ({ ...prev, copies: text.replace(/[^0-9]/g, "") }))}
            />

            <Text style={styles.fieldLabel}>Orientation</Text>
            <View style={styles.checkboxGroupRow}>
              <CheckboxOption
                label="Portrait"
                checked={form.orientation === "portrait"}
                onPress={() => toggleOrientation("portrait")}
              />
              <CheckboxOption
                label="Landscape"
                checked={form.orientation === "landscape"}
                onPress={() => toggleOrientation("landscape")}
              />
            </View>

            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.checkboxGroupRow}>
              <CheckboxOption
                label="Color"
                checked={form.colorMode === "color"}
                onPress={() => toggleColorMode("color")}
              />
              <CheckboxOption
                label="Black & white"
                checked={form.colorMode === "bw"}
                onPress={() => toggleColorMode("bw")}
              />
            </View>

            <Text style={styles.fieldLabel}>Pages</Text>
            <View style={styles.checkboxGroupRow}>
              <CheckboxOption label="All" checked={form.pages === "all"} onPress={() => togglePages("all")} />
              <CheckboxOption
                label="Even pages"
                checked={form.pages === "even"}
                onPress={() => togglePages("even")}
              />
              <CheckboxOption label="Odd pages" checked={form.pages === "odd"} onPress={() => togglePages("odd")} />
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.draftButton, saving && styles.actionButtonDisabled]}
                onPress={handleSaveDraft}
                activeOpacity={0.85}
                disabled={saving}
              >
                <Text style={styles.draftButtonText}>Save as draft</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.payButton, saving && styles.actionButtonDisabled]}
                onPress={handleSaveAndPay}
                activeOpacity={0.85}
                disabled={saving}
              >
                <Text style={styles.payButtonText}>Save and pay</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : !loaded ? null : drafts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>No drafts yet</Text>
            <Text style={styles.emptyStateSubtext}>Requests you save as a draft will show up here.</Text>
          </View>
        ) : (
          drafts.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.draftCard}
              onPress={() => resumeDraft(item)}
              activeOpacity={0.85}
            >
              <View style={styles.draftIconWrap}>
                <Ionicons name="document-text-outline" size={18} color="#2F6FE0" />
              </View>
              <View style={styles.draftTextWrap}>
                <Text style={styles.draftFileName} numberOfLines={1}>
                  {item.fileName ?? "No file yet"}
                </Text>
                <Text style={styles.draftSummary} numberOfLines={1}>
                  {summaryLine(item)}
                </Text>
                <Text style={styles.draftSavedAt}>Saved {formatSavedAt(item.updatedAt)}</Text>
              </View>
              <TouchableOpacity onPress={() => deleteDraft(item.id)} hitSlop={8} style={styles.draftDeleteButton}>
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CheckboxOption({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.checkboxOption} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={13} color="#fff" />}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
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
  tabSwitch: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 10,
  },
  tabButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  tabButtonText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  tabButtonTextActive: {
    color: "#fff",
    fontFamily: fonts.bold,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  editingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EAF0FD",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  editingBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  editingBannerClear: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    textDecorationLine: "underline",
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#374151",
    marginBottom: 8,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#2F6FE0",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
    backgroundColor: "#F7F9FE",
  },
  uploadButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#111827",
    marginBottom: 16,
  },
  checkboxGroupRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 16,
  },
  checkboxOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  checkboxLabel: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#374151",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  draftButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#2F6FE0",
    paddingVertical: 13,
  },
  draftButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  payButton: {
    flex: 1.3,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#2F6FE0",
    paddingVertical: 13,
  },
  payButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 6,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#4B5563",
  },
  emptyStateSubtext: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  draftCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  draftIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  draftTextWrap: {
    flex: 1,
  },
  draftFileName: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  draftSummary: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 2,
  },
  draftSavedAt: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  draftDeleteButton: {
    padding: 4,
  },
});
