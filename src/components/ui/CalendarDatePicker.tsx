import { useMemo, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { toIsoDate } from "@/utils/calendar";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function buildMonthGrid(year: number, month: number): (number | null)[][] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * A real month-grid calendar (not a horizontal chip list) for picking a
 * single date. `minDateIso`/`maxDateIso` (inclusive) disable out-of-range
 * days rather than hiding them, so the grid shape never jumps around.
 */
export function CalendarDatePicker({
  visible,
  title,
  valueIso,
  minDateIso,
  maxDateIso,
  onClose,
  onChange,
}: {
  visible: boolean;
  title: string;
  valueIso: string | null;
  minDateIso?: string;
  maxDateIso?: string;
  onClose: () => void;
  onChange: (iso: string) => void;
}) {
  const initial = valueIso ? new Date(`${valueIso}T00:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const weeks = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const minDate = minDateIso ? startOfDay(new Date(`${minDateIso}T00:00:00`)) : null;
  const maxDate = maxDateIso ? startOfDay(new Date(`${maxDateIso}T00:00:00`)) : null;

  function changeMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function selectDay(day: number) {
    const date = new Date(viewYear, viewMonth, day);
    onChange(toIsoDate(date));
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.card} activeOpacity={1}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.monthRow}>
            <TouchableOpacity onPress={() => changeMonth(-1)} hitSlop={10} style={styles.monthArrow}>
              <Ionicons name="chevron-back" size={18} color="#4B5563" />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={() => changeMonth(1)} hitSlop={10} style={styles.monthArrow}>
              <Ionicons name="chevron-forward" size={18} color="#4B5563" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((w, i) => (
              <Text key={i} style={styles.weekdayText}>
                {w}
              </Text>
            ))}
          </View>

          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day, di) => {
                if (day === null) return <View key={di} style={styles.dayCell} />;
                const cellDate = startOfDay(new Date(viewYear, viewMonth, day));
                const isSelected = valueIso === toIsoDate(cellDate);
                const isDisabled = (minDate !== null && cellDate < minDate) || (maxDate !== null && cellDate > maxDate);
                return (
                  <TouchableOpacity
                    key={di}
                    style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                    disabled={isDisabled}
                    onPress={() => selectDay(day)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        isDisabled && styles.dayTextDisabled,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
  },
  title: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  monthArrow: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  monthLabel: {
    fontSize: 14.5,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 11.5,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
  },
  weekRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  dayCellSelected: {
    backgroundColor: "#2F6FE0",
  },
  dayText: {
    fontSize: 13.5,
    fontFamily: fonts.medium,
    color: "#111827",
  },
  dayTextSelected: {
    color: "#fff",
    fontFamily: fonts.bold,
  },
  dayTextDisabled: {
    color: "#D1D5DB",
  },
});
