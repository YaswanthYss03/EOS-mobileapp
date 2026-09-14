import { Stack } from "expo-router";

// erp/index.tsx now renders the caller's own role dashboard directly (no
// more <Redirect> to a sibling /(tabs)/erp/<role> route) - see that file's
// own comment for why. That means this tab's "root" is genuinely always
// literally "index" now, same as every other tab, so no special-cased
// tabBarStyle listener is needed here anymore - the shared
// tabBarStyleForRoute in app/(tabs)/_layout.tsx handles it identically to
// Home/Class/Amenity/My Bus.
export default function ErpLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
