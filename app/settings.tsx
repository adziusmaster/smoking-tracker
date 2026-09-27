import { File, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PRODUCT_CONTENT } from '@/content/products';
import { SOURCES } from '@/content/sources';
import { deleteEverything, exportAll, saveSettings } from '@/data/repositories';
import { estimateCigarettesBeforeQuitting } from '@/domain/lifetime';
import { formatCount } from '@/domain/format';
import { parseSetupForm, switchProduct, valuesFromSettings, type SetupFormValues } from '@/domain/setupForm';
import { ProductPicker } from '@/ui/ProductPicker';
import QuitMomentPicker from '@/ui/QuitMomentPicker';
import { theme } from '@/ui/theme';
import { UsageFields } from '@/ui/UsageFields';
import { useQuitState } from '@/ui/useQuitState';

type Status = { text: string; tone: 'ok' | 'error' };

/**
 * The same policy Google Play links from the store listing. Hosted publicly because Play
 * requires a reachable URL, and kept in sync with docs/privacy-policy.md in this repo.
 */
const PRIVACY_POLICY_URL = 'https://adziusmaster.github.io/smokefree-privacy/';

const HELP_LINKS = [
  { label: 'Ikstopnu.nl — Dutch national quit support', url: 'https://www.ikstopnu.nl/' },
  { label: 'NHS Better Health — Quit Smoking', url: 'https://www.nhs.uk/better-health/quit-smoking/' },
];

