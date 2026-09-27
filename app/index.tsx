import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { recordMilestoneReached } from '@/data/repositories';
import { planNotifications } from '@/domain/notifications';
import { buildTimeline } from '@/domain/timeline';
import type { MilestoneState } from '@/domain/types';
import { MILESTONES } from '@/content/milestones';
import { DANGER_WINDOW_TIPS, PHASES } from '@/content/phases';
import { PRODUCT_CONTENT } from '@/content/products';
import { SOURCES } from '@/content/sources';
import { syncNotifications } from '@/notifications/schedule';
import { ChapterBlock } from '@/ui/ChapterBlock';
import { Hero } from '@/ui/Hero';
import { theme } from '@/ui/theme';
import { useQuitState } from '@/ui/useQuitState';

/** Backs the 19-day danger-window claim. `SOURCES` is a Record, so under
 * noUncheckedIndexedAccess this is `Source | undefined` and the banner renders the
 * attribution only when it resolves — no cast, no non-null assertion. */
const LAPSE_RELAPSE_SOURCE = SOURCES['lapse-relapse'];

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
  const insets = useSafeAreaInsets();
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
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn’t load your data</Text>
        <Text style={styles.errorBody}>{error.message}</Text>
        <Pressable style={styles.retry} onPress={() => void reload()} accessibilityRole="button">
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (loading || !timeline || !state) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.color.heroBg} />
      </View>
    );
  }

  const { dangerWindow, currentPhase } = timeline;
  const content = PRODUCT_CONTENT[state.settings.product];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + theme.space.md }]}>
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
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Danger window · {dangerWindow.daysRemaining} days left</Text>
            <Text style={styles.bannerBody}>
              On average, a slip that becomes a relapse does so within about 19 days. You’re inside that window, so the
              guidance below has changed to match.
            </Text>
            {/* The 19-day figure is a sourced claim like any milestone, so it is attributed
                where it is shown rather than only in the Settings citation list. */}
            {LAPSE_RELAPSE_SOURCE ? (
              <Text style={styles.bannerSource}>{LAPSE_RELAPSE_SOURCE.label} · full citations in Settings</Text>
            ) : null}
          </View>
        ) : null}

        {timeline.chapters.map((chapter) => (
          <ChapterBlock
            key={chapter.phase.id}
            chapter={chapter}
            tips={chapter.status === 'current' ? timeline.currentTips : null}
            tipsAreDangerWindow={chapter.status === 'current' && timeline.currentTipsAreDangerWindow}
          />
        ))}

        <Text style={styles.footer}>
          Every claim above is sourced. See Settings for the citations, and remember this app is not
          medical advice.
        </Text>
      </ScrollView>

      <Pressable style={[styles.sos, { bottom: insets.bottom + theme.space.lg }]} onPress={() => router.push('/sos')}>
        <Text style={styles.sosText}>{content.cravingButton}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.bg, padding: theme.space.lg, gap: theme.space.md },
  errorTitle: { fontSize: theme.font.title, fontWeight: '700', color: theme.color.text, textAlign: 'center' },
  errorBody: { fontSize: theme.font.small, color: theme.color.textMuted, textAlign: 'center', lineHeight: 19 },
  retry: {
    backgroundColor: theme.color.heroBg,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.sm,
    paddingHorizontal: theme.space.lg,
  },
  retryText: { color: theme.color.heroText, fontSize: theme.font.small, fontWeight: '700' },
  page: { padding: theme.space.lg, paddingBottom: 120 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.space.lg, marginBottom: theme.space.md },
  topLink: { fontSize: theme.font.small, fontWeight: '600', color: theme.color.heroBg },
  banner: {
    marginTop: theme.space.md,
    backgroundColor: theme.color.dangerBg,
    borderWidth: 1,
    borderColor: theme.color.dangerBorder,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
  },
  bannerTitle: { fontSize: theme.font.small, fontWeight: '700', color: theme.color.danger },
  bannerBody: { fontSize: theme.font.tiny, color: theme.color.textMuted, lineHeight: 17, marginTop: 4 },
  bannerSource: { fontSize: 9, color: theme.color.textFaint, lineHeight: 13, marginTop: 6 },
  footer: { fontSize: theme.font.tiny, color: theme.color.textFaint, lineHeight: 16, marginTop: theme.space.xl },
  sos: {
    position: 'absolute',
    left: theme.space.lg,
    right: theme.space.lg,
    backgroundColor: theme.color.danger,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.space.md,
    alignItems: 'center',
  },
  sosText: { color: '#fff', fontSize: theme.font.body, fontWeight: '700' },
});
