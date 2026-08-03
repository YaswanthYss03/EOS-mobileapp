import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastHost } from "@/components/ui/ToastHost";
import { OfflineBanner } from "@/components/ui/OfflineBanner";

// TODO: also wrap with AuthProvider, RBACProvider, QueryClientProvider, ThemeProvider (see src/context, src/store)
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Slot />
      <OfflineBanner />
      <ToastHost />
    </SafeAreaProvider>
  );
}
