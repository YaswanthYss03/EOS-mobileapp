import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { useParticipants as UseParticipantsType, useChat as UseChatType, TrackReference } from "@livekit/react-native";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { confirm } from "@/utils/confirm";
import { getApiErrorMessage } from "@/services/api/client";
import { useRole } from "@/hooks/useRole";
import {
  leaveOnlineClass,
  endOnlineClass,
  joinOnlineClass,
  muteMeetingParticipant,
  muteAllMeetingStudents,
  removeMeetingParticipant,
} from "@/services/api/online-class.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { takeCallSession, toCallSession, type CallSession } from "./callSession";

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
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const mmss = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${mmss}` : mmss;
}

/**
 * Seconds since the meeting started, from the server's start time
 * (corrected for this device's clock drift) - identical for everyone and
 * never restarting when someone leaves and rejoins. Falls back to "since
 * this screen opened" only if the server didn't send a start time.
 */
function useMeetingElapsed(startedAtIso: string | undefined, clockOffsetMs: number): number {
  const fallbackStart = useRef(Date.now());
  const startMs = startedAtIso ? new Date(startedAtIso).getTime() : NaN;
  const origin = Number.isFinite(startMs) ? startMs : fallbackStart.current;
  const compute = useCallback(() => Math.floor((Date.now() + clockOffsetMs - origin) / 1000), [clockOffsetMs, origin]);
  const [elapsed, setElapsed] = useState(compute);

  useEffect(() => {
    setElapsed(compute());
    const interval = setInterval(() => setElapsed(compute()), 1000);
    return () => clearInterval(interval);
  }, [compute]);

  return elapsed;
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
    audio?: string;
    video?: string;
    initials?: string;
    teacher?: string;
    subject?: string;
  }>();

  // Set right before this user leaves/ends on purpose, so the resulting
  // disconnect isn't reported as "the meeting ended".
  const intentionalExitRef = useRef(false);
  // Why LiveKit disconnected us (host ended, removed, joined elsewhere...) -
  // captured from the room's own Disconnected event inside CallBody.
  const disconnectReasonRef = useRef<number | undefined>(undefined);
  const onlineClassIdNum = Number(params.onlineClassId);
  // Token + server URL come from memory (never route params); when absent
  // (e.g. app reloaded) a fresh short-lived token is fetched.
  const [session, setSession] = useState<CallSession | null>(() => takeCallSession(onlineClassIdNum));
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (session || !Number.isFinite(onlineClassIdNum)) return;
    let cancelled = false;
    joinOnlineClass(onlineClassIdNum)
      .then((info) => {
        if (!cancelled) setSession(toCallSession(info));
      })
      .catch((err) => {
        if (!cancelled) setSessionError(getApiErrorMessage(err, "Couldn't rejoin the class."));
      });
    return () => {
      cancelled = true;
    };
  }, [session, onlineClassIdNum]);

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
    if (intentionalExitRef.current) return;
    intentionalExitRef.current = true;
    leaveOnlineClass(onlineClassId).catch(() => {});
    // Deferred one tick: LiveKitRoom's callback can run before CallBody's
    // own Disconnected listener has recorded the reason.
    setTimeout(() => showDisconnectMessage(), 0);
  }

  function showDisconnectMessage() {
    const reasons = LiveKitClient?.DisconnectReason;
    const reason = disconnectReasonRef.current;
    const message =
      reasons && reason === reasons.ROOM_DELETED
        ? "The host ended the meeting."
        : reasons && reason === reasons.PARTICIPANT_REMOVED
          ? "The host removed you from the meeting."
          : reasons && reason === reasons.DUPLICATE_IDENTITY
            ? "You joined this meeting from another device."
            : "You were disconnected from the meeting. Rejoin from Online class if it's still live.";
    toast.info(message);
    goBack();
  }

  function handleError(error: Error) {
    toast.error(error.message || "Lost connection to the class.");
  }

  if (!LiveKitRN || !LiveKitClient) {
    return <UnavailableBody onBack={goBack} subject={subject} />;
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <WatermarkBackground />
        <CallHeader onBack={goBack} subject={subject} />
        <View style={styles.center}>
          {sessionError ? (
            <>
              <Ionicons name="alert-circle-outline" size={28} color="#9AA6B2" />
              <Text style={[styles.meta, { textAlign: "center", paddingHorizontal: 24 }]}>{sessionError}</Text>
            </>
          ) : (
            <>
              <ActivityIndicator color="#fff" />
              <Text style={styles.meta}>Connecting…</Text>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const { LiveKitRoom } = LiveKitRN;

  return (
    <LiveKitRoom
      serverUrl={session.serverUrl}
      token={session.token}
      connect
      audio={params.audio === "1"}
      video={params.video === "1"}
      onDisconnected={handleDisconnected}
      onError={handleError}
    >
      <CallBody
        onlineClassId={onlineClassId}
        initials={initials}
        teacher={teacher}
        subject={subject}
        startedAt={session.startedAt ?? undefined}
        clockOffsetMs={session.clockOffsetMs}
        intentionalExitRef={intentionalExitRef}
        disconnectReasonRef={disconnectReasonRef}
        onLeft={goBack}
      />
    </LiveKitRoom>
  );
}

function CallBody({
  onlineClassId,
  initials,
  teacher,
  subject,
  startedAt,
  clockOffsetMs,
  intentionalExitRef,
  disconnectReasonRef,
  onLeft,
}: {
  onlineClassId: number;
  initials: string;
  teacher: string;
  subject: string;
  startedAt: string | undefined;
  clockOffsetMs: number;
  intentionalExitRef: { current: boolean };
  disconnectReasonRef: { current: number | undefined };
  onLeft: () => void;
}) {
  // Only ever rendered as <LiveKitRoom>'s child (see InCallScreen above),
  // which already guarantees LiveKitRN/LiveKitClient are non-null.
  const {
    VideoTrack,
    useLocalParticipant,
    useRemoteParticipants,
    useParticipants,
    useTracks,
    useChat,
    useDataChannel,
    useRoomContext,
    useConnectionState,
    useSpeakingParticipants,
  } = LiveKitRN!;
  const { Track, RoomEvent, ConnectionState } = LiveKitClient!;

  const role = useRole();
  const isFaculty = role === "employee" || role === "hod";
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const participants = useParticipants();
  const remoteParticipants = useRemoteParticipants();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const speakers = useSpeakingParticipants();
  const connectionState = useConnectionState();
  const [isRecording, setIsRecording] = useState(room.isRecording);

  // Remember why we got disconnected (for the message shown afterwards)
  // and track the room's recording status for the REC indicator.
  useEffect(() => {
    const onDisconnected = (reason?: number) => {
      disconnectReasonRef.current = reason;
    };
    const onRecording = (recording: boolean) => setIsRecording(recording);
    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.RecordingStatusChanged, onRecording);
    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.RecordingStatusChanged, onRecording);
    };
  }, [room, RoomEvent, disconnectReasonRef]);
  const { chatMessages, send: sendChat } = useChat();
  const { send: sendRaiseHand, message: raiseHandMessage } = useDataChannel("raise-hand");

  const elapsed = useMeetingElapsed(startedAt, clockOffsetMs);
  const [handRaised, setHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Record<string, string>>({});
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [leaveMenuOpen, setLeaveMenuOpen] = useState(false);
  const [exiting, setExiting] = useState<"leave" | "end" | null>(null);

  // Android back button opens the same leave menu instead of dropping the
  // call silently.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!exiting) setLeaveMenuOpen(true);
      return true;
    });
    return () => sub.remove();
  }, [exiting]);

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
    setExiting("leave");
    intentionalExitRef.current = true;
    leaveOnlineClass(onlineClassId).catch(() => {});
    room.disconnect();
    onLeft();
  }

  function endMeetingForEveryone() {
    setExiting("end");
    intentionalExitRef.current = true;
    endOnlineClass(onlineClassId)
      .then(() => {
        room.disconnect();
        onLeft();
      })
      .catch((err) => {
        intentionalExitRef.current = false;
        setExiting(null);
        toast.error(getApiErrorMessage(err, "Couldn't end the meeting. Please try again."));
      });
  }

  // Both choices ask once more in a centered dialog - leaving or ending by
  // accident is disruptive, so nothing happens on "No".
  async function chooseLeave() {
    setLeaveMenuOpen(false);
    const ok = await confirm({
      title: "Leave meeting?",
      message: isFaculty
        ? "The meeting will continue without you. You can rejoin from Online class."
        : "You can rejoin while the meeting is live.",
      confirmText: "Yes",
      cancelText: "No",
    });
    if (ok) leaveCall();
  }

  async function chooseEnd() {
    setLeaveMenuOpen(false);
    const ok = await confirm({
      title: "End meeting for everyone?",
      message: "This ends the meeting for all participants.",
      confirmText: "Yes",
      cancelText: "No",
      destructive: true,
    });
    if (ok) endMeetingForEveryone();
  }

  // Main stage, like Meet: someone's screen share first, then the host's
  // camera (for students), then whoever is speaking, then any camera.
  const isHostIdentity = (identity: string) => identity.startsWith("faculty-");
  const remoteCameras = cameraTracks.filter((t) => !t.participant.isLocal);
  const speakingIds = new Set(speakers.filter((p) => !p.isLocal).map((p) => p.identity));
  const stageTrack =
    screenTracks.find((t) => !t.participant.isLocal) ??
    (!isFaculty ? remoteCameras.find((t) => isHostIdentity(t.participant.identity)) : undefined) ??
    remoteCameras.find((t) => speakingIds.has(t.participant.identity)) ??
    remoteCameras[0];
  const stripTracks = remoteCameras.filter((t) => t !== stageTrack).slice(0, 12);
  const localCameraTrack = cameraTracks.find((t) => t.participant.isLocal);
  const hostParticipant = remoteParticipants.find((p) => isHostIdentity(p.identity));
  const remoteName =
    (!isFaculty ? hostParticipant?.name : undefined) ||
    remoteParticipants[0]?.name ||
    (remoteParticipants.length === 0 ? "Waiting for others to join…" : teacher);
  const reconnecting = connectionState === ConnectionState.Reconnecting || connectionState === ConnectionState.SignalReconnecting;

  async function hostMute(identity: string) {
    try {
      await muteMeetingParticipant(onlineClassId, identity);
      toast.success("Muted");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't mute that participant."));
    }
  }

  async function hostMuteAll() {
    try {
      const res = await muteAllMeetingStudents(onlineClassId);
      toast.success(res.muted > 0 ? `Muted ${res.muted} ${res.muted === 1 ? "student" : "students"}` : "No students to mute");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't mute everyone."));
    }
  }

  async function hostRemove(identity: string, name: string) {
    const ok = await confirm({
      title: "Remove from meeting?",
      message: `${name} will be removed. They can rejoin while the meeting is live.`,
      confirmText: "Remove",
      cancelText: "Cancel",
      destructive: true,
    });
    if (!ok) return;
    try {
      await removeMeetingParticipant(onlineClassId, identity);
      toast.success(`${name} was removed`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't remove that participant."));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <CallHeader onBack={() => !exiting && setLeaveMenuOpen(true)} subject={subject} />

      <View style={styles.body}>
        {reconnecting && (
          <View style={styles.reconnectBanner}>
            <ActivityIndicator color="#FDE68A" size="small" />
            <Text style={styles.reconnectText}>Reconnecting… check your internet connection</Text>
          </View>
        )}
        <View style={styles.topRow}>
          <View style={styles.topRowLeft}>
            <View style={styles.timerChip}>
              <View style={styles.liveDot} />
              <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>
            </View>
            {isRecording && (
              <View style={styles.recChip} accessibilityLabel="This meeting is being recorded">
                <View style={styles.recDot} />
                <Text style={styles.recText}>REC</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.peopleChip} onPress={() => setPeopleOpen(true)} activeOpacity={0.8}>
            <Ionicons name="people" size={13} color="#fff" />
            <Text style={styles.peopleChipText}>{participants.length}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.center}>
          {stageTrack ? (
            <>
              <VideoTrack
                trackRef={stageTrack}
                style={styles.remoteVideo}
                objectFit={stageTrack.source === Track.Source.ScreenShare ? "contain" : "cover"}
              />
              <View style={styles.stageLabel}>
                <Text style={styles.stageLabelText} numberOfLines={1}>
                  {stageTrack.participant.name || stageTrack.participant.identity}
                  {stageTrack.source === Track.Source.ScreenShare ? " · presenting" : ""}
                </Text>
              </View>
            </>
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

        {stripTracks.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.stripContent}>
            {stripTracks.map((t) => (
              <View key={`${t.participant.identity}:${t.source}`} style={styles.stripTile}>
                <VideoTrack trackRef={t} style={styles.selfVideo} objectFit="cover" />
                <Text style={styles.stripName} numberOfLines={1}>
                  {t.participant.name || t.participant.identity}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

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
        <TouchableOpacity
          style={styles.leaveButton}
          onPress={() => setLeaveMenuOpen(true)}
          activeOpacity={0.85}
          disabled={exiting !== null}
          accessibilityRole="button"
          accessibilityLabel="Leave or end the meeting"
        >
          {exiting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="call" size={20} color="#fff" style={styles.leaveIcon} />
          )}
        </TouchableOpacity>
      </View>

      <LeaveMenu
        visible={leaveMenuOpen}
        canEnd={isFaculty}
        onLeave={chooseLeave}
        onEnd={chooseEnd}
        onClose={() => setLeaveMenuOpen(false)}
      />

      <PeopleSheet
        visible={peopleOpen}
        onClose={() => setPeopleOpen(false)}
        participants={participants}
        raisedHands={raisedHands}
        isHost={isFaculty}
        onMute={hostMute}
        onMuteAll={hostMuteAll}
        onRemove={hostRemove}
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

function LeaveMenu({
  visible,
  canEnd,
  onLeave,
  onEnd,
  onClose,
}: {
  visible: boolean;
  canEnd: boolean;
  onLeave: () => void;
  onEnd: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.sheet, styles.leaveSheet, { paddingBottom: Math.max(insets.bottom, 16) + 4 }]}
        >
          <View style={styles.sheetHandle} />
          <TouchableOpacity style={styles.leaveOption} onPress={onLeave} activeOpacity={0.85}>
            <View style={styles.leaveOptionIcon}>
              <Ionicons name="exit-outline" size={20} color="#fff" />
            </View>
            <View style={styles.leaveOptionTextWrap}>
              <Text style={styles.leaveOptionTitle}>Leave meeting</Text>
              <Text style={styles.leaveOptionHint}>Others stay in the meeting</Text>
            </View>
          </TouchableOpacity>
          {canEnd && (
            <TouchableOpacity style={[styles.leaveOption, styles.endOption]} onPress={onEnd} activeOpacity={0.85}>
              <View style={[styles.leaveOptionIcon, styles.endOptionIcon]}>
                <Ionicons name="call" size={18} color="#fff" style={styles.leaveIcon} />
              </View>
              <View style={styles.leaveOptionTextWrap}>
                <Text style={[styles.leaveOptionTitle, styles.endOptionTitle]}>End call</Text>
                <Text style={styles.leaveOptionHint}>End the meeting for everyone</Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.leaveCancel} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.leaveCancelText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
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
  isHost,
  onMute,
  onMuteAll,
  onRemove,
}: {
  visible: boolean;
  onClose: () => void;
  participants: ReturnType<typeof UseParticipantsType>;
  raisedHands: Record<string, string>;
  isHost: boolean;
  onMute: (identity: string) => void;
  onMuteAll: () => void;
  onRemove: (identity: string, name: string) => void;
}) {
  // Host first, then raised hands, then everyone else by name.
  const sorted = [...participants].sort((a, b) => {
    const rank = (p: (typeof participants)[number]) =>
      p.identity.startsWith("faculty-") ? 0 : raisedHands[p.identity] ? 1 : 2;
    return rank(a) - rank(b) || (a.name || a.identity).localeCompare(b.name || b.identity);
  });
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetTitle}>People ({participants.length})</Text>
            <View style={styles.sheetHeaderActions}>
              {isHost && (
                <TouchableOpacity onPress={onMuteAll} style={styles.muteAllButton} activeOpacity={0.8}>
                  <Ionicons name="mic-off" size={14} color="#fff" />
                  <Text style={styles.muteAllText}>Mute all</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <FlatList
            data={sorted}
            keyExtractor={(p) => p.identity}
            style={styles.sheetList}
            renderItem={({ item }) => {
              const name = item.name || item.identity;
              const isStudent = item.identity.startsWith("student-");
              return (
                <View style={styles.peopleRow}>
                  <View style={styles.peopleRowNameWrap}>
                    <Text style={styles.peopleRowName} numberOfLines={1}>
                      {name}
                      {item.isLocal ? " (You)" : ""}
                    </Text>
                    {item.identity.startsWith("faculty-") && <Text style={styles.hostTag}>Host</Text>}
                  </View>
                  <View style={styles.peopleRowActions}>
                    {raisedHands[item.identity] && <Ionicons name="hand-left" size={16} color="#F59E0B" />}
                    {!item.isMicrophoneEnabled && <Ionicons name="mic-off" size={15} color="#6B7280" />}
                    {isHost && isStudent && (
                      <>
                        {item.isMicrophoneEnabled && (
                          <TouchableOpacity
                            onPress={() => onMute(item.identity)}
                            style={styles.peopleAction}
                            hitSlop={6}
                            accessibilityLabel={`Mute ${name}`}
                          >
                            <Ionicons name="mic-off-outline" size={16} color="#fff" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => onRemove(item.identity, name)}
                          style={[styles.peopleAction, styles.peopleActionDanger]}
                          hitSlop={6}
                          accessibilityLabel={`Remove ${name}`}
                        >
                          <Ionicons name="person-remove-outline" size={15} color="#FCA5A5" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            }}
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
  topRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(220,38,38,0.2)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  recDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#EF4444",
  },
  recText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#FCA5A5",
    letterSpacing: 0.5,
  },
  reconnectBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(245,158,11,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  reconnectText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#FDE68A",
  },
  stageLabel: {
    position: "absolute",
    left: 10,
    bottom: 10,
    maxWidth: "70%",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stageLabelText: {
    fontSize: 11.5,
    fontFamily: fonts.semibold,
    color: "#fff",
  },
  strip: {
    flexGrow: 0,
    marginTop: 10,
    marginRight: 100,
  },
  stripContent: {
    gap: 8,
  },
  stripTile: {
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#141B2D",
  },
  stripName: {
    position: "absolute",
    left: 4,
    right: 4,
    bottom: 4,
    fontSize: 10,
    fontFamily: fonts.semibold,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 3,
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
  leaveSheet: {
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 14,
  },
  leaveOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  endOption: {
    backgroundColor: "rgba(220,38,38,0.12)",
  },
  leaveOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  endOptionIcon: {
    backgroundColor: "#DC2626",
  },
  leaveOptionTextWrap: {
    flex: 1,
  },
  leaveOptionTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  endOptionTitle: {
    color: "#FCA5A5",
  },
  leaveOptionHint: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginTop: 2,
  },
  leaveCancel: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 2,
  },
  leaveCancelText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#9AA6B2",
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
    flexShrink: 1,
  },
  peopleRowNameWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 8,
  },
  hostTag: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#93C5FD",
    backgroundColor: "rgba(47,111,224,0.25)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },
  peopleRowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  peopleAction: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  peopleActionDanger: {
    backgroundColor: "rgba(220,38,38,0.18)",
  },
  sheetHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  muteAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  muteAllText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#fff",
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
