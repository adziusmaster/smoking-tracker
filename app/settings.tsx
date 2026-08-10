import { File, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SOURCES } from '@/content/sources';
import { deleteEverything, exportAll, saveSettings } from '@/data/repositories';
import { estimateCigarettesBeforeQuitting } from '@/domain/lifetime';
import { formatCount } from '@/domain/format';
import { parseMinorUnits, parsePositiveInt } from '@/domain/parse';
import QuitMomentPicker from '@/ui/QuitMomentPicker';
import { theme } from '@/ui/theme';
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

  const [perDay, setPerDay] = useState('');
  const [price, setPrice] = useState('');
  const [quitMoment, setQuitMoment] = useState<Date | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  const storedPerDay = state?.settings.cigarettesPerDay ?? null;
  const storedPriceMinor = state?.settings.packPriceMinor ?? null;

  // `useQuitState` loads asynchronously, so the first render has `state === null`. Seeding
  // these inputs with `useState` alone froze whatever default was in scope on screen, and
  // Save then wrote that default over the user's real numbers. Re-seeding from the STORED
  // values fixes it. The effect is keyed on those two values rather than on `state` or on
  // every render, so it runs exactly when the load (or a save's reload) delivers different
  // numbers — never while the user is part-way through typing.
  useEffect(() => {
    if (storedPerDay === null || storedPriceMinor === null) return;
    setPerDay(String(storedPerDay));
    setPrice((storedPriceMinor / 100).toFixed(2));
  }, [storedPerDay, storedPriceMinor]);

  useEffect(() => {
    if (!state) return;
    setQuitMoment(new Date(state.settings.quitDate));
  }, [state]);

  const save = async () => {
    if (!state) return;
    const cigarettesPerDay = parsePositiveInt(perDay);
    const packPriceMinor = parseMinorUnits(price);

    if (cigarettesPerDay === null) return setStatus({ text: 'Cigarettes per day must be a whole number above zero.', tone: 'error' });
    if (packPriceMinor === null) return setStatus({ text: 'Pack price must look like 11 or 11.50.', tone: 'error' });
    if (quitMoment !== null && quitMoment.getTime() > Date.now()) {
      return setStatus({ text: 'Your quit date cannot be in the future.', tone: 'error' });
    }

    try {
      await saveSettings(
        db,
        {
          ...state.settings,
          cigarettesPerDay,
          packPriceMinor,
          ...(quitMoment ? { quitDate: quitMoment.toISOString() } : {}),
        },
        new Date(),
      );
      await reload();
      setStatus({ text: 'Saved. Every figure has been recalculated.', tone: 'ok' });
    } catch {
      setStatus({ text: 'Couldn’t save that. Your stored numbers are unchanged — please try again.', tone: 'error' });
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
      {state ? (
        <>
          <Text style={styles.label}>When you quit</Text>
          {quitMoment ? (
            <QuitMomentPicker value={quitMoment} onChange={setQuitMoment} maximumDate={new Date()} />
          ) : null}
          <Text style={styles.label}>Cigarettes per day</Text>
          <TextInput style={styles.input} value={perDay} onChangeText={setPerDay} keyboardType="number-pad" accessibilityLabel="Cigarettes per day" />
          <Text style={styles.label}>Price per pack</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" accessibilityLabel="Price per pack" />
          <Pressable style={styles.cta} onPress={save}><Text style={styles.ctaText}>Save</Text></Pressable>
          <Text style={styles.hint}>
            Estimated lifetime total: {formatCount(estimateCigarettesBeforeQuitting(state.settings))} cigarettes
            before you quit, worked out from your daily rate. An estimate, not a count.
          </Text>
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
  input: {
    borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface, paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm, fontSize: theme.font.body, color: theme.color.text,
  },
  cta: { backgroundColor: theme.color.heroBg, borderRadius: theme.radius.md, paddingVertical: theme.space.md, alignItems: 'center', marginTop: theme.space.md },
  ctaMuted: { backgroundColor: theme.color.textFaint },
  ctaDanger: { backgroundColor: theme.color.danger },
  ctaText: { color: theme.color.heroText, fontSize: theme.font.body, fontWeight: '700' },
  source: { fontSize: theme.font.tiny, color: theme.color.heroBg, lineHeight: 18, marginTop: theme.space.xs },
  disclaimer: { fontSize: theme.font.tiny, color: theme.color.textFaint, lineHeight: 16, marginTop: theme.space.lg },
  status: { fontSize: theme.font.small, color: theme.color.done, marginTop: theme.space.md },
  statusError: { color: theme.color.danger },
});
