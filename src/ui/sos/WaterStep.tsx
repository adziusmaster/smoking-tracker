import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Body, ProgressRing } from '../kit';
import { makeStyles } from '../theme';

const SECONDS = 60;

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    wrap: { alignItems: 'center', gap: t.space.md, paddingVertical: t.space.md },
    seconds: { fontFamily: t.family.display, fontSize: 48, lineHeight: 56, color: t.color.accentText, fontVariant: ['tabular-nums'] },
  }),
);

export function WaterStep(props: { instruction: string }) {
  const styles = useStyles();
  const [left, setLeft] = useState(SECONDS);
  useEffect(() => {
    const id = setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={styles.wrap}>
      <View accessible accessibilityLabel={`${left} seconds left`}>
        <ProgressRing progress={left / SECONDS} size={170} thickness={12}>
          <Text style={styles.seconds}>{left}</Text>
        </ProgressRing>
      </View>
      <Body tone="muted">{props.instruction}</Body>
    </View>
  );
}
