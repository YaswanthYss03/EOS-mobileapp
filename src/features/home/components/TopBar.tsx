import { useEffect, useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { fonts } from "@/theme";
import { useAuth } from "@/context/AuthContext";
import { getMyProfile } from "@/services/api/profile.api";

function greetingNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? email;
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}

// Notification/wallet icons live in HomeHeader now - this row is just the
// avatar (opens /profile) and the greeting. getMyProfile (not getMe) on
// purpose - it's the one endpoint that resolves photo_url for every role
// (student/parent get their own branch, everything else falls through to
// the faculty/staff branch - see EOSbackend1's ProfileService.getMyProfile).
export function TopBar() {
  const router = useRouter();
  const { user } = useAuth();
  // Shown instantly while the real profile loads, so the greeting is never
  // blank - replaced once GET /me/my-profile resolves the caller's actual
  // name and photo server-side.
  const [name, setName] = useState(user ? greetingNameFromEmail(user.email) : "there");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

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
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
});
