import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { breathAt, type BreathPhase } from '@/domain/breathing';
import { makeStyles, useTheme } from '../theme';

const SIZE = 230;
const SMALL = 0.5;
const LABEL: Record<BreathPhase, string> = { in: 'Breathe in', hold: 'Hold', out: 'Breathe out' };
const PHASE_INDEX: Record<BreathPhase, number> = { in: 0, hold: 1, out: 2 };

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    stage: { height: SIZE + 30, alignItems: 'center', justifyContent: 'center' },
    // Where the circle will grow to: always visible, so you can see how big a breath gets.
    outline: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 2, borderStyle: 'dashed', borderColor: t.color.line },
    circle: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
    centre: { alignItems: 'center' },
    seconds: { fontFamily: t.family.display, fontSize: 64, lineHeight: 70, color: t.color.ink, fontVariant: ['tabular-nums'] },
    label: { fontFamily: t.family.semi, fontSize: t.font.heading, color: t.color.ink },
    legend: { flexDirection: 'row', justifyContent: 'center', gap: t.space.lg },
    key: { flexDirection: 'row', alignItems: 'center', gap: t.space.xs },
    dot: { width: 10, height: 10, borderRadius: 5 },
    keyText: { fontFamily: t.family.medium, fontSize: t.font.tiny, color: t.color.muted },
  }),
);

/**
 * Guided 4-4-6 breathing. The circle grows to the dashed outline while you breathe in, holds,
 * and shrinks while you breathe out; its colour tells you the phase and the number counts down
 * the seconds left. A short vibration marks each change. With reduce-motion on, the circle
 * stays still and the colour and countdown do the guiding.
 */
export function BreatheGuide(props: { onPhaseChange: () => void }) {
  const t = useTheme();
  const styles = useStyles();
  const scale = useRef(new Animated.Value(SMALL)).current;
  const colour = useRef(new Animated.Value(0)).current;
  const startedAt = useRef(Date.now()).current;
  const [now, setNow] = useState(() => breathAt(0));
  const lastPhase = useRef<BreathPhase>('in');
  const phaseColours = [t.color.accent, t.color.achieve, t.game[3] ?? t.color.accent];

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled || reduced) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.delay(4000),
          Animated.timing(scale, { toValue: SMALL, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    const clock = setInterval(() => setNow(breathAt(Date.now() - startedAt)), 100);
    return () => {
      cancelled = true;
      loop?.stop();
      clearInterval(clock);
    };
  }, [scale, startedAt]);

  useEffect(() => {
    if (now.phase === lastPhase.current) return;
    lastPhase.current = now.phase;
    props.onPhaseChange();
    if (now.phase === 'in') {
      // Out → in goes forward to a second copy of the "in" colour and then snaps back to 0, so
      // it never passes back through the hold colour on the way.
      Animated.timing(colour, { toValue: 3, duration: 500, useNativeDriver: false }).start(({ finished }) => {
        if (finished) colour.setValue(0);
      });
    } else {
      Animated.timing(colour, { toValue: PHASE_INDEX[now.phase], duration: 500, useNativeDriver: false }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now.phase]);

  const fill = colour.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [...phaseColours, phaseColours[0] ?? t.color.accent] });

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.stage} accessible accessibilityLiveRegion="polite" accessibilityLabel={`${LABEL[now.phase]}, ${now.secondsLeft}`}>
        <View style={styles.outline} />
        {/* Scale runs on the native driver and colour on the JS driver; they live on separate
            views because one animated view cannot mix the two. */}
        <Animated.View style={[styles.circle, { transform: [{ scale }] }]}>
          <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: SIZE / 2, opacity: 0.28, backgroundColor: fill }]} />
        </Animated.View>
        <View style={styles.centre}>
          <Text style={styles.seconds}>{now.secondsLeft}</Text>
          <Text style={styles.label}>{LABEL[now.phase]}</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {(['in', 'hold', 'out'] as const).map((phase, i) => (
          <View key={phase} style={styles.key}>
            <View style={[styles.dot, { backgroundColor: phaseColours[i] }]} />
            <Text style={styles.keyText}>{LABEL[phase]} · {phase === 'out' ? 6 : 4}s</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
