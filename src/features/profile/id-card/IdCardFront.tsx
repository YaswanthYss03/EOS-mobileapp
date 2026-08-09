import { View, Text, Image, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { MyIdCard } from "@/services/api/profile.api";
import { fonts } from "@/theme";
import { CARD_HEIGHT, CARD_WIDTH, WAVE_BLUE, WAVE_GOLD, WAVE_GREEN } from "./idCardLayout";

const logoSource = require("../../../../assets/logo.png");

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

// Front face - kept visually in lock-step with buildIdCardHtml() (idCardHtml.ts),
// which renders the same layout (both sides) for the downloaded PDF.
export function IdCardFront({ card }: { card: MyIdCard }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Image source={logoSource} style={styles.logo} />
        <View style={styles.titles}>
          <Text style={styles.collegeName} numberOfLines={2}>
            Sri Eshwar College of Engineering
          </Text>
          <Text style={styles.sub}>An Autonomous Institution</Text>
          <Text style={styles.sub}>Accredited by NAAC | NBA</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.body}>
        {card.photo_url ? (
          <Image source={{ uri: card.photo_url }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={styles.photoInitials}>{initialsFromName(card.name)}</Text>
          </View>
        )}

        <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
          {card.name}
        </Text>
        <Text style={styles.secondaryId} numberOfLines={1}>
          {card.secondary_id}
        </Text>
        <Text style={styles.line2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {card.degree_dept_label}
        </Text>
        {card.batch_label && (
          <Text style={styles.line3} numberOfLines={1}>
            {card.batch_label}
          </Text>
        )}
      </View>

      <Svg
        width={CARD_WIDTH}
        height={40}
        viewBox="0 0 280 46"
        style={styles.footer}
        preserveAspectRatio="none"
      >
        <Path d={WAVE_BLUE} fill="#1B3F91" />
        <Path d={WAVE_GOLD} fill="#F0CF7A" />
        <Path d={WAVE_GREEN} fill="#8FCB4A" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    width: "100%",
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 10,
  },
  logo: {
    width: 42,
    height: 42,
    resizeMode: "contain",
    marginTop: 2,
  },
  titles: {
    flex: 1,
  },
  collegeName: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#14264D",
    lineHeight: 16,
  },
  sub: {
    fontSize: 8.5,
    fontFamily: fonts.semibold,
    color: "#4B5563",
    marginTop: 2,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  body: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    width: "100%",
  },
  photo: {
    width: 124,
    height: 150,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: "#111827",
    backgroundColor: "#F3F4F6",
  },
  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  photoInitials: {
    fontSize: 32,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  name: {
    marginTop: 14,
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
    maxWidth: "100%",
  },
  secondaryId: {
    marginTop: 3,
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  line2: {
    marginTop: 8,
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    maxWidth: "100%",
  },
  line3: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  footer: {
    marginTop: "auto",
  },
});
