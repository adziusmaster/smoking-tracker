import { StyleSheet, Text, View } from 'react-native';
import { formatMilestoneDate } from '@/domain/format';
import type { MilestoneState, SlipBehavior } from '@/domain/types';
import { theme } from './theme';

// Keyed by the exact SlipBehavior union (not a bare `Record<string, string>`), so indexing
// with `milestone.slipBehavior` is exhaustively covered and never yields `undefined` under
// noUncheckedIndexedAccess — no cast or non-null assertion needed to read it.
const BEHAVIOUR_LABEL: Record<SlipBehavior, string> = {
  restarts: 'Restarts if you slip',
  cumulative: 'A slip does not undo this',
  qualitative: 'No fixed timeline',
};

export function MilestoneNode(props: { state: MilestoneState; compact: boolean }) {
  const { state, compact } = props;
  const { milestone, status } = state;

  if (compact) {
    return (
      <View style={styles.compact}>
        <Text style={styles.tick}>✓</Text>
        <Text style={styles.compactText} numberOfLines={1}>
          {milestone.title}
          {state.reachedAt ? ` — ${formatMilestoneDate(state.reachedAt)}` : ''}
        </Text>
      </View>
    );
  }

  const cardStyle = [
    styles.card,
    status === 'reached' && styles.cardDone,
    status === 'in-progress' && styles.cardActive,
    status === 'future' && styles.cardFuture,
  ];

  return (
    <View style={styles.node}>
      <View style={[styles.dot, status === 'reached' && styles.dotDone, status === 'in-progress' && styles.dotActive]} />
      <View style={cardStyle}>
        <Text style={styles.time}>
          {status === 'in-progress' ? 'Happening now' : status === 'reached' ? 'Reached' : 'Ahead of you'}
          {state.projectedAt && status === 'future' ? ` · ${formatMilestoneDate(state.projectedAt)}` : ''}
          {state.reachedAt && status === 'reached' ? ` · ${formatMilestoneDate(state.reachedAt)}` : ''}
        </Text>
        <Text style={styles.title}>{milestone.title}</Text>
        {milestone.body ? <Text style={styles.body}>{milestone.body}</Text> : null}

        {state.progress !== null ? (
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.round(state.progress * 100)}%` }]} />
          </View>
        ) : null}

        <Text style={styles.badge}>{BEHAVIOUR_LABEL[milestone.slipBehavior]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  node: { flexDirection: 'row', gap: theme.space.md, marginBottom: theme.space.md },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: theme.color.border, backgroundColor: theme.color.surface, marginTop: theme.space.md },
  dotDone: { backgroundColor: theme.color.done, borderColor: theme.color.done },
  dotActive: { backgroundColor: theme.color.active, borderColor: theme.color.active },
  card: { flex: 1, borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.md, padding: theme.space.md, backgroundColor: theme.color.surface },
  cardDone: { backgroundColor: theme.color.doneBg, borderColor: theme.color.doneBorder },
  cardActive: { backgroundColor: theme.color.activeBg, borderColor: theme.color.activeBorder, borderWidth: 2 },
  cardFuture: { opacity: 0.55 },
  time: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: theme.color.textFaint },
  title: { fontSize: theme.font.small, fontWeight: '600', color: theme.color.text, marginTop: 2, marginBottom: 3 },
  body: { fontSize: theme.font.tiny, color: theme.color.textMuted, lineHeight: 16 },
  bar: { height: 4, backgroundColor: theme.color.border, borderRadius: 3, marginTop: theme.space.sm, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: theme.color.active },
  badge: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: theme.color.textFaint, marginTop: theme.space.sm },
  compact: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, paddingVertical: 5 },
  tick: { color: theme.color.done, fontWeight: '700', fontSize: theme.font.small },
  compactText: { flex: 1, fontSize: theme.font.tiny, color: theme.color.textMuted },
});
