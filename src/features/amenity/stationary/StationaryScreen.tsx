import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, FlatList, Platform, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import { File } from "expo-file-system";
import { PDFDocument } from "pdf-lib";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RazorpayCheckout from "react-native-razorpay";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { AnchoredDropdown } from "@/components/ui/dropdown";
import { AnimatedTabBar, TabTransitionView, useTabScrollMemory } from "@/components/ui/tabs";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { confirm } from "@/utils/confirm";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/services/api/client";
import {
  createStationaryOrder,
  verifyStationaryPayment,
  getMyStationaryRequests,
  type MyStationaryRequest,
} from "@/services/api/stationary.api";

type Tab = "request" | "draft" | "history";
type LoadStatus = "loading" | "success" | "error";

const PAPER_SIZES = ["A4", "A3", "A5", "Letter", "Legal"] as const;
const COLOR_MODES = ["Black & White", "Color"] as const;
const SIDES_OPTIONS = ["Single-sided", "Double-sided"] as const;
const ORIENTATIONS = ["Portrait", "Landscape"] as const;
const BINDINGS = ["No binding", "Spiral binding", "Calico binding"] as const;
const MIN_COPIES = 1;
const MAX_COPIES = 50;

type PaperSize = (typeof PAPER_SIZES)[number];
type ColorMode = (typeof COLOR_MODES)[number];
type Sides = (typeof SIDES_OPTIONS)[number];
type Orientation = (typeof ORIENTATIONS)[number];
type Binding = (typeof BINDINGS)[number];

type UploadedFile = {
  id: string;
  name: string;
  // null while a PDF's real page count is still being read (see
  // countPdfPages) - never a fabricated number in the meantime. For a
  // non-PDF file (DOC/DOCX), this is the user's own manually-entered count
  // (see isPdf below) since no accurate page count can be read client-side
  // without fully rendering the document.
  pages: number | null;
  // True only for a page count read from the file's own real PDF
  // structure (via pdf-lib) - false for a manually-entered DOC/DOCX count,
  // so the UI knows which files' page counts are still editable.
  isPdf: boolean;
  sizeLabel: string;
  // Always the real on-device file URI - every file in this list came from
  // a real DocumentPicker pick (see pickFiles), so "Preview" can always
  // open the real document.
  uri: string;
  mimeType: string;
};

type PrintSettings = {
  copies: number;
  paperSize: PaperSize;
  colorMode: ColorMode;
  sides: Sides;
  orientation: Orientation;
  binding: Binding;
};

// Every print setting except copies (a +/- stepper, not a dropdown).
type DropdownableField = Exclude<keyof PrintSettings, "copies">;

