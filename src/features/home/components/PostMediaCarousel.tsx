import { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import type { AnnouncementMedia } from "@/services/api/announcements.api";

/**
 * Swipeable photo/video carousel for a feed post.
 *
 * Sizing rule, which is the whole point of this component:
 *
 * The carousel picks ONE height for the whole post from the FIRST item's real
 * aspect ratio, then letterboxes every other slide inside it. That is what
 * Instagram does, and it matters because the alternative - resizing per slide -
 * makes the card grow and shrink as the user swipes, shoving the rest of the
 * feed up and down.
 *
 * The ratio comes from `width`/`height` stored at upload, so the correct box is
 * reserved BEFORE any bytes arrive and the feed never reflows. Older posts have
 * no stored dimensions; those fall back to measuring the first image on load,
 * which is why `measuredRatio` exists.
 *
 * A small image is NOT upscaled to fill the box - `resizeMode="contain"` shows
 * it at its own size on a neutral backdrop, rather than blowing a 400px graphic
 * up to full width and making it look broken.
 */

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_HORIZONTAL_MARGIN = 16;
const CARD_PADDING = 14;
const SLIDE_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_MARGIN * 2 - CARD_PADDING * 2;

// Bounds borrowed from the achievement PostCard so both feed cards agree:
// tall-portrait floor and wide-landscape ceiling, so one extreme image cannot
// take over the screen.
const MIN_ASPECT_RATIO = 0.55;
const MAX_ASPECT_RATIO = 1.91;
const DEFAULT_ASPECT_RATIO = 1;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function Slide({
  item,
  height,
  active,
}: {
  item: AnnouncementMedia;
  height: number;
  active: boolean;
}) {
  const [muted, setMuted] = useState(true);

  if (item.media_type === "video") {
    return (
      <View style={[styles.slide, { width: SLIDE_WIDTH, height }]}>
        <Video
          source={{ uri: item.url }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls={false}
          isLooping
          isMuted={muted}
          // Only the slide actually on screen plays. Without this every video
          // in the feed would decode at once and drain the battery.
          shouldPlay={active}
          posterSource={item.thumbnail_url ? { uri: item.thumbnail_url } : undefined}
          usePoster={Boolean(item.thumbnail_url)}
        />
        <TouchableOpacity
          style={styles.muteButton}
          onPress={() => setMuted((m) => !m)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name={muted ? "volume-mute" : "volume-high"} size={14} color="#fff" />
        </TouchableOpacity>
        {item.duration_seconds != null && (
          <View style={styles.durationChip}>
            <Text style={styles.durationText}>{formatDuration(item.duration_seconds)}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.slide, { width: SLIDE_WIDTH, height }]}>
      <Image
        source={{ uri: item.url }}
        style={StyleSheet.absoluteFill}
        // contain, not cover: never crop somebody's poster or upscale a small
        // graphic past its real size.
        resizeMode="contain"
      />
    </View>
  );
}

export function PostMediaCarousel({ media }: { media: AnnouncementMedia[] }) {
  const [index, setIndex] = useState(0);
  const [measuredRatio, setMeasuredRatio] = useState<number | null>(null);
  const listRef = useRef<FlatList<AnnouncementMedia>>(null);

  const ordered = useMemo(
    () => [...media].sort((a, b) => a.sequence_no - b.sequence_no),
    [media],
  );

  const first = ordered[0];

  // One height for the whole carousel, from the first slide. Stored dimensions
  // win; otherwise fall back to whatever the first image reported on load.
  const aspectRatio = useMemo(() => {
    if (first?.width && first?.height) {
      return clamp(first.width / first.height, MIN_ASPECT_RATIO, MAX_ASPECT_RATIO);
    }
    if (measuredRatio) {
      return clamp(measuredRatio, MIN_ASPECT_RATIO, MAX_ASPECT_RATIO);
    }
    return DEFAULT_ASPECT_RATIO;
  }, [first?.width, first?.height, measuredRatio]);

  const height = Math.round(SLIDE_WIDTH / aspectRatio);

  const onScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / SLIDE_WIDTH);
    setIndex(next);
  }, []);

  if (ordered.length === 0) return null;

  // A single item needs no pager, dots or measuring machinery.
  if (ordered.length === 1) {
    return (
      <View style={styles.wrapper}>
        <Slide item={ordered[0]} height={height} active />
        {!first?.width && first?.media_type === "photo" && (
          // Invisible probe purely to learn the real ratio of a legacy post
          // that has no stored dimensions.
          <Image
            source={{ uri: ordered[0].url }}
            style={styles.probe}
            onLoad={(event) => {
              const { width, height: h } = event.nativeEvent.source ?? {};
              if (width && h) setMeasuredRatio(width / h);
            }}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <FlatList
        ref={listRef}
        data={ordered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index: i }) => (
          <Slide item={item} height={height} active={i === index} />
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        // Fixed slide width means the list can skip measuring every child,
        // which keeps swiping smooth in a long feed.
        getItemLayout={(_, i) => ({
          length: SLIDE_WIDTH,
          offset: SLIDE_WIDTH * i,
          index: i,
        })}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
      />

      {/* Instagram-style counter: exact position, readable at a glance even
          with 10 items where dots alone become ambiguous. */}
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {index + 1}/{ordered.length}
        </Text>
      </View>

      <View style={styles.dots}>
        {ordered.map((item, i) => (
          <View key={item.id} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 10,
  },
  slide: {
    borderRadius: 12,
    overflow: "hidden",
    // Neutral backdrop behind a letterboxed or small image, so "contain" reads
    // as deliberate framing rather than a rendering gap.
    backgroundColor: "#0F172A",
  },
  probe: {
    width: 1,
    height: 1,
    opacity: 0,
    position: "absolute",
  },
  muteButton: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  durationChip: {
    position: "absolute",
    left: 10,
    bottom: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.6)",
  },
  durationText: {
    fontSize: 10.5,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  counter: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.65)",
  },
  counterText: {
    fontSize: 10.5,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D7DAE0",
  },
  dotActive: {
    backgroundColor: "#2F6FE0",
    width: 16,
  },
});
