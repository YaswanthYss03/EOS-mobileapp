import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { login as loginRequest, type AuthUser } from "@/services/api/auth.api";
import { getAccountResponsibilities, getMyProfile, type AccountResponsibility } from "@/services/api/profile.api";
import { listMyChildren } from "@/services/api/parents.api";
import { setAuthToken, setUnauthorizedHandler } from "@/services/api/client";
import { registerForPushNotifications, unregisterPushToken } from "@/services/push-notifications";
import { toast } from "@/utils/toast";

const STORAGE_KEY = "eos_auth";

// "Switch Account" feature - a HOD/Faculty account can hold any combination
// of HOD, Class Advisor and Subject Handling Faculty responsibilities
// (derived from real backend mappings, see profile.service.ts's
// getAccountResponsibilities) and flip the Campus/Student section between
// them without logging out (see ProfileScreen.tsx / HodDashboard.tsx /
// EmployeeDashboard.tsx). The user's real backend role/JWT never changes -
// this only ever narrows which tiles are shown, never which APIs the app is
// authorized to call (the backend still enforces that per the real role and
// the same class_mentors/faculty_subject_class_mapping scoping).
export type AccountMode = AccountResponsibility;

// Client-only synthetic mode, never present in the real backend-derived
// `responsibilities` array - see the Switch Account section below. Exists
// so a HOD account can pick "Faculty" even when they personally hold
// neither ADVISOR nor SUBJECT_HANDLER responsibility (both HodDashboard and
// EmployeeDashboard already fall back to their own default tile set when
// activeAccountMode is neither of their own special-cased values, so this
// just needs to be "not HOD" for the tab-layout branch below to work).
export type ViewMode = AccountMode | "FACULTY";

