import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addSlip } from '@/data/repositories';
import { SOS_STEPS } from '@/content/sos';
import { formatCount } from '@/domain/format';
import { parseNonNegativeInt, parsePositiveInt } from '@/domain/parse';
import { computeSavings } from '@/domain/savings';
import type { SlipTrigger } from '@/domain/types';
import { theme } from '@/ui/theme';
import { useQuitState } from '@/ui/useQuitState';

const TRIGGERS: SlipTrigger[] = ['alcohol', 'stress', 'social', 'boredom', 'routine', 'other'];

export default function Sos() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useQuitState();

  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState(SOS_STEPS[0]?.seconds ?? 60);
  const [outcome, setOutcome] = useState<'running' | 'passed' | 'slipped'>('running');
  const [count, setCount] = useState('1');
  const [trigger, setTrigger] = useState<SlipTrigger | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // `submittingRef` is the correctness guard, matching app/log.tsx: it is checked and set
  // synchronously before any `await`, so two taps in the same tick (before React re-renders
  // with the updated state) cannot both insert a slip row. Two rows would reset the fast
  // clock twice and charge the savings figures twice. The `submitting` state only drives
  // the visual disabled/opacity and may lag a render behind without weakening the guard.
  const submittingRef = useRef(false);

  useEffect(() => {
    if (outcome !== 'running') return;
    const id = setInterval(() => setRemaining((value) => value - 1), 1000);
    return () => clearInterval(id);
  }, [outcome]);

  useEffect(() => {
    if (remaining > 0) return;
    const next = stepIndex + 1;
    if (next < SOS_STEPS.length) {
      setStepIndex(next);
      setRemaining(SOS_STEPS[next]?.seconds ?? 60);
    } else {
      setOutcome('passed');
    }
  }, [remaining, stepIndex]);

  const logSlip = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFailure(null);
    try {
      await addSlip(
        db,
        { occurredAt: new Date().toISOString(), unitCount: parsePositiveInt(count) ?? 1, trigger, note: null },
        new Date(),
      );
      router.replace('/');
    } catch {
      setFailure('Couldn’t save that. Nothing was recorded — try again, and it still counts as logged honestly.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (outcome === 'slipped') {
    const parsedCount = parseNonNegativeInt(count) ?? 1;
    const lifetimeBefore = state ? computeSavings(state, new Date()).lifetimeCigarettes : null;
    const lifetimeAfterSlip = lifetimeBefore === null ? null : lifetimeBefore + Math.max(1, parsedCount);

    return (
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + theme.space.xl }]}>
        <Text style={styles.h1}>Alright. Let’s log it accurately.</Text>
        <Text style={styles.body}>
          One cigarette is not a failed quit attempt — treating it as one is what turns it into a relapse.
          Your carbon monoxide and nicotine clocks restart from this. Everything measured in months and
          years keeps running, because those depend on cumulative exposure and this barely registers
          against it.
        </Text>
        {lifetimeAfterSlip !== null ? (
          <Text style={styles.body}>
            That brings your estimated lifetime total to {formatCount(lifetimeAfterSlip)}.
          </Text>
        ) : null}

        <Text style={styles.label}>How many did you smoke?</Text>
        <TextInput style={styles.input} value={count} onChangeText={setCount} keyboardType="number-pad" accessibilityLabel="Number of cigarettes" />

        <Text style={styles.label}>What set it off? (optional)</Text>
        <View style={styles.chips}>
          {TRIGGERS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setTrigger(trigger === option ? null : option)}
              style={[styles.chip, trigger === option && styles.chipActive]}
            >
              <Text style={[styles.chipText, trigger === option && styles.chipTextActive]}>{option}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={[styles.cta, submitting && styles.ctaDisabled]} onPress={logSlip} disabled={submitting}>
          <Text style={styles.ctaText}>Log it and carry on</Text>
        </Pressable>

        {failure ? <Text style={styles.failure}>{failure}</Text> : null}
      </ScrollView>
    );
  }

  if (outcome === 'passed') {
    return (
      <View style={[styles.page, styles.centered, { paddingTop: insets.top + theme.space.xl }]}>
        <Text style={styles.h1}>It passed.</Text>
        <Text style={styles.body}>
          That is what cravings do — five minutes, every time, whether you feed them or not. You now have
          direct evidence of that, which is worth more than anything this app can tell you.
        </Text>
        <Pressable style={styles.cta} onPress={() => router.replace('/')}>
          <Text style={styles.ctaText}>Back to the timeline</Text>
        </Pressable>
      </View>
    );
  }

  const step = SOS_STEPS[stepIndex];

  return (
    <View style={[styles.page, { paddingTop: insets.top + theme.space.xl }]}>
      <Text style={styles.stepCount}>Step {stepIndex + 1} of {SOS_STEPS.length}</Text>
      <Text style={styles.h1}>{step?.heading}</Text>
      <Text style={styles.timer}>{Math.max(0, remaining)}</Text>
      <Text style={styles.body}>{step?.instruction}</Text>

      <View style={{ flex: 1 }} />

      <Pressable style={styles.secondary} onPress={() => setOutcome('passed')}>
        <Text style={styles.secondaryText}>It’s passed, I’m fine</Text>
      </Pressable>
      <Pressable style={styles.tertiary} onPress={() => setOutcome('slipped')}>
        <Text style={styles.tertiaryText}>I smoked</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: theme.space.lg, gap: theme.space.md, backgroundColor: theme.color.bg },
  centered: { justifyContent: 'center' },
  stepCount: { fontSize: theme.font.tiny, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: theme.color.textFaint },
  h1: { fontSize: theme.font.title, fontWeight: '700', color: theme.color.text },
  timer: { fontSize: 64, fontWeight: '700', color: theme.color.heroBg, letterSpacing: -2 },
  body: { fontSize: theme.font.body, color: theme.color.textMuted, lineHeight: 22 },
  label: { fontSize: theme.font.small, fontWeight: '600', color: theme.color.text, marginTop: theme.space.md },
  input: {
    borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface, paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm, fontSize: theme.font.body, color: theme.color.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  chip: { borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.pill, paddingHorizontal: theme.space.md, paddingVertical: 6, backgroundColor: theme.color.surface },
  chipActive: { backgroundColor: theme.color.heroBg, borderColor: theme.color.heroBg },
  chipText: { fontSize: theme.font.tiny, color: theme.color.textMuted },
  chipTextActive: { color: theme.color.heroText, fontWeight: '600' },
  cta: { backgroundColor: theme.color.heroBg, borderRadius: theme.radius.md, paddingVertical: theme.space.md, alignItems: 'center', marginTop: theme.space.lg },
  ctaText: { color: theme.color.heroText, fontSize: theme.font.body, fontWeight: '700' },
  ctaDisabled: { opacity: 0.5 },
  failure: { fontSize: theme.font.small, color: theme.color.danger, marginTop: theme.space.md, lineHeight: 19 },
  secondary: { backgroundColor: theme.color.done, borderRadius: theme.radius.md, paddingVertical: theme.space.md, alignItems: 'center' },
  secondaryText: { color: '#fff', fontSize: theme.font.body, fontWeight: '700' },
  tertiary: { paddingVertical: theme.space.md, alignItems: 'center' },
  tertiaryText: { color: theme.color.textFaint, fontSize: theme.font.small },
});
