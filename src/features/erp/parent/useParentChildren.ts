import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/services/api/client";
import { listMyChildren, type ParentChild } from "@/services/api/parents.api";

export type LoadStatus = "loading" | "success" | "error";

// Shared by all three parent screens (Attendance/Performance/Fees) - loads
// the caller's real linked children once and tracks which one is currently
// selected, defaulting to the first. A parent can have more than one child
// (siblings) via parent_student_mapping, so this is never assumed to be
// exactly one.
export function useParentChildren() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    listMyChildren()
      .then((rows) => {
        setChildren(rows);
        setSelectedChildId((current) => current ?? rows[0]?.id ?? null);
        setStatus("success");
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Couldn't load your children."));
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;

  return { status, error, children, selectedChild, selectedChildId, setSelectedChildId, reload: load };
}