type StoredAuth = {
  token: string;
  user: AuthUser;
  activeAccountMode: ViewMode | null;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  // True only while restoring a persisted session on app launch - lets
  // app/index.tsx and app/(tabs)/_layout.tsx avoid redirecting to login
  // before we've had a chance to check SecureStore.
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  // Switch Account - see AccountMode above. `responsibilities` is the real,
  // backend-derived set this account actually holds (possibly empty, e.g.
  // library/finance/academic_coordinator, or a Faculty with no mapping
  // data yet). `canSwitchAccount` (offer the Switch Account UI at all) is
  // true only when there's more than one to choose between.
  responsibilities: AccountMode[];
  // A HOD account can always switch (HOD / Faculty - see ViewMode above),
  // even when `responsibilities` itself only ever holds "HOD" (no personal
  // teaching/mentoring mapping) - every other role still needs 2+ real
  // responsibilities before Switch Account is offered at all.
  canSwitchAccount: boolean;
  activeAccountMode: ViewMode | null;
  setActiveAccountMode: (mode: ViewMode) => void;
  // Student/Faculty bottom-nav tab decision (Bus/Hostel/neither) - see
  // app/(tabs)/_layout.tsx. null until fetched (or for every other role,
  // which never fetches this). Named "studentType" for historical reasons
  // (it predates Faculty getting the same tab logic) - GET /me/my-profile
  // returns this same field for a Faculty account too now (hosteller if a
  // faculty_hostel_mapping row exists, dayscholar otherwise - see
  // EOS-backend's profile.service.ts).
  studentType: "hosteller" | "dayscholar" | null;
  dayscholarMode: "transport" | "own_vehicle" | null;
};

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [responsibilities, setResponsibilities] = useState<AccountMode[]>([]);
  const [activeAccountMode, setActiveAccountModeState] = useState<ViewMode | null>(null);
  const canSwitchAccount = responsibilities.length > 1 || user?.role === "hod";
  const [studentType, setStudentType] = useState<"hosteller" | "dayscholar" | null>(null);
  const [dayscholarMode, setDayscholarMode] = useState<"transport" | "own_vehicle" | null>(null);
  // This device's current Expo push token, once registration completes -
  // held in a ref (not state) purely so logout() can read it without
  // waiting on a render; it's never displayed.
  const pushTokenRef = useRef<string | null>(null);

  // Only ever called for a HOD/Faculty account - checks the real backend
  // signal (see profile.service.ts's getAccountResponsibilities) and picks
  // which mode the dashboard renders immediately: the persisted mode if
  // it's still one this account actually holds, else the first
  // responsibility returned (HOD, then Advisor, then Subject Handler - the
  // backend's own default-selection order), else null if this account has
  // no detected responsibility at all (e.g. library/finance/academic
  // coordinator, or a Faculty with no mapping data yet - dashboards fall
  // back to their pre-existing default tile set in that case). Failure is
  // silent and leaves Switch Account simply unoffered - this is a
  // nice-to-have convenience feature, never something the rest of login
  // should block on.
  async function refreshResponsibilities(authUser: AuthUser, persistedMode: ViewMode | null) {
    if (authUser.role !== "hod" && authUser.role !== "faculty") return;
    try {
      const { responsibilities: fetched } = await getAccountResponsibilities();
      setResponsibilities(fetched);
      // A HOD always defaults to "HOD" (their real, primary identity) unless
      // a persisted choice says otherwise - "FACULTY" is always a valid
      // persisted choice for them regardless of what `fetched` contains (see
      // ViewMode's own comment). Every other role keeps the original
      // behavior: persisted mode if still held, else the first real
      // responsibility, else null.
      if (persistedMode && (persistedMode === "FACULTY" || fetched.includes(persistedMode))) {
        setActiveAccountModeState(persistedMode);
      } else if (authUser.role === "hod") {
        setActiveAccountModeState("HOD");
      } else {
        setActiveAccountModeState(fetched[0] ?? null);
      }
    } catch {
      // Leave responsibilities empty - Switch Account just won't be offered this session.
    }
  }

  // Called for Student AND Faculty accounts - which bottom-nav tab to show
  // in the 5th slot (see app/(tabs)/_layout.tsx): Hostel for a hosteller,
  // Bus for a dayscholar who uses college transport, or neither (4 tabs
  // total) for a dayscholar on their own vehicle. Some faculty live in
  // campus hostels and some commute by college bus too, same as students -
  // see EOS-backend's profile.service.ts's getFacultyProfile, which now
  // returns the same student_type/dayscholar_mode fields for a Faculty
  // account. Failure is silent and leaves both fields null, which the tab
  // bar treats as "show Bus" (the safer default - never silently hides a
  // tab a real student/faculty needs).
  //
  // Parent gets its own branch below: a parent has no student_type of their
  // own, it's derived from their linked child/children (siblings can
  // differ) - "any child is a hosteller" is enough to show the Hostel tab,
  // since ParentHostelScreen itself has a ChildSelector to pick which
  // child's room/night-attendance/gate-log to view. dayscholarMode is left
  // null for parents (the "own vehicle -> 4 tabs" rule is student/
  // faculty-specific self-service, not applied here - a parent always sees
  // one of Bus/Hostel).
  async function refreshTravelInfo(authUser: AuthUser) {
    if (authUser.role === "parent") {
      try {
        const children = await listMyChildren();
        setStudentType(children.some((c) => c.student_type === "hosteller") ? "hosteller" : "dayscholar");
      } catch {
        // Leave null - tab bar falls back to showing "Bus".
      }
      return;
    }
    if (authUser.role !== "student" && authUser.role !== "faculty") return;
    try {
      const profile = await getMyProfile();
      setStudentType(profile.student_type ?? null);
      setDayscholarMode(profile.dayscholar_mode ?? null);
    } catch {
      // Leave both null - tab bar falls back to showing "Bus".
    }
  }

  // Restore a previously-persisted session once on launch.
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (raw) {
          const stored: StoredAuth = JSON.parse(raw);
          setToken(stored.token);
          setUser(stored.user);
          setAuthToken(stored.token);
          // Fire-and-forget - permission prompts/EAS lookups/network calls
          // here must never delay showing the restored session.
          registerForPushNotifications().then((t) => {
            pushTokenRef.current = t;
          });
          void refreshResponsibilities(stored.user, stored.activeAccountMode ?? null);
          void refreshTravelInfo(stored.user);
        }
      } catch {
        // Corrupted/unreadable entry - treat as logged out, no need to surface this.
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // A 401 from any protected endpoint (token expired/revoked) forces logout.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      toast.warning("Your session has expired. Please log in again.");
      setToken(null);
      setUser(null);
      setAuthToken(null);
      setResponsibilities([]);
      setActiveAccountModeState(null);
      setStudentType(null);
      setDayscholarMode(null);
      SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => {});
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  async function login(email: string, password: string) {
    const result = await loginRequest(email, password);
    setToken(result.accessToken);
    setUser(result.user);
    setAuthToken(result.accessToken);
    setResponsibilities([]);
    setActiveAccountModeState(null);
    setStudentType(null);
    setDayscholarMode(null);
    await SecureStore.setItemAsync(
      STORAGE_KEY,
      JSON.stringify({ token: result.accessToken, user: result.user, activeAccountMode: null }),
    );
    // Fire-and-forget - a permission prompt or slow Expo push lookup must
    // never delay the post-login navigation.
    registerForPushNotifications().then((t) => {
      pushTokenRef.current = t;
    });
    void refreshResponsibilities(result.user, null);
    void refreshTravelInfo(result.user);
  }

  async function logout() {
    await unregisterPushToken(pushTokenRef.current);
    pushTokenRef.current = null;
    setToken(null);
    setUser(null);
    setAuthToken(null);
    setResponsibilities([]);
    setActiveAccountModeState(null);
    setStudentType(null);
    setDayscholarMode(null);
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  }

  // Only flips the Campus/Student module set (see HodDashboard.tsx) - never
  // touches the token, never re-authenticates, never logs out. Persisted
  // alongside the session so the choice survives an app restart, same as
  // the "app should still know HOD Account is active" requirement while
  // just navigating within a session.
  function setActiveAccountMode(mode: ViewMode) {
    setActiveAccountModeState(mode);
    if (token && user) {
      SecureStore.setItemAsync(
        STORAGE_KEY,
        JSON.stringify({ token, user, activeAccountMode: mode }),
      ).catch(() => {});
    }
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        login,
        logout,
        responsibilities,
        canSwitchAccount,
        activeAccountMode,
        setActiveAccountMode,
        studentType,
        dayscholarMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
