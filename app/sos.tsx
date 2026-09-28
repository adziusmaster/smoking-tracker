import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { addSlip } from '@/data/repositories';
import { PRODUCT_CONTENT } from '@/content/products';
import { SLIP_REASSURANCE, SOS_STEPS } from '@/content/sos';
import { fillUnitTokens, formatCount } from '@/domain/format';
import { parseNonNegativeInt } from '@/domain/parse';
import { pickVariant } from '@/domain/products';
import { lifetimeAfterSlip } from '@/domain/savings';
import type { SlipTrigger } from '@/domain/types';
import { Body, Button, Chip, Eyebrow, Field, Label, ProgressRing, Screen, Title } from '@/ui/kit';
import { makeStyles } from '@/ui/theme';
import { useQuitState } from '@/ui/useQuitState';
import { useSubmitGuard } from '@/ui/useSubmitGuard';

const TRIGGERS: SlipTrigger[] = ['alcohol', 'stress', 'social', 'boredom', 'routine', 'other'];

export default function Sos() {
  const db = useSQLiteContext();
  const router = useRouter();
  const styles = useStyles();
  const { height: windowHeight } = useWindowDimensions();
  const { state } = useQuitState();

  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState(SOS_STEPS[0]?.seconds ?? 60);
  const [outcome, setOutcome] = useState<'running' | 'passed' | 'slipped'>('running');
  const [count, setCount] = useState('1');
  const [trigger, setTrigger] = useState<SlipTrigger | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const { submitting, run } = useSubmitGuard();
  // Cigarette wording until the stored product has loaded — the screen must work instantly.
  const content = PRODUCT_CONTENT[state?.settings.product ?? 'cigarettes'];
  const slipUnits = content.countsSlips ? Math.max(1, parseNonNegativeInt(count) ?? 1) : 1;

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

  const logSlip = () =>
    run(async () => {
      setFailure(null);
      try {
        await addSlip(db, { occurredAt: new Date().toISOString(), unitCount: slipUnits, trigger, note: null }, new Date());
        router.replace('/');
      } catch {
        setFailure('Couldn’t save that. Nothing was recorded — try again, and it still counts as logged honestly.');
      }
    });

  if (outcome === 'slipped') {
    const lifetime = state ? lifetimeAfterSlip(state, slipUnits, new Date()) : null;
    const reassurance = state ? pickVariant(SLIP_REASSURANCE, state.settings) : SLIP_REASSURANCE.smoke;

    return (
      <Screen>
        <Title>Alright. Let’s log it accurately.</Title>
        <Body tone="muted">{fillUnitTokens(reassurance, content.unit)}</Body>
        {lifetime !== null ? (
          <Body tone="muted">That brings your estimated lifetime cigarette total to {formatCount(lifetime)}.</Body>
        ) : null}

        {content.countsSlips ? (
          <Field
            label={`How many ${content.unit.many}?`}
            value={count}
            onChangeText={setCount}
            keyboardType="number-pad"
            accessibilityLabel={`Number of ${content.unit.many}`}
          />
        ) : null}

        <Label>What set it off? (optional)</Label>
        <View style={styles.chips}>
          {TRIGGERS.map((option) => (
            <Chip key={option} label={option} selected={trigger === option} onPress={() => setTrigger(trigger === option ? null : option)} />
          ))}
        </View>

        <Button label="Log it and carry on" onPress={logSlip} disabled={submitting} />
        {failure ? <Body tone="danger">{failure}</Body> : null}
      </Screen>
    );
  }

  if (outcome === 'passed') {
    return (
      <Screen scroll={false} centered>
        <Title>It passed.</Title>
        <Body tone="muted">
          That is what cravings do — five minutes, every time, whether you feed them or not. You now have direct
          evidence of that, which is worth more than anything this app can tell you.
        </Body>
        <Button label="Back to the timeline" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const step = SOS_STEPS[stepIndex];
  const stepSeconds = step?.seconds ?? 60;
  const shown = Math.max(0, remaining);
  // The main actions are pinned; the ring shrinks on short screens so the instruction stays close.
  const ringSize = Math.round(Math.min(200, Math.max(140, windowHeight * 0.26)));

  return (
    <Screen
      footerSpace={140}
      footer={
        <View style={styles.actions}>
          <Button label="It’s passed, I’m fine" onPress={() => setOutcome('passed')} />
          <Button label={content.slipVerb} variant="quiet" onPress={() => setOutcome('slipped')} />
        </View>
      }
    >
      <Eyebrow>Step {stepIndex + 1} of {SOS_STEPS.length}</Eyebrow>
      <Title>{step?.heading}</Title>
      <View style={styles.ringWrap} accessible accessibilityLabel={`${shown} seconds left`}>
        <ProgressRing progress={shown / stepSeconds} size={ringSize} thickness={12}>
          <Text style={styles.seconds}>{shown}</Text>
        </ProgressRing>
      </View>
      <Body tone="muted">{step ? fillUnitTokens(step.instruction, content.unit) : null}</Body>
    </Screen>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
    ringWrap: { alignItems: 'center', paddingVertical: t.space.md },
    actions: { gap: t.space.xs, backgroundColor: t.color.bg },
    seconds: { fontFamily: t.family.display, fontSize: 56, lineHeight: 64, color: t.color.accentText, fontVariant: ['tabular-nums'] },
  }),
);
