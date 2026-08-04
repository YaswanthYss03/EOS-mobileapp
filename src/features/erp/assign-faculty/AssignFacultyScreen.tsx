import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { classInfo, mockFacultyOptions, mockSubjects, type Subject } from "./data/mockAssignFaculty";

function initialsFromName(name: string) {
  return name
    .replace(/^(Dr|Mr|Mrs|Ms)\.?\s+/i, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// TODO: this is an assignment UI over mockAssignFaculty - wire to a real
// faculty-assignment backend endpoint once one exists. Reachable from the
// HoD dashboard's "Assign Faculty" item.
export function AssignFacultyScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [subjects, setSubjects] = useState(mockSubjects);
  const [pickerSubjectId, setPickerSubjectId] = useState<string | null>(null);

  // This screen renders its own full header below, so hide the shared
  // CollegeHeader while it's focused - same pattern as the other ERP
  // sub-screens.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  function facultyName(id: string | null) {
    return mockFacultyOptions.find((f) => f.id === id)?.name ?? null;
  }

  function handleAssign(subjectId: string, facultyId: string | null) {
    setSubjects((prev) => prev.map((s) => (s.id === subjectId ? { ...s, assignedFacultyId: facultyId } : s)));
    setPickerSubjectId(null);
    const subject = subjects.find((s) => s.id === subjectId);
    if (facultyId) {
      toast.success(`${facultyName(facultyId)} assigned to ${subject?.name}`);
    } else {
      toast.info(`Assignment cleared for ${subject?.name}`);
    }
  }

  const pickerSubject = subjects.find((s) => s.id === pickerSubjectId) ?? null;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Assign Faculty</Text>
          <Text style={styles.headerSubtitle}>
            {classInfo.className} · {subjects.length} subjects
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.classCard} activeOpacity={0.8}>
          <View style={styles.classIconWrap}>
            <Ionicons name="book-outline" size={16} color="#2F6FE0" />
          </View>
          <View style={styles.classTextWrap}>
            <Text style={styles.classTitle}>{classInfo.className}</Text>
            <Text style={styles.classSubtitle}>
              {classInfo.studentCount} students · {classInfo.advisorName}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
        </TouchableOpacity>

        {subjects.map((subject) => {
          const assignedName = facultyName(subject.assignedFacultyId);
          return (
            <View key={subject.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{subject.name}</Text>
                <View style={[styles.statusBadge, !assignedName && styles.statusBadgeUnassigned]}>
                  <Text style={[styles.statusBadgeText, !assignedName && styles.statusBadgeTextUnassigned]}>
                    {assignedName ? "Assigned" : "Unassigned"}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle2}>
                {subject.code} · {subject.className}
              </Text>

              <TouchableOpacity
                style={styles.facultyRow}
                onPress={() => setPickerSubjectId(subject.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.facultyAvatar, !assignedName && styles.facultyAvatarEmpty]}>
                  <Text style={styles.facultyAvatarText}>
                    {assignedName ? initialsFromName(assignedName) : "–"}
                  </Text>
                </View>
                <Text style={[styles.facultyName, !assignedName && styles.facultyNamePlaceholder]}>
                  {assignedName ?? "Select a faculty member"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={pickerSubject !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setPickerSubjectId(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerSubjectId(null)}
        >
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>{pickerSubject?.name}</Text>
            <Text style={styles.modalSubtitle}>Select a faculty member</Text>

            <ScrollView style={styles.modalList}>
              {mockFacultyOptions.map((option) => {
                const selected = pickerSubject?.assignedFacultyId === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.modalOptionRow}
                    onPress={() => pickerSubject && handleAssign(pickerSubject.id, option.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.modalOptionAvatar}>
                      <Text style={styles.modalOptionAvatarText}>{initialsFromName(option.name)}</Text>
                    </View>
                    <Text style={styles.modalOptionName}>{option.name}</Text>
                    {selected && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {pickerSubject?.assignedFacultyId && (
              <TouchableOpacity
                style={styles.modalClearButton}
                onPress={() => pickerSubject && handleAssign(pickerSubject.id, null)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalClearButtonText}>Clear assignment</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

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
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  classCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  classIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  classTextWrap: {
    flex: 1,
  },
  classTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  classSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  cardSubtitle2: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: "#E4EBFB",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeUnassigned: {
    backgroundColor: "#F1F3F6",
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  statusBadgeTextUnassigned: {
    color: "#6B7280",
  },
  facultyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  facultyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  facultyAvatarEmpty: {
    backgroundColor: "#F1F3F6",
  },
  facultyAvatarText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  facultyName: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  facultyNamePlaceholder: {
    color: "#9AA6B2",
    fontFamily: fonts.regular,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
    marginBottom: 12,
  },
  modalList: {
    marginBottom: 8,
  },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalOptionAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOptionAvatarText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  modalOptionName: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  modalClearButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  modalClearButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#DC2626",
  },
});
