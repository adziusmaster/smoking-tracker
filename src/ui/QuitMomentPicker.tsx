import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from './theme';

/**
 * Two tappable rows — a date and a time — that together choose one moment. Android shows
 * these as separate dialogs, so the component holds which one is open. `value` is the
 * single source of truth; the parent owns it.
 */
export default function QuitMomentPicker(props: {
  value: Date;
  onChange: (next: Date) => void;
  maximumDate?: Date | undefined;
}) {
  const [open, setOpen] = useState<'none' | 'date' | 'time'>('none');

  const dateLabel = props.value.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
  const timeLabel = props.value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  /** Merge only the part the user just picked, so choosing a date cannot reset the time. */
  const applyDate = (picked: Date) => {
    const next = new Date(props.value);
    next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    props.onChange(next);
  };

  const applyTime = (picked: Date) => {
    const next = new Date(props.value);
    next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    props.onChange(next);
  };

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.row} onPress={() => setOpen('date')} accessibilityRole="button">
        <Text style={styles.rowLabel}>Date</Text>
        <Text style={styles.rowValue}>{dateLabel}</Text>
      </Pressable>

      <Pressable style={styles.row} onPress={() => setOpen('time')} accessibilityRole="button">
        <Text style={styles.rowLabel}>Time</Text>
        <Text style={styles.rowValue}>{timeLabel}</Text>
      </Pressable>

      {open === 'date' ? (
        <DateTimePicker
          mode="date"
          value={props.value}
          {...(props.maximumDate === undefined ? {} : { maximumDate: props.maximumDate })}
          onChange={(event, picked) => {
            setOpen('none');
            if (event.type === 'set' && picked) applyDate(picked);
          }}
        />
      ) : null}

      {open === 'time' ? (
        <DateTimePicker
          mode="time"
          value={props.value}
          onChange={(event, picked) => {
            setOpen('none');
            if (event.type === 'set' && picked) applyTime(picked);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: theme.space.md, paddingVertical: theme.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.color.border,
  },
  rowLabel: { fontSize: theme.font.small, color: theme.color.textMuted },
  rowValue: { fontSize: theme.font.body, fontWeight: '600', color: theme.color.text },
});
