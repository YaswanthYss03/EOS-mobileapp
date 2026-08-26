import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { registerDeviceToken, unregisterDeviceToken } from "@/services/api/notifications.api";

// Runs once at import time (imported from app/_layout.tsx) so a remote push
// shows a banner+sound while the app is foregrounded, even for a user who
// has never opened Craveo (which sets its own equivalent handler, but only
// once its own NotificationService is instantiated). expo-notifications has
// exactly one global handler - whichever call wins, both configure the same
// show-alert/sound/badge behavior, so there's no real conflict between the
// two features sharing it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// A push token is worthless (and Expo's API rejects the request outright)
// on a simulator/emulator - there's no real device to deliver to.
function isPhysicalDevice(): boolean {
  return Device.isDevice;
}

function getEasProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

/**
 * Requests notification permission (no-op if already granted/denied) and,
 * if granted, fetches this device's Expo push token and registers it with
 * the backend. Called once after login and once on session restore (see
 * AuthContext) - registering the same token twice is always safe, the
 * backend upserts by push_token.
 *
 * Never throws - a user should never be blocked from logging in because a
 * push permission prompt or the Expo push service had a bad day. Returns
 * the token on success so the caller can hold onto it for unregisterPush()
 * at logout, or null if registration didn't happen for any reason.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!isPhysicalDevice()) {
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let status = existingStatus;
    if (status !== "granted") {
      const { status: requestedStatus } = await Notifications.requestPermissionsAsync();
      status = requestedStatus;
    }
    if (status !== "granted") {
      return null;
    }

    const projectId = getEasProjectId();
    if (!projectId) {
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerDeviceToken(token, Platform.OS === "ios" ? "ios" : "android");
    return token;
  } catch {
    // Permission dialogs, a missing EAS project link, or a flaky Expo push
    // service are all recoverable next launch - never surface this to the
    // user or block whatever flow (login, session restore) called this.
    return null;
  }
}

/** Called on logout - stop pushing to a device once its owner logs out. */
export async function unregisterPushToken(pushToken: string | null): Promise<void> {
  if (!pushToken) {
    return;
  }
  try {
    await unregisterDeviceToken(pushToken);
  } catch {
    // Best-effort - a stale token left registered is a minor annoyance
    // (PushNotificationService prunes DeviceNotRegistered tokens on the
    // next send anyway), never worth blocking logout over.
  }
}
