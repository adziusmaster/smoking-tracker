import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { sosProgress } from '@/domain/cravings';
import { Caption, ProgressBar } from '../kit';
import { makeStyles } from '../theme';

const useStyles = makeStyles((t) => StyleSheet.create({ wrap: { gap: t.space.xs } }));

/** The five-minute bar across the top of SOS. It never resets while SOS is open. */
export function CravingBar(props: { startedAt: string }) {
  const styles = useStyles();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const progress = sosProgress(props.startedAt, now);
  return (
    <View style={styles.wrap}>
      <ProgressBar progress={progress} accessibilityLabel="Time since the craving started" />
      <Caption tone="faint">
        {progress < 1 ? 'Most cravings pass within 3–5 minutes' : 'Five minutes. How is it now?'}
      </Caption>
    </View>
  );
}
