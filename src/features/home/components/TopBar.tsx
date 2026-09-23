import { useEffect, useState } from "react";
import { View, Text, Image, Pressable, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { fonts } from "@/theme";
import { useAuth } from "@/context/AuthContext";
import { getMyProfile } from "@/services/api/profile.api";

function greetingNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? email;
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}

// Switch Account labels - see AuthContext.tsx's AccountMode (also duplicated
// in ProfileScreen.tsx, which offers this same switch from the Profile tab -
// this row is a second, more visible entry point for a HOD/Faculty account
// that actually holds more than one responsibility).
const ACCOUNT_MODE_LABELS: Record<"HOD" | "ADVISOR" | "SUBJECT_HANDLER", string> = {
  HOD: "HOD Account",
  ADVISOR: "Class Advisor",
  SUBJECT_HANDLER: "Subject Handling Faculty",
};

// Notification/wallet icons live in HomeHeader now - this row is the avatar
// (opens /profile), the greeting, and - only when this account actually
// holds more than one responsibility (see AuthContext.tsx's
// canSwitchAccount) - a Switch button pinned to the row's right edge.
// getMyProfile (not getMe) on purpose - it's the one endpoint that resolves
// photo_url for every role (student/parent get their own branch, everything
// else falls through to the faculty/staff branch - see EOSbackend1's
// ProfileService.getMyProfile).
export function TopBar() {
  const router = useRouter();
  const { user, canSwitchAccount, responsibilities, activeAccountMode, setActiveAccountMode } = useAuth();
  // A HOD account always gets exactly 2 choices - "HOD" (their real, primary
  // identity) and "Faculty" (the full Faculty/Employee experience already
  // built for that role - see app/(tabs)/_layout.tsx's isHodActingAsFaculty)
  // - regardless of which of ADVISOR/SUBJECT_HANDLER they personally hold,
  // if any (see AuthContext.tsx's ViewMode). Every other role keeps the
  // original per-responsibility list.
  const isHod = user?.role === "hod";
  // Shown instantly while the real profile loads, so the greeting is never
  // blank - replaced once GET /me/my-profile resolves the caller's actual
  // name and photo server-side.
  const [name, setName] = useState(user ? greetingNameFromEmail(user.email) : "there");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [switchOpen, setSwitchOpen] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then((profile) => {
        setName(profile.name);
        setPhotoUrl(profile.photo_url);
      })
      .catch(() => {}); // keep the email-derived guess if this fails
  }, []);

  return (
    <View style={styles.container}>
      <Pressable hitSlop={8} onPress={() => router.push("/profile")}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons name="person" size={20} color="#fff" />
          </View>
        )}
      </Pressable>
      <Text style={styles.greeting}>Hi, {name}</Text>

      {canSwitchAccount && (
        <TouchableOpacity style={styles.switchButton} onPress={() => setSwitchOpen(true)} activeOpacity={0.85}>
          <Ionicons name="swap-horizontal-outline" size={14} color="#2F6FE0" />
          <Text style={styles.switchButtonText}>Switch</Text>
        </TouchableOpacity>
      )}

      <Modal visible={switchOpen} transparent animationType="none" onRequestClose={() => setSwitchOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSwitchOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Switch Account</Text>
            {isHod
              ? (["HOD", "FACULTY"] as const).map((mode) => {
                  const active = activeAccountMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.accountModeRow, active && styles.accountModeRowActive]}
                      activeOpacity={0.8}
                      onPress={() => {
                        setActiveAccountMode(mode);
                        setSwitchOpen(false);
                      }}
                    >
                      <Text style={[styles.accountModeLabel, active && styles.accountModeLabelActive]}>
                        {mode === "HOD" ? "HOD" : "Faculty"}
                      </Text>
                      {active && <Ionicons name="checkmark-circle" size={20} color="#2F6FE0" />}
                    </TouchableOpacity>
                  );
                })
              : responsibilities.map((mode) => {
                  const active = activeAccountMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.accountModeRow, active && styles.accountModeRowActive]}
                      activeOpacity={0.8}
                      onPress={() => {
                        setActiveAccountMode(mode);
                        setSwitchOpen(false);
                      }}
                    >
                      <Text style={[styles.accountModeLabel, active && styles.accountModeLabelActive]}>
                        {ACCOUNT_MODE_LABELS[mode]}
                      </Text>
                      {active && <Ionicons name="checkmark-circle" size={20} color="#2F6FE0" />}
                    </TouchableOpacity>
                  );
                })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#2F6FE0",
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#2F6FE0",
    backgroundColor: "#2F6FE0",
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  switchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2F6FE0",
    backgroundColor: "#EAF0FD",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  switchButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
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
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 10,
  },
  accountModeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  accountModeRowActive: {
    backgroundColor: "#EAF0FD",
  },
  accountModeLabel: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  accountModeLabelActive: {
    color: "#2F6FE0",
    fontFamily: fonts.bold,
  },
});
