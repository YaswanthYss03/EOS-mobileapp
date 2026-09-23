import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AnchoredDropdown, useDropdown } from "@/components/ui/dropdown";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { createMyHostelComplaint, type HostelComplaintCategory } from "@/services/api/hostel.api";
import { hostelFormStyles as styles } from "./hostelFormStyles";
import { HostelPageHeader } from "./HostelPageHeader";
import { HostelRoomCard } from "./HostelRoomCard";
import { useHostelRoom } from "./useHostelRoom";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";

const complaintCategories = ["Electrical", "Plumbing", "Furniture", "Internet/WiFi", "Housekeeping"];

// hostel_complaint_category_enum (see prisma/schema.prisma) has no exact
// 1:1 match for these UI labels - mapped onto the closest real category.
const CATEGORY_TO_ENUM: Record<string, HostelComplaintCategory> = {
  Electrical: "electrical",
  Plumbing: "plumbing",
  Furniture: "carpentry",
  "Internet/WiFi": "network",
  Housekeeping: "facilities",
};

// One of the Hostel hub's 3 sub-pages - see StudentHostelScreen.tsx's own
// comment and StudentHostelOutingScreen.tsx's identical back-navigation note.
export function StudentHostelComplaintsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { status: roomStatus, room } = useHostelRoom();

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complaintCategory, setComplaintCategory] = useState(complaintCategories[0]);
  const categoryPicker = useDropdown();
  const [hostelBlock, setHostelBlock] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [complaintDescription, setComplaintDescription] = useState("");

  // Pre-fill from the room lookup once it arrives (it's fetched
  // asynchronously - see useHostelRoom), same as the original combined
  // screen's identical pre-fill-on-load behavior.
  useEffect(() => {
    if (room?.is_hostel_resident) {
      setHostelBlock(room.hostel_name ?? "");
      setRoomNo(room.room_number ?? "");
    }
  }, [room]);

  function handleSubmitComplaint() {
    if (!hostelBlock.trim() || !roomNo.trim()) {
      toast.warning("Add the hostel block and room number");
      return;
    }
    if (!/^\d{10}$/.test(contactNumber.trim())) {
      toast.warning("Enter a valid 10-digit mobile number");
      return;
    }
    if (!complaintDescription.trim()) {
      toast.warning("Describe the issue");
      return;
    }

    setIsSubmitting(true);
    createMyHostelComplaint({
      category: CATEGORY_TO_ENUM[complaintCategory] ?? "other",
      title: `${complaintCategory} issue`.slice(0, 150),
      description: complaintDescription.trim(),
    })
      .then(() => {
        toast.success("Complaint raised with the warden's office");
        setContactNumber("");
        setComplaintDescription("");
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't raise the complaint.")))
      .finally(() => setIsSubmitting(false));
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <HostelPageHeader title="Complaints" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HostelRoomCard status={roomStatus} room={room} />
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Category</Text>
          <View ref={categoryPicker.anchorRef} collapsable={false}>
            <TouchableOpacity style={styles.selectRow} onPress={categoryPicker.open} activeOpacity={0.8}>
              <Text style={styles.selectValue}>{complaintCategory}</Text>
              <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
            </TouchableOpacity>
          </View>

          <View style={styles.rowFields}>
            <View style={styles.rowField}>
              <Text style={styles.fieldLabel}>Student name</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyInputText}>{room?.student_name ?? "—"}</Text>
              </View>
            </View>
            <View style={styles.rowField}>
              <Text style={styles.fieldLabel}>Register no.</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyInputText}>{room?.register_no ?? "—"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.rowFields}>
            <View style={styles.rowField}>
              <Text style={styles.fieldLabel}>Hostel block</Text>
              <TextInput style={styles.input} placeholderTextColor="#9AA6B2" value={hostelBlock} onChangeText={setHostelBlock} />
            </View>
            <View style={styles.rowField}>
              <Text style={styles.fieldLabel}>Room no.</Text>
              <TextInput style={styles.input} placeholderTextColor="#9AA6B2" value={roomNo} onChangeText={setRoomNo} />
            </View>
          </View>

          <Text style={styles.fieldLabel}>Contact number</Text>
          <TextInput
            style={[styles.input, styles.inputLast]}
            placeholder="10-digit mobile number"
            placeholderTextColor="#9AA6B2"
            value={contactNumber}
            onChangeText={(text) => setContactNumber(text.replace(/[^0-9]/g, "").slice(0, 10))}
            keyboardType="number-pad"
            maxLength={10}
          />

          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Describe the issue</Text>
          <TextInput
            style={[styles.input, styles.textArea, styles.inputLast]}
            placeholder="e.g. Ceiling fan in room 214 is not working"
            placeholderTextColor="#9AA6B2"
            value={complaintDescription}
            onChangeText={setComplaintDescription}
            multiline
          />

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmitComplaint} activeOpacity={0.85} disabled={isSubmitting}>
            <Text style={styles.submitButtonText}>Raise complaint</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AnchoredDropdown
        anchorRef={categoryPicker.anchorRef}
        visible={categoryPicker.visible}
        onClose={categoryPicker.close}
        contentStyle={[styles.modalCard, styles.anchoredCard]}
      >
        <Text style={styles.modalTitle}>Category</Text>
        {complaintCategories.map((option) => (
          <TouchableOpacity
            key={option}
            style={styles.modalOptionRow}
            onPress={() => {
              setComplaintCategory(option);
              categoryPicker.close();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.modalOptionName}>{option}</Text>
            {complaintCategory === option && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
          </TouchableOpacity>
        ))}
      </AnchoredDropdown>
    </SafeAreaView>
  );
}
