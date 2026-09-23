import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { AuthProvider } from "@/context/AuthContext";
import { MessagingProvider } from "@/context/MessagingContext";
import { StationeryCartProvider } from "@/context/StationeryCartContext";
import { CraveoCartProvider } from "@/context/CraveoCartContext";
import { ToastHost } from "@/components/ui/ToastHost";
import { ConfirmHost } from "@/components/ui/ConfirmHost";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { useAndroidExitGuard } from "@/hooks/useAndroidExitGuard";

// NOT importing @livekit/react-native here on purpose - it (transitively)
// requires @livekit/react-native-webrtc's native module, which doesn't
// exist in Expo Go or in any dev-client build made before that package was
// added. Importing it anywhere in this eagerly-loaded root file crashes the
// entire app before AuthProvider even mounts. See
// src/features/academics/online-class/InCallScreen.tsx, which loads it
// lazily and guarded instead - that's the only file that needs it.

// TODO: also wrap with RBACProvider, QueryClientProvider, ThemeProvider (see src/store)
export default function RootLayout() {
  // Bug fix: without this, Android's hardware back button exits the app the
  // instant there's nowhere left to go back to - easily hit just from
  // switching bottom tabs a few times while browsing nested pages. See the
  // hook's own comment for the full explanation.
  useAndroidExitGuard();

  // Loaded once at the root so it's ready before any screen renders (used by
  // the ERP tab for now - see src/features/erp/student).
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <MessagingProvider>
        <StationeryCartProvider>
          <CraveoCartProvider>
            <SafeAreaProvider>
              <Slot />
              <OfflineBanner />
              <ToastHost />
              <ConfirmHost />
            </SafeAreaProvider>
          </CraveoCartProvider>
        </StationeryCartProvider>
      </MessagingProvider>
    </AuthProvider>
  );
}
