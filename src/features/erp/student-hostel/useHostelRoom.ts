import { useEffect, useState } from "react";
import { getMyHostelRoom, type HostelRoomInfo } from "@/services/api/hostel.api";

// Shared by the Hostel hub and all 3 of its own sub-pages (Outing/
// Complaints/Mess feedback) - each is now a separate screen (see
// StudentHostelScreen.tsx's own comment for why), so each fetches this
// itself rather than one screen fetching it once and passing it down.
export function useHostelRoom() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [room, setRoom] = useState<HostelRoomInfo | null>(null);

  useEffect(() => {
    getMyHostelRoom()
      .then((response) => {
        setRoom(response);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, []);

  return { status, room };
}
