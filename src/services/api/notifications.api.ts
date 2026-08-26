import { apiClient } from "./client";

// Mirrors notification_type_enum in the backend schema (18 values across
// approvals, LMS, announcements, fees, wallet, attendance, library,
// placements, hostel). Kept as a plain string here rather than a literal
// union - a client-side deep-link switch that only recognizes a handful of
// these (see NotificationsScreen) should fail open on an unrecognized
// value, not fail to compile when the backend adds a new one.
export type NotificationType = string;

export type NotificationItem = {
  id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean;
  type: NotificationType | null;
  related_entity_type: string | null;
  related_entity_id: number | null;
  created_at: string;
};

export async function getNotifications(): Promise<NotificationItem[]> {
  const { data } = await apiClient.get<{ data: NotificationItem[] }>("/notifications");
  return data.data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<{ data: { count: number } }>("/notifications/unread-count");
  return data.data.count;
}

export async function markNotificationRead(id: number): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post("/notifications/read-all");
}

export async function registerDeviceToken(
  pushToken: string,
  platform: "ios" | "android",
): Promise<void> {
  await apiClient.post("/notifications/register-device", { push_token: pushToken, platform });
}

export async function unregisterDeviceToken(pushToken: string): Promise<void> {
  await apiClient.delete(`/notifications/register-device/${encodeURIComponent(pushToken)}`);
}
