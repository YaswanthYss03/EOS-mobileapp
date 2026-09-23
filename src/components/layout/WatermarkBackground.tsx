import { Image, StyleSheet, View } from "react-native";

const logoSource = require("../../../assets/logo.png");

// Faint centered college-crest watermark for the Class/Campus/Amenity tab
// root screens - sits behind whatever content each screen renders (put it
// as the FIRST child inside that screen's own container, before its
// ScrollView/content, so normal stacking order draws content on top of it).
// pointerEvents="none" so it never intercepts taps meant for the content
// above it.
export function WatermarkBackground() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Image source={logoSource} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 220,
    height: 220,
    opacity: 0.1,
  },
});
