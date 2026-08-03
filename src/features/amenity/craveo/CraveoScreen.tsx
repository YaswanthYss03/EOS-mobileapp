import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { CraveoRoot } from "./CraveoRoot";

// Craveo is the real, standalone app now (see ./app/src for its untouched source
// and ./CraveoRoot.js for how its providers/navigation are mounted here). It has
// its own login, own Redux store, own internal navigation - this just embeds it.
export function CraveoScreen() {
  // We're still in the OUTER expo-router tree here (CraveoRoot below is where it
  // becomes an independent nested tree), so navigation.getParent() reaches EOS's
  // own Tabs navigator directly - hide its tab bar while Craveo (which has its own
  // bottom bar, see CraveoBottomNav) is focused, restore it on the way out.
  const navigation = useNavigation();

  useEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: "none" } });
    return () => {
      parent?.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);

  return <CraveoRoot />;
}
