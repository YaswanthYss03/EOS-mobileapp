import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getAlumniGroupDetail,
  getAlumniTimeline,
  postAlumniMessage,
  type AlumniGroupDetail,
  type AlumniTimelineItem,
} from "@/services/api/alumni.api";

type LoadStatus = "loading" | "success" | "error";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function dateDividerLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}${ordinalSuffix(date.getDate())}`;
}

function ordinalSuffix(day: number): string {
  if (day % 10 === 1 && day !== 11) return "st";
  if (day % 10 === 2 && day !== 12) return "nd";
  if (day % 10 === 3 && day !== 13) return "rd";
  return "th";
}

function GroupHeader({
  onBack,
  groupName,
  memberCount,
}: {
  onBack: () => void;
  groupName: string;
  memberCount: number | null;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="arrow-back" size={20} color="#111827" />
      </TouchableOpacity>
      <View style={styles.headerAvatar}>
        <Ionicons name="people" size={16} color="#fff" />
      </View>
      <View style={styles.headerTextWrap}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {groupName}
        </Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>
          Sri Eshwar College of Engineering Alumni Association
        </Text>
      </View>
      {memberCount !== null && (
        <View style={styles.memberCountWrap}>
          <Text style={styles.memberCountText}>{memberCount}</Text>
          <Ionicons name="people-outline" size={16} color="#2F6FE0" />
        </View>
      )}
    </View>
  );
}

// Principal-only alumni group chat - real chat messages merged with real
// "so-and-so joined" system events (see getAlumniTimeline), plus a compose
// bar that posts as the caller (posted_by_user_id) rather than as an
// alumnus - see EOS-backend's AdminAlumniGroupsService.
export function AlumniGroupChatScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ alumniBatchId: string; groupName?: string; memberCount?: string }>();
  const alumniBatchId = Number(params.alumniBatchId);
  const scrollRef = useRef<ScrollView>(null);

  const [detail, setDetail] = useState<AlumniGroupDetail | null>(null);
  const [items, setItems] = useState<AlumniTimelineItem[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    Promise.all([getAlumniGroupDetail(alumniBatchId), getAlumniTimeline(alumniBatchId)])
      .then(([detailResponse, timeline]) => {
        setDetail(detailResponse);
        setItems(timeline);
        setStatus("success");
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Couldn't load this group."));
        setStatus("error");
      });
  }, [alumniBatchId]);

  useEffect(() => {
    load();
  }, [load]);

  const groupName = detail?.batch_label ?? params.groupName ?? "Alumni group";
  const memberCount = detail?.member_count ?? (params.memberCount ? Number(params.memberCount) : null);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <GroupHeader onBack={() => router.back()} groupName={groupName} memberCount={memberCount} />,
      });
      return () => {
        navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigation, router, groupName, memberCount]),
  );

  const dayGroups = useMemo(() => {
    const map = new Map<string, AlumniTimelineItem[]>();
    for (const item of items) {
      const dayKey = item.at.slice(0, 10);
      const list = map.get(dayKey) ?? [];
      list.push(item);
      map.set(dayKey, list);
    }
    return Array.from(map.entries());
  }, [items]);

  function handleSend() {
    if (!draft.trim() || sending) return;
    setSending(true);
    const content = draft.trim();
    postAlumniMessage(alumniBatchId, content)
      .then(() => {
        setDraft("");
        return getAlumniTimeline(alumniBatchId).then(setItems);
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't send this message.")))
      .finally(() => setSending(false));
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <SafeAreaView style={styles.container} edges={[]}>
        {status === "loading" && (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        )}

        {status === "error" && (
          <View style={[styles.flex, styles.centerState, styles.centerStateMiddle]}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.centerStateText}>{error}</Text>
            <TouchableOpacity onPress={load} activeOpacity={0.8}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === "success" && (
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.content}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {dayGroups.length === 0 && (
              <View style={styles.centerState}>
                <Ionicons name="chatbubbles-outline" size={32} color="#B0B7C3" />
                <Text style={styles.centerStateText}>No activity yet in this group.</Text>
              </View>
            )}

            {dayGroups.map(([day, dayItems]) => (
              <View key={day}>
                <View style={styles.dateDividerRow}>
                  <Text style={styles.dateDividerText}>{dateDividerLabel(day)}</Text>
                </View>
                {dayItems.map((item) =>
                  item.kind === "join" ? (
                    <View key={item.id} style={styles.systemMessageRow}>
                      <Text style={styles.systemMessageText}>{item.text}</Text>
                    </View>
                  ) : (
                    <View key={item.id} style={styles.messageBubble}>
                      <Text style={styles.messageSender}>{item.posted_by_name}</Text>
                      <Text style={styles.messageContent}>{item.content}</Text>
                    </View>
                  ),
                )}
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.composeRow}>
          <TextInput
            style={styles.composeInput}
            placeholder="Type here.."
            placeholderTextColor="#9AA6B2"
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={sending || !draft.trim()}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#2F6FE0" />
            ) : (
              <Ionicons name="send" size={18} color={draft.trim() ? "#2F6FE0" : "#B0B7C3"} />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#EEF1FB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  backButton: {
    padding: 2,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2F6FE0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  memberCountWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  memberCountText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  inlineLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
    paddingHorizontal: 24,
  },
  centerStateMiddle: {
    justifyContent: "center",
    paddingVertical: 0,
  },
  centerStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  retryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  dateDividerRow: {
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  dateDividerText: {
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: "#9AA6B2",
    backgroundColor: "#E3E8F7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: "hidden",
  },
  systemMessageRow: {
    alignItems: "center",
    marginBottom: 12,
  },
  systemMessageText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#6B7280",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: "hidden",
    textAlign: "center",
  },
  messageBubble: {
    alignSelf: "flex-start",
    maxWidth: "82%",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderTopLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  messageSender: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginBottom: 2,
  },
  messageContent: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#111827",
    lineHeight: 18,
  },
  composeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  composeInput: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: "#F7F8FA",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
