import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BackHeader } from "@/components/layout/BackHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getChildHostelRoom,
  getChildNightAttendance,
  getChildGateLog,
  type ChildGateLogEntry,
} from "@/services/api/parents.api";
import type { HostelRoomInfo, MyNightAttendanceRecord } from "@/services/api/hostel.api";
import { useParentChildren } from "./useParentChildren";
import { ChildSelector } from "./ChildSelector";

type LoadStatus = "loading" | "success" | "error";

// The parent's Hostel tab (replaces "My Bus" once the selected child's
// student_type is 'hosteller' - see app/(tabs)/_layout.tsx). Read-only: room
// info, the warden's published night roll-call, and the gate_warden's own
// in/out ledger for this child - same three data sources the student's own
// Hostel hub exposes to themself, just via the parent-child gateway routes
// (see parents.api.ts).
export function ParentHostelScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  const { status: childrenStatus, error: childrenError, children, selectedChild, setSelectedChildId, reload: reloadChildren } =
    useParentChildren();

  const [roomStatus, setRoomStatus] = useState<LoadStatus>("loading");
  const [room, setRoom] = useState<HostelRoomInfo | null>(null);

  const [attendanceStatus, setAttendanceStatus] = useState<LoadStatus>("loading");
  const [attendanceRecords, setAttendanceRecords] = useState<MyNightAttendanceRecord[]>([]);

  const [gateLogStatus, setGateLogStatus] = useState<LoadStatus>("loading");
  const [gateLog, setGateLog] = useState<ChildGateLogEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  const loadRoom = useCallback((studentId: number) => {
    setRoomStatus("loading");
    getChildHostelRoom(studentId)
      .then((r) => {
        setRoom(r);
        setRoomStatus("success");
      })
      .catch(() => setRoomStatus("error"));
  }, []);

  const loadAttendance = useCallback((studentId: number) => {
    setAttendanceStatus("loading");
    getChildNightAttendance(studentId)
      .then((r) => {
        setAttendanceRecords(r.records);
        setAttendanceStatus("success");
      })
      .catch(() => setAttendanceStatus("error"));
  }, []);

  const loadGateLog = useCallback((studentId: number) => {
    setGateLogStatus("loading");
    getChildGateLog(studentId)
      .then((rows) => {
        setGateLog(rows);
        setGateLogStatus("success");
      })
      .catch(() => setGateLogStatus("error"));
  }, []);

  useEffect(() => {
    if (selectedChild) {
      loadRoom(selectedChild.id);
      loadAttendance(selectedChild.id);
      loadGateLog(selectedChild.id);
    }
  }, [selectedChild, loadRoom, loadAttendance, loadGateLog]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <BackHeader title="Hostel" onBack={() => router.replace("/(tabs)/home")} />
      <WatermarkBackground />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {childrenStatus === "loading" && <SkeletonListRows count={3} />}

        {childrenStatus === "error" && (
          <CenterState
            icon="alert-circle-outline"
            text={childrenError ?? "Something went wrong."}
            onRetry={reloadChildren}
          />
        )}

        {childrenStatus === "success" && children.length === 0 && (
          <CenterState icon="people-outline" text="No linked children found" />
        )}

        {childrenStatus === "success" && selectedChild && (
          <>
            <ChildSelector children={children} selected={selectedChild} onSelect={(c) => setSelectedChildId(c.id)} />

            <View style={styles.card}>
              {roomStatus === "loading" ? (
                <SkeletonListRows count={1} />
              ) : roomStatus === "error" ? (
                <CenterState icon="cloud-offline-outline" text="Couldn't load room details." onRetry={() => loadRoom(selectedChild.id)} />
              ) : room?.is_hostel_resident ? (
                <>
                  <Text style={styles.cardTitle}>Room details</Text>
                  <Text style={styles.roomLine}>{room.hostel_name} · {room.room_type_name}</Text>
                  <Text style={styles.roomLineMuted}>Room {room.room_number}{room.mess_type ? ` · ${room.mess_type} mess` : ""}</Text>
                </>
              ) : (
                <Text style={styles.emptyText}>Not currently allotted a hostel room.</Text>
              )}
            </View>

            <Text style={styles.sectionTitle}>Night attendance</Text>
            {attendanceStatus === "loading" ? (
              <SkeletonListRows count={3} />
            ) : attendanceStatus === "error" ? (
              <CenterState icon="cloud-offline-outline" text="Couldn't load night attendance." onRetry={() => loadAttendance(selectedChild.id)} />
            ) : attendanceRecords.length === 0 ? (
              <Text style={styles.emptyText}>No night attendance published yet.</Text>
            ) : (
              attendanceRecords.map((r) => (
                <View key={r.id} style={styles.row}>
                  <Text style={styles.rowDate}>{new Date(r.date).toDateString()}</Text>
                  <View style={[styles.statusBadge, r.status === "present" ? styles.statusBadgePresent : styles.statusBadgeAbsent]}>
                    <Text style={[styles.statusBadgeText, r.status === "present" ? styles.statusBadgeTextPresent : styles.statusBadgeTextAbsent]}>
                      {r.status}
                    </Text>
                  </View>
                </View>
              ))
            )}

            <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Gate in / out</Text>
            {gateLogStatus === "loading" ? (
              <SkeletonListRows count={3} />
            ) : gateLogStatus === "error" ? (
              <CenterState icon="cloud-offline-outline" text="Couldn't load gate entries." onRetry={() => loadGateLog(selectedChild.id)} />
            ) : gateLog.length === 0 ? (
              <Text style={styles.emptyText}>No gate entries recorded yet.</Text>
            ) : (
              gateLog.map((entry) => (
                <View key={entry.id} style={styles.row}>
                  <View style={styles.gateRowLeft}>
                    <Ionicons
                      name={entry.entry_type === "in" ? "log-in-outline" : "log-out-outline"}
                      size={16}
                      color={entry.entry_type === "in" ? "#16A34A" : "#DC2626"}
                    />
                    <Text style={styles.rowDate}>{new Date(entry.recorded_at).toLocaleString()}</Text>
                  </View>
                  <Text style={styles.gateEntryType}>{entry.entry_type === "in" ? "Checked in" : "Checked out"}</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CenterState({
  icon,
  text,
  onRetry,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.centerState}>
      <Ionicons name={icon} size={26} color="#B0B7C3" />
      <Text style={styles.centerStateText}>{text}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} activeOpacity={0.8}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      )}
    </View>
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
  cardTitle: { fontSize: 13, fontFamily: fonts.bold, color: "#111827", marginBottom: 6 },
  roomLine: { fontSize: 13, fontFamily: fonts.medium, color: "#111827" },
  roomLineMuted: { fontSize: 12, fontFamily: fonts.regular, color: "#9AA6B2", marginTop: 2 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  sectionTitleSpaced: { marginTop: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  gateRowLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowDate: { fontSize: 12.5, fontFamily: fonts.medium, color: "#111827" },
  gateEntryType: { fontSize: 12, fontFamily: fonts.medium, color: "#6B7280" },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusBadgePresent: { backgroundColor: "#F0FDF4" },
  statusBadgeAbsent: { backgroundColor: "#FEF2F2" },
  statusBadgeText: { fontSize: 10.5, fontFamily: fonts.bold, textTransform: "capitalize" },
  statusBadgeTextPresent: { color: "#16A34A" },
  statusBadgeTextAbsent: { color: "#DC2626" },
  emptyText: { fontSize: 12.5, fontFamily: fonts.medium, color: "#9AA6B2", paddingVertical: 8 },
  centerState: { alignItems: "center", paddingVertical: 24, gap: 8 },
  centerStateText: { fontSize: 12.5, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center", paddingHorizontal: 16 },
  retryText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0" },
});
