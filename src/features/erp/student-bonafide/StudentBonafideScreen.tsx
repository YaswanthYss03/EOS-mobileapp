import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  listBonafideReasons,
  createMyBonafideRequest,
  type BonafideReason,
} from "@/services/api/bonafide.api";

type CopyType = "signed" | "unsigned";

const copyTypeInfo: Record<CopyType, { label: string; description: string }> = {
  signed: {
    label: "Signed copy",
    description: "Digitally signed by the HoD and the principal · issued as a verified PDF",
  },
  unsigned: {
    label: "Unsigned copy",
    description: "Plain draft for your review · collect the signed copy from the office",
  },
};

// Wired to GET /bonafide-reasons + POST /me/bonafide-requests. "Copy type"
// has no backing column anywhere in the schema (bonafide_requests only has
// reason_id/status/issued_at/file_url), so it stays a client-only choice,
// not sent with the request. Reachable from the Student dashboard's Campus
// "Bonafide" item.
export function StudentBonafideScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [reasonsStatus, setReasonsStatus] = useState<"loading" | "success" | "error">("loading");
  const [reasons, setReasons] = useState<BonafideReason[]>([]);
  const [purpose, setPurpose] = useState<BonafideReason | null>(null);
  const [purposePickerOpen, setPurposePickerOpen] = useState(false);
  const [copyType, setCopyType] = useState<CopyType>("signed");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadReasons = useCallback(() => {
    setReasonsStatus("loading");
    listBonafideReasons()
      .then((response) => {
        setReasons(response);
        setReasonsStatus("success");
      })
      .catch(() => setReasonsStatus("error"));
  }, []);

  useEffect(() => {
    loadReasons();
  }, [loadReasons]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  function openPurposePicker() {
    if (reasonsStatus === "error") {
      toast.info("Retrying...");
      loadReasons();
      return;
    }
    setPurposePickerOpen(true);
  }

  function handleRequest() {
    if (!purpose) {
      toast.warning("Select a purpose");
      return;
    }

    setIsSubmitting(true);
    createMyBonafideRequest(purpose.id)
      .then((request) => {
        toast.success(`${copyTypeInfo[copyType].label} requested for ${request.reason_text.toLowerCase()}`);
        setPurpose(null);
        setCopyType("signed");
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't submit the request.")))
      .finally(() => setIsSubmitting(false));
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
        <Text style={styles.headerTitle}>Bonafide certificate</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.fieldLabel}>Purpose</Text>
        <TouchableOpacity
          style={styles.purposeSelectRow}
          onPress={openPurposePicker}
          activeOpacity={0.8}
        >
          <Text style={styles.purposeSelectValue}>
            {purpose?.reason_text ?? (reasonsStatus === "loading" ? "Loading purposes…" : "Select a purpose")}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#2F6FE0" />
        </TouchableOpacity>

        <Text style={[styles.fieldLabel, styles.copyTypeLabel]}>Copy type</Text>
        {(Object.keys(copyTypeInfo) as CopyType[]).map((type) => {
          const info = copyTypeInfo[type];
          const selected = copyType === type;
          return (
            <TouchableOpacity
              key={type}
              style={[styles.copyCard, selected && styles.copyCardSelected]}
              onPress={() => setCopyType(type)}
              activeOpacity={0.8}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <View style={styles.radioDot} />}
              </View>
              <View style={styles.copyTextWrap}>
                <Text style={[styles.copyTitle, selected && styles.copyTitleSelected]}>{info.label}</Text>
                <Text style={styles.copyDescription}>{info.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleRequest}
          activeOpacity={0.85}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>Request certificate</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={purposePickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPurposePickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setPurposePickerOpen(false)}
        >
          <TouchableOpacity style={styles.sheetCard} activeOpacity={1}>
            <Text style={styles.sheetTitle}>PURPOSE</Text>
            <ScrollView>
              <SheetOptionRow
                label="Select a purpose"
                selected={purpose === null}
                onPress={() => {
                  setPurpose(null);
                  setPurposePickerOpen(false);
                }}
              />
              {reasons.map((option) => (
                <SheetOptionRow
                  key={option.id}
                  label={option.reason_text}
                  selected={purpose?.id === option.id}
                  onPress={() => {
                    setPurpose(option);
                    setPurposePickerOpen(false);
                  }}
                />
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function SheetOptionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.sheetOptionRow, selected && styles.sheetOptionRowSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.sheetOptionText, selected && styles.sheetOptionTextSelected]}>{label}</Text>
      {selected && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
    </TouchableOpacity>
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
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginBottom: 8,
  },
  copyTypeLabel: {
    marginTop: 20,
  },
  purposeSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#2F6FE0",
    backgroundColor: "#F5F8FE",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  purposeSelectValue: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  copyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  copyCardSelected: {
    borderColor: "#2F6FE0",
    backgroundColor: "#EAF0FD",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  radioSelected: {
    borderColor: "#2F6FE0",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2F6FE0",
  },
  copyTextWrap: {
    flex: 1,
  },
  copyTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  copyTitleSelected: {
    color: "#2F6FE0",
  },
  copyDescription: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 4,
    lineHeight: 17,
  },
  submitButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    elevation: 3,
    shadowColor: "#2F6FE0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 18,
    paddingHorizontal: 20,
    maxHeight: "70%",
  },
  sheetTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sheetOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  sheetOptionRowSelected: {
    backgroundColor: "#F5F8FE",
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  sheetOptionText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  sheetOptionTextSelected: {
    color: "#2F6FE0",
    fontFamily: fonts.bold,
  },
});
