import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { addCravingEvent, addSlip } from '@/data/repositories';
import { PRODUCT_CONTENT } from '@/content/products';
import { ACTIVITIES, SLIP_REASSURANCE, SOS_STEPS } from '@/content/sos';
import { cravingsBeaten } from '@/domain/cravings';
import { fillUnitTokens, formatCount } from '@/domain/format';
import { parseNonNegativeInt } from '@/domain/parse';
import { pickVariant } from '@/domain/products';
import { lifetimeAfterSlip } from '@/domain/savings';
import type { ActivityId, SlipTrigger } from '@/domain/types';
import { Body, Button, Chip, Eyebrow, Field, Label, ProgressRing, Screen, Title } from '@/ui/kit';
import { ActivityPicker } from '@/ui/sos/ActivityPicker';
import { BlockDrop } from '@/ui/sos/BlockDrop';
import { BreatheGuide } from '@/ui/sos/BreatheGuide';
import { BubblePop } from '@/ui/sos/BubblePop';
import { CravingBar } from '@/ui/sos/CravingBar';
import { Grounding } from '@/ui/sos/Grounding';
import { MemoryPairs } from '@/ui/sos/MemoryPairs';
import { WaterStep } from '@/ui/sos/WaterStep';
import { makeStyles } from '@/ui/theme';
import { useQuitState } from '@/ui/useQuitState';
import { useSubmitGuard } from '@/ui/useSubmitGuard';

const TRIGGERS: SlipTrigger[] = ['alcohol', 'stress', 'social', 'boredom', 'routine', 'other'];
const DELAY = SOS_STEPS.find((step) => step.id === 'delay');
const WATER = SOS_STEPS.find((step) => step.id === 'drink');
const DELAY_SECONDS = DELAY?.seconds ?? 60;

type Mode = 'delay' | 'pick' | ActivityId;

export default function Sos() {
  const db = useSQLiteContext();
  const router = useRouter();
  const styles = useStyles();
  const { height: windowHeight } = useWindowDimensions();
  const { state } = useQuitState();

  // When the craving started: the five-minute bar and the recorded event both count from here.
  const startedAt = useRef(new Date().toISOString()).current;
  const [mode, setMode] = useState<Mode>('delay');
  const [lastActivity, setLastActivity] = useState<ActivityId | null>(null);
  const [delayLeft, setDelayLeft] = useState(DELAY_SECONDS);
  const [outcome, setOutcome] = useState<'running' | 'passed' | 'slipped'>('running');
  const [beatenNow, setBeatenNow] = useState<number | null>(null);
  const [count, setCount] = useState('1');
  const [trigger, setTrigger] = useState<SlipTrigger | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const { submitting, run } = useSubmitGuard();
  // Cigarette wording until the stored product has loaded — the screen must work instantly.
  const content = PRODUCT_CONTENT[state?.settings.product ?? 'cigarettes'];
  const slipUnits = content.countsSlips ? Math.max(1, parseNonNegativeInt(count) ?? 1) : 1;
  const ringSize = Math.round(Math.min(200, Math.max(140, windowHeight * 0.26)));

  useEffect(() => {
    if (mode !== 'delay' || outcome !== 'running') return;
    const id = setInterval(() => setDelayLeft((value) => value - 1), 1000);
    return () => clearInterval(id);
  }, [mode, outcome]);

  useEffect(() => {
    if (mode === 'delay' && delayLeft <= 0) setMode('pick');
  }, [mode, delayLeft]);

  const choose = (activity: ActivityId) => {
    setLastActivity(activity);
    setMode(activity);
  };

  const markPassed = () =>
    run(async () => {
      setFailure(null);
      try {
        await addCravingEvent(db, { startedAt, endedAt: new Date().toISOString(), outcome: 'passed', activity: lastActivity }, new Date());
        setBeatenNow((state ? cravingsBeaten(state.cravingEvents) : 0) + 1);
      } catch {
        // The craving still passed; failing to record it must not take that away.
        setBeatenNow(null);
      }
      setOutcome('passed');
    });

  const logSlip = () =>
    run(async () => {
      setFailure(null);
      try {
        const now = new Date();
        await addSlip(db, { occurredAt: now.toISOString(), unitCount: slipUnits, trigger, note: null }, now);
        await addCravingEvent(db, { startedAt, endedAt: now.toISOString(), outcome: 'slipped', activity: lastActivity }, now);
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
        {beatenNow !== null ? (
          <Text style={styles.beaten}>
            That’s {beatenNow} {beatenNow === 1 ? 'craving' : 'cravings'} beaten.
          </Text>
        ) : null}
        <Body tone="muted">
          That is what cravings do — a few minutes, every time, whether you feed them or not. You now have direct
          evidence of that, which is worth more than anything this app can tell you.
        </Body>
        <Button label="Back to the timeline" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const activity = ACTIVITIES.find((a) => a.id === mode);

  return (
    <Screen
      footerSpace={140}
      footer={
        <View style={styles.actions}>
          <Button label="It’s passed, I’m fine" onPress={markPassed} disabled={submitting} />
          <Button label={content.slipVerb} variant="quiet" onPress={() => setOutcome('slipped')} />
        </View>
      }
    >
      <CravingBar startedAt={startedAt} />

      {mode === 'delay' ? (
        <>
          <Eyebrow>First, wait one minute</Eyebrow>
          <Title>{DELAY?.heading ?? 'Delay'}</Title>
          <View style={styles.ringWrap} accessible accessibilityLabel={`${Math.max(0, delayLeft)} seconds left`}>
            <ProgressRing progress={Math.max(0, delayLeft) / DELAY_SECONDS} size={ringSize} thickness={12}>
              <Text style={styles.seconds}>{Math.max(0, delayLeft)}</Text>
            </ProgressRing>
          </View>
          <Body tone="muted">{DELAY ? fillUnitTokens(DELAY.instruction, content.unit) : null}</Body>
          <Button label="Skip the wait" variant="secondary" onPress={() => setMode('pick')} />
        </>
      ) : null}

      {mode === 'pick' ? (
        <>
          <Eyebrow>Ride it out</Eyebrow>
          <Title>Pick something to do</Title>
          <ActivityPicker onPick={choose} />
        </>
      ) : null}

      {activity ? (
        <>
          <View style={styles.activityHead}>
            <View style={{ flex: 1 }}>
              <Eyebrow>Ride it out</Eyebrow>
              <Title>{activity.title}</Title>
            </View>
            <Button label="Try something else" variant="quiet" onPress={() => setMode('pick')} />
          </View>
          {mode === 'breathe' ? <BreatheGuide /> : null}
          {mode === 'blocks' ? <BlockDrop /> : null}
          {mode === 'memory' ? <MemoryPairs /> : null}
          {mode === 'bubbles' ? <BubblePop /> : null}
          {mode === 'grounding' ? <Grounding /> : null}
          {mode === 'water' ? <WaterStep instruction={WATER ? fillUnitTokens(WATER.instruction, content.unit) : ''} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
    ringWrap: { alignItems: 'center', paddingVertical: t.space.md },
    seconds: { fontFamily: t.family.display, fontSize: 56, lineHeight: 64, color: t.color.accentText, fontVariant: ['tabular-nums'] },
    actions: { gap: t.space.xs },
    activityHead: { flexDirection: 'row', alignItems: 'flex-end', gap: t.space.sm },
    beaten: { fontFamily: t.family.display, fontSize: t.font.title, lineHeight: 28, color: t.color.accentText },
  }),
);
