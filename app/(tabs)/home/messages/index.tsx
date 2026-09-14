import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { formatRelativeTime } from "@/utils/calendar";
import {
  searchPeople,
  createConversation,
  listConversations,
  type MessagePerson,
  type ConversationSummary,
} from "@/services/api/messaging.api";
import { useMessaging } from "@/context/MessagingContext";

function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function Header({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 10 }]}
    >
      <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-back" size={20} color="#fff" />
      </TouchableOpacity>
      <View>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSubtitle}>Search anyone at your college</Text>
      </View>
    </LinearGradient>
  );
}

export function MessagesListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { refreshUnreadCount } = useMessaging();

  // Same pattern as OnlineClassScreen/FacultyAttendanceScreen/the
  // conversation screen: hide the shared header immediately on focus (no
  // setTimeout - a deferred hide can lose a race against the conversation
  // screen's own focus effect). Restoring only happens on a genuine exit
  // (back/swipe-back out to Home) via beforeRemove below, never on blur -
  // blur also fires when merely pushing into a conversation, which should
  // NOT restore the header since that screen keeps it hidden too.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      refreshUnreadCount();
    }, [navigation, refreshUnreadCount]),
  );

  useEffect(() => {
    return navigation.addListener("beforeRemove", () => {
      navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
    });
  }, [navigation]);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MessagePerson[]>([]);
  const [searching, setSearching] = useState(false);
  const [startingChatWith, setStartingChatWith] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  const loadConversations = useCallback(() => {
    setStatus("loading");
    listConversations()
      .then((rows) => {
        setConversations(rows);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations]),
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      searchPeople(trimmed)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function openConversation(conversationId: number, name: string, roleLabel: string, otherUserId: number) {
    setQuery("");
    router.push({
      pathname: "/(tabs)/home/messages/[conversationId]",
      params: { conversationId: String(conversationId), name, roleLabel, otherUserId: String(otherUserId) },
    } as never);
  }

  async function handleStartConversation(person: MessagePerson) {
    if (startingChatWith !== null) return;
    setStartingChatWith(person.userId);
    try {
      const conversation = await createConversation(person.userId);
      openConversation(conversation.id, person.name, person.roleLabel, person.userId);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't start this conversation."));
    } finally {
      setStartingChatWith(null);
    }
  }

  const isSearching = query.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Header onBack={() => router.back()} />

      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color="#9AA6B2" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#9AA6B2"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color="#B0B7C3" />
          </TouchableOpacity>
        )}
      </View>

      {isSearching ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => String(item.userId)}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            searching ? (
              <View style={styles.centerState}>
                <ActivityIndicator color="#2F6FE0" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            !searching ? (
              <View style={styles.centerState}>
                <Text style={styles.emptyText}>No one found matching "{query.trim()}"</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              disabled={startingChatWith !== null}
              onPress={() => handleStartConversation(item)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initialsFromName(item.name)}</Text>
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowSubtitle}>{item.roleLabel}</Text>
              </View>
              {startingChatWith === item.userId ? (
                <ActivityIndicator size="small" color="#2F6FE0" />
              ) : (
                <Ionicons name="chevron-forward" size={16} color="#B0B7C3" />
              )}
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshing={status === "loading"}
          onRefresh={loadConversations}
          ListEmptyComponent={
            status === "loading" ? (
              <View style={styles.centerState}>
                <ActivityIndicator color="#2F6FE0" />
              </View>
            ) : status === "error" ? (
              <View style={styles.centerState}>
                <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
                <Text style={styles.emptyText}>Couldn't load your messages.</Text>
                <TouchableOpacity onPress={loadConversations}>
                  <Text style={styles.retryText}>Tap to retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.centerState}>
                <Ionicons name="chatbubbles-outline" size={28} color="#B0B7C3" />
                <Text style={styles.emptyText}>No conversations yet.</Text>
                <Text style={styles.emptySubtext}>Search above to message someone.</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => openConversation(item.id, item.otherUser.name, item.otherUser.roleLabel, item.otherUser.userId)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initialsFromName(item.otherUser.name)}</Text>
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowName}>{item.otherUser.name}</Text>
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {item.otherUser.roleLabel}
                </Text>
                {item.lastMessage && (
                  <Text style={styles.rowPreview} numberOfLines={1}>
                    {item.lastMessage.isDeleted ? "Message deleted" : item.lastMessage.body}
                  </Text>
                )}
              </View>
              <View style={styles.rowMeta}>
                {item.lastMessageAt && (
                  <Text style={styles.rowTime}>{formatRelativeTime(item.lastMessageAt)}</Text>
                )}
                {item.unreadCount > 0 && <View style={styles.unreadDot} />}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

export default MessagesListScreen;

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
  headerSubtitle: {
    color: "#D7E2FA",
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#111827",
    padding: 0,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
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
  rowPreview: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 3,
  },
  rowMeta: {
    alignItems: "flex-end",
    gap: 6,
  },
  rowTime: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2F6FE0",
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#B0B7C3",
  },
  retryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
});
