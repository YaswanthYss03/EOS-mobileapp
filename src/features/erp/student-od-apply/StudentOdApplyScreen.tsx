import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { getCalendarWeeks, WEEKDAY_LABELS, MONTH_NAMES, formatDate, toIsoDate } from "@/utils/calendar";
import {
  getMyOdTeams,
  createOdTeam,
  joinOdTeam,
  submitOdRequest,
  getMyOdRequests,
  type OdTeam,
  type OdRequestSummary,
} from "@/services/api/od.api";
import { getFacultyDirectory, type FacultyDirectoryEntry } from "@/services/api/faculty.api";
import { OD_STATUS_META, timeSlots } from "./data/mockStudentOdApply";

type Tab = "apply" | "history";
type TeamMode = "create" | "join";
type DateField = "from" | "to" | null;
type TimeField = "from" | "to" | null;

// Wired to EOS-backend's on-duty module (see @/services/api/od.api.ts) - a
// shareable team code, a from/to date (+ optional time), a mandatory Event
// name (wire format: `reason`), and an optional Faculty guide picked from
// @/services/api/faculty.api.ts's directory - distinct from the student's
// standing class mentor, who gates mentor_approval_status automatically and
// isn't picked here. Reachable from the Student dashboard's "OD"
// quick-access item.
export function StudentOdApplyScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>("apply");
  const [mode, setMode] = useState<TeamMode>("create");

  const [teams, setTeams] = useState<OdTeam[] | null>(null);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsErrored, setTeamsErrored] = useState(false);
  const [teamsReloadToken, setTeamsReloadToken] = useState(0);

  const [creating, setCreating] = useState(false);
  const [teamCode, setTeamCode] = useState("");
  const [joining, setJoining] = useState(false);

  const [fromDateObj, setFromDateObj] = useState<Date | null>(null);
  const [toDateObj, setToDateObj] = useState<Date | null>(null);
  const [fromTime, setFromTime] = useState<string | null>(null);
  const [toTime, setToTime] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [facultyList, setFacultyList] = useState<FacultyDirectoryEntry[] | null>(null);
  const [facultyGuide, setFacultyGuide] = useState<FacultyDirectoryEntry | null>(null);
  const [facultyPickerOpen, setFacultyPickerOpen] = useState(false);
  const [facultySearch, setFacultySearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [datePickerFor, setDatePickerFor] = useState<DateField>(null);
  const [timePickerFor, setTimePickerFor] = useState<TimeField>(null);
  const [pickerYear, setPickerYear] = useState(2026);
  const [pickerMonth, setPickerMonth] = useState(7); // August (0-indexed)

  const [history, setHistory] = useState<OdRequestSummary[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyErrored, setHistoryErrored] = useState(false);
  const [historyReloadToken, setHistoryReloadToken] = useState(0);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  useEffect(() => {
    let cancelled = false;
    setTeamsLoading(true);
    setTeamsErrored(false);

    getMyOdTeams()
      .then((data) => {
        if (!cancelled) setTeams(data);
      })
      .catch((error) => {
        if (cancelled) return;
        setTeamsErrored(true);
        toast.error(getApiErrorMessage(error, "Couldn't load your OD teams. Please try again."));
      })
      .finally(() => {
        if (!cancelled) setTeamsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [teamsReloadToken]);

  useEffect(() => {
    if (tab !== "history") return;
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryErrored(false);

    getMyOdRequests()
      .then(({ data }) => {
        if (!cancelled) setHistory(data);
      })
      .catch((error) => {
        if (cancelled) return;
        setHistoryErrored(true);
        toast.error(getApiErrorMessage(error, "Couldn't load your OD history. Please try again."));
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, historyReloadToken]);

  // Fetched once - the faculty roster (~70 rows) barely changes within a
  // session, unlike teams/history which need a reload token.
  useEffect(() => {
    let cancelled = false;
    getFacultyDirectory()
      .then((data) => {
        if (!cancelled) setFacultyList(data);
      })
      .catch(() => {
        // Silent - the picker just shows "Couldn't load faculty list" and
        // the field stays optional, so a failed fetch here shouldn't block
        // the rest of the form with a toast.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // has_request (not is_locked) is the authoritative "already submitted"
  // signal - it's the field the backend derived specifically for this
  // decision, and won't drift out of sync the way a locally-mirrored
  // is_locked flag theoretically could.
  const activeTeam = useMemo(() => teams?.find((team) => !team.has_request) ?? null, [teams]);

  const filteredFacultyList = useMemo(() => {
    if (!facultyList) return null;
    const query = facultySearch.trim().toLowerCase();
    if (!query) return facultyList;
    return facultyList.filter(
      (entry) => entry.name.toLowerCase().includes(query) || entry.department_name.toLowerCase().includes(query),
    );
  }, [facultyList, facultySearch]);

  const pickerWeeks = useMemo(() => getCalendarWeeks(pickerYear, pickerMonth), [pickerYear, pickerMonth]);

  function goToPreviousPickerMonth() {
    if (pickerMonth === 0) {
      setPickerMonth(11);
      setPickerYear((year) => year - 1);
    } else {
      setPickerMonth((month) => month - 1);
    }
  }

  function goToNextPickerMonth() {
    if (pickerMonth === 11) {
      setPickerMonth(0);
      setPickerYear((year) => year + 1);
    } else {
      setPickerMonth((month) => month + 1);
    }
  }

  function handlePickDate(day: number) {
    const picked = new Date(pickerYear, pickerMonth, day);
    if (datePickerFor === "from") {
      setFromDateObj(picked);
      if (toDateObj && toDateObj < picked) setToDateObj(picked);
    } else if (datePickerFor === "to") {
      setToDateObj(picked);
    }
    setDatePickerFor(null);
  }

  function handlePickTime(value: string) {
    if (timePickerFor === "from") setFromTime(value);
    else if (timePickerFor === "to") setToTime(value);
    setTimePickerFor(null);
  }

  function handleCreateTeam() {
    setCreating(true);
    createOdTeam()
      .then((team) => {
        toast.success(`Team created - share code ${team.unique_code} with your teammates`);
        setTeams((prev) => [team, ...(prev ?? [])]);
      })
      .catch((error) => toast.error(getApiErrorMessage(error, "Couldn't create the team. Please try again.")))
      .finally(() => setCreating(false));
  }

  function handleJoinTeam() {
    if (!teamCode.trim()) {
      toast.warning("Enter the 6-character team code");
      return;
    }
    setJoining(true);
    joinOdTeam(teamCode.trim())
      .then(() => {
        toast.success(`Joined team ${teamCode.trim().toUpperCase()}`);
        setTeamCode("");
        setTeamsReloadToken((n) => n + 1);
      })
      .catch((error) => toast.error(getApiErrorMessage(error, "Couldn't join that team. Please try again.")))
      .finally(() => setJoining(false));
  }

  function handleSubmitRequest() {
    if (!activeTeam) return;
    if (!fromDateObj || !toDateObj) {
      toast.warning("Select a start and end date");
      return;
    }
    if (!reason.trim()) {
      toast.warning("Add the event");
      return;
    }

    // Submitting locks the team server-side - no one still outside it will
    // be able to join afterwards. Confirm first rather than let a creator
    // who just tapped "Create team" immediately lock out teammates who
    // haven't had a chance to join with the code yet (especially likely
    // when they're still the only member).
    const soloWarning =
      activeTeam.member_count <= 1
        ? "You're still the only member. "
        : `Only ${activeTeam.member_count} ${activeTeam.member_count === 1 ? "member" : "members"} have joined so far. `;
    Alert.alert(
      "Submit OD request?",
      `${soloWarning}Submitting locks the team - no one else will be able to join with the code after this.`,
      [
        { text: "Wait, not yet", style: "cancel" },
        { text: "Submit", style: "destructive", onPress: doSubmitRequest },
      ],
    );
  }

  function doSubmitRequest() {
    if (!activeTeam || !fromDateObj || !toDateObj || !reason.trim()) return;
    setSubmitting(true);
    submitOdRequest(activeTeam.id, {
      from_date: toIsoDate(fromDateObj),
      to_date: toIsoDate(toDateObj),
      reason: reason.trim(),
      from_time: fromTime ?? undefined,
      to_time: toTime ?? undefined,
      faculty_guide_id: facultyGuide?.id,
    })
      .then(() => {
        toast.success("OD request submitted");
        setFromDateObj(null);
        setToDateObj(null);
        setFromTime(null);
        setToTime(null);
        setReason("");
        setFacultyGuide(null);
        setTeamsReloadToken((n) => n + 1);
        setHistoryReloadToken((n) => n + 1);
        setTab("history");
      })
      .catch((error) => toast.error(getApiErrorMessage(error, "Couldn't submit the OD request. Please try again.")))
      .finally(() => setSubmitting(false));
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>On-duty</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.tabSwitch}>
          <TouchableOpacity
            style={[styles.tabButton, tab === "apply" && styles.tabButtonActive]}
            onPress={() => setTab("apply")}
          >
            <Text style={[styles.tabButtonText, tab === "apply" && styles.tabButtonTextActive]}>Apply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, tab === "history" && styles.tabButtonActive]}
            onPress={() => setTab("history")}
          >
            <Text style={[styles.tabButtonText, tab === "history" && styles.tabButtonTextActive]}>History</Text>
          </TouchableOpacity>
        </View>

        {tab === "apply" ? (
          teamsLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color="#2F6FE0" />
              <Text style={styles.loadingStateText}>Loading...</Text>
            </View>
          ) : teamsErrored ? (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline-outline" size={32} color="#B0B7C3" />
              <Text style={styles.emptyStateText}>Couldn't load your OD teams</Text>
              <TouchableOpacity onPress={() => setTeamsReloadToken((n) => n + 1)} activeOpacity={0.8}>
                <Text style={styles.retryText}>Tap to retry</Text>
              </TouchableOpacity>
            </View>
          ) : activeTeam ? (
            <>
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Your team</Text>
                <View style={styles.codeDisplayRow}>
                  <Text style={styles.codeDisplayText}>{activeTeam.unique_code}</Text>
                  <View style={styles.memberBadge}>
                    <Ionicons name="people" size={13} color="#2F6FE0" />
                    <Text style={styles.memberBadgeText}>
                      {activeTeam.member_count} {activeTeam.member_count === 1 ? "member" : "members"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.codeHint}>
                  {activeTeam.is_creator
                    ? "Share this code with your teammates and wait for everyone to join - submitting the request below locks the team and no one else will be able to join afterwards."
                    : "You've joined this team. Only the team creator can submit the OD request."}
                </Text>

                {activeTeam.members.length > 0 && (
                  <View style={styles.membersList}>
                    {activeTeam.members.map((member) => (
                      <View key={member.student_id} style={styles.memberRow}>
                        <View style={styles.memberAvatar}>
                          <Text style={styles.memberAvatarText}>
                            {member.name.trim().charAt(0).toUpperCase() || "?"}
                          </Text>
                        </View>
                        <Text style={styles.memberName}>{member.name}</Text>
                        {member.is_creator && (
                          <View style={styles.creatorBadge}>
                            <Text style={styles.creatorBadgeText}>Creator</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {activeTeam.is_creator ? (
                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Submit OD request</Text>
                  <View style={styles.rowFields}>
                    <View style={styles.rowField}>
                      <Text style={styles.fieldLabel}>From date</Text>
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setDatePickerFor("from")}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="calendar-outline" size={14} color="#2F6FE0" />
                        <Text style={[styles.pickerButtonText, !fromDateObj && styles.pickerButtonPlaceholder]}>
                          {fromDateObj ? formatDate(fromDateObj) : "Select date"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.rowField}>
                      <Text style={styles.fieldLabel}>To date</Text>
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setDatePickerFor("to")}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="calendar-outline" size={14} color="#2F6FE0" />
                        <Text style={[styles.pickerButtonText, !toDateObj && styles.pickerButtonPlaceholder]}>
                          {toDateObj ? formatDate(toDateObj) : "Select date"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.rowFields}>
                    <View style={styles.rowField}>
                      <Text style={styles.fieldLabel}>From time (optional)</Text>
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setTimePickerFor("from")}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="time-outline" size={14} color="#2F6FE0" />
                        <Text style={[styles.pickerButtonText, !fromTime && styles.pickerButtonPlaceholder]}>
                          {fromTime ? timeSlots.find((s) => s.value === fromTime)?.label ?? fromTime : "Select"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.rowField}>
                      <Text style={styles.fieldLabel}>To time (optional)</Text>
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setTimePickerFor("to")}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="time-outline" size={14} color="#2F6FE0" />
                        <Text style={[styles.pickerButtonText, !toTime && styles.pickerButtonPlaceholder]}>
                          {toTime ? timeSlots.find((s) => s.value === toTime)?.label ?? toTime : "Select"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.fieldLabel}>Event</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. IEEE paper presentation at SSN College"
                    placeholderTextColor="#9AA6B2"
                    value={reason}
                    onChangeText={setReason}
                    multiline
                  />

                  <Text style={styles.fieldLabel}>Faculty guide (optional)</Text>
                  <TouchableOpacity
                    style={[styles.pickerButton, styles.inputLast]}
                    onPress={() => setFacultyPickerOpen(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="person-outline" size={14} color="#2F6FE0" />
                    <Text style={[styles.pickerButtonText, !facultyGuide && styles.pickerButtonPlaceholder]}>
                      {facultyGuide ? facultyGuide.name : "Select faculty"}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.lockWarningRow}>
                    <Ionicons name="lock-closed-outline" size={13} color="#D97706" />
                    <Text style={styles.lockWarningText}>This locks the team - no one else can join after.</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleSubmitRequest}
                    activeOpacity={0.85}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Submit OD request</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="time-outline" size={32} color="#B0B7C3" />
                  <Text style={styles.emptyStateText}>Waiting for the team creator</Text>
                  <Text style={styles.emptyStateSubtext}>
                    They'll submit the OD request once everyone has joined.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.modeRow}>
                <ModeCard
                  icon="people"
                  label="Create team"
                  selected={mode === "create"}
                  onPress={() => setMode("create")}
                />
                <ModeCard
                  icon="mail-open-outline"
                  label="Join team"
                  selected={mode === "join"}
                  onPress={() => setMode("join")}
                />
              </View>

              {mode === "create" ? (
                <View style={styles.card}>
                  <Text style={styles.codeHint}>
                    Create a team to get a shareable code. Add your teammates, then submit the OD request with
                    the dates and reason - anyone on the team can view its status.
                  </Text>
                  <TouchableOpacity
                    style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                    onPress={handleCreateTeam}
                    activeOpacity={0.85}
                    disabled={creating}
                  >
                    {creating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Create team</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Team code</Text>
                  <TextInput
                    style={[styles.codeInput, styles.inputLast]}
                    placeholder="6-CHARACTER CODE"
                    placeholderTextColor="#9AA6B2"
                    autoCapitalize="characters"
                    maxLength={6}
                    value={teamCode}
                    onChangeText={(text) => setTeamCode(text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                  />
                  <Text style={styles.codeHint}>Ask your team lead for the code generated when the team was created.</Text>
                  <TouchableOpacity
                    style={[styles.submitButton, joining && styles.submitButtonDisabled]}
                    onPress={handleJoinTeam}
                    activeOpacity={0.85}
                    disabled={joining}
                  >
                    {joining ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Join team</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )
        ) : historyLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color="#2F6FE0" />
            <Text style={styles.loadingStateText}>Loading history...</Text>
          </View>
        ) : historyErrored ? (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>Couldn't load your history</Text>
            <TouchableOpacity onPress={() => setHistoryReloadToken((n) => n + 1)} activeOpacity={0.8}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        ) : !history || history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>No on-duty applications yet</Text>
          </View>
        ) : (
          history.map((item) => <HistoryCard key={item.id} item={item} />)
        )}
      </ScrollView>

      <Modal
        visible={datePickerFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerFor(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDatePickerFor(null)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <View style={styles.calendarNav}>
              <TouchableOpacity onPress={goToPreviousPickerMonth} style={styles.navButton} hitSlop={8}>
                <Ionicons name="chevron-back" size={18} color="#2F6FE0" />
              </TouchableOpacity>
              <Text style={styles.calendarMonthLabel}>
                {MONTH_NAMES[pickerMonth]} {pickerYear}
              </Text>
              <TouchableOpacity onPress={goToNextPickerMonth} style={styles.navButton} hitSlop={8}>
                <Ionicons name="chevron-forward" size={18} color="#2F6FE0" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label, index) => (
                <Text key={index} style={styles.weekdayLabel}>
                  {label}
                </Text>
              ))}
            </View>

            {pickerWeeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekRow}>
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return <View key={dayIndex} style={styles.dayCell} />;
                  }
                  return (
                    <TouchableOpacity key={dayIndex} style={styles.dayCell} onPress={() => handlePickDate(day)}>
                      <Text style={styles.dayCellText}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={timePickerFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTimePickerFor(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTimePickerFor(null)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>{timePickerFor === "from" ? "From Time" : "To Time"}</Text>
            <ScrollView style={styles.modalList}>
              {timeSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.value}
                  style={styles.modalOptionRow}
                  onPress={() => handlePickTime(slot.value)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalOptionName}>{slot.label}</Text>
                  {(timePickerFor === "from" ? fromTime : toTime) === slot.value && (
                    <Ionicons name="checkmark" size={18} color="#2F6FE0" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={facultyPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setFacultyPickerOpen(false);
          setFacultySearch("");
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setFacultyPickerOpen(false);
            setFacultySearch("");
          }}
        >
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Faculty guide</Text>

            {facultyList !== null && facultyList.length > 0 && (
              <View style={styles.searchInputWrap}>
                <Ionicons name="search-outline" size={15} color="#9AA6B2" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or department"
                  placeholderTextColor="#9AA6B2"
                  value={facultySearch}
                  onChangeText={setFacultySearch}
                  autoFocus
                />
                {facultySearch.length > 0 && (
                  <TouchableOpacity onPress={() => setFacultySearch("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color="#9AA6B2" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <ScrollView style={styles.modalList}>
              {facultyList === null ? (
                <View style={styles.modalLoadingRow}>
                  <ActivityIndicator size="small" color="#2F6FE0" />
                  <Text style={styles.modalLoadingText}>Loading faculty...</Text>
                </View>
              ) : facultyList.length === 0 ? (
                <Text style={styles.modalLoadingText}>Couldn't load the faculty list.</Text>
              ) : filteredFacultyList && filteredFacultyList.length === 0 ? (
                <Text style={styles.modalLoadingText}>No faculty match "{facultySearch}".</Text>
              ) : (
                filteredFacultyList?.map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    style={styles.modalOptionRow}
                    onPress={() => {
                      setFacultyGuide(entry);
                      setFacultyPickerOpen(false);
                      setFacultySearch("");
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.modalOptionTextWrap}>
                      <Text style={styles.modalOptionName}>{entry.name}</Text>
                      <Text style={styles.modalOptionSubtext}>{entry.department_name}</Text>
                    </View>
                    {facultyGuide?.id === entry.id && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function ModeCard({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.modeCard, selected && styles.modeCardSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.modeIconWrap, selected && styles.modeIconWrapSelected]}>
        <Ionicons name={icon} size={20} color={selected ? "#fff" : "#6B7280"} />
      </View>
      <Text style={[styles.modeLabel, selected && styles.modeLabelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function timeLabel(value: string | null): string | null {
  if (!value) return null;
  return timeSlots.find((slot) => slot.value === value)?.label ?? value;
}

function HistoryCard({ item }: { item: OdRequestSummary }) {
  const meta = OD_STATUS_META[item.overall_status];
  const fromTimeLabel = timeLabel(item.from_time);
  const toTimeLabel = timeLabel(item.to_time);

  return (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyEvent}>{item.reason ?? "On-duty request"}</Text>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>
      <Text style={styles.historyMeta}>
        {item.from_date} to {item.to_date}
        {(fromTimeLabel || toTimeLabel) && ` · ${fromTimeLabel ?? "?"} - ${toTimeLabel ?? "?"}`}
      </Text>
      <Text style={styles.historyTeamLine}>
        Team code {item.unique_code} · {item.member_count} {item.member_count === 1 ? "member" : "members"}
        {item.member_count > 1 &&
          ` · ${item.approved_count} approved, ${item.pending_count} pending, ${item.rejected_count} rejected`}
      </Text>
      {item.faculty_guide_name && <Text style={styles.historyTeamLine}>Faculty guide: {item.faculty_guide_name}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  tabSwitch: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 12,
  },
  tabButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  tabButtonText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  tabButtonTextActive: {
    color: "#fff",
    fontFamily: fonts.bold,
  },
  loadingState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 10,
  },
  loadingStateText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
  },
  modeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  modeCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  modeCardSelected: {
    borderColor: "#2F6FE0",
    backgroundColor: "#EAF0FD",
  },
  modeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F3F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modeIconWrapSelected: {
    backgroundColor: "#2F6FE0",
  },
  modeLabel: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  modeLabelSelected: {
    color: "#2F6FE0",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#374151",
    marginBottom: 6,
  },
  codeDisplayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  codeDisplayText: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    letterSpacing: 3,
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EAF0FD",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  memberBadgeText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  membersList: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
    gap: 10,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  memberName: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  creatorBadge: {
    backgroundColor: "#F1F3F6",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  creatorBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#111827",
    marginBottom: 14,
  },
  inputLast: {
    marginBottom: 16,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#111827",
    letterSpacing: 3,
  },
  codeHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    lineHeight: 18,
    marginBottom: 16,
  },
  rowFields: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  rowField: {
    flex: 1,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerButtonText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  pickerButtonPlaceholder: {
    color: "#9AA6B2",
    fontFamily: fonts.regular,
  },
  lockWarningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  lockWarningText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#D97706",
  },
  submitButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 14,
    paddingVertical: 15,
    elevation: 3,
    shadowColor: "#2F6FE0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  historyEvent: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  historyMeta: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 6,
  },
  historyTeamLine: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  emptyStateSubtext: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 10,
  },
  modalList: {
    marginBottom: 4,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalOptionName: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  modalOptionTextWrap: {
    flex: 1,
  },
  modalOptionSubtext: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  modalLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
  },
  modalLoadingText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  calendarNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F3F6",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarMonthLabel: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: "#9AA6B2",
  },
  weekRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 6,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
});
