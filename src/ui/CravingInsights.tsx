import { StyleSheet, View } from 'react-native';
import type { CravingInsights as Insights, DayPart } from '@/domain/cravings';
import { Body, Caption, Label, ProgressBar } from './kit';
import { makeStyles } from './theme';

const PART_LABEL: Record<DayPart, string> = {
  night: 'Night (0–6)',
  morning: 'Morning (6–12)',
  afternoon: 'Afternoon (12–18)',
  evening: 'Evening (18–24)',
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    wrap: { gap: t.space.sm },
    bar: { gap: t.space.xs },
    barHead: { flexDirection: 'row', justifyContent: 'space-between' },
  }),
);

/** The Log screen's craving section: SOS count, strength trend, time of day, slip triggers. */
export function CravingInsights(props: { insights: Insights }) {
  const styles = useStyles();
  const { total, beaten, trend, timeOfDay, triggers } = props.insights;

  if (total === 0 && triggers.length === 0) {
    return <Caption tone="faint">Tap SOS when a craving hits. Each one you ride out shows up here.</Caption>;
  }

  return (
    <View style={styles.wrap}>
      {total > 0 ? (
        <Body>
          {beaten} of {total} {total === 1 ? 'craving' : 'cravings'} beaten with SOS.
        </Body>
      ) : null}
      {trend ? (
        <Body>
          Your cravings started at {trend.earlier} out of 5 on average before; the last two weeks average {trend.recent}.
        </Body>
      ) : null}
      {total > 0 ? (
        <>
          <Label>When they hit</Label>
          {timeOfDay.map((part) => (
            <View key={part.part} style={styles.bar}>
              <View style={styles.barHead}>
                <Caption>{PART_LABEL[part.part]}</Caption>
                <Caption tone="faint">{part.count}</Caption>
              </View>
              <ProgressBar progress={part.share} accessibilityLabel={`${PART_LABEL[part.part]}: ${part.count} cravings`} />
            </View>
          ))}
        </>
      ) : null}
      {triggers.length > 0 ? (
        <>
          <Label>What set slips off</Label>
          <Body>{triggers.map((t) => `${t.trigger} (${t.count})`).join(' · ')}</Body>
        </>
      ) : null}
    </View>
  );
}
