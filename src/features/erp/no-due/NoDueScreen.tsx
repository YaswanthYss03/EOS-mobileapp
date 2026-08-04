import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { classInfo, mockNoDueStudents, type NoDueStudent } from "./data/mockNoDue";

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatRupees(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

// TODO: this is a view-only clearance tracker over mockNoDue - wire to a
// real no-due backend endpoint once one exists. Each fee/sign-off line is
// updated by its own department (accounts, library, hostel, ...), not by
// the HoD here, so this screen has no approve/reject actions.
export function NoDueScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  // This screen renders its own full header below, so hide the shared
  // CollegeHeader while it's focused - same pattern as the other ERP
  // sub-screens (attendance, leave, on duty).
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return mockNoDueStudents;
    return mockNoDueStudents.filter((student) => student.name.toLowerCase().includes(query));
  }, [search]);

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
          <Text style={styles.headerTitle}>No-Due Approval</Text>
          <Text style={styles.headerSubtitle}>Clearance requests</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.classCard} activeOpacity={0.8}>
          <View style={styles.classIconWrap}>
            <Ionicons name="people-outline" size={16} color="#2F6FE0" />
          </View>
          <View style={styles.classTextWrap}>
            <Text style={styles.classTitle}>{classInfo.className}</Text>
            <Text style={styles.classSubtitle}>
              {classInfo.studentCount} students · {classInfo.advisorName}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#9AA6B2" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search student name"
            placeholderTextColor="#9AA6B2"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {filteredStudents.map((student) => (
          <NoDueCard key={student.id} student={student} />
        ))}

        {filteredStudents.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>No students match "{search}"</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NoDueCard({ student }: { student: NoDueStudent }) {
  const totalPending = student.fees.reduce((sum, fee) => sum + (fee.pendingAmount ?? 0), 0);
  const isCleared = totalPending === 0 && student.signOffs.every((item) => item.status === "cleared");

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFromName(student.name)}</Text>
        </View>
        <View style={styles.cardHeaderTextWrap}>
          <Text style={styles.cardName}>{student.name}</Text>
          <Text style={styles.cardSubtitle}>
            {student.rollNo} · {student.className}
          </Text>
        </View>
        <View style={[styles.statusBadge, isCleared && styles.statusBadgeCleared]}>
          <Text style={[styles.statusBadgeText, isCleared && styles.statusBadgeTextCleared]}>
            {isCleared ? "Cleared" : "Pending"}
          </Text>
        </View>
      </View>

      <View style={styles.appliedForRow}>
        <Text style={styles.appliedForLabel}>APPLIED FOR</Text>
        <Text style={styles.appliedForValue}>{student.appliedFor}</Text>
      </View>

      <View style={styles.feeList}>
        {student.fees.map((fee) => (
          <View style={styles.feeRow} key={fee.label}>
            <View style={styles.feeDot} />
            <Text style={styles.feeLabel}>{fee.label}</Text>
            {fee.status === "cleared" ? (
              <Text style={styles.feeCleared}>Cleared</Text>
            ) : (
              <Text style={styles.feePending}>{formatRupees(fee.pendingAmount ?? 0)}</Text>
            )}
          </View>
        ))}
      </View>

      {totalPending > 0 ? (
        <View style={styles.totalPendingRow}>
          <Text style={styles.totalPendingLabel}>Total pending</Text>
          <Text style={styles.totalPendingValue}>{formatRupees(totalPending)}</Text>
        </View>
      ) : (
        <View style={styles.totalPendingRow}>
          <Text style={styles.totalClearedText}>No dues pending</Text>
        </View>
      )}

      <Text style={styles.signOffSectionLabel}>Clearance Sign-off</Text>
      <View style={styles.signOffList}>
        {student.signOffs.map((item) => (
          <View style={styles.signOffRow} key={item.label}>
            <View style={[styles.checkbox, item.status === "cleared" && styles.checkboxChecked]}>
              {item.status === "cleared" && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            <Text style={styles.signOffLabel}>{item.label}</Text>
            <Text
              style={[
                styles.signOffStatus,
                item.status === "cleared" ? styles.signOffStatusCleared : styles.signOffStatusPending,
              ]}
            >
              {item.status === "cleared" ? "Cleared" : "Pending"}
            </Text>
          </View>
        ))}
      </View>
    </View>
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
    marginBottom: 12,
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#111827",
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
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  cardHeaderTextWrap: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  statusBadge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeCleared: {
    backgroundColor: "#F0FDF4",
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#D97706",
  },
  statusBadgeTextCleared: {
    color: "#16A34A",
  },
  appliedForRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  appliedForLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
  },
  appliedForValue: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  feeList: {
    marginBottom: 4,
  },
  feeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
  },
  feeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#B0B7C3",
  },
  feeLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#374151",
  },
  feeCleared: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#16A34A",
  },
  feePending: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#DC2626",
  },
  totalPendingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
    paddingTop: 10,
    marginTop: 6,
    marginBottom: 12,
  },
  totalPendingLabel: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  totalPendingValue: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#DC2626",
  },
  totalClearedText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#16A34A",
  },
  signOffSectionLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  signOffList: {
    gap: 8,
  },
  signOffRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  signOffLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#374151",
  },
  signOffStatus: {
    fontSize: 12,
    fontFamily: fonts.semibold,
  },
  signOffStatusCleared: {
    color: "#2F6FE0",
  },
  signOffStatusPending: {
    color: "#9AA6B2",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
});
