import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getMyBorrowRecords,
  searchBooks,
  searchEResources,
  type EResource,
  type LibraryBook,
  type MyBorrowRecord,
} from "@/services/api/library.api";

type Tab = "borrowed" | "ebooks" | "search" | "history";
type LoadStatus = "loading" | "success" | "error";

const TABS: { id: Tab; label: string }[] = [
  { id: "borrowed", label: "Borrowed" },
  { id: "ebooks", label: "E-books" },
  { id: "search", label: "Search" },
  { id: "history", label: "History" },
];

function daysUntil(dateOnly: string): number {
  const ms = new Date(dateOnly).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

function formatShortDate(dateOnly: string): string {
  return new Date(dateOnly).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatFileSize(bytes: number | null): string | null {
  if (!bytes) return null;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Wired to EOS-backend's library module: GET /me/library/borrow-records
// (student-only, self-scoped) for Borrowed/History, GET /library/books and
// GET /library/e-resources (shared catalogue reads) for Search/E-books.
// Reachable from the Student dashboard's Campus "Library" item.
export function StudentLibraryScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>("borrowed");

  const [borrowedStatus, setBorrowedStatus] = useState<LoadStatus>("loading");
  const [borrowed, setBorrowed] = useState<MyBorrowRecord[]>([]);

  const [historyStatus, setHistoryStatus] = useState<LoadStatus>("loading");
  const [history, setHistory] = useState<MyBorrowRecord[]>([]);

  const [ebookQuery, setEbookQuery] = useState("");
  const [ebookStatus, setEbookStatus] = useState<LoadStatus>("loading");
  const [ebooks, setEbooks] = useState<EResource[]>([]);

  const [catalogueQuery, setCatalogueQuery] = useState("");
  const [catalogueStatus, setCatalogueStatus] = useState<LoadStatus>("loading");
  const [catalogue, setCatalogue] = useState<LibraryBook[]>([]);

  const loadBorrowed = useCallback(() => {
    setBorrowedStatus("loading");
    getMyBorrowRecords("borrowed")
      .then((rows) => {
        setBorrowed(rows);
        setBorrowedStatus("success");
      })
      .catch(() => setBorrowedStatus("error"));
  }, []);

  const loadHistory = useCallback(() => {
    setHistoryStatus("loading");
    getMyBorrowRecords("returned")
      .then((rows) => {
        setHistory(rows);
        setHistoryStatus("success");
      })
      .catch(() => setHistoryStatus("error"));
  }, []);

  useEffect(() => {
    loadBorrowed();
  }, [loadBorrowed]);

  useEffect(() => {
    if (tab === "history" && historyStatus === "loading" && history.length === 0) {
      loadHistory();
    }
  }, [tab, historyStatus, history.length, loadHistory]);

  useEffect(() => {
    setEbookStatus("loading");
    const handle = setTimeout(() => {
      searchEResources(ebookQuery)
        .then((rows) => {
          setEbooks(rows);
          setEbookStatus("success");
        })
        .catch(() => setEbookStatus("error"));
    }, 300);
    return () => clearTimeout(handle);
  }, [ebookQuery]);

  useEffect(() => {
    setCatalogueStatus("loading");
    const handle = setTimeout(() => {
      searchBooks(catalogueQuery)
        .then((rows) => {
          setCatalogue(rows);
          setCatalogueStatus("success");
        })
        .catch(() => setCatalogueStatus("error"));
    }, 300);
    return () => clearTimeout(handle);
  }, [catalogueQuery]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const overdueCount = useMemo(() => borrowed.filter((b) => daysUntil(b.due_date) < 0).length, [borrowed]);

  const nextDueShort = useMemo(() => {
    const upcoming = borrowed.filter((b) => daysUntil(b.due_date) >= 0);
    if (upcoming.length === 0) return "—";
    const earliest = upcoming.reduce((soonest, book) =>
      new Date(book.due_date).getTime() < new Date(soonest.due_date).getTime() ? book : soonest,
    );
    return formatShortDate(earliest.due_date);
  }, [borrowed]);

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
        <Text style={styles.headerTitle}>Library</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

        <View style={styles.tabSwitch}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tabButton, tab === t.id && styles.tabButtonActive]}
              onPress={() => setTab(t.id)}
            >
              <Text style={[styles.tabButtonText, tab === t.id && styles.tabButtonTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === "borrowed" && (
          <AsyncSection
            status={borrowedStatus}
            onRetry={loadBorrowed}
            emptyText="You have no books borrowed right now."
            isEmpty={borrowed.length === 0}
          >
            {borrowed.map((book) => (
              <BorrowedCard key={book.id} book={book} />
            ))}
          </AsyncSection>
        )}

        {tab === "ebooks" && (
          <>
            <SearchBar
              placeholder="Search e-books by title"
              value={ebookQuery}
              onChangeText={setEbookQuery}
            />
            <AsyncSection
              status={ebookStatus}
              onRetry={() => searchEResources(ebookQuery).then(setEbooks).catch(() => setEbookStatus("error"))}
              emptyText="No e-books found."
              isEmpty={ebooks.length === 0}
            >
              {ebooks.map((book) => (
                <EbookCard key={book.id} book={book} />
              ))}
            </AsyncSection>
          </>
        )}

        {tab === "search" && (
          <>
            <SearchBar
              placeholder="Search the library catalogue"
              value={catalogueQuery}
              onChangeText={setCatalogueQuery}
            />
            <AsyncSection
              status={catalogueStatus}
              onRetry={() => searchBooks(catalogueQuery).then(setCatalogue).catch(() => setCatalogueStatus("error"))}
              emptyText="No books found."
              isEmpty={catalogue.length === 0}
            >
              {catalogue.map((item) => (
                <CatalogueCard key={item.id} item={item} />
              ))}
            </AsyncSection>
          </>
        )}

        {tab === "history" && (
          <AsyncSection
            status={historyStatus}
            onRetry={loadHistory}
            emptyText="No return history yet."
            isEmpty={history.length === 0}
          >
            {history.map((item) => (
              <HistoryCard key={item.id} item={item} />
            ))}
          </AsyncSection>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AsyncSection({
  status,
  onRetry,
  emptyText,
  isEmpty,
  children,
}: {
  status: LoadStatus;
  onRetry: () => void;
  emptyText: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  if (status === "loading") {
    return (
      <View style={styles.inlineLoading}>
        <ActivityIndicator color="#2F6FE0" />
      </View>
    );
  }
  if (status === "error") {
    return (
      <View style={styles.errorNotice}>
        <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
        <Text style={styles.errorNoticeText}>Something went wrong.</Text>
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

function BorrowedCard({ book }: { book: MyBorrowRecord }) {
  const days = daysUntil(book.due_date);
  const isOverdue = days < 0;
  const badgeLabel = isOverdue ? "Overdue" : `Due in ${days} day${days === 1 ? "" : "s"}`;

  return (
    <View style={styles.card}>
      <View style={styles.borrowedHeaderRow}>
        <Text style={styles.borrowedTitle}>{book.title}</Text>
        <View style={[styles.statusBadge, isOverdue && styles.statusBadgeOverdue]}>
          <Text style={[styles.statusBadgeText, isOverdue && styles.statusBadgeTextOverdue]}>{badgeLabel}</Text>
        </View>
      </View>
      <Text style={styles.borrowedSubtitle}>{book.author ?? "Author not listed"}</Text>
      <View style={styles.divider} />
      <Text style={styles.borrowedDueDate}>Due {formatShortDate(book.due_date)}</Text>
    </View>
  );
}

function EbookCard({ book }: { book: EResource }) {
  const sizeLabel = formatFileSize(book.file_size_bytes);
  const subtitleParts = [book.format, sizeLabel, book.license_type].filter(Boolean);

  return (
    <TouchableOpacity style={styles.listCard} onPress={() => Linking.openURL(book.url)} activeOpacity={0.8}>
      <View style={styles.listIconWrap}>
        <Ionicons name="book-outline" size={18} color="#2F6FE0" />
      </View>
      <View style={styles.listTextWrap}>
        <Text style={styles.listTitle}>{book.title}</Text>
        <Text style={styles.listSubtitle}>{subtitleParts.join(" · ") || "E-resource"}</Text>
      </View>
      <Text style={styles.listAction}>Open</Text>
    </TouchableOpacity>
  );
}

function CatalogueCard({ item }: { item: LibraryBook }) {
  return (
    <View style={styles.card}>
      <Text style={styles.borrowedTitle}>{item.title}</Text>
      <Text style={styles.borrowedSubtitle}>
        {item.author ?? "Author not listed"} · {item.rack?.rack_code ?? "Not shelved"} · {item.qr_code}
      </Text>
      <Text style={styles.availabilityText}>
        {item.available_copies} of {item.total_copies} available
      </Text>
    </View>
  );
}

function HistoryCard({ item }: { item: MyBorrowRecord }) {
  return (
    <View style={styles.listCard}>
      <View style={styles.listIconWrap}>
        <Ionicons name="book-outline" size={18} color="#2F6FE0" />
      </View>
      <View style={styles.listTextWrap}>
        <Text style={styles.listTitle}>{item.title}</Text>
        <Text style={styles.listSubtitle}>
          {item.author ?? "Author not listed"} · Issued {formatShortDate(item.borrowed_date)}
          {item.returned_date ? ` · returned ${formatShortDate(item.returned_date)}` : ""}
        </Text>
      </View>
      <View style={styles.statusBadge}>
        <Text style={styles.statusBadgeText}>Returned</Text>
      </View>
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
  inlineLoading: {
    paddingVertical: 32,
    alignItems: "center",
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
  tabButtonActive: {
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
  borrowedDueDate: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#374151",
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
