import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import type { HostelRoomInfo } from "@/services/api/hostel.api";

// The "which room am I in" summary card every Hostel page shows above its
// own content - identical markup previously duplicated 3x inside
// StudentHostelScreen.tsx's single combined screen (renderRoomCard), now a
// real shared component since Outing/Complaints/Mess feedback are separate
// screens.
export function HostelRoomCard({
  status,
  room,
}: {
  status: "loading" | "success" | "error";
  room: HostelRoomInfo | null;
}) {
  return (
    <View style={styles.roomCard}>
      <View style={styles.roomIconWrap}>
        <Ionicons name="bed-outline" size={20} color="#2F6FE0" />
      </View>
      <View style={styles.roomTextWrap}>
        {status === "loading" ? (
          <Text style={styles.roomTitle}>Loading room details…</Text>
        ) : status === "error" ? (
          <Text style={styles.roomTitle}>Couldn't load room details</Text>
        ) : room?.is_hostel_resident ? (
          <>
            <Text style={styles.roomTitle}>
              {room.hostel_name} · Room {room.room_number}
            </Text>
            <Text style={styles.roomSubtitle}>
              {room.room_type_name}
              {room.mess_type ? ` · ${room.mess_type}` : ""}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.roomTitle}>No hostel room assigned</Text>
            <Text style={styles.roomSubtitle}>You're registered as a day scholar</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  roomIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  roomTextWrap: {
    flex: 1,
  },
  roomTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  roomSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
});
