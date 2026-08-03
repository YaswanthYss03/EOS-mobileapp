import { SplashScreen } from "@/features/splash/SplashScreen";

// TODO: once real auth exists, check src/context/AuthContext here and skip
// straight to (tabs) if already logged in, instead of always going to login.
export default function Index() {
  return <SplashScreen />;
}