type StationaryDraft = {
  id: string;
  files: UploadedFile[];
  settings: PrintSettings;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_SETTINGS: PrintSettings = {
  copies: 1,
  paperSize: "A4",
  colorMode: "Black & White",
  sides: "Single-sided",
  orientation: "Portrait",
  binding: "No binding",
};

function formatBytes(bytes: number | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdfAsset(asset: { mimeType?: string | null; name: string }): boolean {
  return (asset.mimeType ?? "").includes("pdf") || asset.name.toLowerCase().endsWith(".pdf");
}

// Real page count, read from the file's own PDF structure (pdf-lib, pure
// JS, no native module) - `getPageCount()` walks the document's actual
// page tree, so this is never an estimate. `ignoreEncryption: true` lets a
// password-protected PDF's page count still be read even though its
// content can't be - the structure (and therefore the count) isn't
// encrypted the same way the content streams are.
async function countPdfPages(uri: string): Promise<number> {
  const bytes = await new File(uri).bytes();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return pdf.getPageCount();
}

const PRICE_PER_PAGE = 2;

// ₹2 per page, the only pricing rule - matches
// StationaryService.PRICE_PER_PAGE on the backend exactly, since the
// server recomputes and trusts only its own copy of this formula (never
// the client's) when creating the real Razorpay order.
function estimateCost(totalPages: number, copies: number): number {
  return totalPages * copies * PRICE_PER_PAGE;
}

function draftSummaryLine(draft: StationaryDraft): string {
  const totalPages = draft.files.reduce((sum, f) => sum + (f.pages ?? 0), 0);
  const copyLabel = `${draft.settings.copies} ${draft.settings.copies === 1 ? "copy" : "copies"}`;
  const colorShort = draft.settings.colorMode === "Black & White" ? "B&W" : "Color";
  return `${totalPages} pages · ${copyLabel} · ${colorShort} · ${draft.settings.paperSize}`;
}

function formatSavedAt(iso: string): string {
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  const isYesterday = date.toDateString() === new Date(Date.now() - 86400000).toDateString();
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `today, ${time}`;
  if (isYesterday) return "yesterday";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

const REQUEST_STATUS_LABEL: Record<MyStationaryRequest["status"], string> = {
  pending_payment: "Payment pending",
  paid: "Paid",
  processing: "Processing",
  ready_for_pickup: "Ready for pickup",
  completed: "Completed",
  rejected: "Rejected",
};

// Set by a Stationary-vendor account (see stationary-vendor.api.ts), never
// by this student-facing screen - just displayed here once the vendor
// moves a request along.
const REQUEST_STATUS_COLORS: Record<MyStationaryRequest["status"], { bg: string; text: string }> = {
  pending_payment: { bg: "#FEF3C7", text: "#B45309" },
  paid: { bg: "#DCFCE7", text: "#16A34A" },
  processing: { bg: "#DBEAFE", text: "#2563EB" },
  ready_for_pickup: { bg: "#EAF0FD", text: "#2F6FE0" },
  completed: { bg: "#DCFCE7", text: "#16A34A" },
  rejected: { bg: "#FEE2E2", text: "#DC2626" },
};

function requestSummaryLine(request: MyStationaryRequest): string {
  const copyLabel = `${request.copies} ${request.copies === 1 ? "copy" : "copies"}`;
  const colorShort = request.color_mode === "color" ? "Color" : "B&W";
  return `${request.total_pages} pages · ${copyLabel} · ${colorShort}${request.paper_size ? ` · ${request.paper_size}` : ""}`;
}

// Xerox/print-shop request form, reachable from the Amenity tab's
// "Stationary" tile. File upload is real (DocumentPicker, see pickFiles) -
// no starter mock catalogue anymore, every file/draft in this screen came
// from a real pick or a real previously-saved draft, and Preview always
// opens the actual on-device file. A PDF's page count is read for real from
// its own structure (countPdfPages, via pdf-lib) - never estimated, since
// the charge amount is derived directly from it. A DOC/DOCX file has no
// equivalent client-side parser available, so its page count is left for
// the user to enter themselves (see the manual pages stepper on its file
// card) rather than guessed. "Save and pay" is a real
// Razorpay order-then-verify flow against EOSbackend1's stationary module
// (see stationary.api.ts) - the amount is always server-computed from
// total_pages/copies, never trusted from the client. Drafts stay local-only
// (this device's AsyncStorage, namespaced per signed-in user id) - there is
// no backend concept of a draft, only of a submitted-and-paid request.
export function StationaryScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const storageKey = `stationary_drafts_v2_${user?.id ?? "guest"}`;

  const scrollMemory = useTabScrollMemory();

  const [tab, setTab] = useState<Tab>("request");
  const [drafts, setDrafts] = useState<StationaryDraft[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [history, setHistory] = useState<MyStationaryRequest[]>([]);
  const [historyStatus, setHistoryStatus] = useState<LoadStatus>("loading");

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [dropdownField, setDropdownField] = useState<DropdownableField | null>(null);
  // One <AnchoredDropdown> is shared by all 5 fields below (same as before,
  // just anchored instead of centered) - it needs to measure whichever
  // field's own trigger was actually tapped, so each field keeps its own
  // node here rather than all fighting over a single ref.
  const fieldAnchors = useRef<Partial<Record<DropdownableField, View | null>>>({});

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
        setDrafts(raw ? (JSON.parse(raw) as StationaryDraft[]) : []);
      })
      .catch(() => setDrafts([]))
      .finally(() => setLoaded(true));
  }, [storageKey]);

  const loadHistory = useCallback(() => {
    setHistoryStatus("loading");
    getMyStationaryRequests()
      .then((rows) => {
        setHistory(rows);
        setHistoryStatus("success");
      })
      .catch(() => setHistoryStatus("error"));
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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
    setFiles([]);
    setSettings(DEFAULT_SETTINGS);
    setEditingId(null);
  }

  async function pickFiles() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      multiple: true,
    });
    if (result.canceled || !result.assets?.length) return;

    const added: UploadedFile[] = result.assets.map((asset) => {
      const isPdf = isPdfAsset(asset);
      return {
        id: `${Date.now()}-${asset.name}`,
        name: asset.name,
        // PDFs: unknown until countPdfPages resolves below (null, not a
        // guess). DOC/DOCX: no client-side parser exists for these, so
        // start at a clearly-a-placeholder 1 and leave it for the user to
        // correct via the manual stepper on its file card.
        pages: isPdf ? null : 1,
        isPdf,
        sizeLabel: formatBytes(asset.size),
        uri: asset.uri,
        mimeType: asset.mimeType ?? "application/octet-stream",
      };
    });
    setFiles((prev) => [...prev, ...added]);

    for (const file of added) {
      if (!file.isPdf) continue;
      countPdfPages(file.uri)
        .then((pages) => {
          setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, pages } : f)));
        })
        .catch((error) => {
          console.error(`Couldn't read page count for ${file.name}:`, error);
          toast.error(`Couldn't read ${file.name}'s page count - enter it manually`);
          // Falls back to a manually-editable count rather than blocking
          // the file entirely - e.g. a corrupted or unusually-structured
          // PDF that pdf-lib can't parse.
          setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, pages: 1, isPdf: false } : f)));
        });
    }
  }

  function adjustManualPages(fileId: string, delta: number) {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId && !f.isPdf ? { ...f, pages: Math.max(1, (f.pages ?? 1) + delta) } : f)),
    );
  }

  // FLAG_GRANT_READ_URI_PERMISSION - the document-picker URI is a content://
  // grant scoped to this app, so the launched viewer activity needs its own
  // read grant on it or it'll fail to open the file.
  const FLAG_GRANT_READ_URI_PERMISSION = 1;

  async function handlePreviewPress(file: UploadedFile) {
    if (Platform.OS === "android") {
      // ACTION_VIEW launches the device's own viewer app directly for this
      // file - Android only shows an app-picker itself if more than one app
      // can open it, same as tapping the file from a Files app. This is a
      // more direct "just open it" experience than Sharing.shareAsync below,
      // which always opens the broader share/send sheet instead.
      try {
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: file.uri,
          type: file.mimeType,
          flags: FLAG_GRANT_READ_URI_PERMISSION,
        });
        return;
      } catch (error) {
        console.error("Couldn't open stationary file via intent, falling back to share sheet:", error);
        // Fall through to Sharing below - e.g. no viewer app installed for
        // this exact mime type, still worth letting the user pick one.
      }
    }

    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        toast.error("Previewing files isn't supported on this device.");
        return;
      }
      await Sharing.shareAsync(file.uri);
    } catch (error) {
      console.error("Couldn't preview stationary file:", error);
      toast.error("Couldn't open that file.");
    }
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  // While any PDF's real page count is still being read, its `pages` is
  // null - excluded from the running total (never counted as 0 pages) so
  // the estimate never flashes a wrong, too-low number mid-count.
  const countingAny = files.some((f) => f.pages === null);
  const totalPages = files.reduce((sum, f) => sum + (f.pages ?? 0), 0);
  const estimatedTotal = estimateCost(totalPages, settings.copies);

  async function handleSaveDraft() {
    if (files.length === 0) {
      toast.warning("Add at least one file first");
      return;
    }
    if (countingAny) {
      toast.warning("Still reading page counts - one moment");
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    const next = editingId
      ? drafts.map((d) => (d.id === editingId ? { ...d, files, settings, updatedAt: now } : d))
      : [{ id: `${Date.now()}`, files, settings, createdAt: now, updatedAt: now }, ...drafts];
    await persist(next);
    setSaving(false);
    toast.success("Saved to your drafts");
    resetForm();
    setTab("draft");
  }

  async function handleSaveAndPay() {
    if (files.length === 0) {
      toast.warning("Add at least one file to print");
      return;
    }
    if (countingAny) {
      toast.warning("Still reading page counts - one moment");
      return;
    }

    setSaving(true);
    // Real Razorpay order-then-verify flow, same shape as Pay Fees/wallet
    // top-up - see stationary.api.ts. The amount is always recomputed
    // server-side from total_pages/copies (see StationaryService), never
    // trusted from the client.
    try {
      const order = await createStationaryOrder({
        file_summary:
          files.length === 1 ? files[0].name : `${files.length} files (${totalPages} pages)`,
        total_pages: totalPages,
        copies: settings.copies,
        orientation: settings.orientation === "Portrait" ? "portrait" : "landscape",
        color_mode: settings.colorMode === "Color" ? "color" : "bw",
        paper_size: settings.paperSize,
        sides: settings.sides,
        binding: settings.binding,
      });

      const checkoutResult = await RazorpayCheckout.open({
        key: order.key_id,
        order_id: order.order_id,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: "EOS Stationery",
        description: `${settings.copies} ${settings.copies === 1 ? "copy" : "copies"} · ${totalPages} pages`,
        prefill: user?.email ? { email: user.email } : undefined,
        theme: { color: "#2F6FE0" },
      });

      await verifyStationaryPayment({
        razorpay_order_id: checkoutResult.razorpay_order_id,
        razorpay_payment_id: checkoutResult.razorpay_payment_id,
        razorpay_signature: checkoutResult.razorpay_signature,
      });

      if (editingId) {
        await persist(drafts.filter((d) => d.id !== editingId));
      }
      toast.success(`Payment successful - ₹${order.amount} paid`);
      resetForm();
      loadHistory();
      setTab("history");
    } catch (error: any) {
      // RazorpayCheckout's own cancel/failure rejection shape ({code,
      // description}) is distinct from our axios error shape - only the
      // latter has getApiErrorMessage's expected response.data.message.
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

  function resumeDraft(draft: StationaryDraft) {
    setFiles(draft.files);
    setSettings(draft.settings);
    setEditingId(draft.id);
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
    await persist(drafts.filter((d) => d.id !== id));
    if (editingId === id) resetForm();
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
        <Text style={styles.headerTitle}>Copy Center</Text>
      </LinearGradient>

      <View style={styles.tabSwitchWrap}>
        <AnimatedTabBar
          tabs={[
            { key: "request" as Tab, label: "Request" },
            { key: "draft" as Tab, label: `Draft ${drafts.length > 0 ? `(${drafts.length})` : ""}`.trimEnd() },
            { key: "history" as Tab, label: "History" },
          ]}
          active={tab}
          onChange={setTab}
          containerStyle={styles.tabSwitch}
          tabStyle={styles.tabButton}
          tabTextStyle={styles.tabButtonText}
          activeTabTextStyle={styles.tabButtonTextActive}
          indicatorStyle={styles.tabSwitchIndicator}
        />
      </View>

      <TabTransitionView activeKey={tab} order={["request", "draft", "history"]} style={styles.tabContent}>
        {tab === "request" ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} {...scrollMemory.bind("request")}>
          <>
            {editingId && (
              <View style={styles.editingBanner}>
                <Ionicons name="create-outline" size={14} color="#2F6FE0" />
                <Text style={styles.editingBannerText}>Editing a saved draft</Text>
                <TouchableOpacity onPress={resetForm} hitSlop={8}>
                  <Text style={styles.editingBannerClear}>Start new</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Upload files ────────────────────────────────────────── */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Upload files</Text>

              <TouchableOpacity style={styles.uploadArea} onPress={pickFiles} activeOpacity={0.8}>
                <Ionicons name="cloud-upload-outline" size={26} color="#2F6FE0" />
                <Text style={styles.uploadAreaText}>Tap to upload files</Text>
                <Text style={styles.uploadAreaSubtext}>PDF, DOC, DOCX · multiple files allowed</Text>
              </TouchableOpacity>

              {files.map((file) => (
                <View key={file.id} style={styles.fileCard}>
                  <View style={styles.fileIconWrap}>
                    <Ionicons name="document-text" size={18} color="#fff" />
                  </View>
                  <View style={styles.fileTextWrap}>
                    <Text style={styles.fileCardName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    {file.pages === null ? (
                      <View style={styles.countingRow}>
                        <ActivityIndicator size="small" color="#2F6FE0" />
                        <Text style={styles.fileCardMeta}>Counting pages…</Text>
                      </View>
                    ) : file.isPdf ? (
                      <Text style={styles.fileCardMeta}>
                        {file.pages} page{file.pages === 1 ? "" : "s"} · {file.sizeLabel}
                      </Text>
                    ) : (
                      <View style={styles.manualPagesRow}>
                        <Text style={styles.fileCardMeta}>{file.sizeLabel} · </Text>
                        <TouchableOpacity onPress={() => adjustManualPages(file.id, -1)} hitSlop={6}>
                          <Ionicons name="remove-circle-outline" size={16} color="#2F6FE0" />
                        </TouchableOpacity>
                        <Text style={styles.manualPagesValue}>
                          {file.pages} page{file.pages === 1 ? "" : "s"}
                        </Text>
                        <TouchableOpacity onPress={() => adjustManualPages(file.id, 1)} hitSlop={6}>
                          <Ionicons name="add-circle-outline" size={16} color="#2F6FE0" />
                        </TouchableOpacity>
                      </View>
                    )}
                    {!file.isPdf && file.pages !== null && (
                      <Text style={styles.manualPagesHint}>
                        Enter the real page count - can't be read automatically for this file type.
                      </Text>
                    )}
                    <TouchableOpacity onPress={() => void handlePreviewPress(file)} hitSlop={6}>
                      <Text style={styles.previewLink}>Preview</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => removeFile(file.id)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color="#B0B7C3" />
                  </TouchableOpacity>
                </View>
              ))}

              {files.length === 0 && <Text style={styles.noFilesText}>No files added yet.</Text>}
            </View>

            {/* ── Print settings ──────────────────────────────────────── */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Print settings</Text>

              <View style={styles.dropdownField}>
                <Text style={styles.fieldLabel}>Copies</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={[styles.stepperButton, settings.copies <= MIN_COPIES && styles.stepperButtonDisabled]}
                    onPress={() => setSettings((prev) => ({ ...prev, copies: Math.max(MIN_COPIES, prev.copies - 1) }))}
                    disabled={settings.copies <= MIN_COPIES}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="remove" size={16} color={settings.copies <= MIN_COPIES ? "#B0B7C3" : "#2F6FE0"} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{settings.copies}</Text>
                  <TouchableOpacity
                    style={[styles.stepperButton, settings.copies >= MAX_COPIES && styles.stepperButtonDisabled]}
                    onPress={() => setSettings((prev) => ({ ...prev, copies: Math.min(MAX_COPIES, prev.copies + 1) }))}
                    disabled={settings.copies >= MAX_COPIES}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color={settings.copies >= MAX_COPIES ? "#B0B7C3" : "#2F6FE0"} />
                  </TouchableOpacity>
                </View>
              </View>
              <DropdownField
                label="Paper size"
                value={settings.paperSize}
                onPress={() => setDropdownField("paperSize")}
                anchorRef={(node) => (fieldAnchors.current.paperSize = node)}
              />
              <DropdownField
                label="Color"
                value={settings.colorMode}
                onPress={() => setDropdownField("colorMode")}
                anchorRef={(node) => (fieldAnchors.current.colorMode = node)}
              />
              <DropdownField
                label="Sides"
                value={settings.sides}
                onPress={() => setDropdownField("sides")}
                anchorRef={(node) => (fieldAnchors.current.sides = node)}
              />
              <DropdownField
                label="Orientation"
                value={settings.orientation}
                onPress={() => setDropdownField("orientation")}
                anchorRef={(node) => (fieldAnchors.current.orientation = node)}
              />
              <DropdownField
                label="Binding"
                value={settings.binding}
                onPress={() => setDropdownField("binding")}
                anchorRef={(node) => (fieldAnchors.current.binding = node)}
                last
              />
            </View>

            {/* ── Estimated cost ──────────────────────────────────────── */}
            <View style={styles.costCard}>
              <View style={styles.costHeaderRow}>
                <Ionicons name="calculator-outline" size={16} color="#2F6FE0" />
                <Text style={styles.costHeaderText}>Estimated cost</Text>
              </View>
              <Text style={styles.costLine}>
                {countingAny ? "Counting pages…" : `${totalPages} pages`} × {settings.copies}{" "}
                {settings.copies === 1 ? "copy" : "copies"}
              </Text>
              <Text style={styles.costLine}>
                {settings.colorMode} · {settings.paperSize} · {settings.sides}
              </Text>
              <Text style={styles.costLine}>{settings.binding}</Text>

              <View style={styles.costTotalRow}>
                <Text style={styles.costTotalLabel}>Estimated total</Text>
                <Text style={styles.costTotalValue}>{countingAny ? "…" : `₹${estimatedTotal}`}</Text>
              </View>

              <Text style={styles.costDisclaimer}>
                Final amount may vary based on printing and binding requirements.
              </Text>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.draftButton, (saving || countingAny) && styles.actionButtonDisabled]}
                onPress={handleSaveDraft}
                activeOpacity={0.85}
                disabled={saving || countingAny}
              >
                <Text style={styles.draftButtonText}>Save as draft</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.payButton, (saving || countingAny) && styles.actionButtonDisabled]}
                onPress={handleSaveAndPay}
                activeOpacity={0.85}
                disabled={saving || countingAny}
              >
                <Text style={styles.payButtonText}>Save and pay</Text>
              </TouchableOpacity>
            </View>
          </>
          </ScrollView>
        ) : tab === "draft" ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} {...scrollMemory.bind("draft")}>
            {!loaded ? null : drafts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={32} color="#B0B7C3" />
                <Text style={styles.emptyStateText}>No drafts yet</Text>
                <Text style={styles.emptyStateSubtext}>Requests you save as a draft will show up here.</Text>
              </View>
            ) : (
              drafts.map((draft) => (
                <View key={draft.id} style={styles.draftCard}>
                  <View style={styles.draftTopRow}>
                    <View style={styles.draftIconWrap}>
                      <Ionicons name="document-text-outline" size={18} color="#2F6FE0" />
                    </View>
                    <View style={styles.draftTextWrap}>
                      <Text style={styles.draftFileName} numberOfLines={1}>
                        {draft.files[0]?.name.replace(/\.(pdf|docx?|)$/i, "") ?? "Untitled request"}
                      </Text>
                      <Text style={styles.draftSummary}>{draftSummaryLine(draft)}</Text>
                      <Text style={styles.draftBinding}>{draft.settings.binding}</Text>
                      <Text style={styles.draftSavedAt}>Saved {formatSavedAt(draft.updatedAt)}</Text>
                    </View>
                  </View>
                  <View style={styles.draftActionsRow}>
                    <TouchableOpacity style={styles.draftActionButton} onPress={() => resumeDraft(draft)} activeOpacity={0.8}>
                      <Ionicons name="create-outline" size={14} color="#2F6FE0" />
                      <Text style={styles.draftActionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.draftActionButton}
                      onPress={() => deleteDraft(draft.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      <Text style={[styles.draftActionText, styles.draftActionTextDanger]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} {...scrollMemory.bind("history")}>
            {historyStatus === "loading" && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateSubtext}>Loading your requests…</Text>
              </View>
            )}

            {historyStatus === "error" && (
              <View style={styles.emptyState}>
                <Ionicons name="alert-circle-outline" size={28} color="#DC2626" />
                <Text style={styles.emptyStateText}>Couldn't load your requests</Text>
                <TouchableOpacity onPress={loadHistory} style={styles.retryButton} activeOpacity={0.8}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {historyStatus === "success" && history.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={32} color="#B0B7C3" />
                <Text style={styles.emptyStateText}>No requests yet</Text>
                <Text style={styles.emptyStateSubtext}>Requests you pay for will show up here.</Text>
              </View>
            )}

            {historyStatus === "success" &&
              history.map((request) => (
                <View key={request.id} style={styles.draftCard}>
                  <View style={styles.draftTopRow}>
                    <View style={styles.draftIconWrap}>
                      <Ionicons name="document-text-outline" size={18} color="#2F6FE0" />
                    </View>
                    <View style={styles.draftTextWrap}>
                      <View style={styles.historyTopRow}>
                        <Text style={styles.draftFileName} numberOfLines={1}>
                          {request.file_summary ?? "Untitled request"}
                        </Text>
                        <View
                          style={[
                            styles.historyStatusBadge,
                            { backgroundColor: REQUEST_STATUS_COLORS[request.status].bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.historyStatusText,
                              { color: REQUEST_STATUS_COLORS[request.status].text },
                            ]}
                          >
                            {REQUEST_STATUS_LABEL[request.status]}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.draftSummary}>{requestSummaryLine(request)}</Text>
                      {request.binding && <Text style={styles.draftBinding}>{request.binding}</Text>}
                      {request.status === "rejected" && request.rejection_reason && (
                        <Text style={styles.rejectionReasonText}>Reason: {request.rejection_reason}</Text>
                      )}
                      <Text style={styles.draftSavedAt}>
                        ₹{request.amount} · {formatSavedAt(request.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
          </ScrollView>
        )}
      </TabTransitionView>

      {/* Dropdown option picker - one shared instance, anchored under
          whichever field above was tapped (see fieldAnchors). */}
      <AnchoredDropdown
        anchorRef={{ current: dropdownField ? fieldAnchors.current[dropdownField] ?? null : null }}
        visible={dropdownField !== null}
        onClose={() => setDropdownField(null)}
        contentStyle={styles.dropdownModalCard}
      >
        <Text style={styles.dropdownModalTitle}>{dropdownField ? FIELD_LABEL[dropdownField] : ""}</Text>
        <FlatList
          data={dropdownField ? FIELD_OPTIONS[dropdownField] : []}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.dropdownOptionRow}
              activeOpacity={0.8}
              onPress={() => {
                if (dropdownField) {
                  setSettings((prev) => ({ ...prev, [dropdownField]: item }));
                }
                setDropdownField(null);
              }}
            >
              <Text style={styles.dropdownOptionText}>{item}</Text>
              {dropdownField && settings[dropdownField] === item && (
                <Ionicons name="checkmark" size={18} color="#2F6FE0" />
              )}
            </TouchableOpacity>
          )}
        />
      </AnchoredDropdown>
    </SafeAreaView>
  );
}

const FIELD_LABEL: Record<DropdownableField, string> = {
  paperSize: "Paper size",
  colorMode: "Color",
  sides: "Sides",
  orientation: "Orientation",
  binding: "Binding",
};

const FIELD_OPTIONS: Record<DropdownableField, readonly string[]> = {
  paperSize: PAPER_SIZES,
  colorMode: COLOR_MODES,
  sides: SIDES_OPTIONS,
  orientation: ORIENTATIONS,
  binding: BINDINGS,
};

function DropdownField({
  label,
  value,
  onPress,
  anchorRef,
  last,
}: {
  label: string;
  value: string;
  onPress: () => void;
  anchorRef: (node: View | null) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.dropdownField, last && styles.dropdownFieldLast]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View ref={anchorRef} collapsable={false}>
        <TouchableOpacity style={styles.dropdownButton} onPress={onPress} activeOpacity={0.8}>
          <Text style={styles.dropdownButtonText}>{value}</Text>
          <Ionicons name="chevron-down" size={16} color="#2F6FE0" />
        </TouchableOpacity>
      </View>
    </View>
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
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  tabContent: {
    flex: 1,
  },
  tabSwitchWrap: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  tabSwitch: {
    flexDirection: "row",
    backgroundColor: "#fff",
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
  tabSwitchIndicator: {
    top: 0,
    bottom: 0,
    borderRadius: 9,
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  editingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EAF0FD",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
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

  // Upload area
  uploadArea: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: "#2F6FE0",
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 22,
    backgroundColor: "#F7F9FE",
    marginBottom: 14,
  },
  uploadAreaText: {
    fontSize: 13.5,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 4,
  },
  uploadAreaSubtext: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
  },
  noFilesText: {
    fontSize: 12.5,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
    paddingVertical: 4,
  },

  // File card
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  fileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#2F6FE0",
    alignItems: "center",
    justifyContent: "center",
  },
  fileTextWrap: {
    flex: 1,
    gap: 2,
  },
  fileCardName: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  fileCardMeta: {
    fontSize: 11.5,
    fontFamily: fonts.regular,
    color: "#6B7280",
  },
  countingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  manualPagesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  manualPagesValue: {
    fontSize: 11.5,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  manualPagesHint: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: "#B0B7C3",
    marginTop: 2,
  },
  previewLink: {
    fontSize: 11.5,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 2,
  },

  // Print settings dropdowns
  dropdownField: {
    marginBottom: 14,
  },
  dropdownFieldLast: {
    marginBottom: 0,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#374151",
    marginBottom: 6,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownButtonText: {
    fontSize: 13.5,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonDisabled: {
    backgroundColor: "#F1F3F6",
  },
  stepperValue: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },

  // Estimated cost card
  costCard: {
    backgroundColor: "#EAF0FD",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D6E2FA",
    padding: 16,
    marginBottom: 16,
  },
  costHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  costHeaderText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  costLine: {
    fontSize: 12.5,
    fontFamily: fonts.medium,
    color: "#374151",
    marginTop: 2,
  },
  costTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#D6E2FA",
  },
  costTotalLabel: {
    fontSize: 13.5,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  costTotalValue: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  costDisclaimer: {
    fontSize: 10.5,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 8,
    lineHeight: 15,
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

  // Draft cards
  draftCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 12,
  },
  draftTopRow: {
    flexDirection: "row",
    gap: 12,
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
    marginTop: 3,
  },
  draftBinding: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 1,
  },
  draftSavedAt: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 4,
  },
  draftActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  draftActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  draftActionText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  draftActionTextDanger: {
    color: "#DC2626",
  },

  // History (real requests)
  retryButton: {
    marginTop: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2F6FE0",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  retryButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  historyTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  historyStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  historyStatusBadgePaid: {
    backgroundColor: "#DCFCE7",
  },
  historyStatusBadgePending: {
    backgroundColor: "#FEF3C7",
  },
  historyStatusText: {
    fontSize: 10.5,
    fontFamily: fonts.bold,
  },
  historyStatusTextPaid: {
    color: "#16A34A",
  },
  historyStatusTextPending: {
    color: "#B45309",
  },

  // Dropdown
  dropdownModalCard: {
    width: 260,
    maxHeight: 320,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    elevation: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  dropdownModalTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 10,
  },
  dropdownOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  dropdownOptionText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: "#111827",
  },
});
