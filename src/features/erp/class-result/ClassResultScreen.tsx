import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { classInfo, mockClassResultStudents, type ClassResultStudent } from "./data/mockClassResult";

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// TODO: this is a view-only report over mockClassResult - wire to a real
// results backend endpoint once one exists. Reachable from both the
// Employee/Faculty and HoD dashboards' "Class Result" item.
export function ClassResultScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(mockClassResultStudents[0]?.id ?? null);

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

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return mockClassResultStudents;
    return mockClassResultStudents.filter(
      (student) => student.name.toLowerCase().includes(query) || student.rollNo.toLowerCase().includes(query),
    );
  }, [search]);

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
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
          <Text style={styles.headerTitle}>Class Result</Text>
          <Text style={styles.headerSubtitle}>
            {classInfo.departmentName} · {mockClassResultStudents.length} students
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.sectionsCard} activeOpacity={0.8}>
          <View style={styles.sectionsIconWrap}>
            <Ionicons name="people-outline" size={16} color="#2F6FE0" />
          </View>
          <View style={styles.sectionsTextWrap}>
            <Text style={styles.sectionsTitle}>All sections</Text>
            <Text style={styles.sectionsSubtitle}>Whole department · {classInfo.sectionCount} sections</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#9AA6B2" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name or register number"
            placeholderTextColor="#9AA6B2"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {filteredStudents.map((student) => (
          <ClassResultCard
            key={student.id}
            student={student}
            expanded={expandedId === student.id}
            onToggle={() => toggleExpanded(student.id)}
          />
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

function ClassResultCard({
  student,
  expanded,
  onToggle,
}: {
  student: ClassResultStudent;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={onToggle} activeOpacity={0.8}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFromName(student.name)}</Text>
        </View>
        <View style={styles.cardHeaderTextWrap}>
          <Text style={styles.cardName}>{student.name}</Text>
          <Text style={styles.cardSubtitle}>
            {student.rollNo} · {student.className}
          </Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#B0B7C3" />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>ATTENDANCE</Text>
              <Text style={[styles.statValue, styles.statValueBlue]}>{student.attendancePercent}%</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>CGPA</Text>
              <Text style={styles.statValue}>{student.cgpa.toFixed(2)}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>ARREARS</Text>
              <Text style={styles.statValue}>{student.arrears}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mentor</Text>
            <Text style={styles.detailValue}>{student.mentor}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Guardian</Text>
            <Text style={styles.detailValue}>{student.guardian}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Contact</Text>
            <Text style={styles.detailValue}>{student.contact}</Text>
          </View>
        </View>
      )}
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
  sectionsCard: {
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
  sectionsIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionsTextWrap: {
    flex: 1,
  },
  sectionsTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  sectionsSubtitle: {
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
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
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
  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginTop: 3,
  },
  statValueBlue: {
    color: "#2F6FE0",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F3F6",
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#2F6FE0",
  },
  detailValue: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
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
