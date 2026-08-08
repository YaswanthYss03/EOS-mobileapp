import { View, Text, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { MyIdCard } from "@/services/api/profile.api";
import { fonts } from "@/theme";
import { CARD_HEIGHT, CARD_WIDTH } from "./idCardLayout";

const WAVE_TRANSITION = "M0,10 C70,-4 210,22 280,6 L280,34 L0,34 Z";

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

// Back face - the personal-details panel + signature strip + the same
// static, real institution contact block printed on the physical card
// (address/phone/email are the college's own published details, the same
// category of static branding already used in CollegeHeader.tsx). Kept in
// lock-step with buildIdCardHtml()'s back page.
export function IdCardBack({ card }: { card: MyIdCard }) {
  return (
    <View style={styles.card}>
      <View style={styles.body}>
        <Row label="Blood Group" value={card.blood_group} />
        <Row label="Date of Birth" value={card.date_of_birth} />
        <Row label={card.role === "student" ? "Parent Name" : "Contact"} value={card.parent_name} />
        <Row label="Resi. Tel. No" value={card.resi_tel_no} />
        <Row label="Address" value={card.address} />

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Holder Sign</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Principal</Text>
          </View>
        </View>
      </View>

      <Svg width={CARD_WIDTH} height={34} viewBox="0 0 280 34" style={styles.waveTransition} preserveAspectRatio="none">
        <Path d={WAVE_TRANSITION} fill="#8FCB4A" />
      </Svg>
      <View style={styles.institutionBar}>
        <Text style={styles.institutionName}>SRI ESHWAR COLLEGE OF ENGINEERING</Text>
        <Text style={styles.institutionLine}>Accredited by NAAC with 'A' Grade</Text>
        <Text style={styles.institutionLine}>
          Approved by AICTE, New Delhi · Affiliated to Anna University, Chennai
        </Text>
        <Text style={styles.institutionLine}>
          Kondampatti Post, Vadasithur via, Kinathukadavu, Coimbatore - 641202
        </Text>
        <Text style={styles.institutionLine}>Phone: 04259 200300 · Email: sece@sece.ac.in</Text>
      </View>
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
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 22,
  },
  row: {
    flexDirection: "row",
    marginBottom: 12,
  },
  rowLabel: {
    width: 96,
    fontSize: 11.5,
    fontFamily: fonts.semibold,
    color: "#374151",
  },
  rowValue: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingBottom: 14,
  },
  signatureBlock: {
    alignItems: "center",
    width: 100,
  },
  signatureLine: {
    width: "100%",
    height: 1,
    backgroundColor: "#9CA3AF",
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: "#6B7280",
  },
  waveTransition: {
    marginTop: -2,
  },
  institutionBar: {
    backgroundColor: "#1B3F91",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 14,
    gap: 2,
  },
  institutionName: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#F2C744",
    textAlign: "center",
    marginBottom: 2,
  },
  institutionLine: {
    fontSize: 7.5,
    fontFamily: fonts.regular,
    color: "#EAF0FD",
    textAlign: "center",
    lineHeight: 10,
  },
});
