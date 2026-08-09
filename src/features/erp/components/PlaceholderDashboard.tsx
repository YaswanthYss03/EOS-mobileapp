import { useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { DashboardHeader } from "./DashboardHeader";

// Shared body for the roles whose dashboard isn't built out yet (still a
// bare TODO stub) - still needs the same "EOS + back" header treatment as
// every other role's dashboard, even before there's any real content
// underneath it.
export function PlaceholderDashboard({ subtitle, label }: { subtitle: string; label: string }) {
  const navigation = useNavigation();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <DashboardHeader subtitle={subtitle} onBack={() => router.replace("/(tabs)/home")} />,
      });
      return () => {
        navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
      };
    }, [navigation, router, subtitle]),
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.content}>
        <Text style={styles.text}>{label}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  text: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
});
