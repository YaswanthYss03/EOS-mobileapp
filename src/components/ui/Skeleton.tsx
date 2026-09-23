import { useEffect, useRef } from "react";
import { Animated, View, StyleSheet, type ViewStyle, type StyleProp } from "react-native";

// Shared "page is loading" placeholder system - a pulsing gray block plus a
// few composed layouts matching the shapes that repeat across this app's
// screens (a list of bordered cards, a 3-per-row icon grid, a row of stat
// cards). Used in place of a bare centered ActivityIndicator so a loading
// screen shows the shape of what's coming instead of going blank.
//
// Plain Animated (not reanimated, despite it being a dependency) - a single
// looping opacity tween needs nothing worklet-based, and this keeps every
// screen that adopts it from having to think about reanimated at all.
export function SkeletonBlock({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

// One bordered white card shaped like the list-item cards used across
// dashboards, history lists, borrow/leave/drive rows, etc. - a title-width
// line, a shorter meta-width line, done `count` times.
export function SkeletonListRows({
  count = 4,
  style,
}: {
  count?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.row}>
          <SkeletonBlock width="70%" height={14} style={{ marginBottom: 8 }} />
          <SkeletonBlock width="45%" height={11} />
        </View>
      ))}
    </View>
  );
}

// Circle + label, 3-per-row - matches CampusIconGrid/QuickAccessGrid.
export function SkeletonIconGrid({
  count = 9,
  style,
}: {
  count?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.grid, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.gridItem}>
          <SkeletonBlock width={60} height={60} borderRadius={30} style={{ marginBottom: 6 }} />
          <SkeletonBlock width={44} height={10} />
        </View>
      ))}
    </View>
  );
}

// A row of small stat cards - matches StudentDashboard's Attendance/
// Performance/Fees row and similar summary rows elsewhere.
export function SkeletonStatCards({
  count = 3,
  style,
}: {
  count?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.statRow, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.statCard}>
          <SkeletonBlock width={36} height={36} borderRadius={18} style={{ marginBottom: 10 }} />
          <SkeletonBlock width="80%" height={11} style={{ marginBottom: 8 }} />
          <SkeletonBlock width="60%" height={16} />
        </View>
      ))}
    </View>
  );
}

// Matches PostCard/AnnouncementPostCard's real shape (Home feed) - an
// edge-to-edge card with an avatar+name header, a couple of text lines, and
// a large image block - unlike the generic bordered SkeletonListRows shape,
// which looks nothing like an actual feed post (no avatar, no image, a
// rounded border the real cards don't have) and read as "wrong" while the
// feed was loading.
export function SkeletonFeedCards({
  count = 3,
  style,
}: {
  count?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.feedCard}>
          <View style={styles.feedHeaderRow}>
            <SkeletonBlock width={30} height={30} borderRadius={8} />
            <View style={styles.feedHeaderTextWrap}>
              <SkeletonBlock width="55%" height={12} style={{ marginBottom: 6 }} />
              <SkeletonBlock width="35%" height={10} />
            </View>
          </View>
          <SkeletonBlock width="80%" height={13} style={{ marginTop: 12, marginBottom: 8 }} />
          <SkeletonBlock width="95%" height={11} style={{ marginBottom: 12 }} />
          <SkeletonBlock width="100%" height={180} borderRadius={12} />
        </View>
      ))}
    </View>
  );
}

// Matches ProductCard's own shape (Stationery Store) - an image block, a
// name line, a price/stock row, and an add-button block - unlike
// SkeletonListRows, which has no image or button and reads as "wrong" for a
// product grid. `cardStyle` lets the caller reuse the exact width the real
// ProductCard uses at each call site (a fixed width in a horizontal row, a
// "47%" in a wrapping grid) so the skeleton lines up with what replaces it.
export function SkeletonProductGrid({
  count = 6,
  cardStyle,
  style,
}: {
  count?: number;
  cardStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.productGrid, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.productCard, cardStyle]}>
          <SkeletonBlock width="100%" height={78} borderRadius={0} />
          <View style={styles.productCardBody}>
            <SkeletonBlock width="85%" height={11} style={{ marginBottom: 6 }} />
            <SkeletonBlock width="55%" height={11} style={{ marginBottom: 8 }} />
            <SkeletonBlock width="100%" height={26} borderRadius={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

// A single detail-page block - a couple of full-width lines then a
// paragraph-height block, for screens that show one record's details
// rather than a list (e.g. a borrow record, a leave request).
export function SkeletonDetailBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonBlock width="60%" height={16} style={{ marginBottom: 12 }} />
      <SkeletonBlock width="90%" height={12} style={{ marginBottom: 8 }} />
      <SkeletonBlock width="80%" height={12} style={{ marginBottom: 8 }} />
      <SkeletonBlock width="40%" height={12} />
    </View>
  );
}

// A month calendar's own shape - a nav row, a weekday header row, and a
// 6-week grid of day-cell circles - for screens whose loading state is a
// calendar (Academic Calendar, Attendance) rather than a generic card, so
// the placeholder actually previews a grid instead of one plain block.
export function SkeletonCalendarBlock({
  style,
  showNavRow = true,
}: {
  style?: StyleProp<ViewStyle>;
  // Screens that already render their own real month-nav row (month label +
  // prev/next arrows) above this component only need the weekday/day-grid
  // part - a second skeleton nav row above the real one would be redundant.
  showNavRow?: boolean;
}) {
  return (
    <View style={[styles.card, style]}>
      {showNavRow && (
        <View style={styles.calendarNavRow}>
          <SkeletonBlock width={32} height={32} borderRadius={10} />
          <SkeletonBlock width={110} height={16} />
          <SkeletonBlock width={32} height={32} borderRadius={10} />
        </View>
      )}
      <View style={styles.calendarWeekdayRow}>
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonBlock key={i} width={18} height={10} style={styles.calendarWeekdayCell} />
        ))}
      </View>
      {Array.from({ length: 6 }).map((_, row) => (
        <View key={row} style={styles.calendarWeekRow}>
          {Array.from({ length: 7 }).map((_, col) => (
            <SkeletonBlock key={col} width={30} height={30} borderRadius={15} style={styles.calendarDayCell} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: "#E5E7EB",
  },
  row: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
  },
  feedCard: {
    backgroundColor: "#fff",
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  feedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  feedHeaderTextWrap: {
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    overflow: "hidden",
  },
  productCardBody: {
    padding: 10,
  },
  gridItem: {
    width: "33.33%",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
  },
  calendarNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  calendarWeekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  calendarWeekdayCell: {
    flex: 1,
    alignSelf: "center",
    marginHorizontal: 4,
  },
  calendarWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  calendarDayCell: {
    flex: 1,
    alignSelf: "center",
    marginHorizontal: 4,
  },
});
