import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { useParticipants as UseParticipantsType, useChat as UseChatType, TrackReference } from "@livekit/react-native";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { useRole } from "@/hooks/useRole";
import { leaveOnlineClass, endOnlineClass } from "@/services/api/online-class.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";

// Real LiveKit in-call screen. <LiveKitRoom> owns the connection (built
// from the serverUrl/token JoinLobbyScreen fetched from the real backend);
// everything inside it (CallBody) is real - video tracks, mute/camera
// toggle, participant count/list, and raise-hand/chat over LiveKit's data
// channel (ephemeral - not persisted anywhere, there's no existing
// chat-persistence table for this app to reuse without touching an
// unrelated module).
//
// @livekit/react-native and livekit-client are loaded lazily/guarded (not
// as static imports) - @livekit/react-native transitively requires
// @livekit/react-native-webrtc's native module, which doesn't exist in
// Expo Go or in any dev-client build made before that package was added.
// A static import at the top of this file would be evaluated the moment
// expo-router's route table touches this module (which happens on app
// start, not just on navigating here) and would crash the entire app - see
// app/_layout.tsx's own comment on the same issue.

type LiveKitReactNativeModule = typeof import("@livekit/react-native");
type LiveKitClientModule = typeof import("livekit-client");

let LiveKitRN: LiveKitReactNativeModule | null = null;
let LiveKitClient: LiveKitClientModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  LiveKitRN = require("@livekit/react-native") as LiveKitReactNativeModule;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  LiveKitClient = require("livekit-client") as LiveKitClientModule;
  LiveKitRN.registerGlobals();
} catch (err) {
  console.warn(
    "LiveKit's native module isn't available - Online Class needs a custom dev-client build " +
      "(eas build --profile development, or expo prebuild + expo run:android), not Expo Go or an " +
      "older dev-client build made before @livekit/react-native was added.",
    err,
  );
}

type RaiseHandPayload = { identity: string; name: string; raised: boolean };

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function CallHeader({ onBack, subject }: { onBack: () => void; subject: string }) {
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
        <Text style={styles.headerSubtitle}>{subject} · Live session</Text>
      </View>
    </LinearGradient>
  );
}

function UnavailableBody({ onBack, subject }: { onBack: () => void; subject: string }) {
  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <CallHeader onBack={onBack} subject={subject} />
      <View style={styles.center}>
        <Ionicons name="videocam-off-outline" size={32} color="#6B7280" />
        <Text style={[styles.name, { marginTop: 12, textAlign: "center" }]}>Video calling isn't available on this build</Text>
        <Text style={[styles.meta, { textAlign: "center", marginTop: 6, paddingHorizontal: 24 }]}>
          Online Class needs a custom dev-client build - it can't run in Expo Go.
        </Text>
      </View>
    </SafeAreaView>
  );
}

export function InCallScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const role = useRole();
  // Mirrors OnlineClassScreen's own basePath - see that screen's comment.
  const basePath = role === "employee" || role === "hod" ? "/(tabs)/erp/online-class" : "/(tabs)/academics/online-class";
  const params = useLocalSearchParams<{
    onlineClassId?: string;
    serverUrl?: string;
    token?: string;
    audio?: string;
    video?: string;
    initials?: string;
    teacher?: string;
    subject?: string;
  }>();

  // Only hides on focus, deliberately no restore-on-blur cleanup - leaving
  // this screen always replaces back to OnlineClassScreen, which re-hides
  // on its own focus and is the one place CollegeHeader gets restored (its
  // beforeRemove listener) - see that screen's own comment for why an
  // unconditional restore-on-blur here would race it.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
    }, [navigation]),
  );

  useEffect(() => {
    if (!LiveKitRN) return;
    LiveKitRN.AudioSession.startAudioSession();
    return () => {
      LiveKitRN?.AudioSession.stopAudioSession();
    };
  }, []);

  const onlineClassId = Number(params.onlineClassId);
  const initials = params.initials ?? "?";
  const teacher = params.teacher ?? "";
  const subject = params.subject ?? "Online class";

  function goBack() {
    router.replace(basePath as never);
  }

  function handleDisconnected() {
    leaveOnlineClass(onlineClassId).catch(() => {});
    goBack();
  }

  function handleError(error: Error) {
    toast.error(error.message || "Lost connection to the class.");
  }

  if (!LiveKitRN || !LiveKitClient) {
    return <UnavailableBody onBack={goBack} subject={subject} />;
  }

  if (!params.serverUrl || !params.token) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <WatermarkBackground />
        <CallHeader onBack={goBack} subject={subject} />
        <View style={styles.center}>
          <Text style={styles.meta}>Missing connection details - please rejoin.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { LiveKitRoom } = LiveKitRN;

  return (
    <LiveKitRoom
      serverUrl={params.serverUrl}
      token={params.token}
      connect
      audio={params.audio === "1"}
      video={params.video === "1"}
      onDisconnected={handleDisconnected}
      onError={handleError}
    >
      <CallBody onlineClassId={onlineClassId} initials={initials} teacher={teacher} subject={subject} onLeft={goBack} />
    </LiveKitRoom>
  );
}

