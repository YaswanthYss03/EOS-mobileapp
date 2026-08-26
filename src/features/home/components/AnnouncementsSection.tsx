import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Dimensions, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { formatRelativeTime } from "@/utils/calendar";
import { getAnnouncements, type Announcement } from "@/services/api/announcements.api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 16 * 2 - 24; // leaves a peek of the next card
const CARD_SPACING = 12;
const HOME_CAROUSEL_LIMIT = 3;
const NEW_BADGE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

function isRecent(isoTimestamp: string): boolean {
  return Date.now() - new Date(isoTimestamp).getTime() < NEW_BADGE_WINDOW_MS;
}

// GET /announcements is already fully scoped server-side to whatever this
// caller's role/class/department actually makes visible (see
// AnnouncementsService.buildVisibilityQuery) - this just shows the most
// recent few here, and the rest behind "View All"
// (app/(tabs)/home/announcements.tsx).
export function AnnouncementsSection() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    getAnnouncements()
      .then((all) => setAnnouncements(all.slice(0, HOME_CAROUSEL_LIMIT)))
      .catch(() => setAnnouncements([])); // a quiet failure here just hides the carousel, not worth a toast on the home feed
  }, []);

  if (announcements.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Ionicons name="megaphone-outline" size={16} color="#111827" />
        <Text style={styles.title}>Announcements</Text>
        <TouchableOpacity hitSlop={8} onPress={() => router.push("/(tabs)/home/announcements" as never)}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={announcements}
        keyExtractor={(item) => String(item.id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_SPACING));
          setActiveIndex(index);
        }}
        renderItem={({ item }) => (
          <AnnouncementCard
            announcement={item}
            onPress={() => router.push("/(tabs)/home/announcements" as never)}
          />
        )}
      />

      <View style={styles.dots}>
        {announcements.map((item, index) => (
          <View key={item.id} style={[styles.dot, index === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

function AnnouncementCard({ announcement, onPress }: { announcement: Announcement; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.card, { width: CARD_WIDTH }]} onPress={onPress} activeOpacity={0.9}>
      {isRecent(announcement.created_at) && (
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>NEW</Text>
          </View>
        </View>
      )}

      <View style={styles.cardBody}>
        <View style={styles.cardTextWrap}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {announcement.title}
          </Text>
          <Text style={styles.cardDescription} numberOfLines={2}>
            {announcement.content}
          </Text>
          <Text style={styles.cardMeta}>{formatRelativeTime(announcement.created_at)}</Text>
        </View>

        <View style={styles.decoration}>
          <View style={styles.decorationBox}>
            <Ionicons name="chevron-forward" size={16} color="#2F6FE0" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  viewAll: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  list: {
    paddingHorizontal: 16,
    gap: CARD_SPACING,
  },
  card: {
    backgroundColor: "#EAF1FE",
    borderRadius: 18,
    padding: 16,
    marginRight: CARD_SPACING,
    minHeight: 130,
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  badge: {
    backgroundColor: "#1A3D8F",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#fff",
    letterSpacing: 0.5,
  },
  cardBody: {
    flexDirection: "row",
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#4B5563",
    marginTop: 4,
    lineHeight: 18,
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#4B5563",
    marginTop: 8,
  },
  decoration: {
    width: 40,
    alignItems: "flex-end",
    justifyContent: "flex-end",
  },
  decorationBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(47,111,224,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  dotActive: {
    backgroundColor: "#2F6FE0",
    width: 16,
  },
});
