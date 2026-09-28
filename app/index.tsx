import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { recordMilestoneReached } from '@/data/repositories';
import { planNotifications } from '@/domain/notifications';
import { buildTimeline } from '@/domain/timeline';
import type { MilestoneState } from '@/domain/types';
import { MILESTONES } from '@/content/milestones';
import { DANGER_WINDOW_TIPS, PHASES } from '@/content/phases';
import { PRODUCT_CONTENT } from '@/content/products';
import { syncNotifications } from '@/notifications/schedule';
import { ChapterBlock } from '@/ui/ChapterBlock';
import { Hero } from '@/ui/Hero';
import { SourceLinks } from '@/ui/SourceLinks';
import { Body, Button, Caption, Card, Heading, Screen, Title } from '@/ui/kit';
import { makeStyles, useTheme } from '@/ui/theme';
import { useQuitState } from '@/ui/useQuitState';

/** Narrows to milestones that are reached AND have a timestamp, so downstream code
 * never needs `reachedAt as string` — the type system proves it instead of a cast. */
function isReachedWithTimestamp(
  milestoneState: MilestoneState,
): milestoneState is MilestoneState & { reachedAt: string } {
  return milestoneState.status === 'reached' && milestoneState.reachedAt !== null;
}

export default function Timeline() {
  const db = useSQLiteContext();
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles();
  const { state, loading, error, reload } = useQuitState();

  // Re-tick every minute so the counter is live without a heavy interval.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Reload after returning from the log or settings modals.
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  useEffect(() => {
    // `state === null` means onboarding has not run, but only when `error === null` too.
    // A DB load failure looks identical to "onboarding never ran" if you only check `state`,
    // and redirecting there would let onboarding UPSERT over an existing settings row,
    // silently destroying real quit history — so the redirect is gated on `error === null`.
    if (!loading && error === null && state === null) router.replace('/onboarding');
  }, [loading, error, state, router]);

  const timeline = useMemo(
    () =>
      state
        ? buildTimeline({
            state,
            milestones: MILESTONES,
            phases: PHASES,
            dangerTips: DANGER_WINDOW_TIPS,
            unit: PRODUCT_CONTENT[state.settings.product].unit,
            now,
          })
        : null,
    [state, now],
  );

  // Record the date each milestone was reached, so it survives a settings edit that moves an
  // anchor. This is NOT what suppresses notifications — planNotifications never plans an
  // already-reached milestone and syncNotifications rebuilds the whole queue.
  const recorded = useRef(new Set<string>());
  useEffect(() => {
    if (!timeline) return;
    const reached = timeline.chapters
      .flatMap((chapter) => chapter.milestones)
      .filter(isReachedWithTimestamp);

    void (async () => {
      for (const milestoneState of reached) {
        if (recorded.current.has(milestoneState.milestone.id)) continue;
        recorded.current.add(milestoneState.milestone.id);
        await recordMilestoneReached(db, milestoneState.milestone.id, milestoneState.reachedAt);
      }
    })();
  }, [timeline, db]);

  // Re-plan the OS notification queue when the danger window or the next milestone changes —
  // NOT on `timeline` itself, which is rebuilt every minute by the clock and would otherwise
  // reschedule the entire queue 1440 times a day.
  //
  // All four deps are derived from stored facts and anchors, never from the ticking clock, so
  // they only change when a slip, relapse or settings edit changes what should fire:
  //   dangerWindow.active           — whether check-ins should be queued at all
  //   dangerWindow.endsAt           — a SECOND slip inside an open window moves the end date
  //                                   without flipping `active`, so the check-ins would
  //                                   otherwise keep running to the first slip's schedule
  //   nextMilestone.milestone.id    — which milestone is next
  //   nextMilestone.projectedAt     — WHEN it lands. A second slip re-anchors a `restarts`
  //                                   milestone without changing its id, so without this the
  //                                   "milestone reached" alarm still fired at the first
  //                                   slip's projected time — up to a day early, i.e. the
  //                                   notification made a claim that was not yet true.
  useEffect(() => {
    if (!timeline) return;
    const planned = planNotifications({
      milestones: timeline.chapters.flatMap((chapter) => chapter.milestones),
      dangerWindow: timeline.dangerWindow,
      now: new Date(),
    });
    void syncNotifications(planned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    timeline?.dangerWindow.active,
    timeline?.dangerWindow.endsAt,
    timeline?.nextMilestone?.milestone.id,
    timeline?.nextMilestone?.projectedAt,
  ]);

  if (!loading && error) {
    return (
      <Screen scroll={false} centered>
        <Title>Couldn’t load your data</Title>
        <Body tone="muted">{error.message}</Body>
        <Button label="Retry" onPress={() => void reload()} />
      </Screen>
    );
  }

  if (loading || !timeline || !state) {
    return (
      <Screen scroll={false} centered>
        <ActivityIndicator color={t.color.accent} />
      </Screen>
    );
  }

  const { dangerWindow, currentPhase } = timeline;
  const content = PRODUCT_CONTENT[state.settings.product];

  return (
    <Screen
      footer={
        <Pressable
          style={({ pressed }) => [styles.sos, pressed && styles.sosPressed]}
          onPress={() => router.push('/sos')}
          accessibilityRole="button"
        >
          <Text style={styles.sosText}>{content.cravingButton}</Text>
        </Pressable>
      }
    >
      <View style={styles.topBar}>
        <Link href="/log" style={styles.topLink}>Log</Link>
        <Link href="/settings" style={styles.topLink}>Settings</Link>
      </View>

      <Hero
        elapsed={timeline.elapsed}
        longestStreak={timeline.longestStreak}
        savings={timeline.savings}
        currency={state.settings.currency}
        phaseName={currentPhase.name}
        currentlySmoking={timeline.anchors.isCurrentlySmoking}
        freeWord={content.freeWord}
        avoidedLabel={content.avoidedLabel}
        relapseTitle={content.relapseTitle}
      />

      {dangerWindow.active ? (
        <Card tone="danger">
          <Heading tone="danger">Danger window · {dangerWindow.daysRemaining} days left</Heading>
          <Body tone="muted">
            On average, a slip that becomes a relapse does so within about 19 days. You’re inside that window, so
            the guidance below has changed to match.
          </Body>
          {/* The 19-day figure is a sourced claim like any milestone, so it is attributed
              where it is shown rather than only in the Settings citation list. */}
          <SourceLinks ids={['lapse-relapse']} />
        </Card>
      ) : null}

      {timeline.chapters.map((chapter) => (
        <ChapterBlock
          key={chapter.phase.id}
          chapter={chapter}
          tips={chapter.status === 'current' ? timeline.currentTips : null}
          tipsAreDangerWindow={chapter.status === 'current' && timeline.currentTipsAreDangerWindow}
        />
      ))}

      <Caption tone="faint">
        Every claim above is sourced. See Settings for the citations, and remember this app is not medical advice.
      </Caption>
    </Screen>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    topBar: { flexDirection: 'row', justifyContent: 'flex-end', gap: t.space.lg },
    topLink: { fontFamily: t.family.semi, fontSize: t.font.small, color: t.color.accentText, paddingVertical: t.space.xs },
    sos: { minHeight: 52, borderRadius: t.radius.pill, backgroundColor: t.color.sos, alignItems: 'center', justifyContent: 'center' },
    sosPressed: { opacity: 0.9 },
    sosText: { fontFamily: t.family.bold, fontSize: t.font.body, color: t.color.onSos },
  }),
);
