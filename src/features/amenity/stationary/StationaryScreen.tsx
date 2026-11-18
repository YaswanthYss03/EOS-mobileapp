import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Vibration } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { confirm } from "@/utils/confirm";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/services/api/client";
import { getWallet } from "@/services/api/wallet.api";
import { SetPinModal } from "@/features/erp/wallet/SetPinModal";
import { WalletPaySheet } from "@/features/amenity/stationary/WalletPaySheet";
import {
  BINDINGS,
  PAPER_SIZES,
  PRICE_PER_PAGE,
  SIDES,
  apiErrorCode,
  createStationaryRequest,
  listMyStationaryRequests,
  payStationaryRequestWithWallet,
  uploadStationaryFile,
  type MyStationaryRequest,
  type StationaryBinding,
  type StationaryPaperSize,
  type StationarySides,
} from "@/services/api/stationary.api";

type Tab = "request" | "draft" | "history";
type Orientation = "portrait" | "landscape";
type ColorMode = "color" | "bw";

// Only ever a draft-in-progress - a request that's actually gone to
// checkout is submitted straight to the backend (see handleSaveAndPay) and
// is no longer this device's problem to track, same reasoning
// stationary_requests only ever gets a row once payment starts.
type StationaryDraft = {
  id: string;
  fileName: string | null;
  fileUri: string | null;
  fileMimeType: string | null;
  /** How many pages the document has: the price is per printed page (pages x copies). */
  totalPages: string;
  copies: string;
  orientation: Orientation | null;
  colorMode: ColorMode | null;
  paperSize: StationaryPaperSize | null;
  sides: StationarySides | null;
  binding: StationaryBinding | null;
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
    totalPages: "",
    copies: "",
    orientation: null,
    colorMode: null,
    paperSize: null,
    sides: null,
    binding: null,
  };
}