function CallBody({
  onlineClassId,
  initials,
  teacher,
  subject,
  onLeft,
}: {
  onlineClassId: number;
  initials: string;
  teacher: string;
  subject: string;
  onLeft: () => void;
}) {
  // Only ever rendered as <LiveKitRoom>'s child (see InCallScreen above),
  // which already guarantees LiveKitRN/LiveKitClient are non-null.
  const { VideoTrack, useLocalParticipant, useRemoteParticipants, useParticipants, useTracks, useChat, useDataChannel, useRoomContext } =
    LiveKitRN!;
  const { Track } = LiveKitClient!;

  const role = useRole();
  const isFaculty = role === "employee" || role === "hod";
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const participants = useParticipants();
  const remoteParticipants = useRemoteParticipants();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const { chatMessages, send: sendChat } = useChat();
  const { send: sendRaiseHand, message: raiseHandMessage } = useDataChannel("raise-hand");

  const [elapsed, setElapsed] = useState(0);
  const [handRaised, setHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Record<string, string>>({});
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!raiseHandMessage) return;
    try {
      const data = JSON.parse(new TextDecoder().decode(raiseHandMessage.payload)) as RaiseHandPayload;
      setRaisedHands((prev) => {
        const next = { ...prev };
        if (data.raised) next[data.identity] = data.name;
        else delete next[data.identity];
        return next;
      });
    } catch {
      // ignore malformed data-channel payloads
    }
  }, [raiseHandMessage]);

  function toggleMic() {
    localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled).catch(() => toast.error("Couldn't access your microphone."));
  }

  function toggleCamera() {
    localParticipant.setCameraEnabled(!isCameraEnabled).catch(() => toast.error("Couldn't access your camera."));
  }

  function toggleRaiseHand() {
    const next = !handRaised;
    setHandRaised(next);
    const payload: RaiseHandPayload = { identity: localParticipant.identity, name: localParticipant.name || "Someone", raised: next };
    sendRaiseHand(new TextEncoder().encode(JSON.stringify(payload)), { reliable: true }).catch(() => {});
  }

  function handleSendChat() {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    sendChat(text).catch(() => toast.error("Couldn't send that message."));
  }

  function leaveCall() {
    leaveOnlineClass(onlineClassId).catch(() => {});
    room.disconnect();
    onLeft();
  }

  function endClassForEveryone() {
    setEnding(true);
    endOnlineClass(onlineClassId)
      .then(() => {
        room.disconnect();
        onLeft();
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Couldn't end the class."));
        setEnding(false);
      });
  }

  const remoteCameraTrack = cameraTracks.find((t) => !t.participant.isLocal);
  const localCameraTrack = cameraTracks.find((t) => t.participant.isLocal);
  const remoteName = remoteParticipants[0]?.name || teacher || "Waiting for others to join…";

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <CallHeader onBack={leaveCall} subject={subject} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.timerChip}>
            <View style={styles.liveDot} />
            <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>
          </View>
          <TouchableOpacity style={styles.peopleChip} onPress={() => setPeopleOpen(true)} activeOpacity={0.8}>
            <Ionicons name="people" size={13} color="#fff" />
            <Text style={styles.peopleChipText}>{participants.length}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.center}>
          {remoteCameraTrack ? (
            <VideoTrack trackRef={remoteCameraTrack} style={styles.remoteVideo} objectFit="cover" />
          ) : (
            <>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <Text style={styles.name}>{remoteName}</Text>
              <Text style={styles.meta}>{subject}</Text>
            </>
          )}
        </View>

        <View style={styles.selfTile}>
          {localCameraTrack ? (
            <VideoTrack trackRef={localCameraTrack as TrackReference} style={styles.selfVideo} objectFit="cover" mirror />
          ) : (
            <Text style={styles.selfTileText}>{isCameraEnabled ? "Connecting camera…" : "Camera off"}</Text>
          )}
        </View>
      </View>

      <View style={styles.controlBar}>
        <ControlButton
          icon={isMicrophoneEnabled ? "mic" : "mic-off"}
          label={isMicrophoneEnabled ? "Mute" : "Unmute"}
          active={!isMicrophoneEnabled}
          onPress={toggleMic}
        />
        <ControlButton
          icon={isCameraEnabled ? "videocam" : "videocam-off"}
          label={isCameraEnabled ? "Camera off" : "Camera on"}
          active={!isCameraEnabled}
          onPress={toggleCamera}
        />
        <ControlButton icon="hand-left" label="Raise hand" active={handRaised} onPress={toggleRaiseHand} />
        <ControlButton icon="people" label="People" onPress={() => setPeopleOpen(true)} />
        <ControlButton icon="chatbubble" label="Chat" onPress={() => setChatOpen(true)} />
        <TouchableOpacity style={styles.leaveButton} onPress={leaveCall} activeOpacity={0.85}>
          <Ionicons name="call" size={20} color="#fff" style={styles.leaveIcon} />
        </TouchableOpacity>
      </View>

      {isFaculty && (
        <TouchableOpacity style={styles.endClassButton} onPress={endClassForEveryone} activeOpacity={0.85} disabled={ending}>
          <Text style={styles.endClassButtonText}>{ending ? "Ending…" : "End class for everyone"}</Text>
        </TouchableOpacity>
      )}

      <PeopleSheet
        visible={peopleOpen}
        onClose={() => setPeopleOpen(false)}
        participants={participants}
        raisedHands={raisedHands}
      />
      <ChatSheet
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chatMessages}
        input={chatInput}
        onChangeInput={setChatInput}
        onSend={handleSendChat}
      />
    </SafeAreaView>
  );
}

function ControlButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.controlButton} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.controlIconWrap, active && styles.controlIconWrapActive]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <Text style={styles.controlLabel} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PeopleSheet({
  visible,
  onClose,
  participants,
  raisedHands,
}: {
  visible: boolean;
  onClose: () => void;
  participants: ReturnType<typeof UseParticipantsType>;
  raisedHands: Record<string, string>;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetTitle}>People ({participants.length})</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={participants}
            keyExtractor={(p) => p.identity}
            style={styles.sheetList}
            renderItem={({ item }) => (
              <View style={styles.peopleRow}>
                <Text style={styles.peopleRowName}>
                  {item.name || item.identity}
                  {item.isLocal ? " (You)" : ""}
                </Text>
                {raisedHands[item.identity] && <Ionicons name="hand-left" size={16} color="#F59E0B" />}
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

function ChatSheet({
  visible,
  onClose,
  messages,
  input,
  onChangeInput,
  onSend,
}: {
  visible: boolean;
  onClose: () => void;
  messages: ReturnType<typeof UseChatType>["chatMessages"];
  input: string;
  onChangeInput: (v: string) => void;
  onSend: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.sheetOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.sheet, styles.chatSheet]}>
          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetTitle}>Chat</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            style={styles.sheetList}
            renderItem={({ item }) => (
              <View style={styles.chatRow}>
                <Text style={styles.chatFrom}>{item.from?.name || item.from?.identity || "Someone"}</Text>
                <Text style={styles.chatMessage}>{item.message}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.chatEmpty}>No messages yet.</Text>}
          />
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Message the class…"
              placeholderTextColor="#6B7280"
              value={input}
              onChangeText={onChangeInput}
              onSubmitEditing={onSend}
              returnKeyType="send"
            />
            <TouchableOpacity onPress={onSend} style={styles.chatSendButton} activeOpacity={0.85}>
              <Ionicons name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#22C55E",
  },
  timerText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  peopleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  peopleChipText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    overflow: "hidden",
    borderRadius: 16,
  },
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#2F6FE0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 34,
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
  selfTile: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 92,
    height: 92,
    borderRadius: 14,
    backgroundColor: "#141B2D",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    overflow: "hidden",
  },
  selfVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  selfTileText: {
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: "#9AA6B2",
    textAlign: "center",
  },
  controlBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: "#0B1220",
  },
  controlButton: {
    alignItems: "center",
    gap: 5,
  },
  controlIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlIconWrapActive: {
    backgroundColor: "rgba(220,38,38,0.3)",
  },
  controlLabel: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  leaveButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
  },
  leaveIcon: {
    transform: [{ rotate: "135deg" }],
  },
  endClassButton: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.4)",
  },
  endClassButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#DC2626",
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "#141B2D",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  chatSheet: {
    maxHeight: "80%",
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  sheetList: {
    marginBottom: 4,
  },
  peopleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  peopleRowName: {
    fontSize: 13.5,
    fontFamily: fonts.medium,
    color: "#E5E7EB",
  },
  chatRow: {
    paddingVertical: 8,
  },
  chatFrom: {
    fontSize: 11.5,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
  },
  chatMessage: {
    fontSize: 13.5,
    fontFamily: fonts.regular,
    color: "#E5E7EB",
    marginTop: 2,
  },
  chatEmpty: {
    fontSize: 12.5,
    fontFamily: fonts.medium,
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 24,
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 13.5,
    fontFamily: fonts.regular,
  },
  chatSendButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#2F6FE0",
    alignItems: "center",
    justifyContent: "center",
  },
});
