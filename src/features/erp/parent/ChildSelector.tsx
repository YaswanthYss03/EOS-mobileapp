import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import type { ParentChild } from "@/services/api/parents.api";

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function childSubtitle(child: ParentChild): string {
  const parts = [child.student_id_no];
  if (child.department) parts.push(child.department.code);
  if (child.section) parts.push(`Section ${child.section}`);
  return parts.join(" · ");
}

// Shared across the three parent screens (Attendance/Performance/Fees) - a
// parent can have more than one linked child (siblings), so this always
// shows which child is currently selected, with a tap-to-switch picker only
// when there's actually more than one to switch between.
export function ChildSelector({
  children,
  selected,
  onSelect,
}: {
  children: ParentChild[];
  selected: ParentChild;
  onSelect: (child: ParentChild) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const canSwitch = children.length > 1;

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        onPress={() => canSwitch && setPickerOpen(true)}
        activeOpacity={canSwitch ? 0.8 : 1}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFromName(selected.name)}</Text>
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.name}>{selected.name}</Text>
          <Text style={styles.subtitle}>{childSubtitle(selected)}</Text>
        </View>
        {canSwitch && <Ionicons name="chevron-down" size={18} color="#B0B7C3" />}
      </TouchableOpacity>

      {canSwitch && (
        <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
            <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
              <Text style={styles.modalTitle}>Select child</Text>
              <ScrollView style={styles.modalList}>
                {children.map((child) => (
                  <TouchableOpacity
                    key={child.id}
                    style={styles.modalOptionRow}
                    onPress={() => {
                      onSelect(child);
                      setPickerOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.modalOptionTextWrap}>
                      <Text style={styles.modalOptionName}>{child.name}</Text>
                      <Text style={styles.modalOptionSubtitle}>{childSubtitle(child)}</Text>
                    </View>
                    {child.id === selected.id && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  textWrap: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
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
    marginBottom: 10,
  },
  modalList: {
    marginBottom: 4,
  },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalOptionTextWrap: {
    flex: 1,
  },
  modalOptionName: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  modalOptionSubtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
});
