import { StyleSheet, Text, View } from 'react-native';
import { formatCount, formatElapsed, formatMinutesNotLost, formatMoneyMinor } from '@/domain/format';
import type { Elapsed, Savings, Streak } from '@/domain/types';
import { Body, Card, Heading, StatTile } from './kit';
import { makeStyles } from './theme';

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    hero: { backgroundColor: t.color.heroTo, borderRadius: t.radius.lg, padding: t.space.lg, overflow: 'hidden' },
    // One large disc of the darker hero colour clipped into the corner stands in for a gradient,
    // which would need a native module.
    depth: { position: 'absolute', width: 260, height: 260, borderRadius: 130, top: -110, left: -90, backgroundColor: t.color.heroFrom },
    big: { fontFamily: t.family.display, fontSize: t.font.display, lineHeight: 40, color: t.color.onHero, letterSpacing: -0.5 },
    sub: { fontFamily: t.family.medium, fontSize: t.font.small, color: t.color.onHero, marginTop: t.space.xs },
    row: { flexDirection: 'row', gap: t.space.sm, marginTop: t.space.lg },
    beaten: { fontFamily: t.family.semi, fontSize: t.font.small, color: t.color.onHero, marginTop: t.space.sm },
  }),
);

export function Hero(props: {
  elapsed: Elapsed;
  /** Longest smoke-free run so far. Not `elapsed`: that one keeps climbing while smoking. */
  longestStreak: Streak;
  savings: Savings;
  currency: string;
  phaseName: string;
  currentlySmoking: boolean;
  /** Product wording from src/content/products.ts. */
  freeWord: string;
  avoidedLabel: string;
  relapseTitle: string;
  cravingsBeaten: number;
}) {
  const styles = useStyles();

  if (props.currentlySmoking) {
    return (
      <Card tone="danger">
        <Heading tone="danger">{props.relapseTitle}</Heading>
        <Body tone="muted">
          That’s logged, not judged. Your best run was {formatElapsed(props.longestStreak.elapsed)} — you’ve
          already proved you can do this once. End the period from the Log screen whenever you’re ready to
          start again.
        </Body>
      </Card>
    );
  }

  return (
    <View style={styles.hero}>
      <View style={styles.depth} />
      <Text style={styles.big} accessibilityRole="header">{formatElapsed(props.elapsed)}</Text>
      <Text style={styles.sub}>{props.freeWord} · {props.phaseName}</Text>
      <View style={styles.row}>
        <StatTile value={formatMoneyMinor(props.savings.moneySavedMinor, props.currency)} label="saved" />
        <StatTile value={formatCount(props.savings.unitsAvoided)} label={props.avoidedLabel} />
        {props.savings.minutesNotLost !== null ? (
          <StatTile value={formatMinutesNotLost(props.savings.minutesNotLost)} label="time not lost" />
        ) : (
          <StatTile value={formatCount(props.cravingsBeaten)} label="cravings beaten" />
        )}
      </View>
      {props.savings.minutesNotLost !== null && props.cravingsBeaten > 0 ? (
        <Text style={styles.beaten}>
          {formatCount(props.cravingsBeaten)} {props.cravingsBeaten === 1 ? 'craving' : 'cravings'} beaten
        </Text>
      ) : null}
    </View>
  );
}
