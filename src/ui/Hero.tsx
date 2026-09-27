import { StyleSheet, Text, View } from 'react-native';
import { formatElapsed, formatMinutesNotLost, formatMoneyMinor } from '@/domain/format';
import type { Savings, Elapsed, Streak } from '@/domain/types';
import { theme } from './theme';

export function Hero(props: {
  elapsed: Elapsed;
  /** Longest smoke-free run so far. Not `elapsed`: that one keeps climbing while smoking. */
  longestStreak: Streak;
  savings: Savings;
  currency: string;
  phaseName: string;
  currentlySmoking: boolean;
}) {
  if (props.currentlySmoking) {
    return (
      <View style={[styles.hero, styles.heroSmoking]}>
        <Text style={styles.smokingTitle}>You’re smoking again right now</Text>
        <Text style={styles.smokingBody}>
          That’s logged, not judged. Your best run was {formatElapsed(props.longestStreak.elapsed)} — you’ve
          already proved you can do this once. End the period from the Log screen whenever you’re ready to
          start again.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.hero}>
      <Text style={styles.big}>{formatElapsed(props.elapsed)}</Text>
      <Text style={styles.sub}>smoke-free · {props.phaseName}</Text>
      <View style={styles.row}>
        <Stat value={formatMoneyMinor(props.savings.moneySavedMinor, props.currency)} label="saved" />
        <Stat value={String(props.savings.unitsAvoided)} label="not smoked" />
        {props.savings.minutesNotLost !== null ? (
          <Stat value={formatMinutesNotLost(props.savings.minutesNotLost)} label="time not lost" />
        ) : null}
      </View>
    </View>
  );
}

function Stat(props: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{props.value}</Text>
      <Text style={styles.statLabel}>{props.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: theme.color.heroBg, borderRadius: theme.radius.lg, padding: theme.space.lg },
  heroSmoking: { backgroundColor: theme.color.danger },
  big: { fontSize: theme.font.hero, fontWeight: '700', color: theme.color.heroText, letterSpacing: -0.5 },
  sub: { fontSize: theme.font.small, color: theme.color.heroText, opacity: 0.75, marginTop: theme.space.xs },
  row: { flexDirection: 'row', gap: theme.space.sm, marginTop: theme.space.lg },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: theme.radius.sm, padding: theme.space.sm },
  statValue: { color: theme.color.heroText, fontSize: theme.font.small, fontWeight: '700' },
  statLabel: { color: theme.color.heroText, opacity: 0.7, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },
  smokingTitle: { fontSize: theme.font.title, fontWeight: '700', color: theme.color.heroText },
  smokingBody: { fontSize: theme.font.small, color: theme.color.heroText, opacity: 0.9, lineHeight: 19, marginTop: theme.space.sm },
});
