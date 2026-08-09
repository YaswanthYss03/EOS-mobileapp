import { useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import type { MyIdCard } from "@/services/api/profile.api";
import { CARD_HEIGHT, CARD_WIDTH } from "./idCardLayout";
import { IdCardFront } from "./IdCardFront";
import { IdCardBack } from "./IdCardBack";

const FLIP_DURATION = 620;

// Tap-to-flip 3D card, front <-> back. Both faces are mounted the whole
// time and cross-fade at the 90-degree mark (rather than relying on
// backfaceVisibility alone) since Android's support for it is inconsistent -
// this keeps the mirrored back face from ever flashing through the front.
// A slight forward tilt (rotateX) and a light sweep are layered on top of
// the rotateY itself purely to sell the sense of a physical card turning
// in space rather than a flat texture-swap.
export function FlippableIdCard({ card }: { card: MyIdCard }) {
  const flip = useRef(new Animated.Value(0)).current;
  const [showingBack, setShowingBack] = useState(false);

  function handleFlip() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Animated.timing(flip, {
      toValue: showingBack ? 0 : 180,
      duration: FLIP_DURATION,
      easing: Easing.bezier(0.33, 1, 0.68, 1),
      useNativeDriver: true,
    }).start();
    setShowingBack((prev) => !prev);
  }

  const frontRotateY = flip.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });
  const backRotateY = flip.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });
  const frontOpacity = flip.interpolate({
    inputRange: [0, 89, 90, 180],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = flip.interpolate({
    inputRange: [0, 90, 91, 180],
    outputRange: [0, 0, 1, 1],
  });
  // A forward tilt + lift that peaks mid-flip, as if the card is being
  // rotated up off the table rather than spinning flat in place.
  const rotateX = flip.interpolate({
    inputRange: [0, 90, 180],
    outputRange: ["0deg", "7deg", "0deg"],
  });
  const scale = flip.interpolate({
    inputRange: [0, 90, 180],
    outputRange: [1, 1.08, 1],
  });
  const translateY = flip.interpolate({
    inputRange: [0, 90, 180],
    outputRange: [0, -10, 0],
  });
  // Diagonal light-sweep highlight, translating across whichever face is
  // visible as it turns - mimics light catching a glossy laminated card.
  const sweepTranslate = flip.interpolate({
    inputRange: [0, 90, 180],
    outputRange: [-CARD_WIDTH, CARD_WIDTH, -CARD_WIDTH],
  });
  const sweepOpacity = flip.interpolate({
    inputRange: [0, 60, 90, 120, 180],
    outputRange: [0, 0.5, 0.7, 0.5, 0],
  });

  return (
    <Pressable onPress={handleFlip} style={styles.wrap}>
      <Animated.View
        style={[
          styles.face,
          styles.shadow,
          {
            opacity: frontOpacity,
            transform: [
              { perspective: 1400 },
              { translateY },
              { rotateX },
              { rotateY: frontRotateY },
              { scale },
            ],
          },
        ]}
      >
        <IdCardFront card={card} />
        <Sweep translateX={sweepTranslate} opacity={sweepOpacity} />
      </Animated.View>
      <Animated.View
        style={[
          styles.face,
          styles.shadow,
          {
            opacity: backOpacity,
            transform: [
              { perspective: 1400 },
              { translateY },
              { rotateX },
              { rotateY: backRotateY },
              { scale },
            ],
          },
        ]}
      >
        <IdCardBack card={card} />
        <Sweep translateX={sweepTranslate} opacity={sweepOpacity} />
      </Animated.View>
    </Pressable>
  );
}

function Sweep({ translateX, opacity }: { translateX: Animated.AnimatedInterpolation<number>; opacity: Animated.AnimatedInterpolation<number> }) {
  return (
    <Animated.View pointerEvents="none" style={[styles.sweepWrap, { opacity }]}>
      <Animated.View style={[styles.sweepInner, { transform: [{ translateX }, { rotate: "20deg" }] }]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.55)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  face: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 14,
    backfaceVisibility: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  shadow: {
    elevation: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  sweepWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  sweepInner: {
    position: "absolute",
    top: -60,
    bottom: -60,
    width: 90,
  },
});
