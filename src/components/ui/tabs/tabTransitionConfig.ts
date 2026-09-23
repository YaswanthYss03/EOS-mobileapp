import { Easing } from "react-native-reanimated";

// The single source of truth for tab-switch timing - content transitions
// (TabTransitionView), the sliding indicator (AnimatedTabBar), and the
// bottom tab bar's sceneStyleInterpolator (app/(tabs)/_layout.tsx) all
// import from here, so every tab switch in the app moves in lockstep.
export const TAB_TRANSITION_MS = 210;
export const TAB_TRANSITION_EASING = Easing.inOut(Easing.cubic);
