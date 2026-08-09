import { useRef, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, type CameraType } from "expo-camera";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";

/**
 * Shared multi-shot capture UI backing both AI face attendance (whole-class
 * photos, handed to POST .../attendance/recognize) and advisor face
 * enrollment (one student's photos, handed to POST .../face-enrollment).
 * Neither backend endpoint needs anything more than a handful of plain
 * JPEG data URIs - "data:image/jpeg;base64,..." (see
 * Attendance-CV/common.py's decode_data_url) - so this component's only
 * job is collecting those and handing them back; it holds no knowledge of
 * what happens to them afterward.
 *
 * Same camera-permission handling as ScanToPayScreen (see
 * @/features/erp/wallet/ScanToPayScreen) - kept separate rather than
 * shared since that one scans a barcode continuously and this one takes
 * discrete still shots on demand; the only genuinely shared idea is "ask
 * for camera permission, show a friendly prompt if denied".
 */
export function FaceCaptureCamera({
  title,
  hint,
  minPhotos = 1,
  facing = "back",
  onDone,
  onCancel,
}: {
  title: string;
  hint: string;
  minPhotos?: number;
  facing?: CameraType;
  onDone: (images: string[]) => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [capturing, setCapturing] = useState(false);

  async function handleCapture() {
    if (capturing || !cameraRef.current) return;
    setCapturing(true);
    try {
      const shot = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      if (!shot.base64) {
        toast.error("Couldn't read that photo, try again");
        return;
      }
      const mime = shot.format === "png" ? "image/png" : "image/jpeg";
      setPhotos((prev) => [...prev, `data:${mime};base64,${shot.base64}`]);
    } catch {
      toast.error("Couldn't capture that photo, try again");
    } finally {
      setCapturing(false);
    }
  }

  function handleRemoveLast() {
    setPhotos((prev) => prev.slice(0, -1));
  }

  if (!permission) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer} edges={[]}>
        <View style={styles.centerState}>
          <Ionicons name="camera-outline" size={40} color="#B0B7C3" />
          <Text style={styles.permissionText}>Camera access is needed to capture photos</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.85}>
            <Text style={styles.permissionButtonText}>Allow Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} style={{ marginTop: 16 }}>
            <Text style={styles.cancelLinkText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing} />

      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onCancel} style={styles.iconButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.topBarTextWrap}>
          <Text style={styles.topBarTitle}>{title}</Text>
          <Text style={styles.topBarHint}>{hint}</Text>
        </View>
        <View style={styles.photoCountBadge}>
          <Text style={styles.photoCountText}>{photos.length}</Text>
        </View>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 18 }]}>
        {/* Always rendered (just invisible when empty) so the shutter button
            stays centered regardless of photo count - a conditionally
            absent sibling would shift it sideways under space-between. */}
        <TouchableOpacity
          onPress={handleRemoveLast}
          disabled={photos.length === 0}
          style={[styles.retakeButton, photos.length === 0 && styles.retakeButtonHidden]}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-undo" size={16} color="#fff" />
          <Text style={styles.retakeText}>Remove last</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCapture}
          disabled={capturing}
          style={styles.shutterOuter}
          activeOpacity={0.85}
        >
          <View style={styles.shutterInner}>
            {capturing && <ActivityIndicator color="#2F6FE0" size="small" />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onDone(photos)}
          disabled={photos.length < minPhotos}
          style={[styles.doneButton, photos.length < minPhotos && styles.doneButtonDisabled]}
          activeOpacity={0.85}
        >
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#111827",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 24,
  },
  permissionText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#D1D5DB",
    textAlign: "center",
  },
  permissionButton: {
    backgroundColor: "#2F6FE0",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  permissionButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  cancelLinkText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#9AA6B2",
  },
  camera: {
    flex: 1,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTextWrap: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  topBarHint: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#D7E2FA",
    marginTop: 1,
  },
  photoCountBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 6,
    backgroundColor: "#2F6FE0",
    alignItems: "center",
    justifyContent: "center",
  },
  photoCountText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: 88,
  },
  retakeButtonHidden: {
    opacity: 0,
  },
  retakeText: {
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: "#fff",
  },
  doneButton: {
    width: 88,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 12,
    paddingVertical: 12,
  },
  doneButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  doneText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#fff",
  },
});
