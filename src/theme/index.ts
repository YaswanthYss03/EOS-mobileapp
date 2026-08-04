// TODO: colors, spacing, typography shared across all screens
export const theme = {
  colors: {
    primary: "#1E3A8A",
    background: "#FFFFFF",
    text: "#111111",
  },
  spacing: (n: number) => n * 4,
};

// Inter is loaded once at the root layout (app/_layout.tsx) via
// @expo-google-fonts/inter. It ships as separate static files per weight, so
// there's no synthetic bolding - use the matching family name instead of
// fontWeight to get a given weight.
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
};
