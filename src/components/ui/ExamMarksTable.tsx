import { useState } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { fonts } from "@/theme";

export type ExamMarksColumn = {
  key: string;
  label: string;
  maxMarks: number | null;
};

export type ExamMarksCell = {
  value: string;
  editable: boolean;
};

export type ExamMarksRow = {
  studentId: number;
  name: string;
  rollNo: string;
  cells: Record<string, ExamMarksCell | undefined>;
};

const ROW_HEIGHT = 62;
const NAME_COL_WIDTH = 164;
const EXAM_COL_WIDTH = 92;
const CARD_HORIZONTAL_MARGIN = 32; // matches the screens' own content padding (16 each side)
const HAIRLINE = StyleSheet.hairlineWidth;

/**
 * S.No + Name/Roll stays fixed on the left; every exam-type column (CIA1,
 * CIA2, Quiz, SEM, ...) scrolls together as one horizontally-scrollable
 * region on the right. Both halves are plain vertical stacks placed side by
 * side inside one flexDirection:"row" parent - the row's default
 * alignItems:"stretch" makes the ScrollView match the fixed column's
 * height, so a single shared horizontal scroll never lets rows drift out
 * of alignment with each other (one ScrollView per row would). Alternating
 * row tint (zebra striping) is applied identically to both stacks by row
 * index, so a wide table with many exam columns stays easy to scan across.
 */
export function ExamMarksTable({
  columns,
  rows,
  onChangeCell,
  onBlurCell,
}: {
  columns: ExamMarksColumn[];
  rows: ExamMarksRow[];
  onChangeCell?: (studentId: number, columnKey: string, text: string) => void;
  onBlurCell?: (studentId: number, columnKey: string) => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const visibleWidth = windowWidth - CARD_HORIZONTAL_MARGIN - NAME_COL_WIDTH;
  const contentWidth = columns.length * EXAM_COL_WIDTH;
  const overflows = contentWidth > visibleWidth;

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setScrolledToEnd(contentOffset.x + layoutMeasurement.width >= contentSize.width - 4);
  }

  return (
    <View style={styles.card}>
      <View style={styles.tableHeaderRow}>
        <Text style={styles.tableHeaderTitle}>{columns.length} exam{columns.length === 1 ? "" : "s"}</Text>
        {overflows && (
          <View style={styles.swipeHintPill}>
            <Text style={styles.swipeHintText}>Swipe for more →</Text>
          </View>
        )}
      </View>

      <View style={styles.tableBody}>
        <View style={styles.fixedColStack}>
          <View style={[styles.fixedCol, styles.headerCell]}>
            <Text style={styles.headerNameText}>Student</Text>
          </View>
          {rows.map((row, index) => (
            <View
              key={row.studentId}
              style={[styles.fixedCol, index % 2 === 1 && styles.rowStriped, index === rows.length - 1 && styles.rowLast]}
            >
              <Text style={styles.snoText}>{index + 1}</Text>
              <View style={styles.nameWrap}>
                <Text style={styles.nameText} numberOfLines={1}>
                  {row.name}
                </Text>
                <Text style={styles.rollText}>{row.rollNo}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.scrollWrap}>
          <ScrollView
            horizontal
            nestedScrollEnabled
            directionalLockEnabled
            showsHorizontalScrollIndicator
            style={styles.scrollArea}
            onScroll={handleScroll}
            scrollEventThrottle={32}
            snapToInterval={EXAM_COL_WIDTH}
            snapToAlignment="start"
            decelerationRate="fast"
          >
            <View>
              <View style={styles.examColsRow}>
                {columns.map((col) => (
                  <View key={col.key} style={[styles.examCol, styles.headerCell]}>
                    <Text style={styles.headerColText} numberOfLines={2}>
                      {col.label}
                    </Text>
                    {col.maxMarks != null && <Text style={styles.headerColMax}>Max {col.maxMarks}</Text>}
                  </View>
                ))}
              </View>

              {rows.map((row, index) => (
                <View
                  key={row.studentId}
                  style={[
                    styles.examColsRow,
                    index % 2 === 1 && styles.rowStriped,
                    index === rows.length - 1 && styles.rowLast,
                  ]}
                >
                  {columns.map((col) => {
                    const cell = row.cells[col.key];
                    return (
                      <View key={col.key} style={styles.examCol}>
                        {cell?.editable ? (
                          <TextInput
                            style={styles.markInput}
                            value={cell.value}
                            onChangeText={(text) => onChangeCell?.(row.studentId, col.key, text)}
                            onBlur={() => onBlurCell?.(row.studentId, col.key)}
                            placeholder="–"
                            placeholderTextColor="#B0B7C3"
                            keyboardType="number-pad"
                            maxLength={3}
                          />
                        ) : (
                          <Text style={styles.markText}>{cell?.value || "–"}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>

          {overflows && !scrolledToEnd && (
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.97)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.edgeFade}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: HAIRLINE,
    borderColor: "#E5E7EB",
    marginBottom: 20,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F7F8FA",
    borderBottomWidth: HAIRLINE,
    borderBottomColor: "#E5E7EB",
  },
  tableHeaderTitle: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#6B7280",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  swipeHintPill: {
    backgroundColor: "#EAF0FD",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  swipeHintText: {
    fontSize: 10.5,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  tableBody: {
    flexDirection: "row",
  },
  fixedColStack: {
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  scrollWrap: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  edgeFade: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 24,
  },
  examColsRow: {
    flexDirection: "row",
    height: ROW_HEIGHT,
  },
  rowStriped: {
    backgroundColor: "#FAFBFC",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  fixedCol: {
    width: NAME_COL_WIDTH,
    height: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    borderBottomWidth: HAIRLINE,
    borderBottomColor: "#EEF0F4",
  },
  headerCell: {
    backgroundColor: "#F7F8FA",
    borderBottomWidth: HAIRLINE,
    borderBottomColor: "#E5E7EB",
  },
  headerNameText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#6B7280",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  snoText: {
    width: 18,
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: "#9AA6B2",
  },
  nameWrap: {
    flex: 1,
  },
  nameText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  rollText: {
    fontSize: 10.5,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  examCol: {
    width: EXAM_COL_WIDTH,
    height: ROW_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderLeftWidth: HAIRLINE,
    borderLeftColor: "#EEF0F4",
    borderBottomWidth: HAIRLINE,
    borderBottomColor: "#EEF0F4",
  },
  headerColText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#111827",
    textAlign: "center",
  },
  headerColMax: {
    fontSize: 9.5,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginTop: 2,
  },
  markText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  markInput: {
    width: EXAM_COL_WIDTH - 24,
    height: 38,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#DCE4F5",
    backgroundColor: "#F9FAFF",
    textAlign: "center",
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#111827",
  },
});
