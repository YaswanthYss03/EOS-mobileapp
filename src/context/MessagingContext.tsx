import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import {
  getUnreadMessageCount,
  listIncomingChatRequests,
  listGroupInvites,
} from "@/services/api/messaging.api";

// EXPO_PUBLIC_API_URL is the REST base (".../api/v1") - the messaging
// WebSocket gateway is a separate Socket.IO namespace at the plain host root
// (see EOSbackend1's MessagingGateway: @WebSocketGateway({ namespace:
// '/messaging' }), no global prefix applies to it), so the "/api/v1" suffix
// has to come off before connecting.
function socketBaseUrl(): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
  return apiUrl.replace(/\/api\/v1\/?$/, "");
}

type MessagingState = {
  socket: Socket | null;
  unreadCount: number;
  refreshUnreadCount: () => void;
  // Student-only (the endpoints behind this 403 for every other role) - the
  // combined count of incoming chat requests + group invitations, backing a
  // small badge on the messages list's requests entry point.
  pendingRequestsCount: number;
  refreshPendingRequestsCount: () => void;
};

const MessagingContext = createContext<MessagingState | null>(null);

export function useMessaging() {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error("useMessaging must be used within MessagingProvider");
  return ctx;
}

// One socket connection for the whole app, alive for as long as the user is
// logged in - both the header's unread badge and any open chat screen share
// it, rather than each screen opening/closing its own connection.
export function MessagingProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  // Avoids a stale closure inside the socket event handlers below re-reading
  // an old `refreshUnreadCount`/`refreshPendingRequestsCount` - they call
  // these refs instead.
  const refreshRef = useRef<() => void>(() => {});
  const refreshRequestsRef = useRef<() => void>(() => {});
  const isStudent = user?.role === "student";

  function refreshUnreadCount() {
    getUnreadMessageCount()
      .then(setUnreadCount)
      .catch(() => {
        // Best-effort - a stale badge count isn't worth surfacing an error for.
      });
  }
  refreshRef.current = refreshUnreadCount;

  function refreshPendingRequestsCount() {
    if (!isStudent) return;
    Promise.all([listIncomingChatRequests(), listGroupInvites()])
      .then(([requests, invites]) => setPendingRequestsCount(requests.length + invites.length))
      .catch(() => {
        // Best-effort - same as refreshUnreadCount above.
      });
  }
  refreshRequestsRef.current = refreshPendingRequestsCount;

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setUnreadCount(0);
      setPendingRequestsCount(0);
      return;
    }

    refreshUnreadCount();
    refreshPendingRequestsCount();

    const client = io(`${socketBaseUrl()}/messaging`, {
      auth: { token },
      transports: ["websocket"],
    });

    // A brand-new conversation's first message, or any new message in an
    // existing one, can change the unread total - simplest correct approach
    // is a real recount rather than hand-rolled increment/decrement math
    // that has to agree with which conversation the user currently has open.
    client.on("conversation:new", () => refreshRef.current());
    client.on("message:new", () => refreshRef.current());
    client.on("message:read", () => refreshRef.current());

    // Same recount-not-increment reasoning for the requests badge - any of
    // these six events can only be received by a student (see
    // MessageRequestsService), so this is a no-op for every other role.
    client.on("chat_request:new", () => refreshRequestsRef.current());
    client.on("chat_request:accepted", () => refreshRequestsRef.current());
    client.on("chat_request:rejected", () => refreshRequestsRef.current());
    client.on("group_invite:new", () => refreshRequestsRef.current());
    client.on("group_invite:accepted", () => refreshRequestsRef.current());
    client.on("group_invite:rejected", () => refreshRequestsRef.current());
    client.on("group_invite:cancelled", () => refreshRequestsRef.current());

    setSocket(client);

    return () => {
      client.disconnect();
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <MessagingContext.Provider
      value={{ socket, unreadCount, refreshUnreadCount, pendingRequestsCount, refreshPendingRequestsCount }}
    >
      {children}
    </MessagingContext.Provider>
  );
}
