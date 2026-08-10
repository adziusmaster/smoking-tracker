import { StyleSheet, Text, View } from 'react-native';
import type { CheckinRow } from '@/data/repositories';
import { theme } from './theme';

/** Craving intensity 1–5 as bar heights, oldest on the left. */
export function CravingChart(props: { checkins: CheckinRow[] }) {
  const ordered = [...props.checkins].reverse().slice(-30);

  if (ordered.length === 0) {
    return <Text style={styles.empty}>No check-ins yet. Log one below and a pattern will build up here.</Text>;
  }

  return (
    <View>
      <View style={styles.chart}>
        {ordered.map((checkin) => (
          <View
            key={checkin.loggedOn}
            style={[styles.bar, { height: `${(checkin.cravingIntensity / 5) * 100}%` }]}
            accessibilityLabel={`${checkin.loggedOn}: craving ${checkin.cravingIntensity} of 5`}
          />
        ))}
      </View>
      <Text style={styles.axis}>
        {ordered[0]?.loggedOn} → {ordered[ordered.length - 1]?.loggedOn}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 80 },
  bar: { flex: 1, backgroundColor: theme.color.active, borderRadius: 2, minHeight: 3 },
  axis: { fontSize: 9, color: theme.color.textFaint, marginTop: theme.space.xs },
  empty: { fontSize: theme.font.tiny, color: theme.color.textFaint, lineHeight: 16 },
});
