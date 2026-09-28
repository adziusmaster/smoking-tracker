import { StyleSheet, View } from 'react-native';
import { makeStyles } from '../theme';

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    track: { height: 6, borderRadius: 3, backgroundColor: t.color.line, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 3, backgroundColor: t.color.achieve },
  }),
);

export function ProgressBar(props: { progress: number; accessibilityLabel: string }) {
  const styles = useStyles();
  const percent = Math.round(Math.min(1, Math.max(0, props.progress)) * 100);
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityLabel={props.accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <View style={[styles.fill, { width: `${percent}%` }]} />
    </View>
  );
}
