import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  addSlip,
  endSmokingPeriod,
  listCheckins,
  saveCheckin,
  startSmokingPeriod,
  type CheckinRow,
} from '@/data/repositories';
import { parsePositiveInt } from '@/domain/parse';
import type { SlipTrigger } from '@/domain/types';
import { CravingChart } from '@/ui/CravingChart';
import { theme } from '@/ui/theme';
import { useQuitState } from '@/ui/useQuitState';

const TRIGGERS: SlipTrigger[] = ['alcohol', 'stress', 'social', 'boredom', 'routine', 'other'];
const SCALE = [1, 2, 3, 4, 5];

type Status = { text: string; tone: 'ok' | 'error' };

export default function Log() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, reload } = useQuitState();

  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [slipCount, setSlipCount] = useState('1');
  const [slipTrigger, setSlipTrigger] = useState<SlipTrigger | null>(null);
  const [craving, setCraving] = useState(3);
  const [mood, setMood] = useState(3);
  const [relapseAvg, setRelapseAvg] = useState('15');
  const [status, setStatus] = useState<Status | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // `submittingRef` is the actual correctness guard: it is checked and set
  // synchronously before any `await`, so two taps in the same tick (before
  // React re-renders with the updated state) cannot both pass the check. The
  // `submitting` state exists only to drive the visual disabled/opacity —
  // it can lag a render behind the ref without weakening the guard.
  const submittingRef = useRef(false);

  const loadCheckins = useCallback(async () => {
    setCheckins(await listCheckins(db, 30));
  }, [db]);

  useEffect(() => { void loadCheckins(); }, [loadCheckins]);

  const currentlySmoking = state?.periods.some((period) => period.endedAt === null) ?? false;

  const submitSlip = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const parsed = parsePositiveInt(slipCount) ?? 1;
      await addSlip(db, { occurredAt: new Date().toISOString(), cigaretteCount: parsed, trigger: slipTrigger, note: null }, new Date());
      await reload();
      setStatus({ text: 'Slip logged. Your fast clocks restarted; the long ones did not.', tone: 'ok' });
    } catch {
      setStatus({ text: 'Couldn’t save that slip. Nothing was recorded — please try again.', tone: 'error' });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const submitCheckin = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      // `.slice(0, 10)` on an ISO string yields the UTC calendar date, which can differ
      // from the user's local date near midnight. Accepted tradeoff for v1 — see brief.
      const today = new Date().toISOString().slice(0, 10);
      await saveCheckin(db, { loggedOn: today, cravingIntensity: craving, mood, note: null }, new Date());
      await loadCheckins();
      setStatus({ text: 'Check-in saved.', tone: 'ok' });
    } catch {
      setStatus({ text: 'Couldn’t save today’s check-in. Nothing was recorded — please try again.', tone: 'error' });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const toggleRelapse = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (currentlySmoking) {
        await endSmokingPeriod(db, new Date().toISOString());
        setStatus({ text: 'Welcome back. Your long-term clocks restart from today.', tone: 'ok' });
      } else {
        const parsed = parsePositiveInt(relapseAvg) ?? 15;
        await startSmokingPeriod(db, { startedAt: new Date().toISOString(), averageCigarettesPerDay: parsed, note: null }, new Date());
        setStatus({ text: 'Logged. Nothing here is a verdict on you — come back when you are ready.', tone: 'ok' });
      }
      await reload();
    } catch {
      // The concrete failure this catches: if the device clock is corrected backwards while
      // a period is open, END_OPEN_SMOKING_PERIOD violates the `ended_at >= started_at`
      // CHECK. Without this the period silently stayed open and the user was told nothing.
      setStatus({ text: 'Couldn’t update your smoking period. Nothing changed — check your phone’s date and time, then try again.', tone: 'error' });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + theme.space.lg }]}>
      <Pressable onPress={() => router.back()}><Text style={styles.close}>Close</Text></Pressable>

      <Text style={styles.h2}>Today’s check-in</Text>
      <Scale label="Craving intensity" value={craving} onChange={setCraving} />
      <Scale label="Mood" value={mood} onChange={setMood} />
      <Pressable style={[styles.cta, submitting && styles.ctaDisabled]} onPress={submitCheckin} disabled={submitting}>
        <Text style={styles.ctaText}>Save check-in</Text>
      </Pressable>

      <Text style={styles.h2}>Craving over the last 30 days</Text>
      <CravingChart checkins={checkins} />

      <Text style={styles.h2}>Log a slip</Text>
      <Text style={styles.hint}>A few cigarettes, still quit. This subtracts exactly what you smoked — nothing more.</Text>
      <TextInput style={styles.input} value={slipCount} onChangeText={setSlipCount} keyboardType="number-pad" accessibilityLabel="Cigarettes smoked" />
      <View style={styles.chips}>
        {TRIGGERS.map((option) => (
          <Pressable key={option} onPress={() => setSlipTrigger(slipTrigger === option ? null : option)} style={[styles.chip, slipTrigger === option && styles.chipActive]}>
            <Text style={[styles.chipText, slipTrigger === option && styles.chipTextActive]}>{option}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={[styles.cta, submitting && styles.ctaDisabled]} onPress={submitSlip} disabled={submitting}>
        <Text style={styles.ctaText}>Log slip</Text>
      </Pressable>

      <Text style={styles.h2}>{currentlySmoking ? 'Start again' : 'I’ve gone back to smoking'}</Text>
      {currentlySmoking ? (
        <Text style={styles.hint}>
          Ends the current smoking period. Your long-term recovery clocks restart from today, and your
          longest smoke-free run so far stays on record — nothing you already did is erased.
        </Text>
      ) : (
        <>
          <Text style={styles.hint}>Not a slip — a return to regular smoking. Roughly how many a day?</Text>
          <TextInput style={styles.input} value={relapseAvg} onChangeText={setRelapseAvg} keyboardType="number-pad" accessibilityLabel="Average cigarettes per day" />
        </>
      )}
      <Pressable
        style={[styles.cta, styles.ctaMuted, submitting && styles.ctaDisabled]}
        onPress={toggleRelapse}
        disabled={submitting}
      >
        <Text style={styles.ctaText}>{currentlySmoking ? 'I’ve stopped again' : 'Log a relapse'}</Text>
      </Pressable>

      {status ? (
        <Text style={[styles.status, status.tone === 'error' && styles.statusError]}>{status.text}</Text>
      ) : null}
    </ScrollView>
  );
}

function Scale(props: { label: string; value: number; onChange: (next: number) => void }) {
  return (
    <View style={{ gap: theme.space.xs }}>
      <Text style={styles.label}>{props.label}</Text>
      <View style={styles.chips}>
        {SCALE.map((option) => (
          <Pressable key={option} onPress={() => props.onChange(option)} style={[styles.chip, props.value === option && styles.chipActive]}>
            <Text style={[styles.chipText, props.value === option && styles.chipTextActive]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: theme.space.lg, paddingBottom: theme.space.xxl, gap: theme.space.md, backgroundColor: theme.color.bg },
  close: { fontSize: theme.font.small, fontWeight: '600', color: theme.color.heroBg, alignSelf: 'flex-end' },
  h2: { fontSize: theme.font.body, fontWeight: '700', color: theme.color.text, marginTop: theme.space.lg },
  hint: { fontSize: theme.font.tiny, color: theme.color.textFaint, lineHeight: 16 },
  label: { fontSize: theme.font.small, fontWeight: '600', color: theme.color.text },
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
  cta: { backgroundColor: theme.color.heroBg, borderRadius: theme.radius.md, paddingVertical: theme.space.md, alignItems: 'center' },
  ctaMuted: { backgroundColor: theme.color.textFaint },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: theme.color.heroText, fontSize: theme.font.body, fontWeight: '700' },
  status: { fontSize: theme.font.small, color: theme.color.done, marginTop: theme.space.md, lineHeight: 19 },
  statusError: { color: theme.color.danger },
});
