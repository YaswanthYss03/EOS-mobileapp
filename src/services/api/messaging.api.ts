import { apiClient } from "./client";

// Wired to EOSbackend1's src/modules/messaging module (REST side - see
// useMessagingSocket.tsx for the real-time WebSocket side). Every response
// here goes through the backend's global TransformInterceptor, so each call
// unwraps a `{ data: T }` envelope, same convention as every other api.ts file.

export type MessagePerson = {
  userId: number;
  name: string;
  roleLabel: string;
};

export type SuggestedContact = MessagePerson & {
  suggestionLabel: string;
};

// GET /me/messaging/search?q= - searches faculty/hod/principal/admin/staff/
// students by name (or email) across every role. A student caller never
// gets other students back - enforced server-side, not just hidden here.
export async function searchPeople(q: string): Promise<MessagePerson[]> {
  const query = q.trim();
  if (!query) return [];
  const { data } = await apiClient.get<{ data: MessagePerson[] }>("/me/messaging/search", {
    params: { q: query },
  });
  return data.data;
}

// GET /me/messaging/contacts/suggested - student-only (class advisor + personal
// mentor); empty array for every other role.
export async function getSuggestedContacts(): Promise<SuggestedContact[]> {
  const { data } = await apiClient.get<{ data: SuggestedContact[] }>(
    "/me/messaging/contacts/suggested",
  );
  return data.data;
}

export type ConversationLastMessage = {
  id: number;
  body: string | null;
  isDeleted: boolean;
  senderUserId: number;
  createdAt: string;
};

export type ConversationSummary = {
  id: number;
  otherUser: MessagePerson;
  lastMessage: ConversationLastMessage | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

// GET /me/messaging/conversations - only conversations with at least one
// real message ever appear here (a just-created, never-messaged conversation
// stays invisible on both sides - see createConversation's own doc comment).
export async function listConversations(beforeId?: number): Promise<ConversationSummary[]> {
  const { data } = await apiClient.get<{ data: ConversationSummary[] }>(
    "/me/messaging/conversations",
    { params: beforeId ? { beforeId } : undefined },
  );
  return data.data;
}

// POST /me/messaging/conversations { otherUserId } - idempotent (returns the
// existing DM if one's already there). Doesn't show up in listConversations
// for either side until sendMessage's first real message lands.
export async function createConversation(otherUserId: number): Promise<ConversationSummary> {
  const { data } = await apiClient.post<{ data: ConversationSummary }>(
    "/me/messaging/conversations",
    { otherUserId },
  );
  return data.data;
}

export type MessageStatus = "sent" | "delivered" | "read";

export type ChatMessage = {
  id: number;
  conversationId: number;
  senderUserId: number;
  body: string | null;
  isDeleted: boolean;
  isEdited: boolean;
  status: MessageStatus;
  createdAt: string;
  deliveredAt: string | null;
  readAt: string | null;
};

// GET /me/messaging/conversations/:id/messages - oldest-first (the service
// fetches newest-first for pagination, then reverses before returning).
export async function listMessages(
  conversationId: number,
  beforeId?: number,
): Promise<ChatMessage[]> {
  const { data } = await apiClient.get<{ data: ChatMessage[] }>(
    `/me/messaging/conversations/${conversationId}/messages`,
    { params: beforeId ? { beforeId } : undefined },
  );
  return data.data;
}

// GET /me/messaging/unread-count - total unread across every conversation,
// backs the header's message badge (see useMessagingSocket.tsx).
export async function getUnreadMessageCount(): Promise<number> {
  const { data } = await apiClient.get<{ data: { count: number } }>(
    "/me/messaging/unread-count",
  );
  return data.data.count;
}

// PATCH /me/messaging/messages/:id - sender-only, blocked once deleted.
export async function editMessage(messageId: number, body: string): Promise<void> {
  await apiClient.patch(`/me/messaging/messages/${messageId}`, { body });
}

// DELETE /me/messaging/messages/:id - sender-only soft delete.
export async function deleteMessage(messageId: number): Promise<void> {
  await apiClient.delete(`/me/messaging/messages/${messageId}`);
}
