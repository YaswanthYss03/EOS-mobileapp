import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Video, ResizeMode, type AVPlaybackStatus } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getRecordingPlaybackUrl,
  getSubjectRecordings,
  type ClassRecording,
} from "@/services/api/online-class.api";
import { formatBytes, formatDurationMillis, formatRecordedAt, formatRecordedTime } from "./recording-format";

// YouTube-style recording player: 16:9 video on top (native controls +
// full-screen), the recording's details under it, then "Up next" - the
// other recordings in the same subject folder. Picking one plays it in
// place. Playback uses a short-lived signed URL from the backend (the
// storage bucket itself is private).
export function RecordingPlayerScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ subjectId?: string; file?: string }>();
  const subjectId = Number(params.subjectId);

  const videoRef = useRef<Video>(null);
  const listRef = useRef<FlatList<ClassRecording>>(null);
  const [subjectName, setSubjectName] = useState("");
  const [recordings, setRecordings] = useState<ClassRecording[]>([]);
  const [currentFile, setCurrentFile] = useState(params.file ?? "");
  const [uri, setUri] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [buffering, setBuffering] = useState(false);
  const [durationMs, setDurationMs] = useState<number | undefined>(undefined);
  const urlRequest = useRef(0);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
    }, [navigation]),
  );

  // The folder's recordings, for the details and "Up next".
  useEffect(() => {
    if (!Number.isFinite(subjectId)) return;
    getSubjectRecordings(subjectId)
      .then((res) => {
        setSubjectName(res.subject_name);
        setRecordings(res.recordings);
      })
      .catch(() => {
        // The video can still play; "Up next" just stays empty.
      });
  }, [subjectId]);

  const loadUrl = useCallback(
    (file: string) => {
      const seq = ++urlRequest.current;
      setLoadingUrl(true);
      setPlaybackError(null);
      setUri(null);
      setDurationMs(undefined);
      getRecordingPlaybackUrl(subjectId, file)
        .then((url) => {
          if (seq === urlRequest.current) setUri(url);
        })
        .catch((err) => {
          if (seq === urlRequest.current) setPlaybackError(getApiErrorMessage(err, "Couldn't open this recording."));
        })
        .finally(() => {
          if (seq === urlRequest.current) setLoadingUrl(false);
        });
    },
    [subjectId],
  );

  useEffect(() => {
    if (currentFile && Number.isFinite(subjectId)) loadUrl(currentFile);
    else {
      setLoadingUrl(false);
      setPlaybackError("This recording couldn't be opened.");
    }
  }, [currentFile, subjectId, loadUrl]);

  function onStatus(status: AVPlaybackStatus) {
    if (!status.isLoaded) {
      if (status.error) setPlaybackError("This recording couldn't be played. Please try again.");
      return;
    }
    setBuffering(status.isBuffering && !status.isPlaying);
    if (status.durationMillis) setDurationMs(status.durationMillis);
  }

  async function enterFullscreen() {
    try {
      await videoRef.current?.presentFullscreenPlayer();
    } catch {
      toast.error("Full screen isn't available right now.");
    }
  }

  function playNext(recording: ClassRecording) {
    if (recording.file === currentFile) return;
    setCurrentFile(recording.file);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  const current = recordings.find((r) => r.file === currentFile) ?? null;
  const upNext = recordings.filter((r) => r.file !== currentFile);
  const size = current ? formatBytes(current.size_bytes) : null;
  const duration = formatDurationMillis(durationMs);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar style="light" />
      <View style={[styles.playerArea, { paddingTop: insets.top }]}>
        <View style={styles.videoBox}>
          {uri && !playbackError && (
            <Video
              ref={videoRef}
              style={StyleSheet.absoluteFill}
              source={{ uri }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              onPlaybackStatusUpdate={onStatus}
              onError={() => setPlaybackError("This recording couldn't be played. Please try again.")}
            />
          )}

          {(loadingUrl || (buffering && !playbackError)) && (
            <View style={styles.videoOverlay} pointerEvents="none">
              <ActivityIndicator color="#fff" size="large" />
            </View>
          )}

          {playbackError && (
            <View style={styles.videoOverlay}>
              <Ionicons name="alert-circle-outline" size={30} color="#fff" />
              <Text style={styles.errorText}>{playbackError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => loadUrl(currentFile)} activeOpacity={0.85}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.videoIconButton, styles.videoBack]}
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-down" size={22} color="#fff" />
          </TouchableOpacity>
          {uri && !playbackError && (
            <TouchableOpacity
              style={[styles.videoIconButton, styles.videoFullscreen]}
              onPress={enterFullscreen}
              hitSlop={8}
              accessibilityLabel="Full screen"
            >
              <Ionicons name="expand" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={upNext}
        keyExtractor={(r) => r.file}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.details}>
            <Text style={styles.title}>{current?.title ?? subjectName ?? "Recording"}</Text>
            <Text style={styles.meta}>
              {[
                subjectName || null,
                current?.sections.length ? `Section ${current.sections.join(", ")}` : null,
                current ? `${formatRecordedAt(current.recorded_at)}, ${formatRecordedTime(current.recorded_at)}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>

            <View style={styles.chipRow}>
              {duration && (
                <View style={styles.chip}>
                  <Ionicons name="time-outline" size={14} color="#111827" />
                  <Text style={styles.chipText}>{duration}</Text>
                </View>
              )}
              {size && (
                <View style={styles.chip}>
                  <Ionicons name="document-outline" size={14} color="#111827" />
                  <Text style={styles.chipText}>{size}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.chip}
                onPress={enterFullscreen}
                disabled={!uri || !!playbackError}
                activeOpacity={0.8}
              >
                <Ionicons name="expand-outline" size={14} color="#111827" />
                <Text style={styles.chipText}>Full screen</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.upNextLabel}>{upNext.length > 0 ? "Up next" : "No other recordings in this subject"}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.nextRow} onPress={() => playNext(item)} activeOpacity={0.85}>
            <LinearGradient colors={["#1E293B", "#0F172A"]} style={styles.nextThumb}>
              <View style={styles.nextThumbPlay}>
                <Ionicons name="play" size={14} color="#fff" />
              </View>
            </LinearGradient>
            <View style={styles.nextTextWrap}>
              <Text style={styles.nextTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.nextMeta} numberOfLines={1}>
                {item.sections.length ? `Section ${item.sections.join(", ")} · ` : ""}
                {formatRecordedAt(item.recorded_at)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  playerArea: {
    backgroundColor: "#000",
  },
  videoBox: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  videoIconButton: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoBack: {
    top: 8,
    left: 8,
  },
  videoFullscreen: {
    top: 8,
    right: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#E5E7EB",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  retryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  listContent: {
    paddingBottom: 32,
  },
  details: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  title: {
    fontSize: 17,
    lineHeight: 23,
    fontFamily: fonts.bold,
    color: "#0F0F0F",
  },
  meta: {
    fontSize: 12.5,
    fontFamily: fonts.regular,
    color: "#606060",
    marginTop: 6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F2F2F2",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 12.5,
    fontFamily: fonts.semibold,
    color: "#0F0F0F",
  },
  upNextLabel: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#0F0F0F",
    marginTop: 22,
    marginBottom: 10,
  },
  nextRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  nextThumb: {
    width: 160,
    aspectRatio: 16 / 9,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  nextThumbPlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  nextTextWrap: {
    flex: 1,
    gap: 4,
  },
  nextTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontFamily: fonts.semibold,
    color: "#0F0F0F",
  },
  nextMeta: {
    fontSize: 11.5,
    fontFamily: fonts.regular,
    color: "#606060",
  },
});