/** Drafts saved before the form asked for pages, paper size, sides and binding have none of them yet. */
function normaliseDraft(raw: Partial<StationaryDraft> & { id: string }): StationaryDraft {
  return {
    ...emptyForm(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...raw,
    totalPages: raw.totalPages ?? "",
    paperSize: raw.paperSize ?? null,
    sides: raw.sides ?? null,
    binding: raw.binding ?? null,
  };
}

const STATUS_TEXT: Record<MyStationaryRequest["status"], string> = {
  pending_payment: "Awaiting payment",
  paid: "Sent to the print shop",
  processing: "Being printed",
  ready_for_pickup: "Ready for pickup",
  completed: "Completed",
  rejected: "Rejected",
};

function summaryLine(item: StationaryDraft): string {
  const parts: string[] = [];
  if (item.totalPages) parts.push(`${item.totalPages} ${Number(item.totalPages) === 1 ? "page" : "pages"}`);
  if (item.copies) parts.push(`${item.copies} ${Number(item.copies) === 1 ? "copy" : "copies"}`);
  if (item.paperSize) parts.push(item.paperSize);
  if (item.orientation) parts.push(item.orientation === "portrait" ? "Portrait" : "Landscape");
  if (item.colorMode) parts.push(item.colorMode === "color" ? "Color" : "Black & white");
  if (item.sides) parts.push(item.sides);
  if (item.binding && item.binding !== "No binding") parts.push(item.binding);
  return parts.length > 0 ? parts.join(" · ") : "No details yet";
}

/** What the request should cost: printed pages x the per-page rate. The server works out the real price. */
function estimateAmount(totalPages: string, copies: string): number | null {
  const pages = Number(totalPages);
  const count = Number(copies);
  return pages >= 1 && count >= 1 ? pages * count * PRICE_PER_PAGE : null;
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
// concept of a draft, only of a submitted request (see
// EOSbackend1/src/modules/stationary/stationary.service.ts). "Save and
// pay" pays from the requester's own wallet, after they enter their wallet
// PIN - see @/services/api/stationary.api.ts.
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
  // Paying from the wallet: the PIN sheet, and the wallet PIN set-up when there is none yet.
  const [payOpen, setPayOpen] = useState(false);
  const [setPinOpen, setSetPinOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [pinAttempt, setPinAttempt] = useState(0);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  // A request that has been saved but not paid yet (a wrong PIN, a closed sheet): the next try pays that one
  // rather than saving another, unless the form has been changed since.
  const pendingRef = useRef<{ id: number; signature: string; fileAttached: boolean } | null>(null);
  const [history, setHistory] = useState<MyStationaryRequest[] | null>(null);
  const [historyFailed, setHistoryFailed] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await listMyStationaryRequests());
      setHistoryFailed(false);
    } catch {
      setHistoryFailed(true);
    }
  }, []);

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
        if (raw) setDrafts((JSON.parse(raw) as Array<Partial<StationaryDraft> & { id: string }>).map(normaliseDraft));
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

  function togglePaperSize(value: StationaryPaperSize) {
    setForm((prev) => ({ ...prev, paperSize: prev.paperSize === value ? null : value }));
  }

  function toggleSides(value: StationarySides) {
    setForm((prev) => ({ ...prev, sides: prev.sides === value ? null : value }));
  }

  function toggleBinding(value: StationaryBinding) {
    setForm((prev) => ({ ...prev, binding: prev.binding === value ? null : value }));
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
    if (!form.totalPages.trim() || Number(form.totalPages) < 1) {
      toast.warning("Enter how many pages the document has");
      return;
    }
    if (!form.paperSize) {
      toast.warning("Choose the paper size");
      return;
    }
    if (!form.sides) {
      toast.warning("Choose single-sided or double-sided");
      return;
    }
    if (!form.binding) {
      toast.warning("Choose a binding, or no binding");
      return;
    }

    // Pay from the wallet: first look at the wallet (is there a PIN, is there enough in it), then ask for the PIN.
    setSaving(true);
    try {
      const wallet = await getWallet();
      if (!wallet.pin_set) {
        toast.warning("Set up your wallet PIN first");
        setSetPinOpen(true);
        return;
      }
      setWalletBalance(wallet.balance);
      setPin("");
      setPayError(null);
      setPayOpen(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't open your wallet. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  /** What makes one request different from another: change any of it and an unpaid saved request no longer matches. */
  function formSignature(): string {
    return JSON.stringify([form.fileName, form.fileUri, form.totalPages, form.copies, form.orientation, form.colorMode, form.paperSize, form.sides, form.binding]);
  }

  // The PIN pad calls this as the fourth digit is typed. The server alone checks the PIN and the balance. The
  // document goes to the print shop BEFORE the money is taken, so a request that is paid for always has its
  // file; if the upload fails nothing has been charged.
  async function handlePinComplete(enteredPin: string) {
    if (paying || !form.fileName || !form.orientation || !form.colorMode || !form.paperSize || !form.sides || !form.binding) return;
    setPaying(true);
    setPayError(null);
    try {
      const signature = formSignature();
      if (pendingRef.current?.signature !== signature) pendingRef.current = null;
      if (!pendingRef.current) {
        const created = await createStationaryRequest({
          file_summary: form.fileName.slice(0, 255),
          total_pages: Number(form.totalPages),
          copies: Number(form.copies),
          orientation: form.orientation,
          color_mode: form.colorMode,
          paper_size: form.paperSize,
          sides: form.sides,
          binding: form.binding,
        });
        pendingRef.current = { id: created.request_id, signature, fileAttached: false };
      }
      const pending = pendingRef.current;

      if (form.fileUri && !pending.fileAttached) {
        try {
          await uploadStationaryFile(pending.id, { uri: form.fileUri, name: form.fileName, mimeType: form.fileMimeType });
          pending.fileAttached = true;
        } catch (uploadError) {
          console.warn("Stationary file upload failed:", uploadError);
          setPayOpen(false);
          toast.error(getApiErrorMessage(uploadError, "Could not send your file to the print shop. You have not been charged - please try again."));
          return;
        }
      }

      const result = await payStationaryRequestWithWallet(pending.id, enteredPin);
      pendingRef.current = null;
      setPayOpen(false);
      // Paid requests live on the backend now, not this device's draft
      // list - if this was resumed from a draft, that draft is done with.
      if (editingId) {
        await persist(drafts.filter((r) => r.id !== editingId));
      }
      toast.success(`₹${result.amount.toLocaleString("en-IN")} paid from your wallet`);
      resetForm();
      void loadHistory();
      setTab("history");
    } catch (error) {
      const code = apiErrorCode(error);
      setPin("");
      if (code === "WRONG_PIN") {
        // Expected, and not worth a red error screen: say so plainly and let them try again.
        Vibration.vibrate(150);
        setPayError("Wrong PIN, try again.");
        setPinAttempt((n) => n + 1);
      } else if (code === "PIN_LOCKED") {
        setPayError(getApiErrorMessage(error, "Too many incorrect PIN attempts. Please try again later."));
        setPinAttempt((n) => n + 1);
      } else if (code === "INSUFFICIENT_BALANCE") {
        // Show what the wallet really holds, with the way to top it up. The saved request is kept for the next try.
        setPayError(null);
        getWallet()
          .then((w) => {
            setWalletBalance(w.balance);
            if (w.balance >= (estimateAmount(form.totalPages, form.copies) ?? 0)) setPayError("Your wallet balance has changed. Please try again.");
          })
          .catch(() => setWalletBalance(0));
      } else if (code === "PIN_NOT_SET") {
        setPayOpen(false);
        toast.warning("Set up your wallet PIN first");
        setSetPinOpen(true);
      } else if (code === "INVALID_WORKFLOW_STATE") {
        // Already paid (for example the answer to an earlier try was lost on the way back).
        pendingRef.current = null;
        setPayOpen(false);
        toast.info("This request has already been paid. You can follow it under My requests.");
        resetForm();
        void loadHistory();
        setTab("history");
      } else {
        console.warn("Stationary wallet payment failed:", error);
        setPayError(getApiErrorMessage(error, "The payment didn't go through. You have not been charged."));
        setPinAttempt((n) => n + 1);
      }
    } finally {
      setPaying(false);
    }
  }

  function resumeDraft(item: StationaryDraft) {
    setForm({
      fileName: item.fileName,
      fileUri: item.fileUri,
      fileMimeType: item.fileMimeType,
      totalPages: item.totalPages,
      copies: item.copies,
      orientation: item.orientation,
      colorMode: item.colorMode,
      paperSize: item.paperSize,
      sides: item.sides,
      binding: item.binding,
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
        <TouchableOpacity
          style={[styles.tabButton, tab === "history" && styles.tabButtonActive]}
          onPress={() => {
            setTab("history");
            void loadHistory();
          }}
        >
          <Text style={[styles.tabButtonText, tab === "history" && styles.tabButtonTextActive]}>My requests</Text>
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

            <Text style={styles.fieldLabel}>Pages in the document</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 12"
              placeholderTextColor="#9AA6B2"
              keyboardType="number-pad"
              value={form.totalPages}
              onChangeText={(text) => setForm((prev) => ({ ...prev, totalPages: text.replace(/[^0-9]/g, "") }))}
            />

            <Text style={styles.fieldLabel}>Copies</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2"
              placeholderTextColor="#9AA6B2"
              keyboardType="number-pad"
              value={form.copies}
              onChangeText={(text) => setForm((prev) => ({ ...prev, copies: text.replace(/[^0-9]/g, "") }))}
            />

            <Text style={styles.fieldLabel}>Paper size</Text>
            <View style={styles.checkboxGroupWrap}>
              {PAPER_SIZES.map((size) => (
                <CheckboxOption key={size} label={size} checked={form.paperSize === size} onPress={() => togglePaperSize(size)} />
              ))}
            </View>

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

            <Text style={styles.fieldLabel}>Sides</Text>
            <View style={styles.checkboxGroupWrap}>
              {SIDES.map((value) => (
                <CheckboxOption key={value} label={value} checked={form.sides === value} onPress={() => toggleSides(value)} />
              ))}
            </View>

            <Text style={styles.fieldLabel}>Binding</Text>
            <View style={styles.checkboxGroupWrap}>
              {BINDINGS.map((value) => (
                <CheckboxOption key={value} label={value} checked={form.binding === value} onPress={() => toggleBinding(value)} />
              ))}
            </View>

            {estimateAmount(form.totalPages, form.copies) !== null ? (
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>
                  {Number(form.totalPages) * Number(form.copies)} printed pages x ₹{PRICE_PER_PAGE}
                </Text>
                <Text style={styles.estimateValue}>₹{estimateAmount(form.totalPages, form.copies)}</Text>
              </View>
            ) : null}

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
        ) : tab === "history" ? (
          <HistoryList items={history} failed={historyFailed} onRetry={loadHistory} />
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

      <WalletPaySheet
        visible={payOpen}
        amount={estimateAmount(form.totalPages, form.copies) ?? 0}
        balance={walletBalance}
        pin={pin}
        onPinChange={setPin}
        attempt={pinAttempt}
        paying={paying}
        error={payError}
        onPinComplete={handlePinComplete}
        onCancel={() => setPayOpen(false)}
        onAddMoney={() => {
          setPayOpen(false);
          router.push("/wallet" as never);
        }}
      />
      <SetPinModal
        visible={setPinOpen}
        onClose={() => setSetPinOpen(false)}
        onDone={() => {
          setSetPinOpen(false);
          void handleSaveAndPay();
        }}
      />
    </SafeAreaView>
  );
}

function HistoryList({ items, failed, onRetry }: { items: MyStationaryRequest[] | null; failed: boolean; onRetry: () => void }) {
  if (failed && !items) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="cloud-offline-outline" size={32} color="#B0B7C3" />
        <Text style={styles.emptyStateText}>Could not load your requests</Text>
        <TouchableOpacity onPress={onRetry} hitSlop={8}>
          <Text style={styles.editingBannerClear}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!items) return null;
  if (items.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="print-outline" size={32} color="#B0B7C3" />
        <Text style={styles.emptyStateText}>No requests yet</Text>
        <Text style={styles.emptyStateSubtext}>Requests you pay for will show up here with their progress.</Text>
      </View>
    );
  }
  return (
    <>
      {items.map((item) => {
        const ready = item.status === "ready_for_pickup";
        return (
          <View key={item.id} style={styles.draftCard}>
            <View style={styles.draftTextWrap}>
              <Text style={styles.draftFileName} numberOfLines={1}>
                {item.file_summary ?? `Request #${item.id}`}
              </Text>
              <Text style={styles.draftSummary} numberOfLines={2}>
                {[
                  item.total_pages ? `${item.total_pages} pages` : null,
                  `${item.copies} ${item.copies === 1 ? "copy" : "copies"}`,
                  item.paper_size,
                  item.color_mode === "color" ? "Color" : "Black & white",
                  item.sides,
                  item.binding && item.binding !== "No binding" ? item.binding : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <Text style={[styles.statusText, ready && styles.statusTextReady, item.status === "rejected" && styles.statusTextRejected]}>
                {STATUS_TEXT[item.status]} · ₹{item.amount}
                {item.payment_mode === "wallet" ? (item.status === "rejected" ? " · refunded to your wallet" : item.status === "pending_payment" ? "" : " · paid from wallet") : ""}
              </Text>
              {item.status === "rejected" && item.rejection_reason ? <Text style={styles.draftSavedAt}>{item.rejection_reason}</Text> : null}
              <Text style={styles.draftSavedAt}>Requested {formatSavedAt(item.created_at)}</Text>
            </View>
          </View>
        );
      })}
    </>
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
  checkboxGroupWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 18,
    rowGap: 12,
    marginBottom: 16,
  },
  estimateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F1F6FE",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  estimateLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#374151",
  },
  estimateValue: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#1E3A8A",
  },
  statusText: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#374151",
    marginTop: 4,
  },
  statusTextReady: {
    color: "#15803D",
  },
  statusTextRejected: {
    color: "#DC2626",
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
