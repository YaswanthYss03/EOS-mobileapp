import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
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

// Wired to GET /bonafide-reasons + POST /me/bonafide-requests. Purpose is
// picked from the real, backend-driven list of reasons — there is no
// separate "copy type" column anywhere in the schema (bonafide_requests
// only has reason_id/status/issued_at/file_url), so that concept was
// dropped entirely rather than faked client-side. Reachable from the
// Student dashboard's Campus "Bonafide" item.
export function StudentBonafideScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [reasonsStatus, setReasonsStatus] = useState<"loading" | "success" | "error">("loading");
  const [reasons, setReasons] = useState<BonafideReason[]>([]);
  const [purpose, setPurpose] = useState<BonafideReason | null>(null);
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

  function handleRequest() {
    if (!purpose) {
      toast.warning("Select a purpose");
      return;
    }

    setIsSubmitting(true);
    createMyBonafideRequest(purpose.id)
      .then((request) => {
        toast.success(`Bonafide certificate requested for ${request.reason_text.toLowerCase()}`);
        setPurpose(null);
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

        {reasonsStatus === "loading" && <Text style={styles.helperText}>Loading purposes…</Text>}

        {reasonsStatus === "error" && (
          <View style={styles.helperBlock}>
            <Text style={styles.helperText}>Couldn't load purposes.</Text>
            <TouchableOpacity onPress={loadReasons} activeOpacity={0.8}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {reasonsStatus === "success" && reasons.length === 0 && (
          <Text style={styles.helperText}>No purposes are configured yet.</Text>
        )}

        {reasonsStatus === "success" &&
          reasons.map((option) => {
            const selected = purpose?.id === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.copyCard, selected && styles.copyCardSelected]}
                onPress={() => setPurpose(option)}
                activeOpacity={0.8}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
                <View style={styles.copyTextWrap}>
                  <Text style={[styles.copyTitle, selected && styles.copyTitleSelected]}>
                    {option.reason_text}
                  </Text>
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
  helperText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginBottom: 12,
  },
  helperBlock: {
    marginBottom: 12,
  },
  retryText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 4,
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
});
