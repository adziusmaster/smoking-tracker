import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { addCravingEvent, countCravingsBeaten, logSlipAfterCraving, setCravingStrengthEnd } from '@/data/repositories';
import { PRODUCT_CONTENT } from '@/content/products';
import { ACTIVITIES, SLIP_BUTTON, SLIP_REASSURANCE, SOS_STEPS } from '@/content/sos';
import { fillUnitTokens } from '@/domain/format';
import { parseNonNegativeInt } from '@/domain/parse';
import { variantForProduct } from '@/domain/products';
import type { ActivityId, ProductId, SlipTrigger } from '@/domain/types';
import { Body, Button, Card, Chip, Eyebrow, Field, Label, ProgressRing, Screen, SpeakerIcon, Title } from '@/ui/kit';
import { ActivityPicker } from '@/ui/sos/ActivityPicker';
import { BlockDrop } from '@/ui/sos/BlockDrop';
import { BreatheGuide } from '@/ui/sos/BreatheGuide';
import { BubblePop } from '@/ui/sos/BubblePop';
import { CravingBar } from '@/ui/sos/CravingBar';
import { Grounding } from '@/ui/sos/Grounding';
import { MemoryPairs } from '@/ui/sos/MemoryPairs';
import { SlipProductPicker } from '@/ui/SlipProductPicker';
import { WaterStep } from '@/ui/sos/WaterStep';
import { makeStyles, useTheme } from '@/ui/theme';
import { useFeedback } from '@/ui/useFeedback';
import { usePreferences } from '@/ui/usePreferences';
import { useQuitState } from '@/ui/useQuitState';
import { useSubmitGuard } from '@/ui/useSubmitGuard';

const TRIGGERS: SlipTrigger[] = ['alcohol', 'stress', 'social', 'boredom', 'routine', 'other'];
const STRENGTHS = [1, 2, 3, 4, 5];
const DELAY = SOS_STEPS.find((step) => step.id === 'delay');
const WATER = SOS_STEPS.find((step) => step.id === 'drink');
const DELAY_SECONDS = DELAY?.seconds ?? 60;

type Mode = 'delay' | 'pick' | ActivityId;

