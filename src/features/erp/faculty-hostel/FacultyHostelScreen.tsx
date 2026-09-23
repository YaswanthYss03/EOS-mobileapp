import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { BackHeader } from "@/components/layout/BackHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { AnchoredDropdown, useDropdown } from "@/components/ui/dropdown";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import type { HostelComplaintCategory, MyHostelComplaint } from "@/services/api/hostel.api";
import {
  createFacultyHostelComplaint,
  listMyFacultyHostelComplaints,
} from "@/services/api/faculty-hostel-complaints.api";

const COMPLAINT_CATEGORIES = ["Electrical", "Plumbing", "Furniture", "Internet/WiFi", "Housekeeping"];

const CATEGORY_TO_ENUM: Record<string, HostelComplaintCategory> = {
  Electrical: "electrical",
  Plumbing: "plumbing",
  Furniture: "carpentry",
  "Internet/WiFi": "network",
  Housekeeping: "facilities",
};

// This tab's content for a hostel-resident Faculty (see
// app/(tabs)/bus-tracking/index.tsx's isHosteller) - a Complaints page: raise
// a hostel complaint against their own room/block, and see the status of
// ones already raised. Same hostel_complaints table/category enum as the
// student-facing StudentHostelComplaintsScreen, just faculty-keyed server
// side (see FacultyHostelComplaintsService).
export function FacultyHostelScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState(COMPLAINT_CATEGORIES[0]);
  const categoryPicker = useDropdown();
  const [description, setDescription] = useState("");

  const [listStatus, setListStatus] = useState<"loading" | "success" | "error">("loading");
  const [complaints, setComplaints] = useState<MyHostelComplaint[]>([]);

  const loadComplaints = useCallback(() => {
    setListStatus("loading");
    listMyFacultyHostelComplaints()
      .then((rows) => {
        setComplaints(rows);
        setListStatus("success");
      })
      .catch(() => setListStatus("error"));
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  function handleSubmit() {
    if (!description.trim()) {
      toast.warning("Describe the issue");
      return;
    }

    setIsSubmitting(true);
    createFacultyHostelComplaint({
      category: CATEGORY_TO_ENUM[category] ?? "other",
      title: `${category} issue`.slice(0, 150),
      description: description.trim(),
    })
      .then(() => {
        toast.success("Complaint raised with the warden's office");
        setDescription("");
        loadComplaints();
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't raise the complaint.")))
      .finally(() => setIsSubmitting(false));
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <BackHeader title="Hostel" onBack={() => router.replace("/(tabs)/home")} />
      <WatermarkBackground />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Raise a complaint</Text>
          <Text style={styles.fieldLabel}>Category</Text>
          <View ref={categoryPicker.anchorRef} collapsable={false}>
            <TouchableOpacity style={styles.selectRow} onPress={categoryPicker.open} activeOpacity={0.8}>
              <Text style={styles.selectValue}>{category}</Text>
              <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Describe the issue</Text>
          <TextInput
            style={styles.textArea}
            placeholder="e.g. Ceiling fan in room 214 is not working"
            placeholderTextColor="#9AA6B2"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85} disabled={isSubmitting}>
            <Text style={styles.submitButtonText}>Raise complaint</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>My complaints</Text>
        {listStatus === "loading" ? (
          <SkeletonListRows count={3} />
        ) : listStatus === "error" ? (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={26} color="#B0B7C3" />
            <Text style={styles.centerStateText}>Couldn't load your complaints.</Text>
            <TouchableOpacity onPress={loadComplaints} activeOpacity={0.8}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        ) : complaints.length === 0 ? (
          <View style={styles.centerState}>
            <Text style={styles.centerStateText}>No complaints raised yet.</Text>
          </View>
        ) : (
          complaints.map((c) => (
            <View key={c.id} style={styles.complaintRow}>
              <View style={styles.complaintTextWrap}>
                <Text style={styles.complaintTitle} numberOfLines={1}>{c.title}</Text>
                {c.description ? (
                  <Text style={styles.complaintDescription} numberOfLines={2}>{c.description}</Text>
                ) : null}
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{c.status}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <AnchoredDropdown
        anchorRef={categoryPicker.anchorRef}
        visible={categoryPicker.visible}
        onClose={categoryPicker.close}
        contentStyle={styles.anchoredCard}
      >
        <Text style={styles.modalTitle}>Category</Text>
        {COMPLAINT_CATEGORIES.map((option) => (
          <TouchableOpacity
            key={option}
            style={styles.modalOptionRow}
            onPress={() => {
              setCategory(option);
              categoryPicker.close();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.modalOptionName}>{option}</Text>
            {category === option && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
          </TouchableOpacity>
        ))}
      </AnchoredDropdown>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 14, fontFamily: fonts.bold, color: "#111827", marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontFamily: fonts.medium, color: "#6B7280", marginBottom: 6 },
  fieldLabelSpaced: { marginTop: 12 },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectValue: { fontSize: 13, fontFamily: fonts.medium, color: "#111827" },
  textArea: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#111827",
    minHeight: 80,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#2F6FE0",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 14,
  },
  submitButtonText: { fontSize: 13, fontFamily: fonts.bold, color: "#fff" },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  complaintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  complaintTextWrap: { flex: 1 },
  complaintTitle: { fontSize: 13, fontFamily: fonts.bold, color: "#111827" },
  complaintDescription: { fontSize: 11.5, fontFamily: fonts.regular, color: "#9AA6B2", marginTop: 2 },
  statusBadge: { backgroundColor: "#EFF6FF", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusBadgeText: { fontSize: 10.5, fontFamily: fonts.bold, color: "#2F6FE0", textTransform: "capitalize" },
  centerState: { alignItems: "center", paddingVertical: 30, gap: 8 },
  centerStateText: { fontSize: 12.5, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center" },
  retryText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0" },
  anchoredCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 6,
    minWidth: 200,
  },
  modalTitle: { fontSize: 12, fontFamily: fonts.bold, color: "#8A93A3", paddingHorizontal: 14, paddingVertical: 8 },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalOptionName: { fontSize: 13, fontFamily: fonts.medium, color: "#111827" },
});
