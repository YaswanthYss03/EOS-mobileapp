import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { fonts } from "@/theme";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/services/api/client";

const logoSource = require("../../../assets/logo.png");
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const HERO_HEIGHT_LARGE = SCREEN_HEIGHT;
const HERO_HEIGHT_SMALL = 170;
const REVEAL_DELAY_MS = 900;
const REVEAL_DURATION_MS = 700;

export function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 0 = full-screen welcome hero, 1 = collapsed into a compact header with the
  // login form revealed underneath. Starts full-screen so the welcome hero is
  // the first thing shown, then animates on its own into the login form.
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(reveal, {
        toValue: 1,
        duration: REVEAL_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // driving a height interpolation
      }).start();
    }, REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [reveal]);

  const heroHeight = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: [HERO_HEIGHT_LARGE, HERO_HEIGHT_SMALL + insets.top],
  });
  const largeContentOpacity = reveal.interpolate({
    inputRange: [0, 0.35],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const smallContentOpacity = reveal.interpolate({
    inputRange: [0.55, 1],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const formOpacity = reveal.interpolate({
    inputRange: [0.5, 1],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const formTranslateY = reveal.interpolate({
    inputRange: [0.5, 1],
    outputRange: [30, 0],
    extrapolate: "clamp",
  });

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Enter both email and password");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)/home");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not log in. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.hero, { height: heroHeight }]}>
        <LinearGradient
          colors={["#2F6FE0", "#1A3D8F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <Animated.View style={[styles.heroLarge, { opacity: largeContentOpacity }]} pointerEvents="none">
            <Image source={logoSource} style={styles.logoImageLarge} resizeMode="contain" />
            <Text style={styles.appNameLarge}>Sri Eshwar&apos;s App</Text>
            <Text style={styles.taglineLarge}>LEADERSHIP & EXCELLENCE</Text>
          </Animated.View>

          <Animated.View
            style={[styles.heroSmall, { top: insets.top + 18, opacity: smallContentOpacity }]}
            pointerEvents="none"
          >
            <Image source={logoSource} style={styles.logoImageSmall} resizeMode="contain" />
            <Text style={styles.appNameSmall}>Sri Eshwar&apos;s App</Text>
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      <Animated.View
        style={[styles.formSection, { opacity: formOpacity, transform: [{ translateY: formTranslateY }] }]}
      >
        <Text style={styles.welcomeText}>Welcome back</Text>
        <Text style={styles.welcomeSubtext}>Login to continue</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!loading}
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              editable={!loading}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
              <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  hero: {
    width: "100%",
    overflow: "hidden",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  heroGradient: {
    flex: 1,
  },
  heroLarge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoImageLarge: {
    width: 110,
    height: 110,
    marginBottom: 20,
  },
  appNameLarge: {
    color: "#fff",
    fontSize: 26,
    fontFamily: fonts.bold,
    textAlign: "center",
  },
  taglineLarge: {
    color: "#D7E2FA",
    fontSize: 12,
    fontFamily: fonts.semibold,
    letterSpacing: 1.2,
    marginTop: 6,
  },
  heroSmall: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  logoImageSmall: {
    width: 40,
    height: 40,
  },
  appNameSmall: {
    color: "#fff",
    fontSize: 17,
    fontFamily: fonts.bold,
  },
  formSection: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 36,
  },
  welcomeText: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  welcomeSubtext: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 28,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  error: {
    color: "#DC2626",
    fontSize: 13,
    fontFamily: fonts.regular,
    marginTop: -6,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#235EAA",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    elevation: 3,
    shadowColor: "#235EAA",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: "#7A9BC4",
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonText: {
    color: "#fff",
    fontFamily: fonts.bold,
    fontSize: 16,
  },
});
