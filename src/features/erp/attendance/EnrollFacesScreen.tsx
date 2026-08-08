import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { getMyMentorClasses, type MentorClass } from "@/services/api/class-mentors.api";
import {
  getEnrollmentRoster,
  enrollStudentFace,
  type EnrollmentRosterStudent,
} from "@/services/api/attendance-cv.api";
import { FaceCaptureCamera } from "./FaceCaptureCamera";

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Advisor-only: "the advisor can add the images of each student with
// respective of their roll number, once the images are added, the model
// gets trained" - each capture batch is forwarded to POST
// /me/classes/:class_id/students/:student_id/face-enrollment, which the CV
// service trains on immediately (no separate "train" step on our side).
// Only reachable classes are ones class_mentors actually maps this faculty
// to - getMyMentorClasses() returns an empty list rather than a 403 for a
// non-mentor, so this screen self-gates via its own empty state.
export function EnrollFacesScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Reached by pushing on top of StudentAttendanceScreen, which hides this
  // same shared header the same way - on that transition, this screen's own
  // "hide" call and the outgoing screen's blur cleanup (which restores
  // CollegeHeader) land in the same tick, and empirically the cleanup can
  // fire last, re-showing CollegeHeader on top of this screen. Deferring
  // this screen's own call by a tick makes it reliably win, since it's the
  // one that should reflect who's actually focused now. Same fix mirrored
  // in StudentAttendanceScreen's own effect for the reverse (back) case.
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        navigation.getParent()?.setOptions({ headerShown: false });
      }, 50);
      return () => {
        clearTimeout(timer);
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const [loadingClasses, setLoadingClasses] = useState(true);
  const [mentorClasses, setMentorClasses] = useState<MentorClass[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState<MentorClass | null>(null);

  const [rosterLoading, setRosterLoading] = useState(false);
  const [students, setStudents] = useState<EnrollmentRosterStudent[]>([]);
  const [captureTarget, setCaptureTarget] = useState<EnrollmentRosterStudent | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const classes = await getMyMentorClasses();
        setMentorClasses(classes);
        if (classes.length === 1) setSelectedClass(classes[0]);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Couldn't load your mentored classes"));
      } finally {
        setLoadingClasses(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      return;
    }
    (async () => {
      setRosterLoading(true);
      try {
        const result = await getEnrollmentRoster(selectedClass.class_id);
        setStudents(result.students);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Couldn't load the class roster"));
      } finally {
        setRosterLoading(false);
      }
    })();
  }, [selectedClass]);

  async function handleCaptureDone(images: string[]) {
    const target = captureTarget;
    setCaptureTarget(null);
    if (!target || !selectedClass || images.length === 0) return;

    setEnrolling(true);
    try {
      const result = await enrollStudentFace(selectedClass.class_id, target.student_id, images);
      toast.success(`Captured ${result.captured} photo(s) for ${result.name}`);
      setStudents((prev) =>
        prev.map((s) =>
          s.student_id === target.student_id ? { ...s, face_enrolled_at: new Date().toISOString() } : s,
        ),
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't enroll this student's face"));
    } finally {
      setEnrolling(false);
    }
  }

  if (captureTarget) {
    return (
      <FaceCaptureCamera
        title={`Enroll ${captureTarget.name}`}
        hint="Take a few clear photos of just this student's face"
        minPhotos={2}
        onDone={handleCaptureDone}
        onCancel={() => setCaptureTarget(null)}
      />
    );
  }

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
          <Text style={styles.headerTitle}>Enroll Student Faces</Text>
          <Text style={styles.headerSubtitle}>For AI face attendance</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loadingClasses ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        ) : mentorClasses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="shield-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>
              You aren't the class advisor for any class - only the class advisor can enroll faces.
            </Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => setPickerVisible(true)}
              disabled={mentorClasses.length === 1}
            >
              <View style={styles.selectorRow}>
                <View style={styles.selectorIconWrap}>
                  <Ionicons name="school-outline" size={18} color="#2F6FE0" />
                </View>
                <View style={styles.selectorTextWrap}>
                  <Text style={styles.selectorTitle}>
                    {selectedClass
                      ? `${selectedClass.department.name} · ${selectedClass.section}`
                      : "Select a class"}
                  </Text>
                  <Text style={styles.selectorSubtitle}>
                    {selectedClass ? selectedClass.academic_year : "Choose the class you mentor"}
                  </Text>
                </View>
                {mentorClasses.length > 1 && <Ionicons name="chevron-forward" size={18} color="#B0B7C3" />}
              </View>
            </TouchableOpacity>

            {rosterLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color="#2F6FE0" />
              </View>
            ) : (
              selectedClass && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>
                    {students.length} student{students.length === 1 ? "" : "s"} ·{" "}
                    {students.filter((s) => s.face_enrolled_at).length} enrolled
                  </Text>
                  <View style={styles.studentList}>
                    {students.map((student) => (
                      <TouchableOpacity
                        key={student.student_id}
                        style={styles.studentRow}
                        activeOpacity={0.7}
                        disabled={enrolling}
                        onPress={() => setCaptureTarget(student)}
                      >
                        <View style={styles.studentAvatar}>
                          <Text style={styles.studentAvatarText}>{initialsFromName(student.name)}</Text>
                        </View>
                        <View style={styles.studentTextWrap}>
                          <Text style={styles.studentName} numberOfLines={1}>
                            {student.name}
                          </Text>
                          <Text style={styles.studentRoll}>{student.student_id_no}</Text>
                        </View>
                        <View
                          style={[
                            styles.enrolledBadge,
                            student.face_enrolled_at ? styles.enrolledBadgeYes : styles.enrolledBadgeNo,
                          ]}
                        >
                          <Text
                            style={[
                              styles.enrolledBadgeText,
                              student.face_enrolled_at ? styles.enrolledBadgeTextYes : styles.enrolledBadgeTextNo,
                            ]}
                          >
                            {student.face_enrolled_at ? "Enrolled" : "Not enrolled"}
                          </Text>
                        </View>
                        <Ionicons name="camera-outline" size={18} color="#2F6FE0" style={{ marginLeft: 8 }} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandleRow}>
              <Text style={styles.modalTitle}>Choose a class</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalList}>
              {mentorClasses.map((option) => (
                <TouchableOpacity
                  key={option.class_id}
                  style={styles.optionRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedClass(option);
                    setPickerVisible(false);
                  }}
                >
                  <View style={styles.optionIconWrap}>
                    <Ionicons name="school-outline" size={16} color="#2F6FE0" />
                  </View>
                  <View style={styles.optionTextWrap}>
                    <Text style={styles.optionTitle}>
                      {option.department.name} · {option.section}
                    </Text>
                    <Text style={styles.optionSubtitle}>{option.academic_year}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#B0B7C3" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  selectorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectorIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  selectorTextWrap: {
    flex: 1,
  },
  selectorTitle: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  selectorSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  studentList: {
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
    paddingTop: 4,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  studentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  studentAvatarText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  studentTextWrap: {
    flex: 1,
  },
  studentName: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  studentRoll: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  enrolledBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  enrolledBadgeYes: {
    backgroundColor: "#F0FDF4",
  },
  enrolledBadgeNo: {
    backgroundColor: "#FEF3C7",
  },
  enrolledBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    letterSpacing: 0.3,
  },
  enrolledBadgeTextYes: {
    color: "#16A34A",
  },
  enrolledBadgeTextNo: {
    color: "#B45309",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingTop: 16,
  },
  modalHandleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  modalList: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  optionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  optionSubtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
});
