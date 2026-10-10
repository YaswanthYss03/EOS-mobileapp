import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCameraPermissions } from "expo-camera";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { useRole } from "@/hooks/useRole";
import { startOnlineClass, startOnlineClassById, joinOnlineClass } from "@/services/api/online-class.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { setCallSession } from "./callSession";

// Real pre-join lobby for a LiveKit online class, pushed from
// OnlineClassScreen's "Start class"/"Join" button. Requests real camera/mic
// permissions (same useCameraPermissions pattern already used in
// ScanToPayScreen.tsx/FaceCaptureCamera.tsx) and calls the real
// start/join endpoint here (see online-class.api.ts) - the returned
// LiveKit token/serverUrl are handed to InCallScreen, which does the
// actual room connection. A student's mic/camera default OFF; faculty
// default ON (they're the one presenting).

function LobbyHeader({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 10 }]}
    >
      <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
      <View>
        <Text style={styles.headerTitle}>Online class</Text>
        <Text style={styles.headerSubtitle}>{"Pre-join check"}</Text>
      </View>
    </LinearGradient>
  );
}

export function JoinLobbyScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const role = useRole();
  const isFaculty = role === "employee" || role === "hod";
  // Mirrors OnlineClassScreen's own basePath - see that screen's comment.
  const basePath = isFaculty ? "/(tabs)/erp/online-class" : "/(tabs)/academics/online-class";
  const params = useLocalSearchParams<{
    mode?: string;
    onlineClassId?: string;
    subjectId?: string;
    classId?: string;
    initials?: string;
    teacher?: string;
    subject?: string;
    timeRange?: string;
  }>();

  const [micOn, setMicOn] = useState(isFaculty);
  const [cameraOn, setCameraOn] = useState(isFaculty);
  const [connecting, setConnecting] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermissionGranted, setMicPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    Audio.requestPermissionsAsync().then((res) => setMicPermissionGranted(res.granted));
  }, []);

  // Only hides on focus, deliberately no restore-on-blur cleanup here -
  // this screen only ever leads deeper into the same hidden-header flow
  // (replace to the call screen) or back to OnlineClassScreen (which
  // re-hides on its own focus anyway); CollegeHeader is restored in
  // exactly one place, OnlineClassScreen's beforeRemove listener, so it
  // can't race against whichever screen in this chain focuses next. See
  // that screen's own comment for why.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
    }, [navigation]),
  );

  const initials = params.initials ?? "LP";
  const teacher = params.teacher ?? "";
  const subject = params.subject ?? "";
  const timeRange = params.timeRange ?? "";
  // "start" = start today's session for a subject/class; "startMeeting" =
  // start (or rejoin) one specific meeting by id (scheduled list); "join" =
  // join a live meeting.
  const isStarting = params.mode === "start" || params.mode === "startMeeting";

  async function toggleCamera() {
    if (!cameraOn && !cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) {
        toast.error("Camera permission was denied - you can still join with your camera off.");
        return;
      }
    }
    setCameraOn((v) => !v);
  }

  function toggleMic() {
    if (!micOn && micPermissionGranted === false) {
      toast.error("Microphone permission was denied - you can still join muted.");
      return;
    }
    setMicOn((v) => !v);
  }

  function handleJoinClass() {
    if (connecting) return;
    setConnecting(true);

    const request =
      params.mode === "startMeeting"
        ? startOnlineClassById(Number(params.onlineClassId))
        : params.mode === "start"
          ? startOnlineClass(Number(params.subjectId), Number(params.classId))
          : joinOnlineClass(Number(params.onlineClassId));

    request
      .then((info) => {
        // Token/server URL stay in memory (see callSession.ts) - only
        // non-sensitive display values go into the route params.
        setCallSession(info);
        router.replace({
          pathname: `${basePath}/call`,
          params: {
            onlineClassId: String(info.onlineClassId),
            audio: micOn ? "1" : "0",
            video: cameraOn ? "1" : "0",
            initials,
            teacher,
            subject,
          },
        } as never);
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, isStarting ? "Couldn't start the class." : "Couldn't join the class."));
        setConnecting(false);
      });
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <LobbyHeader onBack={() => router.back()} />

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{teacher}</Text>
          <Text style={styles.meta}>
            {subject} · {timeRange}
          </Text>

          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>
              {isStarting ? "You're starting this class" : "Class in progress · Join now"}
            </Text>
          </View>

          <Text style={styles.hint}>Check your mic and camera before joining</Text>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleButton, !micOn && styles.toggleButtonOff]}
              onPress={toggleMic}
              activeOpacity={0.8}
            >
              <Ionicons name={micOn ? "mic" : "mic-off"} size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, !cameraOn && styles.toggleButtonOff]}
              onPress={toggleCamera}
              activeOpacity={0.8}
            >
              <Ionicons name={cameraOn ? "videocam" : "videocam-off"} size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.joinButton, connecting && styles.joinButtonDisabled]}
          onPress={handleJoinClass}
          activeOpacity={0.85}
          disabled={connecting}
        >
          {connecting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.joinButtonText}>{isStarting ? "Start class" : "Join class"}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1220",
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
  headerSubtitle: {
    color: "#D7E2FA",
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  body: {
    flex: 1,
    padding: 16,
  },
  card: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#141B2D",
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 6,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#2F6FE0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 30,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  name: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  meta: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 18,
  },
  statusPillText: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  hint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
    marginTop: 14,
    textAlign: "center",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 24,
  },
  toggleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButtonOff: {
    backgroundColor: "rgba(220,38,38,0.25)",
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
  },
  joinButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 14,
    paddingVertical: 16,
  },
  joinButtonDisabled: {
    opacity: 0.7,
  },
  joinButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
});
