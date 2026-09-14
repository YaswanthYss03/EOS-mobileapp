import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, Linking, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { useRole } from "@/hooks/useRole";
import {
  searchBooks,
  searchEResources,
  getMyFacultyBorrowRecords,
  getMyStaffBorrowRecords,
  type LibraryBook,
  type EResource,
} from "@/services/api/library.api";
import { libraryInfo } from "./data/mockLibrary";

type Tab = "search" | "e-resources" | "borrowed" | "history";
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
  { id: "search", label: "Search" },
  { id: "e-resources", label: "E-Resources" },
  { id: "borrowed", label: "Borrowed" },
  { id: "history", label: "History" },
];

function formatShortDate(dateOnly: string): string {
  return new Date(dateOnly).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Wired to GET /library/books, GET /library/e-resources and one of two real
// book_borrow_records-backed endpoints for Borrowed/History, depending on
// who's asking: Employee/HoD go through GET /library/borrow-records
// (@Roles(..., 'faculty', 'hod'), self-scoped to the caller's own
// faculty_id - a HoD account has a real faculty row of its own); HR
// Payroll/Secretary have no faculty row at all, so they go through GET
// /me/library/staff-borrow-records instead (self-scoped to staff_user_id -
// see getMyStaffBorrowRecords). Both responses get normalized into the same
// local BorrowedItem shape before hitting state, since the two backend
// shapes don't match (nested `book` vs flat). There is no self-service
// renew/return action anywhere in the backend for any of these roles (those
// mutations are library/admin only), so Renew shows an honest notice
// instead of a fake success. Reachable from the shared Employee-section
// "Library" item on the Employee/Faculty, HoD, HR Payroll, and Secretary
// dashboards alike.
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
  const [tab, setTab] = useState<Tab>("search");
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
        <View>
          <Text style={styles.headerTitle}>Library</Text>
          <Text style={styles.headerSubtitle}>
            {libraryInfo.name} · {libraryInfo.accountType}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.tabRow}>
        {TABS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.tabButton, tab === item.id && styles.tabButtonActive]}
            onPress={() => setTab(item.id)}
          >
            <Text style={[styles.tabButtonText, tab === item.id && styles.tabButtonTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === "search" && (
          <>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color="#9AA6B2" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by book, author or category"
                placeholderTextColor="#9AA6B2"
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <Text style={styles.sectionTitle}>Catalogue</Text>
            <AsyncSection
              status={catalogueStatus}
              onRetry={() => searchBooks(search).then(setCatalogue).catch(() => setCatalogueStatus("error"))}
              emptyText={search ? `No books match "${search}"` : "No books found."}
              isEmpty={catalogue.length === 0}
            >
              {catalogue.map((book) => (
                <View key={book.id} style={styles.card}>
                  <Text style={styles.bookTitle}>{book.title}</Text>
                  <Text style={styles.bookAuthor}>
                    {book.author ?? "Unknown author"} · {book.category_name}
                  </Text>
                  <Text style={[styles.bookMeta, book.available_copies === 0 && styles.bookMetaOutOfStock]}>
                    {book.qr_code} · {book.available_copies === 0
                      ? "out of stock"
                      : `${book.available_copies} cop${book.available_copies === 1 ? "y" : "ies"} free`}
                  </Text>
                </View>
              ))}
            </AsyncSection>
          </>
        )}

        {tab === "e-resources" && (
          <>
            <Text style={styles.sectionTitle}>E-Resources</Text>
            <AsyncSection
              status={eResourcesStatus}
              onRetry={() => searchEResources("").then(setResources).catch(() => setEResourcesStatus("error"))}
              emptyText="No e-resources available."
              isEmpty={resources.length === 0}
            >
              {resources.map((resource) => (
                <TouchableOpacity
                  key={resource.id}
                  style={styles.card}
                  onPress={() => handleOpenResource(resource.url, resource.title)}
                  activeOpacity={0.8}
                >
                  <View style={styles.eResourceRow}>
                    <View style={styles.eResourceTextWrap}>
                      <Text style={styles.bookTitle}>{resource.title}</Text>
                      <Text style={styles.bookAuthor}>{resource.format ?? "Link"}</Text>
                    </View>
                    <Ionicons name="open-outline" size={18} color="#2F6FE0" />
                  </View>
                </TouchableOpacity>
              ))}
            </AsyncSection>
          </>
        )}

        {tab === "borrowed" && (
          <>
            <Text style={styles.sectionTitle}>Borrowed Books</Text>
            <AsyncSection
              status={borrowedStatus}
              onRetry={loadBorrowed}
              errorText={borrowedError}
              emptyText="Nothing borrowed right now"
              emptyIcon="library-outline"
              isEmpty={borrowed.length === 0}
            >
              {borrowed.map((book) => (
                <View key={book.id} style={styles.card}>
                  <View style={styles.borrowedHeader}>
                    <Text style={styles.bookTitle}>{book.title}</Text>
                    <View style={[styles.statusBadge, book.is_overdue && styles.statusBadgeOverdue]}>
                      <Text
                        style={[styles.statusBadgeText, book.is_overdue && styles.statusBadgeTextOverdue]}
                      >
                        {book.is_overdue ? "Overdue" : "Active"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.bookMeta}>
                    Borrowed {formatShortDate(book.borrowed_date)} · Due {formatShortDate(book.due_date)}
                  </Text>
                  <TouchableOpacity
                    style={styles.renewButton}
                    onPress={handleRenew}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="refresh-outline" size={14} color="#2F6FE0" />
                    <Text style={styles.renewButtonText}>Renew</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </AsyncSection>
          </>
        )}

        {tab === "history" && (
          <>
            <Text style={styles.sectionTitle}>Return History</Text>
            <AsyncSection
              status={historyStatus}
              onRetry={loadHistory}
              errorText={historyError}
              emptyText="No history yet"
              emptyIcon="checkmark-done-outline"
              isEmpty={history.length === 0}
            >
              {history.map((entry) => (
                <View key={entry.id} style={styles.card}>
                  <Text style={styles.bookTitle}>{entry.title}</Text>
                  <Text style={styles.bookMeta}>
                    Borrowed {formatShortDate(entry.borrowed_date)}
                    {entry.returned_date ? ` · Returned ${formatShortDate(entry.returned_date)}` : ""}
                  </Text>
                </View>
              ))}
            </AsyncSection>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AsyncSection({
  status,
  onRetry,
  errorText,
  emptyText,
  emptyIcon = "search-outline",
  isEmpty,
  children,
}: {
  status: LoadStatus;
  onRetry: () => void;
  errorText?: string | null;
  emptyText: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
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
    return (
      <View style={styles.emptyState}>
        <Ionicons name={emptyIcon} size={32} color="#B0B7C3" />
        <Text style={styles.emptyStateText}>{emptyText}</Text>
      </View>
    );
  }
  return <>{children}</>;
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
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  headerSubtitle: {
    color: "#D7E2FA",
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    backgroundColor: "#F7F8FA",
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  tabButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  tabButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#6B85B8",
  },
  tabButtonTextActive: {
    color: "#fff",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  card: {
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
  bookTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  bookAuthor: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 3,
  },
  bookMeta: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
    marginTop: 6,
  },
  bookMetaOutOfStock: {
    color: "#DC2626",
  },
  eResourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  eResourceTextWrap: {
    flex: 1,
  },
  borrowedHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  statusBadge: {
    backgroundColor: "#F0FDF4",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeOverdue: {
    backgroundColor: "#FEF2F2",
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#16A34A",
  },
  statusBadgeTextOverdue: {
    color: "#DC2626",
  },
  renewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#B7CBE6",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 10,
  },
  renewButtonText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  errorNotice: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
    paddingHorizontal: 16,
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
});
