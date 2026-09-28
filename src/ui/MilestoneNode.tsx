import { StyleSheet, Text, View } from 'react-native';
import { SOURCES } from '@/content/sources';
import { formatMilestoneDate } from '@/domain/format';
import type { MilestoneState, SlipBehavior } from '@/domain/types';
import { Caption, Card, Eyebrow, ProgressBar } from './kit';
import { makeStyles } from './theme';

// Keyed by the exact SlipBehavior union (not a bare `Record<string, string>`), so indexing
// with `milestone.slipBehavior` is exhaustively covered and never yields `undefined` under
// noUncheckedIndexedAccess — no cast or non-null assertion needed to read it.
const BEHAVIOUR_LABEL: Record<SlipBehavior, string> = {
  restarts: 'Restarts if you slip',
  cumulative: 'A slip does not undo this',
  qualitative: 'No fixed timeline',
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    future: { opacity: 0.6 },
    title: { fontFamily: t.family.semi, fontSize: t.font.body, lineHeight: 21, color: t.color.ink },
    body: { fontFamily: t.family.body, fontSize: t.font.small, lineHeight: 19, color: t.color.muted },
    footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: t.space.xs, marginTop: t.space.xs },
    compact: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm, paddingVertical: 4 },
    tick: { fontFamily: t.family.bold, fontSize: t.font.small, color: t.color.accentText },
    compactText: { flex: 1, fontFamily: t.family.medium, fontSize: t.font.small, color: t.color.muted },
  }),
);

export function MilestoneNode(props: { state: MilestoneState; compact: boolean }) {
  const styles = useStyles();
  const { state, compact } = props;
  const { milestone, status } = state;
  const source = SOURCES[milestone.sourceId];

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

  const statusLine =
    (status === 'in-progress' ? 'Happening now' : status === 'reached' ? 'Reached' : 'Ahead of you') +
    (state.projectedAt && status === 'future' ? ` · ${formatMilestoneDate(state.projectedAt)}` : '') +
    (state.reachedAt && status === 'reached' ? ` · ${formatMilestoneDate(state.reachedAt)}` : '');

  return (
    <Card
      tone={status === 'in-progress' ? 'now' : status === 'reached' ? 'done' : 'plain'}
      style={status === 'future' ? styles.future : undefined}
    >
      <Eyebrow tone={status === 'in-progress' ? 'achieve' : 'faint'}>{statusLine}</Eyebrow>
      <Text style={styles.title}>{milestone.title}</Text>
      {milestone.body ? <Text style={styles.body}>{milestone.body}</Text> : null}

      {state.progress !== null ? (
        <ProgressBar progress={state.progress} accessibilityLabel={`${milestone.title} progress`} />
      ) : null}

      {state.conservativelyAnchored ? (
        <Caption tone="faint">
          Measured in people who quit smoking. Counted from your final quit date, which is conservative if you
          stopped cigarettes earlier.
        </Caption>
      ) : null}

      <View style={styles.footer}>
        <Caption tone="faint">{BEHAVIOUR_LABEL[milestone.slipBehavior]}</Caption>
        {source ? <Caption tone="faint">Source: {source.label.split(' — ')[0]}</Caption> : null}
      </View>
    </Card>
  );
}
