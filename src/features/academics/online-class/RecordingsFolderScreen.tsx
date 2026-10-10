import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { getApiErrorMessage } from "@/services/api/client";
import { useRole } from "@/hooks/useRole";
import { getSubjectRecordings, type ClassRecording } from "@/services/api/online-class.api";
import { formatBytes, formatRecordedAt, formatRecordedTime } from "./recording-format";

// One subject's class recordings (a "folder" from the Recordings tab),
// newest first. Tapping one opens RecordingPlayerScreen.
export function RecordingsFolderScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const role = useRole();
  const basePath = role === "employee" || role === "hod" ? "/(tabs)/erp/online-class" : "/(tabs)/academics/online-class";
  const params = useLocalSearchParams<{ subjectId?: string; subjectName?: string }>();
  const subjectId = Number(params.subjectId);

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [subjectName, setSubjectName] = useState(params.subjectName ?? "Recordings");
  const [recordings, setRecordings] = useState<ClassRecording[]>([]);

  const load = useCallback(
    (isRefresh = false) => {
      if (!Number.isFinite(subjectId)) {
        setStatus("error");
        setError("This folder couldn't be opened.");
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setStatus("loading");
      getSubjectRecordings(subjectId)
        .then((res) => {
          setSubjectName(res.subject_name);
          setRecordings(res.recordings);
          setStatus("success");
        })
        .catch((err) => {
          setError(getApiErrorMessage(err, "Couldn't load recordings."));
          setStatus("error");
        })
        .finally(() => setRefreshing(false));
    },
    [subjectId],
  );

  // Same hidden-header flow as the rest of Online class (see
  // OnlineClassScreen) - hide on focus, never restore here.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      load();
    }, [navigation, load]),
  );

  function openRecording(recording: ClassRecording) {
    router.push({
      pathname: `${basePath}/recordings/player`,
      params: { subjectId: String(subjectId), file: recording.file },
    } as never);
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {subjectName}
          </Text>
          <Text style={styles.headerSubtitle}>
            {status === "success" ? `${recordings.length} ${recordings.length === 1 ? "recording" : "recordings"}` : "Class recordings"}
          </Text>
        </View>
      </LinearGradient>

      {status === "loading" ? (
        <SkeletonListRows count={4} style={styles.list} />
      ) : status === "error" ? (
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={30} color="#B0B7C3" />
          <Text style={styles.centerText}>{error}</Text>
          <TouchableOpacity onPress={() => load()} style={styles.retryButton} activeOpacity={0.85}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={recordings}
          keyExtractor={(r) => r.file}
          contentContainerStyle={[styles.list, recordings.length === 0 && styles.listEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#2F6FE0" />}
          renderItem={({ item }) => <RecordingRow recording={item} onPress={() => openRecording(item)} />}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Ionicons name="videocam-outline" size={30} color="#B0B7C3" />
              <Text style={styles.centerText}>No recordings in this subject yet.</Text>
              <Text style={styles.centerHint}>Online classes you run for this subject will appear here after they end.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function RecordingRow({ recording, onPress }: { recording: ClassRecording; onPress: () => void }) {
  const size = formatBytes(recording.size_bytes);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <LinearGradient colors={["#1E293B", "#0F172A"]} style={styles.thumb}>
        <View style={styles.thumbPlay}>
          <Ionicons name="play" size={16} color="#fff" />
        </View>
      </LinearGradient>
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {recording.title}
        </Text>
        {recording.sections.length > 0 && (
          <Text style={styles.rowMeta} numberOfLines={1}>
            Section {recording.sections.join(", ")}
          </Text>
        )}
        <Text style={styles.rowMeta} numberOfLines={1}>
          {formatRecordedAt(recording.recorded_at)} · {formatRecordedTime(recording.recorded_at)}
          {size ? ` · ${size}` : ""}
        </Text>
      </View>
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
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
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
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 10,
    marginBottom: 10,
  },
  thumb: {
    width: 128,
    aspectRatio: 16 / 9,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbPlay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTextWrap: {
    flex: 1,
    justifyContent: "center",
    gap: 3,
  },
  rowTitle: {
    fontSize: 13.5,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  rowMeta: {
    fontSize: 11.5,
    fontFamily: fonts.regular,
    color: "#6B7280",
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  centerText: {
    fontSize: 13.5,
    fontFamily: fonts.semibold,
    color: "#6B7280",
    textAlign: "center",
  },
  centerHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#2F6FE0",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 9,
    marginTop: 4,
  },
  retryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#fff",
  },
});
