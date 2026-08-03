import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import LottieView from "lottie-react-native";
import { useRouter } from "expo-router";

// Plays once on app launch, then hands off to the login screen. Falls back to
// a fixed timeout in case onAnimationFinish doesn't fire for some reason (e.g.
// a dropped frame callback), so the user is never stuck here.
const ANIMATION_FALLBACK_MS = 4500;

export function SplashScreen() {
  const router = useRouter();
  const hasNavigated = useRef(false);

  function goToLogin() {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    router.replace("/(auth)/login");
  }

  useEffect(() => {
    const timer = setTimeout(goToLogin, ANIMATION_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <LottieView
        source={require("../../../assets/College_logo_reveal_animation_202608022012.json")}
        autoPlay
        loop={false}
        onAnimationFinish={goToLogin}
        style={styles.lottie}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  lottie: {
    width: "100%",
    height: "100%",
  },
});
