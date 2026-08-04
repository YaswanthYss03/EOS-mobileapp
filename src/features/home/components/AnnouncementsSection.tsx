import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Dimensions, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { mockAnnouncements, type Announcement } from "../data/mockAnnouncements";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 16 * 2 - 24; // leaves a peek of the next card
const CARD_SPACING = 12;

export function AnnouncementsSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Ionicons name="megaphone-outline" size={16} color="#111827" />
        <Text style={styles.title}>Announcements</Text>
        <TouchableOpacity hitSlop={8}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={mockAnnouncements}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_SPACING));
          setActiveIndex(index);
        }}
        renderItem={({ item }) => <AnnouncementCard announcement={item} />}
      />

      <View style={styles.dots}>
        {mockAnnouncements.map((item, index) => (
          <View key={item.id} style={[styles.dot, index === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  return (
    <View style={[styles.card, { width: CARD_WIDTH }]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{announcement.badge}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTextWrap}>
          <Text style={styles.cardTitle}>{announcement.title}</Text>
          <Text style={styles.cardDescription}>{announcement.description}</Text>
          <Text style={styles.cardMeta}>{announcement.meta}</Text>

          <TouchableOpacity style={styles.cta} activeOpacity={0.85}>
            <Text style={styles.ctaText}>{announcement.ctaLabel}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.decoration}>
          <View style={styles.decorationBox}>
            <Ionicons name="code-slash-outline" size={16} color="#2F6FE0" />
          </View>
          <View style={styles.decorationLine} />
          <View style={styles.decorationCircle} />
        </View>
      </View>
    </View>
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
    minHeight: 150,
  },
  badge: {
    position: "absolute",
    top: 14,
    left: 16,
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
    marginTop: 26,
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
    marginTop: 2,
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#4B5563",
    marginTop: 4,
  },
  cta: {
    alignSelf: "flex-start",
    backgroundColor: "#1A3D8F",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
  },
  ctaText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  decoration: {
    width: 56,
    alignItems: "flex-end",
  },
  decorationBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(47,111,224,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  decorationLine: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(47,111,224,0.25)",
    marginTop: 8,
  },
  decorationCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(47,111,224,0.18)",
    marginTop: 10,
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
