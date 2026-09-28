import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  addSlip,
  endSmokingPeriod,
  listCheckins,
  saveCheckin,
  startSmokingPeriod,
  type CheckinRow,
} from '@/data/repositories';
import { parsePositiveInt } from '@/domain/parse';
import type { ProductId, SlipTrigger } from '@/domain/types';
import { PRODUCT_CONTENT } from '@/content/products';
import { CravingChart } from '@/ui/CravingChart';
import { SlipProductPicker } from '@/ui/SlipProductPicker';
import { Body, Button, Caption, Chip, Field, Heading, Label, Screen, Title } from '@/ui/kit';
import { makeStyles } from '@/ui/theme';
import { useQuitState } from '@/ui/useQuitState';
import { useSubmitGuard } from '@/ui/useSubmitGuard';

const TRIGGERS: SlipTrigger[] = ['alcohol', 'stress', 'social', 'boredom', 'routine', 'other'];
const SCALE = [1, 2, 3, 4, 5];

type Status = { text: string; tone: 'ok' | 'error' };

export default function Log() {
  const db = useSQLiteContext();
  const router = useRouter();
  const styles = useStyles();
  const { state, reload } = useQuitState();

  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [slipCount, setSlipCount] = useState('1');
  const [slipChoice, setSlipChoice] = useState<ProductId | null>(null);
  const [slipTrigger, setSlipTrigger] = useState<SlipTrigger | null>(null);
  const [craving, setCraving] = useState(3);
  const [mood, setMood] = useState(3);
  const [relapseAvg, setRelapseAvg] = useState('15');
  const [status, setStatus] = useState<Status | null>(null);
  const { submitting, run } = useSubmitGuard();

  const loadCheckins = useCallback(async () => {
    setCheckins(await listCheckins(db, 30));
  }, [db]);

  useEffect(() => { void loadCheckins(); }, [loadCheckins]);

  const currentlySmoking = state?.periods.some((period) => period.endedAt === null) ?? false;

  const own: ProductId = state?.settings.product ?? 'cigarettes';
  const content = PRODUCT_CONTENT[own];
  // A slip can be any product: an IQOS quitter can slip on a cigarette.
  const slipProduct = slipChoice ?? own;
  const slipContent = PRODUCT_CONTENT[slipProduct];

  const submitSlip = () =>
    run(async () => {
      try {
        const units = slipContent.countsSlips ? (parsePositiveInt(slipCount) ?? 1) : 1;
        await addSlip(db, { occurredAt: new Date().toISOString(), unitCount: units, trigger: slipTrigger, note: null, product: slipProduct }, new Date());
        await reload();
        setStatus({ text: 'Slip logged. Your fast clocks restarted; the long ones did not.', tone: 'ok' });
      } catch {
        setStatus({ text: 'Couldn’t save that slip. Nothing was recorded — please try again.', tone: 'error' });
      }
    });

  const submitCheckin = () =>
    run(async () => {
      try {
        // `.slice(0, 10)` on an ISO string yields the UTC calendar date, which can differ
        // from the user's local date near midnight. Accepted tradeoff for v1 — see brief.
        const today = new Date().toISOString().slice(0, 10);
        await saveCheckin(db, { loggedOn: today, cravingIntensity: craving, mood, note: null }, new Date());
        await loadCheckins();
        setStatus({ text: 'Check-in saved.', tone: 'ok' });
      } catch {
        setStatus({ text: 'Couldn’t save today’s check-in. Nothing was recorded — please try again.', tone: 'error' });
      }
    });

  const toggleRelapse = () =>
    run(async () => {
      try {
        if (currentlySmoking) {
          await endSmokingPeriod(db, new Date().toISOString());
          setStatus({ text: 'Welcome back. Your long-term clocks restart from today.', tone: 'ok' });
        } else {
          const parsed = parsePositiveInt(relapseAvg) ?? 15;
          await startSmokingPeriod(db, { startedAt: new Date().toISOString(), averageUnitsPerDay: parsed, note: null }, new Date());
          setStatus({ text: 'Logged. Nothing here is a verdict on you — come back when you are ready.', tone: 'ok' });
        }
        await reload();
      } catch {
        // The concrete failure this catches: if the device clock is corrected backwards while
        // a period is open, END_OPEN_SMOKING_PERIOD violates the `ended_at >= started_at`
        // CHECK. Without this the period silently stayed open and the user was told nothing.
        setStatus({ text: 'Couldn’t update your smoking period. Nothing changed — check your phone’s date and time, then try again.', tone: 'error' });
      }
    });

  const relapsePrompt = content.countsSlips
    ? `Not a slip — a return to regular use. Roughly how many ${content.unit.many} a day?`
    : 'Not a slip — a return to regular use. Roughly how many times a day?';

  return (
    <Screen>
      <View style={styles.topBar}>
        <Button label="Close" variant="quiet" onPress={() => router.back()} />
      </View>

      <Title>Log</Title>

      <Heading>Today’s check-in</Heading>
      <Scale label="Craving intensity" value={craving} onChange={setCraving} />
      <Scale label="Mood" value={mood} onChange={setMood} />
      <Button label="Save check-in" onPress={submitCheckin} disabled={submitting} />

      <Heading>Craving over the last 30 days</Heading>
      <CravingChart checkins={checkins} />

      <Heading>Log a slip</Heading>
      <Caption tone="faint">A slip, still quit. It restarts the fast clocks and nothing else is taken away.</Caption>
      <SlipProductPicker own={own} value={slipProduct} onChange={setSlipChoice} />
      {slipContent.countsSlips ? (
        <Field
          label={`How many ${slipContent.unit.many}?`}
          value={slipCount}
          onChangeText={setSlipCount}
          keyboardType="number-pad"
          accessibilityLabel={`Number of ${slipContent.unit.many}`}
        />
      ) : null}
      <View style={styles.chips}>
        {TRIGGERS.map((option) => (
          <Chip key={option} label={option} selected={slipTrigger === option} onPress={() => setSlipTrigger(slipTrigger === option ? null : option)} />
        ))}
      </View>
      <Button label="Log slip" onPress={submitSlip} disabled={submitting} />

      <Heading>{currentlySmoking ? 'Start again' : 'I’ve gone back to it'}</Heading>
      {currentlySmoking ? (
        <Caption tone="faint">
          Ends the current period. Your long-term recovery clocks restart from today, and your longest run so far
          stays on record — nothing you already did is erased.
        </Caption>
      ) : (
        <Field label={relapsePrompt} value={relapseAvg} onChangeText={setRelapseAvg} keyboardType="number-pad" />
      )}
      <Button
        label={currentlySmoking ? 'I’ve stopped again' : 'Log a relapse'}
        variant="secondary"
        onPress={toggleRelapse}
        disabled={submitting}
      />

      {status ? <Body tone={status.tone === 'error' ? 'danger' : 'accent'}>{status.text}</Body> : null}
    </Screen>
  );
}

function Scale(props: { label: string; value: number; onChange: (next: number) => void }) {
  const styles = useStyles();
  return (
    <View style={styles.scale}>
      <Label>{props.label}</Label>
      <View style={styles.chips}>
        {SCALE.map((option) => (
          <Chip key={option} label={String(option)} selected={props.value === option} onPress={() => props.onChange(option)} />
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    topBar: { flexDirection: 'row', justifyContent: 'flex-end' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
    scale: { gap: t.space.xs },
  }),
);
