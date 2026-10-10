import { useCallback, useMemo, useRef } from "react";
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";
import { fonts } from "@/theme";

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const SIDE_PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2);

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0-59
const PERIODS = ["AM", "PM"] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Parses the "HH:MM AM/PM" strings already used throughout VenueRequestScreen. */
function parseTime(value: string | null): { hour: number; minute: number; period: "AM" | "PM" } {
  const match = value ? /^(\d{2}):(\d{2}) (AM|PM)$/.exec(value) : null;
  if (!match) return { hour: 9, minute: 0, period: "AM" };
  return { hour: Number(match[1]), minute: Number(match[2]), period: match[3] as "AM" | "PM" };
}

type WheelColumnProps<T> = {
  data: T[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  renderLabel: (item: T) => string;
};

function WheelColumn<T>({ data, selectedIndex, onSelect, renderLabel }: WheelColumnProps<T>) {
  const listRef = useRef<FlatList<T>>(null);

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(data.length - 1, index));
      onSelect(clamped);
    },
    [data.length, onSelect],
  );

  return (
    <View style={styles.wheelColumn}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(_, index) => String(index)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        contentContainerStyle={{ paddingVertical: SIDE_PADDING }}
        initialScrollIndex={selectedIndex}
        onMomentumScrollEnd={handleMomentumEnd}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.wheelItem}
            activeOpacity={0.7}
            onPress={() => {
              onSelect(index);
              listRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: true });
            }}
          >
            <Text style={[styles.wheelItemText, index === selectedIndex && styles.wheelItemTextSelected]}>
              {renderLabel(item)}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

export function TimeWheelPicker({
  visible,
  title,
  value,
  onClose,
  onChange,
}: {
  visible: boolean;
  title: string;
  value: string | null;
  onClose: () => void;
  onChange: (value: string) => void;
}) {
  const parsed = useMemo(() => parseTime(value), [value]);
  const hourIndex = HOURS.indexOf(parsed.hour === 0 ? 12 : parsed.hour);
  const minuteIndex = parsed.minute;
  const periodIndex = PERIODS.indexOf(parsed.period);

  function commit(nextHourIndex: number, nextMinuteIndex: number, nextPeriodIndex: number) {
    const hour = HOURS[nextHourIndex] ?? parsed.hour;
    const minute = MINUTES[nextMinuteIndex] ?? parsed.minute;
    const period = PERIODS[nextPeriodIndex] ?? parsed.period;
    onChange(`${pad2(hour)}:${pad2(minute)} ${period}`);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.card} activeOpacity={1}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.wheelRow}>
            <WheelColumn
              data={HOURS}
              selectedIndex={hourIndex < 0 ? 0 : hourIndex}
              onSelect={(index) => commit(index, minuteIndex, periodIndex)}
              renderLabel={(h) => pad2(h)}
            />
            <Text style={styles.wheelSeparator}>:</Text>
            <WheelColumn
              data={MINUTES}
              selectedIndex={minuteIndex}
              onSelect={(index) => commit(hourIndex < 0 ? 0 : hourIndex, index, periodIndex)}
              renderLabel={(m) => pad2(m)}
            />
            <WheelColumn
              data={[...PERIODS]}
              selectedIndex={periodIndex < 0 ? 0 : periodIndex}
              onSelect={(index) => commit(hourIndex < 0 ? 0 : hourIndex, minuteIndex, index)}
              renderLabel={(p) => p}
            />

            {/* Centered selection band, purely visual - sits behind the three wheels' middle row. */}
            <View pointerEvents="none" style={styles.selectionBand} />
          </View>

          <TouchableOpacity style={styles.doneButton} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
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
    padding: 20,
  },
  title: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    textAlign: "center",
    marginBottom: 14,
  },
  wheelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: WHEEL_HEIGHT,
  },
  wheelColumn: {
    width: 64,
    height: WHEEL_HEIGHT,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelItemText: {
    fontSize: 18,
    fontFamily: fonts.medium,
    color: "#B0B7C3",
  },
  wheelItemTextSelected: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  wheelSeparator: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: "#111827",
    marginHorizontal: 2,
  },
  selectionBand: {
    position: "absolute",
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2),
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "rgba(47,111,224,0.06)",
  },
  doneButton: {
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 12,
    paddingVertical: 13,
  },
  doneButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#fff",
  },
});
