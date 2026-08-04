import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { AuthProvider } from "@/context/AuthContext";
import { ToastHost } from "@/components/ui/ToastHost";
import { OfflineBanner } from "@/components/ui/OfflineBanner";

// TODO: also wrap with RBACProvider, QueryClientProvider, ThemeProvider (see src/store)
export default function RootLayout() {
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
      <SafeAreaProvider>
        <Slot />
        <OfflineBanner />
        <ToastHost />
      </SafeAreaProvider>
    </AuthProvider>
  );
}
