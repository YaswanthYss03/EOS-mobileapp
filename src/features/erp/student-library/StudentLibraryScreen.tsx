import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import {
  maxBooksAllowed,
  mockBorrowedBooks,
  mockEbooks,
  mockCatalogue,
  mockHistory,
  type BorrowedBook,
  type Ebook,
  type CatalogueItem,
  type HistoryItem,
} from "./data/mockStudentLibrary";

type Tab = "borrowed" | "ebooks" | "search" | "history";

const TABS: { id: Tab; label: string }[] = [
  { id: "borrowed", label: "Borrowed" },
  { id: "ebooks", label: "E-books" },
  { id: "search", label: "Search" },
  { id: "history", label: "History" },
];

function matches(query: string, ...fields: string[]) {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return fields.some((field) => field.toLowerCase().includes(q));
}

// TODO: this is a view-only library screen over mockStudentLibrary - wire to
// a real library backend endpoint once one exists. Reachable from the
// Student dashboard's Campus "Library" item.
export function StudentLibraryScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>("borrowed");
  const [ebookQuery, setEbookQuery] = useState("");
  const [catalogueQuery, setCatalogueQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const overdueCount = useMemo(
    () => mockBorrowedBooks.filter((b) => b.status === "overdue").length,
    [],
  );

  const nextDueShort = useMemo(() => {
    const upcoming = mockBorrowedBooks.filter((b) => b.status !== "overdue");
    if (upcoming.length === 0) return "—";
    const earliest = upcoming.reduce((soonest, book) =>
      new Date(book.dueDate).getTime() < new Date(soonest.dueDate).getTime() ? book : soonest,
    );
    return earliest.dueDate.split(" ").slice(0, 2).join(" ");
  }, []);

  const filteredEbooks = useMemo(
    () => mockEbooks.filter((book) => matches(ebookQuery, book.title, book.author)),
    [ebookQuery],
  );

  const filteredCatalogue = useMemo(
    () => mockCatalogue.filter((item) => matches(catalogueQuery, item.title, item.author)),
    [catalogueQuery],
  );

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
            <Text style={styles.statsValue}>
              {mockBorrowedBooks.length} of {maxBooksAllowed}
            </Text>
            <Text style={styles.statsLabel}>Books issued</Text>
          </View>
          <View style={styles.statsCol}>
            <Text style={styles.statsValue}>{nextDueShort}</Text>
            <Text style={styles.statsLabel}>Next due</Text>
          </View>
          <View style={styles.statsCol}>
            <Text style={styles.statsValue}>{overdueCount}</Text>
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

        {tab === "borrowed" &&
          mockBorrowedBooks.map((book) => <BorrowedCard key={book.id} book={book} />)}

        {tab === "ebooks" && (
          <>
            <SearchBar
              placeholder="Search e-books by title or author"
              value={ebookQuery}
              onChangeText={setEbookQuery}
            />
            {filteredEbooks.map((book) => (
              <EbookCard key={book.id} book={book} />
            ))}
          </>
        )}

        {tab === "search" && (
          <>
            <SearchBar
              placeholder="Search the library catalogue"
              value={catalogueQuery}
              onChangeText={setCatalogueQuery}
            />
            {filteredCatalogue.map((item) => (
              <CatalogueCard key={item.id} item={item} />
            ))}
          </>
        )}

        {tab === "history" && mockHistory.map((item) => <HistoryCard key={item.id} item={item} />)}
      </ScrollView>
    </SafeAreaView>
  );
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

function BorrowedCard({ book }: { book: BorrowedBook }) {
  const badgeLabel =
    book.status === "overdue" ? "Overdue" : book.status === "on-time" ? "On time" : `Due in ${book.dueInDays} days`;

  return (
    <View style={styles.card}>
      <View style={styles.borrowedHeaderRow}>
        <Text style={styles.borrowedTitle}>{book.title}</Text>
        <View style={[styles.statusBadge, book.status === "overdue" && styles.statusBadgeOverdue]}>
          <Text style={[styles.statusBadgeText, book.status === "overdue" && styles.statusBadgeTextOverdue]}>
            {badgeLabel}
          </Text>
        </View>
      </View>
      <Text style={styles.borrowedSubtitle}>
        {book.author} · {book.code} · {book.accNo}
      </Text>
      <View style={styles.divider} />
      <Text style={styles.borrowedDueDate}>Due {book.dueDate}</Text>
    </View>
  );
}

function EbookCard({ book }: { book: Ebook }) {
  return (
    <View style={styles.listCard}>
      <View style={styles.listIconWrap}>
        <Ionicons name="book-outline" size={18} color="#2F6FE0" />
      </View>
      <View style={styles.listTextWrap}>
        <Text style={styles.listTitle}>{book.title}</Text>
        <Text style={styles.listSubtitle}>
          {book.author} · {book.format}
          {book.sizeMb > 0 ? ` · ${book.sizeMb} MB` : ""} · {book.publisher}
        </Text>
      </View>
      <Text style={styles.listAction}>{book.actionLabel}</Text>
    </View>
  );
}

function CatalogueCard({ item }: { item: CatalogueItem }) {
  return (
    <View style={styles.card}>
      <Text style={styles.borrowedTitle}>{item.title}</Text>
      <Text style={styles.borrowedSubtitle}>
        {item.author} · {item.shelf} · {item.code}
      </Text>
      <Text style={styles.availabilityText}>{item.availability}</Text>
    </View>
  );
}

function HistoryCard({ item }: { item: HistoryItem }) {
  return (
    <View style={styles.listCard}>
      <View style={styles.listIconWrap}>
        <Ionicons name="book-outline" size={18} color="#2F6FE0" />
      </View>
      <View style={styles.listTextWrap}>
        <Text style={styles.listTitle}>{item.title}</Text>
        <Text style={styles.listSubtitle}>
          {item.author} · Issued {item.issuedOn} · returned {item.returnedOn}
        </Text>
      </View>
      <View style={styles.statusBadge}>
        <Text style={styles.statusBadgeText}>{item.fine ? `Returned · ₹${item.fine} fine` : "Returned"}</Text>
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