export default function Settings() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, error, reload } = useQuitState();

  const [values, setValues] = useState<SetupFormValues | null>(null);
  const [quitMoment, setQuitMoment] = useState<Date | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  // `useQuitState` loads asynchronously, so the first render has `state === null`. Seeding the
  // form with `useState` alone froze whatever default was in scope, and Save then wrote that
  // default over the user's real numbers. Re-seeding is keyed on the STORED settings, as a
  // string, so it runs when a load or a save's reload delivers different numbers — never while
  // the user is part-way through typing.
  const storedKey = state ? JSON.stringify(state.settings) : null;
  useEffect(() => {
    if (!state) return;
    setValues(valuesFromSettings(state.settings));
    setQuitMoment(new Date(state.settings.quitDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedKey]);

  const lifetimeEstimate = state ? estimateCigarettesBeforeQuitting(state.settings) : null;
  const productChanged = state !== null && values !== null && values.product !== state.settings.product;
  const slipCount = state?.slips.length ?? 0;

  const save = async () => {
    if (!state || values === null) return;
    const content = PRODUCT_CONTENT[values.product];
    const result = parseSetupForm(values, {
      quitMoment: quitMoment ?? new Date(state.settings.quitDate),
      now: new Date(),
      currency: state.settings.currency,
      timezone: state.settings.timezone,
      labels: { perDay: content.perDayLabel, perPack: content.perPackLabel, packPrice: content.packPriceLabel },
    });
    if (!result.ok) return setStatus({ text: result.error, tone: 'error' });

    try {
      await saveSettings(db, result.settings, new Date());
    } catch {
      return setStatus({ text: 'Couldn’t save that. Your stored numbers are unchanged — please try again.', tone: 'error' });
    }
    // The write succeeded; a failed refresh must not be reported as a failed save.
    try {
      await reload();
      setStatus({ text: 'Saved. Every figure has been recalculated.', tone: 'ok' });
    } catch {
      setStatus({ text: 'Saved, but couldn’t refresh — reopen Settings to see the new figures.', tone: 'ok' });
    }
  };

  const exportData = async () => {
    try {
      const json = await exportAll(db);

      const file = new File(Paths.cache, 'smokefree-export.json');
      // The cache file is overwritten on every export, so delete any previous one first.
      if (file.exists) file.delete();
      file.create();
      file.write(json);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export your data' });
      } else {
        setStatus({ text: `Saved to ${file.uri}`, tone: 'ok' });
      }
    } catch {
      setStatus({ text: 'Couldn’t write the export file. Nothing was exported — please try again.', tone: 'error' });
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete everything?',
      'Your quit date, slips, relapses and check-ins will be permanently removed from this phone. There is no cloud copy, so this cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEverything(db);
            } catch {
              return setStatus({ text: 'Couldn’t delete your data. Nothing was removed — please try again.', tone: 'error' });
            }
            router.replace('/onboarding');
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + theme.space.lg }]}>
      <Pressable onPress={() => router.back()}><Text style={styles.close}>Back</Text></Pressable>

      <Text style={styles.h2}>Your numbers</Text>
      {/* Nothing editable is rendered until the stored numbers have loaded, so a default
          is never shown to the user as if it were their own figure. */}
      {state && values ? (
        <>
          <Text style={styles.label}>What you quit</Text>
          <ProductPicker
            value={values.product}
            onChange={(product) => setValues(switchProduct(values, product, PRODUCT_CONTENT[product].defaultPerPack))}
          />
          <UsageFields values={values} onChange={setValues} section="usage" />
          <UsageFields values={values} onChange={setValues} section="history" />
          <Text style={styles.label}>When you quit</Text>
          {quitMoment ? (
            <QuitMomentPicker value={quitMoment} onChange={setQuitMoment} maximumDate={new Date()} />
          ) : null}
          {productChanged && slipCount > 0 ? (
            <Text style={styles.warning}>
              You have {slipCount} logged {slipCount === 1 ? 'slip' : 'slips'}. {slipCount === 1 ? 'It' : 'They'} will be
              counted as {PRODUCT_CONTENT[values.product].unit.many} from now on.
            </Text>
          ) : null}
          <Pressable style={styles.cta} onPress={save}><Text style={styles.ctaText}>Save</Text></Pressable>
          {/* Deliberately NOT called a "lifetime total": that phrase is used on the SOS and
              Log screens for the running figure, which adds every slip and relapse cigarette
              logged since the quit date. This one stops at the quit date. */}
          {lifetimeEstimate !== null ? (
            <Text style={styles.hint}>
              Estimated cigarettes you smoked before quitting: {formatCount(lifetimeEstimate)}. Worked out from
              your daily rate and how long you smoked — an estimate, not a count.
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={styles.hint}>
          {error ? 'Couldn’t load your numbers, so they cannot be edited right now.' : 'Loading your numbers…'}
        </Text>
      )}

      <Text style={styles.h2}>Your data</Text>
      <Text style={styles.hint}>
        Everything lives in a database file on this phone. Nothing is uploaded, there is no account, and no
        analytics are collected. That also means an export is your only backup.
      </Text>
      <Pressable style={[styles.cta, styles.ctaMuted]} onPress={exportData}><Text style={styles.ctaText}>Export as JSON</Text></Pressable>
      <Pressable style={[styles.cta, styles.ctaDanger]} onPress={confirmDelete}><Text style={styles.ctaText}>Delete everything</Text></Pressable>
      <Pressable onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}>
        <Text style={styles.source}>Read the full privacy policy</Text>
      </Pressable>

      <Text style={styles.h2}>Where the claims come from</Text>
      <Text style={styles.hint}>
        Every physiological statement in this app is traceable. Two claims that appear in most quit-smoking
        timelines online — nerve endings regrowing at 48 hours and bronchial tubes relaxing at 72 — are
        deliberately absent, because they could not be traced to a primary source.
      </Text>
      {Object.values(SOURCES).map((source) => (
        <Pressable key={source.id} onPress={() => void Linking.openURL(source.url)}>
          <Text style={styles.source}>{source.label}</Text>
        </Pressable>
      ))}

      <Text style={styles.h2}>Real help</Text>
      {HELP_LINKS.map((link) => (
        <Pressable key={link.url} onPress={() => void Linking.openURL(link.url)}>
          <Text style={styles.source}>{link.label}</Text>
        </Pressable>
      ))}

      <Text style={styles.disclaimer}>
        This app is not a medical device and does not provide medical advice. It reports published
        population-level findings, which are not predictions about you. Your GP or a national quitline will
        do more for your odds than any app, including this one.
      </Text>

      {status ? (
        <Text style={[styles.status, status.tone === 'error' && styles.statusError]}>{status.text}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: theme.space.lg, paddingBottom: theme.space.xxl, gap: theme.space.sm, backgroundColor: theme.color.bg },
  close: { fontSize: theme.font.small, fontWeight: '600', color: theme.color.heroBg },
  h2: { fontSize: theme.font.body, fontWeight: '700', color: theme.color.text, marginTop: theme.space.lg },
  label: { fontSize: theme.font.small, fontWeight: '600', color: theme.color.text, marginTop: theme.space.sm },
  hint: { fontSize: theme.font.tiny, color: theme.color.textFaint, lineHeight: 16 },
  warning: { fontSize: theme.font.small, color: theme.color.tipLabel, lineHeight: 19, marginTop: theme.space.sm },
  cta: { backgroundColor: theme.color.heroBg, borderRadius: theme.radius.md, paddingVertical: theme.space.md, alignItems: 'center', marginTop: theme.space.md },
  ctaMuted: { backgroundColor: theme.color.textFaint },
  ctaDanger: { backgroundColor: theme.color.danger },
  ctaText: { color: theme.color.heroText, fontSize: theme.font.body, fontWeight: '700' },
  source: { fontSize: theme.font.tiny, color: theme.color.heroBg, lineHeight: 18, marginTop: theme.space.xs },
  disclaimer: { fontSize: theme.font.tiny, color: theme.color.textFaint, lineHeight: 16, marginTop: theme.space.lg },
  status: { fontSize: theme.font.small, color: theme.color.done, marginTop: theme.space.md },
  statusError: { color: theme.color.danger },
});
