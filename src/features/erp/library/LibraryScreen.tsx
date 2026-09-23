import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, Linking, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { AnimatedTabBar, TabTransitionView, useTabScrollMemory } from "@/components/ui/tabs";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { useRole } from "@/hooks/useRole";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import {
  searchBooks,
  searchEResources,
  getMyFacultyBorrowRecords,
  getMyStaffBorrowRecords,
  type LibraryBook,
  type EResource,
} from "@/services/api/library.api";

type Tab = "borrowed" | "e-resources" | "search" | "history";
type LoadStatus = "loading" | "success" | "error";

// Faculty/HoD's own record shape (faculty_id-scoped, nested `book`) and HR
// Payroll/Secretary's (staff_user_id-scoped, flat) don't match - normalized
// to this one shape before hitting state, so the render below doesn't need
// to care which endpoint a given role actually called.
type BorrowedItem = {
  id: number;
  title: string;
  borrowed_date: string;
  due_date: string;
  returned_date: string | null;
  is_overdue: boolean;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "borrowed", label: "Borrowed" },
  { id: "e-resources", label: "E-Resources" },
  { id: "search", label: "Search" },
  { id: "history", label: "History" },
];

function formatShortDate(dateOnly: string): string {
  return new Date(dateOnly).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Same UI/tab structure/card styles as the Student's own StudentLibraryScreen
// (see that file) - Borrowed/E-Resources/Search/History via AnimatedTabBar,
// a stats card above the tabs, matching card radii/shadows/colors. Only the
// data-fetching underneath differs by role: Employee/HoD go through
// GET /library/borrow-records (@Roles(..., 'faculty', 'hod'), self-scoped to
// the caller's own faculty_id - a HoD account has a real faculty row of its
// own); HR Payroll/Secretary have no faculty row at all, so they go through
// GET /me/library/staff-borrow-records instead (self-scoped to
// staff_user_id - see getMyStaffBorrowRecords). Both responses get
// normalized into the same local BorrowedItem shape before hitting state,
// since the two backend shapes don't match (nested `book` vs flat). There is
// no self-service renew/return action anywhere in the backend for any of
// these roles (those mutations are library/admin only), so Renew shows an
// honest notice instead of a fake success. Reachable from the shared
// Employee-section "Library" item on the Employee/Faculty, HoD, HR Payroll,
// and Secretary dashboards alike.
export function LibraryScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const role = useRole();
  // HR Payroll/Secretary have no faculty row to self-scope through (see
  // GET /me/library/staff-borrow-records's own doc comment) - every other
  // role reaching this screen (Employee/HoD) uses the faculty_id-scoped
  // /library/borrow-records instead.
  const isStaffBorrower = role === "hr-payroll" || role === "secretary";
  const scrollMemory = useTabScrollMemory();
  const [tab, setTab] = useState<Tab>("borrowed");
  const [search, setSearch] = useState("");

  const [catalogueStatus, setCatalogueStatus] = useState<LoadStatus>("loading");
  const [catalogue, setCatalogue] = useState<LibraryBook[]>([]);

  const [eResourcesStatus, setEResourcesStatus] = useState<LoadStatus>("loading");
  const [resources, setResources] = useState<EResource[]>([]);

  const [borrowedStatus, setBorrowedStatus] = useState<LoadStatus>("loading");
  const [borrowedError, setBorrowedError] = useState<string | null>(null);
  const [borrowed, setBorrowed] = useState<BorrowedItem[]>([]);

  const [historyStatus, setHistoryStatus] = useState<LoadStatus>("loading");
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [history, setHistory] = useState<BorrowedItem[]>([]);

  useEffect(() => {
    setCatalogueStatus("loading");
    const handle = setTimeout(() => {
      searchBooks(search)
        .then((rows) => {
          setCatalogue(rows);
          setCatalogueStatus("success");
        })
        .catch(() => setCatalogueStatus("error"));
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    setEResourcesStatus("loading");
    searchEResources("")
      .then((rows) => {
        setResources(rows);
        setEResourcesStatus("success");
      })
      .catch(() => setEResourcesStatus("error"));
  }, []);

  const loadBorrowed = useCallback(() => {
    setBorrowedStatus("loading");
    setBorrowedError(null);
    const request = isStaffBorrower
      ? getMyStaffBorrowRecords("borrowed").then((rows) =>
          rows.map((r) => ({
            id: r.id,
            title: r.title,
            borrowed_date: r.borrowed_date,
            due_date: r.due_date,
            returned_date: r.returned_date,
            is_overdue: r.status === "borrowed" && new Date(r.due_date) < new Date(),
          })),
        )
      : getMyFacultyBorrowRecords("borrowed").then((rows) =>
          rows.map((r) => ({
            id: r.id,
            title: r.book.title,
            borrowed_date: r.borrowed_date,
            due_date: r.due_date,
            returned_date: r.returned_date,
            is_overdue: r.is_overdue,
          })),
        );
    request
      .then((rows) => {
        setBorrowed(rows);
        setBorrowedStatus("success");
      })
      .catch((err) => {
        setBorrowedError(getApiErrorMessage(err, "Couldn't load your borrowed books."));
        setBorrowedStatus("error");
      });
  }, [isStaffBorrower]);

  const loadHistory = useCallback(() => {
    setHistoryStatus("loading");
    setHistoryError(null);
    const request = isStaffBorrower
      ? getMyStaffBorrowRecords("returned").then((rows) =>
          rows.map((r) => ({
            id: r.id,
            title: r.title,
            borrowed_date: r.borrowed_date,
            due_date: r.due_date,
            returned_date: r.returned_date,
            is_overdue: false,
          })),
        )
      : getMyFacultyBorrowRecords("returned").then((rows) =>
          rows.map((r) => ({
            id: r.id,
            title: r.book.title,
            borrowed_date: r.borrowed_date,
            due_date: r.due_date,
            returned_date: r.returned_date,
            is_overdue: r.is_overdue,
          })),
        );
    request
      .then((rows) => {
        setHistory(rows);
        setHistoryStatus("success");
      })
      .catch((err) => {
        setHistoryError(getApiErrorMessage(err, "Couldn't load your library history."));
        setHistoryStatus("error");
      });
  }, [isStaffBorrower]);

  useEffect(() => {
    loadBorrowed();
  }, [loadBorrowed]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // This screen renders its own full header below, so hide the shared
  // CollegeHeader while it's focused - same pattern as the other ERP
  // sub-screens.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  function handleOpenResource(url: string, title: string) {
    Linking.openURL(url).catch(() => toast.error(`Couldn't open ${title}`));
  }

  function handleRenew() {
    toast.info("Renewals must be requested at the library desk");
  }

  const overdueCount = useMemo(() => borrowed.filter((b) => b.is_overdue).length, [borrowed]);

  const nextDueShort = useMemo(() => {
    const upcoming = borrowed.filter((b) => !b.is_overdue);
    if (upcoming.length === 0) return "—";
    const earliest = upcoming.reduce((soonest, book) =>
      new Date(book.due_date).getTime() < new Date(soonest.due_date).getTime() ? book : soonest,
    );
    return formatShortDate(earliest.due_date);
  }, [borrowed]);

  // Stats card sits directly above the tab switch, same layout/spacing as
  // the Student's own StudentLibraryScreen.
  function renderStatsCard() {
    return (
      <View style={styles.statsCard}>
        <View style={styles.statsCol}>
          <Text style={styles.statsValue}>{borrowedStatus === "success" ? borrowed.length : "—"}</Text>
          <Text style={styles.statsLabel}>Books issued</Text>
        </View>
        <View style={styles.statsCol}>
          <Text style={styles.statsValue}>{borrowedStatus === "success" ? nextDueShort : "—"}</Text>
          <Text style={styles.statsLabel}>Next due</Text>
        </View>
        <View style={styles.statsCol}>
          <Text style={styles.statsValue}>{borrowedStatus === "success" ? overdueCount : "—"}</Text>
          <Text style={styles.statsLabel}>Overdue</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
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
        <Text style={styles.headerTitle}>Library</Text>
      </LinearGradient>

      <View style={styles.tabSwitchWrap}>
        {renderStatsCard()}

        <AnimatedTabBar
          tabs={TABS.map((t) => ({ key: t.id, label: t.label }))}
          active={tab}
          onChange={setTab}
          containerStyle={styles.tabSwitch}
          tabStyle={styles.tabButton}
          tabTextStyle={styles.tabButtonText}
          activeTabTextStyle={styles.tabButtonTextActive}
          indicatorStyle={styles.tabSwitchIndicator}
        />
      </View>

      <TabTransitionView activeKey={tab} order={TABS.map((t) => t.id)} style={styles.tabContent}>
        {tab === "borrowed" ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} {...scrollMemory.bind("borrowed")}>
            <AsyncSection
              status={borrowedStatus}
              onRetry={loadBorrowed}
              errorText={borrowedError}
              emptyText="Nothing borrowed right now."
              isEmpty={borrowed.length === 0}
            >
              {borrowed.map((book) => {
                const badgeLabel = book.is_overdue
                  ? "Overdue"
                  : `Due ${formatShortDate(book.due_date)}`;
                return (
                  <View key={book.id} style={styles.card}>
                    <View style={styles.borrowedHeaderRow}>
                      <Text style={styles.borrowedTitle}>{book.title}</Text>
                      <View style={[styles.statusBadge, book.is_overdue && styles.statusBadgeOverdue]}>
                        <Text style={[styles.statusBadgeText, book.is_overdue && styles.statusBadgeTextOverdue]}>
                          {badgeLabel}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.borrowedSubtitle}>Borrowed {formatShortDate(book.borrowed_date)}</Text>
                    <View style={styles.divider} />
                    <View style={styles.borrowedFooterRow}>
                      <Text style={styles.borrowedDueDate}>Due {formatShortDate(book.due_date)}</Text>
                      <TouchableOpacity onPress={handleRenew} hitSlop={8}>
                        <Text style={styles.renewLink}>Renew</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </AsyncSection>
          </ScrollView>
        ) : tab === "e-resources" ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} {...scrollMemory.bind("e-resources")}>
            <AsyncSection
              status={eResourcesStatus}
              onRetry={() => searchEResources("").then(setResources).catch(() => setEResourcesStatus("error"))}
              emptyText="No e-resources available."
              isEmpty={resources.length === 0}
            >
              {resources.map((resource) => (
                <TouchableOpacity
                  key={resource.id}
                  style={styles.listCard}
                  onPress={() => handleOpenResource(resource.url, resource.title)}
                  activeOpacity={0.8}
                >
                  <View style={styles.listIconWrap}>
                    <Ionicons name="book-outline" size={18} color="#2F6FE0" />
                  </View>
                  <View style={styles.listTextWrap}>
                    <Text style={styles.listTitle}>{resource.title}</Text>
                    <Text style={styles.listSubtitle}>{resource.format ?? "E-resource"}</Text>
                  </View>
                  <Text style={styles.listAction}>Open</Text>
                </TouchableOpacity>
              ))}
            </AsyncSection>
          </ScrollView>
        ) : tab === "search" ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} {...scrollMemory.bind("search")}>
            <SearchBar
              placeholder="Search by book, author or category"
              value={search}
              onChangeText={setSearch}
            />
            <AsyncSection
              status={catalogueStatus}
              onRetry={() => searchBooks(search).then(setCatalogue).catch(() => setCatalogueStatus("error"))}
              emptyText={search ? `No books match "${search}"` : "No books found."}
              isEmpty={catalogue.length === 0}
            >
              {catalogue.map((book) => (
                <View key={book.id} style={styles.card}>
                  <Text style={styles.borrowedTitle}>{book.title}</Text>
                  <Text style={styles.borrowedSubtitle}>
                    {book.author ?? "Unknown author"} · {book.category_name} · {book.qr_code}
                  </Text>
                  <Text style={[styles.availabilityText, book.available_copies === 0 && styles.availabilityTextOutOfStock]}>
                    {book.available_copies === 0
                      ? "Out of stock"
                      : `${book.available_copies} of ${book.total_copies} available`}
                  </Text>
                </View>
              ))}
            </AsyncSection>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} {...scrollMemory.bind("history")}>
            <AsyncSection
              status={historyStatus}
              onRetry={loadHistory}
              errorText={historyError}
              emptyText="No return history yet."
              isEmpty={history.length === 0}
            >
              {history.map((entry) => (
                <View key={entry.id} style={styles.listCard}>
                  <View style={styles.listIconWrap}>
                    <Ionicons name="book-outline" size={18} color="#2F6FE0" />
                  </View>
                  <View style={styles.listTextWrap}>
                    <Text style={styles.listTitle}>{entry.title}</Text>
                    <Text style={styles.listSubtitle}>
                      Issued {formatShortDate(entry.borrowed_date)}
                      {entry.returned_date ? ` · returned ${formatShortDate(entry.returned_date)}` : ""}
                    </Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>Returned</Text>
                  </View>
                </View>
              ))}
            </AsyncSection>
          </ScrollView>
        )}
      </TabTransitionView>
    </SafeAreaView>
  );
}

