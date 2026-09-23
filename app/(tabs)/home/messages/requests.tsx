import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { useMessaging } from "@/context/MessagingContext";
import {
  listIncomingChatRequests,
  listGroupInvites,
  acceptChatRequest,
  rejectChatRequest,
  acceptGroupInvite,
  rejectGroupInvite,
  type ChatRequest,
  type GroupInvite,
} from "@/services/api/messaging.api";

function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("");
}

// Student-only screen (the entry point in messages/index.tsx only ever
// renders for a student, and every endpoint here 403s for anyone else). Two
// independent lists - accepting/rejecting one never touches the other.
export function RequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshPendingRequestsCount } = useMessaging();

  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);
  const [groupInvites, setGroupInvites] = useState<GroupInvite[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    Promise.all([listIncomingChatRequests(), listGroupInvites()])
      .then(([requests, invites]) => {
        setChatRequests(requests);
        setGroupInvites(invites);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleAcceptChat(request: ChatRequest) {
    const key = `chat-${request.requestId}`;
    if (actingId) return;
    setActingId(key);
    try {
      const conversation = await acceptChatRequest(request.requestId);
      setChatRequests((prev) => prev.filter((r) => r.requestId !== request.requestId));
      refreshPendingRequestsCount();
      router.push({
        pathname: "/(tabs)/home/messages/[conversationId]",
        params: {
          conversationId: String(conversation.id),
          name: request.sender?.name ?? "",
          roleLabel: request.sender?.roleLabel ?? "",
          otherUserId: String(request.senderUserId),
          ...(request.sender?.photoUrl ? { photoUrl: request.sender.photoUrl } : {}),
        },
      } as never);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't accept this request."));
    } finally {
      setActingId(null);
    }
  }

  async function handleRejectChat(request: ChatRequest) {
    const key = `chat-${request.requestId}`;
    if (actingId) return;
    setActingId(key);
    try {
      await rejectChatRequest(request.requestId);
      setChatRequests((prev) => prev.filter((r) => r.requestId !== request.requestId));
      refreshPendingRequestsCount();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't reject this request."));
    } finally {
      setActingId(null);
    }
  }

  async function handleAcceptInvite(invite: GroupInvite) {
    const key = `group-${invite.requestId}`;
    if (actingId) return;
    setActingId(key);
    try {
      const group = await acceptGroupInvite(invite.requestId);
      setGroupInvites((prev) => prev.filter((i) => i.requestId !== invite.requestId));
      refreshPendingRequestsCount();
      router.push({
        pathname: "/(tabs)/home/messages/[conversationId]",
        params: { conversationId: String(group.id), isGroup: "true" },
      } as never);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't accept this invitation."));
    } finally {
      setActingId(null);
    }
  }

  async function handleRejectInvite(invite: GroupInvite) {
    const key = `group-${invite.requestId}`;
    if (actingId) return;
    setActingId(key);
    try {
      await rejectGroupInvite(invite.requestId);
      setGroupInvites((prev) => prev.filter((i) => i.requestId !== invite.requestId));
      refreshPendingRequestsCount();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't reject this invitation."));
    } finally {
      setActingId(null);
    }
  }

  const sections = [
    ...(chatRequests.length > 0
      ? [{ key: "chat", title: "MESSAGE REQUESTS", data: chatRequests }]
      : []),
    ...(groupInvites.length > 0
      ? [{ key: "group", title: "GROUP INVITATIONS", data: groupInvites }]
      : []),
  ];

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Requests</Text>
      </LinearGradient>

      {status === "loading" ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#2F6FE0" />
        </View>
      ) : status === "error" ? (
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
          <Text style={styles.emptyText}>Couldn't load your requests.</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="mail-open-outline" size={28} color="#B0B7C3" />
          <Text style={styles.emptyText}>No pending requests or invitations.</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(section) => section.key}
          contentContainerStyle={styles.listContent}
          renderItem={({ item: section }) =>
            section.key === "chat" ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {(section.data as ChatRequest[]).map((request) => (
                  <View key={request.requestId} style={styles.row}>
                    <View style={styles.avatar}>
                      {request.sender?.photoUrl ? (
                        <Image source={{ uri: request.sender.photoUrl }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarText}>{initialsFromName(request.sender?.name ?? "?")}</Text>
                      )}
                    </View>
                    <View style={styles.rowTextWrap}>
                      <Text style={styles.rowName}>{request.sender?.name ?? "Unknown student"}</Text>
                      <Text style={styles.rowSubtitle}>wants to message you</Text>
                    </View>
                    {actingId === `chat-${request.requestId}` ? (
                      <ActivityIndicator size="small" color="#2F6FE0" />
                    ) : (
                      <View style={styles.pillRow}>
                        <TouchableOpacity
                          style={[styles.pillButton, styles.pillButtonOutline]}
                          onPress={() => handleRejectChat(request)}
                          hitSlop={6}
                        >
                          <Text style={styles.pillButtonOutlineText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.pillButton} onPress={() => handleAcceptChat(request)} hitSlop={6}>
                          <Text style={styles.pillButtonText}>Accept</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {(section.data as GroupInvite[]).map((invite) => (
                  <View key={invite.requestId} style={styles.row}>
                    <View style={styles.avatar}>
                      {invite.groupImageUrl ? (
                        <Image source={{ uri: invite.groupImageUrl }} style={styles.avatarImage} />
                      ) : (
                        <Ionicons name="people" size={18} color="#2F6FE0" />
                      )}
                    </View>
                    <View style={styles.rowTextWrap}>
                      <Text style={styles.rowName}>{invite.groupTitle ?? "Group"}</Text>
                      <Text style={styles.rowSubtitle} numberOfLines={1}>
                        {invite.invitedBy ? `${invite.invitedBy.name} invited you` : "You were invited"}
                      </Text>
                    </View>
                    {actingId === `group-${invite.requestId}` ? (
                      <ActivityIndicator size="small" color="#2F6FE0" />
                    ) : (
                      <View style={styles.pillRow}>
                        <TouchableOpacity
                          style={[styles.pillButton, styles.pillButtonOutline]}
                          onPress={() => handleRejectInvite(invite)}
                          hitSlop={6}
                        >
                          <Text style={styles.pillButtonOutlineText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.pillButton} onPress={() => handleAcceptInvite(invite)} hitSlop={6}>
                          <Text style={styles.pillButtonText}>Accept</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

export default RequestsScreen;

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
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  rowTextWrap: {
    flex: 1,
  },
  rowName: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  rowSubtitle: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#7A828E",
    marginTop: 1,
  },
  pillRow: {
    flexDirection: "row",
    gap: 6,
  },
  pillButton: {
    backgroundColor: "#2F6FE0",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillButtonText: {
    fontSize: 11.5,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  pillButtonOutline: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pillButtonOutlineText: {
    fontSize: 11.5,
    fontFamily: fonts.bold,
    color: "#6B7280",
  },
});
