import { StyleSheet, Text, View } from 'react-native';
import type { Chapter } from '@/domain/types';
import { MilestoneNode } from './MilestoneNode';
import { theme } from './theme';

export interface TipContent {
  whatsHappening: string;
  whyYouFeelThisWay: string;
  howToCope: readonly string[];
}

export function ChapterBlock(props: { chapter: Chapter; tips: TipContent | null; tipsAreDangerWindow: boolean }) {
  const { chapter, tips } = props;
  const isCurrent = chapter.status === 'current';

  return (
    <View style={chapter.status === 'future' ? styles.future : undefined}>
      <View style={styles.header}>
        <View style={[styles.num, chapter.status === 'past' && styles.numPast, chapter.status === 'future' && styles.numFuture]}>
          <Text style={styles.numText}>{chapter.status === 'past' ? '✓' : chapter.phase.name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{chapter.phase.name}</Text>
          <Text style={styles.range}>{isCurrent ? 'you are here' : chapter.status === 'past' ? 'behind you' : 'ahead'}</Text>
        </View>
      </View>

      {isCurrent && tips ? (
        <View style={[styles.tipBox, props.tipsAreDangerWindow && styles.tipBoxDanger]}>
          <Text style={[styles.tipLabel, props.tipsAreDangerWindow && styles.tipLabelDanger]}>What’s happening</Text>
          <Text style={styles.tipText}>{tips.whatsHappening}</Text>

          <Text style={[styles.tipLabel, props.tipsAreDangerWindow && styles.tipLabelDanger, styles.tipLabelSpaced]}>
            Why you feel this way
          </Text>
          <Text style={styles.tipText}>{tips.whyYouFeelThisWay}</Text>

          <Text style={[styles.tipLabel, props.tipsAreDangerWindow && styles.tipLabelDanger, styles.tipLabelSpaced]}>
            What to do about it
          </Text>
          {tips.howToCope.map((tip) => (
            <Text key={tip} style={styles.tipBullet}>• {tip}</Text>
          ))}
        </View>
      ) : null}

      {chapter.milestones.map((milestoneState) => (
        <MilestoneNode
          key={milestoneState.milestone.id}
          state={milestoneState}
          compact={chapter.status === 'past' && milestoneState.status === 'reached'}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  future: { opacity: 0.5 },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, marginTop: theme.space.lg, marginBottom: theme.space.md },
  num: { width: 24, height: 24, borderRadius: theme.radius.sm, backgroundColor: theme.color.heroBg, alignItems: 'center', justifyContent: 'center' },
  numPast: { backgroundColor: theme.color.done },
  numFuture: { backgroundColor: theme.color.textFaint },
  numText: { color: theme.color.heroText, fontSize: theme.font.tiny, fontWeight: '700' },
  name: { fontSize: theme.font.small, fontWeight: '700', color: theme.color.text },
  range: { fontSize: 9, color: theme.color.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 },
  tipBox: {
    backgroundColor: theme.color.tipBg,
    borderLeftWidth: 3,
    borderLeftColor: theme.color.tipAccent,
    borderRadius: theme.radius.sm,
    padding: theme.space.md,
    marginBottom: theme.space.md,
  },
  tipBoxDanger: { backgroundColor: theme.color.dangerBg, borderLeftColor: theme.color.danger },
  tipLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: theme.color.tipLabel },
  tipLabelDanger: { color: theme.color.danger },
  tipLabelSpaced: { marginTop: theme.space.md },
  tipText: { fontSize: theme.font.tiny, color: theme.color.textMuted, lineHeight: 17, marginTop: 3 },
  tipBullet: { fontSize: theme.font.tiny, color: theme.color.textMuted, lineHeight: 17, marginTop: 4 },
});
