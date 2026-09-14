import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { getUnreadMessageCount } from "@/services/api/messaging.api";

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
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  // Avoids a stale closure inside the socket event handlers below re-reading
  // an old `refreshUnreadCount` - they call this ref instead.
  const refreshRef = useRef<() => void>(() => {});

  function refreshUnreadCount() {
    getUnreadMessageCount()
      .then(setUnreadCount)
      .catch(() => {
        // Best-effort - a stale badge count isn't worth surfacing an error for.
      });
  }
  refreshRef.current = refreshUnreadCount;

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setUnreadCount(0);
      return;
    }

    refreshUnreadCount();

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

    setSocket(client);

    return () => {
      client.disconnect();
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <MessagingContext.Provider value={{ socket, unreadCount, refreshUnreadCount }}>
      {children}
    </MessagingContext.Provider>
  );
}
