import { useCallback, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { getMyIdCard, issueMyIdCard, type MyIdCard } from "@/services/api/profile.api";
import { FlippableIdCard } from "./FlippableIdCard";
import { buildIdCardHtml, PAGE_HEIGHT, PAGE_WIDTH } from "./idCardHtml";

let cachedLogoDataUri: string | null = null;

async function getLogoDataUri(): Promise<string> {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  const asset = Asset.fromModule(require("../../../../assets/logo.png"));
  await asset.downloadAsync();
  const file = new File(asset.localUri ?? asset.uri);
  const base64 = await file.base64();
  cachedLogoDataUri = `data:image/png;base64,${base64}`;
  return cachedLogoDataUri;
}

export function IdCardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [card, setCard] = useState<MyIdCard | null>(null);
  const [downloading, setDownloading] = useState(false);
  const hasLoaded = useRef(false);

  // One tap on "Digital ID Card" from Profile lands here and immediately
  // generates the card - no separate "Generate" step. getMyIdCard() and
  // issueMyIdCard() run together: the former is the actual data, the
  // latter just records the audit row (see ProfileService.issueIdCard) -
  // failing to record the audit row shouldn't block showing the card, so
  // only the data fetch gates the UI.
  const load = useCallback(() => {
    setStatus("loading");
    issueMyIdCard().catch(() => {});
    getMyIdCard()
      .then((data) => {
        setCard(data);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, []);

  // Fetch once per screen visit (it rarely changes mid-session) rather
  // than on every focus - real-time enough without re-querying the DB
  // every time the user comes back to this screen.
  useFocusEffect(
    useCallback(() => {
      if (!hasLoaded.current) {
        hasLoaded.current = true;
        load();
      }
    }, [load]),
  );

  async function handleDownload() {
    if (!card) return;
    setDownloading(true);
    try {
      const logoDataUri = await getLogoDataUri();
      const html = buildIdCardHtml(card, logoDataUri);
      const { uri } = await Print.printToFileAsync({ html, width: PAGE_WIDTH, height: PAGE_HEIGHT });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Save your ID card",
          UTI: "com.adobe.pdf",
        });
      } else {
        toast.success("ID card saved to " + uri);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't generate the PDF."));
    } finally {
      setDownloading(false);
    }
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
        <Text style={styles.headerTitle}>Digital ID Card</Text>
      </LinearGradient>

      {status === "loading" && (
        <View style={styles.centerFill}>
          <ActivityIndicator color="#2F6FE0" size="large" />
          <Text style={styles.errorText}>Generating your ID card…</Text>
        </View>
      )}

      {status === "error" && (
        <View style={styles.centerFill}>
          <Ionicons name="cloud-offline-outline" size={40} color="#B0B7C3" />
          <Text style={styles.errorText}>Couldn't load your details.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "success" && card && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.previewWrap}>
            <FlippableIdCard card={card} />
            <View style={styles.flipHintRow}>
              <Ionicons name="sync-outline" size={13} color="#9AA6B2" />
              <Text style={styles.flipHintText}>Tap the card to flip sides</Text>
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleDownload}
              activeOpacity={0.85}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>Download PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
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
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  previewWrap: {
    alignItems: "center",
    gap: 14,
  },
  flipHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  flipHintText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#2F6FE0",
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 28,
    elevation: 3,
    shadowColor: "#2F6FE0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    minWidth: 220,
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
});
