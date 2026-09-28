import { StyleSheet, Text, View } from 'react-native';
import type { Chapter, TipContent } from '@/domain/types';
import { Body, Card, Eyebrow } from './kit';
import { MilestoneNode } from './MilestoneNode';
import { makeStyles } from './theme';

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    future: { opacity: 0.55 },
    block: { gap: t.space.sm },
    header: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm, marginTop: t.space.lg },
    badge: { width: 26, height: 26, borderRadius: t.radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.accent },
    badgePast: { backgroundColor: t.color.doneLine },
    badgeFuture: { backgroundColor: t.color.line },
    badgeText: { fontFamily: t.family.bold, fontSize: t.font.tiny, color: t.color.onAccent },
    badgeTextMuted: { color: t.color.ink },
    name: { fontFamily: t.family.display, fontSize: t.font.heading, color: t.color.ink },
    status: { fontFamily: t.family.bold, fontSize: t.font.micro, letterSpacing: 0.8, textTransform: 'uppercase', color: t.color.faint },
    tipGap: { marginTop: t.space.sm },
    bullet: { flexDirection: 'row', gap: t.space.sm },
  }),
);

export function ChapterBlock(props: { chapter: Chapter; tips: TipContent | null; tipsAreDangerWindow: boolean }) {
  const styles = useStyles();
  const { chapter, tips } = props;
  const isCurrent = chapter.status === 'current';
  const eyebrowTone = props.tipsAreDangerWindow ? 'danger' : 'achieve';

  return (
    <View style={[styles.block, chapter.status === 'future' && styles.future]}>
      <View style={styles.header}>
        <View style={[styles.badge, chapter.status === 'past' && styles.badgePast, chapter.status === 'future' && styles.badgeFuture]}>
          <Text style={[styles.badgeText, chapter.status !== 'current' && styles.badgeTextMuted]}>
            {chapter.status === 'past' ? '✓' : chapter.phase.name.charAt(0)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} accessibilityRole="header">{chapter.phase.name}</Text>
          <Text style={styles.status}>{isCurrent ? 'you are here' : chapter.status === 'past' ? 'behind you' : 'ahead'}</Text>
        </View>
      </View>

      {isCurrent && tips ? (
        <Card tone={props.tipsAreDangerWindow ? 'danger' : 'plain'}>
          <Eyebrow tone={eyebrowTone}>What’s happening</Eyebrow>
          <Body tone="muted">{tips.whatsHappening}</Body>
          <View style={styles.tipGap} />
          <Eyebrow tone={eyebrowTone}>Why you feel this way</Eyebrow>
          <Body tone="muted">{tips.whyYouFeelThisWay}</Body>
          <View style={styles.tipGap} />
          <Eyebrow tone={eyebrowTone}>What to do about it</Eyebrow>
          {tips.howToCope.map((tip) => (
            <View key={tip} style={styles.bullet}>
              <Body tone="muted">•</Body>
              <View style={{ flex: 1 }}><Body tone="muted">{tip}</Body></View>
            </View>
          ))}
        </Card>
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
