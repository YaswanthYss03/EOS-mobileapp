import { useCallback, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { BackHeader } from "@/components/layout/BackHeader";
import { CraveoRoot } from "./CraveoRoot";

// Craveo is the real, standalone app now (see ./app/src for its untouched source
// and ./CraveoRoot.js for how its providers/navigation are mounted here). It has
// its own login, own Redux store, own internal navigation (its own
// NavigationIndependentTree, see CraveoRoot.js) - this just embeds it.
export function CraveoScreen() {
  // We're still in the OUTER expo-router tree here (CraveoRoot below is where it
  // becomes an independent nested tree), so navigation.getParent() reaches EOS's
  // own Tabs navigator directly - hide its tab bar while Craveo (which has its own
  // bottom bar, see CraveoBottomNav) is focused, restore it on the way out.
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: "none" } });
    return () => {
      parent?.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);

  // Just tells the outer Tabs navigator not to render ITS OWN header at
  // all while Craveo is focused (a plain on/off flag) - the actual
  // "Craveo" + back header below is rendered directly in this component's
  // own tree instead of being handed to the outer navigator via
  // setOptions({ header: ... }), so there's nothing for anything else
  // (Craveo's own deeply-nested, independent navigation included) to ever
  // race or overwrite.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  return (
    <View style={styles.container}>
      <BackHeader title="Craveo" onBack={() => router.back()} />
      <CraveoRoot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