export default function Sos() {
  const db = useSQLiteContext();
  const router = useRouter();
  const styles = useStyles();
  const t = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const { state } = useQuitState();

  // When the craving started: the five-minute bar and the recorded event both count from here.
  const startedAt = useRef(new Date().toISOString()).current;
  const [mode, setMode] = useState<Mode>('delay');
  const [lastActivity, setLastActivity] = useState<ActivityId | null>(null);
  const [delayLeft, setDelayLeft] = useState(DELAY_SECONDS);
  const [outcome, setOutcome] = useState<'running' | 'rating' | 'passed' | 'slipped'>('running');
  const [strengthStart, setStrengthStart] = useState<number | null>(null);
  const { preferences, setSound } = usePreferences();
  const feedback = useFeedback(preferences);
  const [beatenNow, setBeatenNow] = useState<number | null>(null);
  const passedId = useRef<number | null>(null);
  const [count, setCount] = useState('1');
  const [trigger, setTrigger] = useState<SlipTrigger | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const { submitting, run } = useSubmitGuard();
  // The user's own product (cigarettes until the stored one has loaded — the screen must work
  // instantly), and what the slip was, which can be anything: an IQOS quitter can slip on a cigarette.
  const own: ProductId = state?.settings.product ?? 'cigarettes';
  const content = PRODUCT_CONTENT[own];
  const [slipChoice, setSlipChoice] = useState<ProductId | null>(null);
  const slipProduct = slipChoice ?? own;
  const slipContent = PRODUCT_CONTENT[slipProduct];
  const slipUnits = slipContent.countsSlips ? Math.max(1, parseNonNegativeInt(count) ?? 1) : 1;
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

  // "It passed" records the craving straight away, so leaving the optional rating step (back
  // button, app killed) never loses it; a rating is added to that row afterwards.
  const markPassed = () =>
    run(async () => {
      setFailure(null);
      try {
        passedId.current = await addCravingEvent(db, { startedAt, endedAt: new Date().toISOString(), outcome: 'passed', activity: lastActivity, strengthStart, strengthEnd: null }, new Date());
        setBeatenNow(await countCravingsBeaten(db));
      } catch {
        // The craving still passed; failing to record it must not take that away.
        passedId.current = null;
        setBeatenNow(null);
      }
      setOutcome('rating');
    });

  const rateEnd = (strengthEnd: number | null) =>
    run(async () => {
      if (strengthEnd !== null && passedId.current !== null) {
        try {
          await setCravingStrengthEnd(db, passedId.current, strengthEnd);
        } catch {
          // The rating is optional; the craving itself is already saved.
        }
      }
      setOutcome('passed');
    });

  const logSlip = () =>
    run(async () => {
      setFailure(null);
      try {
        const now = new Date();
        await logSlipAfterCraving(
          db,
          { occurredAt: now.toISOString(), unitCount: slipUnits, trigger, note: null, product: slipProduct },
          { startedAt, endedAt: now.toISOString(), outcome: 'slipped', activity: lastActivity, strengthStart, strengthEnd: null },
          now,
        );
        router.replace('/');
      } catch {
        setFailure('Couldn’t save that. Nothing was recorded — try again, and it still counts as logged honestly.');
      }
    });

  if (outcome === 'slipped') {
    const reassurance = variantForProduct(SLIP_REASSURANCE, slipProduct);

    return (
      <Screen>
        <Title>Alright. Let’s log it accurately.</Title>
        <Body tone="muted">{fillUnitTokens(reassurance, slipContent.unit)}</Body>
        <SlipProductPicker own={own} value={slipProduct} onChange={setSlipChoice} />
        {slipContent.countsSlips ? (
          <Field
            label={`How many ${slipContent.unit.many}?`}
            value={count}
            onChangeText={setCount}
            keyboardType="number-pad"
            accessibilityLabel={`Number of ${slipContent.unit.many}`}
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

  if (outcome === 'rating') {
    return (
      <Screen scroll={false} centered>
        <Title>How strong is it now?</Title>
        <Body tone="muted">Optional. Over time this shows whether your cravings are getting weaker.</Body>
        <StrengthChips value={null} onChange={(value) => void rateEnd(value)} disabled={submitting} />
        <Button label="Skip" variant="quiet" onPress={() => void rateEnd(null)} disabled={submitting} />
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
          <Button label="It’s passed, I’m fine" onPress={() => void markPassed()} disabled={submitting} />
          <Button label={SLIP_BUTTON} variant="quiet" onPress={() => setOutcome('slipped')} />
        </View>
      }
    >
      <CravingBar startedAt={startedAt} />

      {preferences.reason ? (
        <Card>
          <Eyebrow tone="achieve">Your reason</Eyebrow>
          {/* In full before a game starts; two lines during one, so the controls stay on screen. */}
          <Body {...(mode === 'delay' || mode === 'pick' ? {} : { numberOfLines: 2 })}>{preferences.reason}</Body>
        </Card>
      ) : null}

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
          <Label>How strong is it? (optional)</Label>
          {/* Optional: tapping the chosen number again clears it. */}
          <StrengthChips value={strengthStart} onChange={(n) => setStrengthStart(strengthStart === n ? null : n)} />
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
            {/* Only the games that make a sound get the mute button. */}
            {mode === 'blocks' || mode === 'bubbles' ? (
              <Pressable
                onPress={() => void setSound(!preferences.sound).catch(() => undefined)}
                style={({ pressed }) => [styles.mute, pressed && styles.mutePressed]}
                accessibilityRole="switch"
                accessibilityState={{ checked: preferences.sound }}
                accessibilityLabel="Sound"
                hitSlop={8}
              >
                <SpeakerIcon on={preferences.sound} color={preferences.sound ? t.color.ink : t.color.muted} />
              </Pressable>
            ) : null}
            <Button label="Try something else" variant="quiet" onPress={() => setMode('pick')} />
          </View>
          {mode === 'breathe' ? <BreatheGuide onPhaseChange={feedback.tick} /> : null}
          {mode === 'blocks' ? <BlockDrop onClear={feedback.pop} /> : null}
          {mode === 'memory' ? <MemoryPairs onMatch={feedback.tick} /> : null}
          {mode === 'bubbles' ? <BubblePop onPop={feedback.pop} /> : null}
          {mode === 'grounding' ? <Grounding /> : null}
          {mode === 'water' ? <WaterStep instruction={WATER ? fillUnitTokens(WATER.instruction, content.unit) : ''} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

/** 1 (barely there) to 5 (overwhelming). */
function StrengthChips(props: { value: number | null; onChange: (value: number) => void; disabled?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.chips} accessibilityLabel="Craving strength from 1, barely there, to 5, overwhelming">
      {STRENGTHS.map((n) => (
        <Chip key={n} label={String(n)} selected={props.value === n} onPress={() => { if (!props.disabled) props.onChange(n); }} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
    mute: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: t.color.line, backgroundColor: t.color.surface, alignItems: 'center', justifyContent: 'center' },
    mutePressed: { backgroundColor: t.color.doneWash },
    ringWrap: { alignItems: 'center', paddingVertical: t.space.md },
    seconds: { fontFamily: t.family.display, fontSize: 56, lineHeight: 64, color: t.color.accentText, fontVariant: ['tabular-nums'] },
    actions: { gap: t.space.xs },
    activityHead: { flexDirection: 'row', alignItems: 'flex-end', gap: t.space.sm },
    beaten: { fontFamily: t.family.display, fontSize: t.font.title, lineHeight: 28, color: t.color.accentText },
  }),
);