function AsyncSection({
  status,
  onRetry,
  errorText,
  emptyText,
  isEmpty,
  children,
}: {
  status: LoadStatus;
  onRetry: () => void;
  errorText?: string | null;
  emptyText: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  if (status === "loading") {
    return <SkeletonListRows count={4} />;
  }
  if (status === "error") {
    return (
      <View style={styles.errorNotice}>
        <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
        <Text style={styles.errorNoticeText}>{errorText ?? "Something went wrong."}</Text>
        <TouchableOpacity onPress={onRetry} style={styles.retryButton} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (isEmpty) {
    return <Text style={styles.emptyText}>{emptyText}</Text>;
  }
  return <>{children}</>;
}

function SearchBar({
  placeholder,
  value,
  onChangeText,
}: {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View style={styles.searchBar}>
      <Ionicons name="search-outline" size={18} color="#9AA6B2" />
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor="#9AA6B2"
        value={value}
        onChangeText={onChangeText}
      />
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
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  tabContent: {
    flex: 1,
  },
  tabSwitchWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  errorNotice: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 32,
  },
  errorNoticeText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  retryButton: {
    marginTop: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2F6FE0",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  retryButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
    marginTop: 16,
  },
  statsCard: {
    flexDirection: "row",
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
  statsCol: {
    flex: 1,
  },
  statsValue: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  statsLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 4,
  },
  tabSwitch: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 12,
  },
  tabSwitchIndicator: {
    top: 0,
    bottom: 0,
    borderRadius: 9,
    backgroundColor: "#2F6FE0",
  },
  tabButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  tabButtonTextActive: {
    color: "#fff",
    fontFamily: fonts.bold,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  borrowedHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6,
  },
  borrowedTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  borrowedSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F3F6",
    marginBottom: 10,
  },
  borrowedFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  borrowedDueDate: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#374151",
  },
  renewLink: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  statusBadge: {
    backgroundColor: "#EAF0FD",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  statusBadgeOverdue: {
    backgroundColor: "#FEF2F2",
  },
  statusBadgeTextOverdue: {
    color: "#DC2626",
  },
  availabilityText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  availabilityTextOutOfStock: {
    color: "#DC2626",
  },
  listCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  listIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  listTextWrap: {
    flex: 1,
  },
  listTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  listSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 3,
  },
  listAction: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
});
