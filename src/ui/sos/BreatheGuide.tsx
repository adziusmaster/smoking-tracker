import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { makeStyles } from '../theme';

const IN_MS = 4000;
const HOLD_MS = 4000;
const OUT_MS = 6000;
const CYCLE_MS = IN_MS + HOLD_MS + OUT_MS;
const SMALL = 0.55;

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    stage: { height: 260, alignItems: 'center', justifyContent: 'center' },
    circle: { width: 220, height: 220, borderRadius: 110, backgroundColor: t.color.doneWash, borderWidth: 3, borderColor: t.color.accent },
    label: { position: 'absolute', fontFamily: t.family.display, fontSize: t.font.title, color: t.color.accentText },
  }),
);

function phaseAt(ms: number): string {
  const at = ms % CYCLE_MS;
  if (at < IN_MS) return 'Breathe in';
  if (at < IN_MS + HOLD_MS) return 'Hold';
  return 'Breathe out';
}

/** A circle that grows (in, 4 s), holds (4 s) and shrinks (out, 6 s). Still if reduce-motion is on. */
export function BreatheGuide() {
  const styles = useStyles();
  const scale = useRef(new Animated.Value(SMALL)).current;
  const startedAt = useRef(Date.now()).current;
  const [label, setLabel] = useState('Breathe in');

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled || reduced) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1, duration: IN_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.delay(HOLD_MS),
          Animated.timing(scale, { toValue: SMALL, duration: OUT_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    const clock = setInterval(() => setLabel(phaseAt(Date.now() - startedAt)), 250);
    return () => {
      cancelled = true;
      loop?.stop();
      clearInterval(clock);
    };
  }, [scale, startedAt]);

  return (
    <View style={styles.stage} accessible accessibilityLiveRegion="polite" accessibilityLabel={label}>
      <Animated.View style={[styles.circle, { transform: [{ scale }] }]} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}
