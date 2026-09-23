import { useCallback, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedTabBar } from "@/components/ui/tabs";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { submitChildFeedback, submitCollegeFeedback } from "@/services/api/parents.api";
import { useParentChildren } from "./useParentChildren";
import { ChildSelector } from "./ChildSelector";

// Deliberately NOT AmenityServiceFeedbackScreen's Mess/Academic/Service
// star-rating filter (that whole mechanism - feedback_forms/
// feedback_responses - is coordinator-authored and hard-wired to "a
// student answering about themselves," not "a parent writing about
// someone/something else," per explicit request not to just clone the
// student UI). This is a plain free-text form with an optional 1-5 rating,
// backed by its own simple parent_feedback table - two segments, About
// Student (needs a child picker, since a parent can have more than one
// child) and About College (institute-wide, no child involved at all).
type Segment = "student" | "college";

const RATINGS = [1, 2, 3, 4, 5] as const;

export function ParentCampusFeedbackScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [segment, setSegment] = useState<Segment>("student");
  const { status: childrenStatus, error: childrenError, children, selectedChild, setSelectedChildId, reload: reloadChildren } =
    useParentChildren();

  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  function resetForm() {
    setMessage("");
    setRating(null);
  }

  function handleSubmit() {
    if (!message.trim()) {
      toast.warning("Write your feedback first");
      return;
    }
    if (segment === "student" && !selectedChild) {
      toast.warning("Select a child");
      return;
    }

    setSubmitting(true);
    const payload = { message: message.trim(), rating: rating ?? undefined };
    const request =
      segment === "student" && selectedChild
        ? submitChildFeedback(selectedChild.id, payload)
        : submitCollegeFeedback(payload);

    request
      .then(() => {
        toast.success("Thanks for your feedback");
        resetForm();
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't submit your feedback.")))
      .finally(() => setSubmitting(false));
  }

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
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AnimatedTabBar
          tabs={[
            { key: "student" as Segment, label: "About Student" },
            { key: "college" as Segment, label: "About College" },
          ]}
          active={segment}
          onChange={(key) => {
            setSegment(key);
            resetForm();
          }}
          containerStyle={styles.tabSwitch}
          tabStyle={styles.tabSwitchButton}
          tabTextStyle={styles.tabSwitchText}
          activeTabTextStyle={styles.tabSwitchTextActive}
          indicatorStyle={styles.tabSwitchIndicator}
        />

        {segment === "student" && (
          <View style={styles.section}>
            {childrenStatus === "loading" ? (
              <SkeletonListRows count={2} />
            ) : childrenStatus === "error" ? (
              <View style={styles.errorNotice}>
                <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
                <Text style={styles.errorNoticeText}>{childrenError ?? "Something went wrong."}</Text>
                <TouchableOpacity onPress={reloadChildren} style={styles.retryButton} activeOpacity={0.8}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : children.length === 0 ? (
              <Text style={styles.emptyText}>No linked children found</Text>
            ) : selectedChild ? (
              <ChildSelector children={children} selected={selectedChild} onSelect={(c) => setSelectedChildId(c.id)} />
            ) : null}
          </View>
        )}

        <Text style={styles.fieldLabel}>
          {segment === "student" ? "How is your child doing? Any concerns?" : "What would you like the college to know?"}
        </Text>
        <TextInput
          style={styles.input}
          placeholder={
            segment === "student"
              ? "Share how your child is doing, any concerns about their studies, wellbeing, or campus life…"
              : "Share your thoughts on campus facilities, communication, administration, or anything else…"
          }
          placeholderTextColor="#9AA6B2"
          value={message}
          onChangeText={setMessage}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.fieldLabel}>Overall rating (optional)</Text>
        <View style={styles.ratingRow}>
          {RATINGS.map((value) => {
            const selected = rating !== null && value <= rating;
            return (
              <TouchableOpacity key={value} onPress={() => setRating(value === rating ? null : value)} activeOpacity={0.8} hitSlop={6}>
                <Ionicons name={selected ? "star" : "star-outline"} size={30} color={selected ? "#F59E0B" : "#D1D5DB"} />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Submit feedback</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  backButton: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 20, fontFamily: fonts.bold },
  content: { padding: 16, paddingBottom: 32 },
  tabSwitch: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabSwitchButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 12,
  },
  tabSwitchIndicator: {
    top: 0,
    bottom: 0,
    borderRadius: 9,
    backgroundColor: "#2F6FE0",
  },
  tabSwitchText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  tabSwitchTextActive: {
    color: "#fff",
    fontFamily: fonts.bold,
  },
  section: { marginTop: 14 },
  errorNotice: { alignItems: "center", gap: 8, paddingVertical: 16 },
  errorNoticeText: { fontSize: 13, fontFamily: fonts.regular, color: "#6B7280", textAlign: "center" },
  retryButton: { marginTop: 4, borderRadius: 999, borderWidth: 1, borderColor: "#2F6FE0", paddingHorizontal: 16, paddingVertical: 6 },
  retryButtonText: { fontSize: 12, fontFamily: fonts.bold, color: "#2F6FE0" },
  emptyText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2" },
  fieldLabel: { fontSize: 13, fontFamily: fonts.semibold, color: "#374151", marginTop: 18, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#111827",
    height: 140,
  },
  ratingRow: { flexDirection: "row", gap: 10 },
  submitButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 24,
  },
  submitButtonText: { fontSize: 15, fontFamily: fonts.bold, color: "#fff" },
  buttonDisabled: { opacity: 0.6 },
});
