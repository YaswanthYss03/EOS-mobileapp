import { apiClient } from "./client";

// Wired to EOSbackend1's src/modules/messaging module (REST side - see
// useMessagingSocket.tsx for the real-time WebSocket side). Every response
// here goes through the backend's global TransformInterceptor, so each call
// unwraps a `{ data: T }` envelope, same convention as every other api.ts file.

export type MessagePerson = {
  userId: number;
  name: string;
  roleLabel: string;
  // students.photo_url / faculty.profile_url, normalized to one field name
  // server-side (see ProfileService.getMyProfile's same convention) - null
  // falls back to the existing initials-circle avatar, never a second
  // messaging-specific image.
  photoUrl: string | null;
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

// A DM has otherUser set and isGroup:false; a group has title/imageUrl set,
// otherUser:null, and isGroup:true - branch on isGroup, not on otherUser
// being present, since a group's otherUser is always null by design (no
// single "other party" for 3+ participants).
export type ConversationSummary = {
  id: number;
  isGroup: boolean;
  title: string | null;
  imageUrl: string | null;
  memberCount?: number;
  otherUser: MessagePerson | null;
  lastMessage: ConversationLastMessage | null;
  lastMessageAt: string | null;
  unreadCount: number;
  // Personal to the caller - pinning a conversation never changes this for
  // any other participant (see MessagingService.setConversationPinned).
  isPinned: boolean;
};

export type GroupMember = MessagePerson & { isOwner: boolean };

export type GroupDetails = {
  id: number;
  title: string | null;
  imageUrl: string | null;
  isGroup: boolean;
  isOwner: boolean;
  memberCount: number;
  members: GroupMember[];
  // Only ever populated for the owner - a student who hasn't accepted yet
  // has no message_participants row and must never appear in `members`.
  pendingInvites: MessagePerson[];
};

// GET /me/messaging/conversations - only DMs with at least one real message
// ever appear here (a just-created, never-messaged DM stays invisible on
// both sides - see createConversation's own doc comment). A group appears
// immediately on creation instead - see createGroupConversation.
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

// GET /me/messaging/contacts/eligible-students?q= (Faculty/HoD) - any active
// student in the college, regardless of department/year/section/class.
// Without q, a capped default page; q searches the full student directory.
// Server-enforced on every write - this is just what the picker UI shows.
export async function getEligibleStudents(q?: string): Promise<MessagePerson[]> {
  const { data } = await apiClient.get<{ data: MessagePerson[] }>(
    "/me/messaging/contacts/eligible-students",
    { params: q?.trim() ? { q: q.trim() } : undefined },
  );
  return data.data;
}

// POST /me/messaging/conversations/group { title, studentUserIds } -
// Faculty/HoD only. Visible to every member immediately (not deferred until
// a first message, unlike a DM).
export async function createGroupConversation(
  title: string,
  studentUserIds: number[],
): Promise<ConversationSummary> {
  const { data } = await apiClient.post<{ data: ConversationSummary }>(
    "/me/messaging/conversations/group",
    { title, studentUserIds },
  );
  return data.data;
}

// GET /me/messaging/conversations/:id - any current participant.
export async function getGroupDetails(conversationId: number): Promise<GroupDetails> {
  const { data } = await apiClient.get<{ data: GroupDetails }>(
    `/me/messaging/conversations/${conversationId}`,
  );
  return data.data;
}

// PATCH /me/messaging/conversations/:id { title } - group owner only.
export async function updateGroupTitle(conversationId: number, title: string): Promise<GroupDetails> {
  const { data } = await apiClient.patch<{ data: GroupDetails }>(
    `/me/messaging/conversations/${conversationId}`,
    { title },
  );
  return data.data;
}

// POST /me/messaging/conversations/:id/image (multipart, field "file") -
// group owner only. Same FormData shape as profile.api.ts's uploadMyResume.
export async function uploadGroupImage(
  conversationId: number,
  file: { uri: string; name: string; mimeType: string },
): Promise<GroupDetails> {
  const formData = new FormData();
  formData.append("file", { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  const { data } = await apiClient.post<{ data: GroupDetails }>(
    `/me/messaging/conversations/${conversationId}/image`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.data;
}

// POST /me/messaging/conversations/:id/members { studentUserIds } - group
// owner only, re-validated server-side against the same eligible-students
// set. Idempotent - ids already a member are silently skipped.
export async function addGroupMembers(conversationId: number, studentUserIds: number[]): Promise<GroupDetails> {
  const { data } = await apiClient.post<{ data: GroupDetails }>(
    `/me/messaging/conversations/${conversationId}/members`,
    { studentUserIds },
  );
  return data.data;
}

// DELETE /me/messaging/conversations/:id/members/:userId - group owner only.
export async function removeGroupMember(conversationId: number, userId: number): Promise<GroupDetails> {
  const { data } = await apiClient.delete<{ data: GroupDetails }>(
    `/me/messaging/conversations/${conversationId}/members/${userId}`,
  );
  return data.data;
}

// DELETE /me/messaging/conversations/:id - group owner only.
export async function deleteGroup(conversationId: number): Promise<void> {
  await apiClient.delete(`/me/messaging/conversations/${conversationId}`);
}

// PATCH /me/messaging/conversations/:id/pin | .../unpin - any current
// participant, personal to the caller only (never visible to other
// participants' own lists).
export async function pinConversation(conversationId: number): Promise<ConversationSummary> {
  const { data } = await apiClient.patch<{ data: ConversationSummary }>(
    `/me/messaging/conversations/${conversationId}/pin`,
  );
  return data.data;
}

export async function unpinConversation(conversationId: number): Promise<ConversationSummary> {
  const { data } = await apiClient.patch<{ data: ConversationSummary }>(
    `/me/messaging/conversations/${conversationId}/unpin`,
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

// ─────────────────────── student-to-student chat requests ───────────────────────
// Students can't DM each other directly - one side must send a request and
// the other must accept it before the normal DM endpoints above (POST
// /conversations, message:send) will work between them. See
// message-requests.service.ts.

export type ChatRequestStatus = "pending" | "accepted" | "rejected";

export type ChatRequest = {
  requestId: number;
  senderUserId: number;
  receiverUserId: number;
  status: ChatRequestStatus;
  sender: MessagePerson | null;
  createdAt: string;
};

export type RelationshipStatus =
  | { status: "self" }
  | { status: "none" }
  | { status: "pending_sent"; requestId: number }
  | { status: "pending_received"; requestId: number }
  | { status: "accepted"; conversationId: number | null };

// POST /me/messaging/requests { receiverUserId } - student only.
export async function sendChatRequest(receiverUserId: number): Promise<ChatRequest> {
  const { data } = await apiClient.post<{ data: ChatRequest }>("/me/messaging/requests", {
    receiverUserId,
  });
  return data.data;
}

// GET /me/messaging/requests/incoming - pending requests sent TO me.
export async function listIncomingChatRequests(): Promise<ChatRequest[]> {
  const { data } = await apiClient.get<{ data: ChatRequest[] }>("/me/messaging/requests/incoming");
  return data.data;
}

// GET /me/messaging/requests/sent - pending requests I sent.
export async function listSentChatRequests(): Promise<ChatRequest[]> {
  const { data } = await apiClient.get<{ data: ChatRequest[] }>("/me/messaging/requests/sent");
  return data.data;
}

// GET /me/messaging/requests/status/:userId - drives the "Send Message
// Request" / "Request Sent" / "Accept · Reject" / "Message" button state on
// another student's profile/contact row.
export async function getRelationshipStatus(otherUserId: number): Promise<RelationshipStatus> {
  const { data } = await apiClient.get<{ data: RelationshipStatus }>(
    `/me/messaging/requests/status/${otherUserId}`,
  );
  return data.data;
}

// POST /me/messaging/requests/:id/accept - creates/activates the DM
// conversation and returns it, ready to open immediately.
export async function acceptChatRequest(requestId: number): Promise<ConversationSummary> {
  const { data } = await apiClient.post<{ data: ConversationSummary }>(
    `/me/messaging/requests/${requestId}/accept`,
  );
  return data.data;
}

// POST /me/messaging/requests/:id/reject
export async function rejectChatRequest(requestId: number): Promise<void> {
  await apiClient.post(`/me/messaging/requests/${requestId}/reject`);
}

// ─────────────────────── student-created-group invitations ───────────────────────
// A student group owner's selections become pending invitations, not active
// members - see MessagingService.createGroupInvites. Faculty/HoD groups
// never generate one of these; their adds are immediate.

export type GroupInvite = {
  requestId: number;
  conversationId: number | null;
  groupTitle: string | null;
  groupImageUrl: string | null;
  invitedBy: MessagePerson | null;
  createdAt: string;
};

// GET /me/messaging/group-invites - pending invitations sent to me.
export async function listGroupInvites(): Promise<GroupInvite[]> {
  const { data } = await apiClient.get<{ data: GroupInvite[] }>("/me/messaging/group-invites");
  return data.data;
}

// POST /me/messaging/group-invites/:id/accept - adds me as an active member
// and returns the group's details, ready to open immediately.
export async function acceptGroupInvite(requestId: number): Promise<GroupDetails> {
  const { data } = await apiClient.post<{ data: GroupDetails }>(
    `/me/messaging/group-invites/${requestId}/accept`,
  );
  return data.data;
}

// POST /me/messaging/group-invites/:id/reject
export async function rejectGroupInvite(requestId: number): Promise<void> {
  await apiClient.post(`/me/messaging/group-invites/${requestId}/reject`);
}
