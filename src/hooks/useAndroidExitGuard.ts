import { useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";
import { useRouter } from "expo-router";
import { toast } from "@/utils/toast";

const DOUBLE_PRESS_WINDOW_MS = 2000;

/**
 * Bug fix: with no override, React Navigation's default Android back-button
 * behavior bubbles all the way up and closes the app the instant the focused
 * stack AND the bottom-tab history are both exhausted - which happens easily
 * just from switching between tabs a few times while browsing nested pages,
 * with zero warning. `router.canGoBack()` is the single source of truth
 * across the whole nested tab/stack tree (not just the locally focused
 * stack), so this only ever intercepts the true "nothing left to go back
 * to" case - every other back press still pops/switches tabs exactly as
 * before. At that true root, a second press within 2s exits for real
 * (standard Android "press back again to exit" pattern) instead of either
 * silently closing on the first press or trapping the user forever.
 */
export function useAndroidExitGuard() {
  const router = useRouter();
  const lastPressRef = useRef(0);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (router.canGoBack()) return false;

      const now = Date.now();
      if (now - lastPressRef.current < DOUBLE_PRESS_WINDOW_MS) {
        BackHandler.exitApp();
        return true;
      }
      lastPressRef.current = now;
      toast.info("Press back again to exit");
      return true;
    });

    return () => subscription.remove();
  }, [router]);
}
