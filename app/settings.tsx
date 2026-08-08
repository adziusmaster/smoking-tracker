import { File, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SOURCES } from '@/content/sources';
import { deleteEverything, exportAll, saveSettings } from '@/data/repositories';
import { theme } from '@/ui/theme';
import { useQuitState } from '@/ui/useQuitState';

const HELP_LINKS = [
  { label: 'Ikstopnu.nl — Dutch national quit support', url: 'https://www.ikstopnu.nl/' },
  { label: 'NHS Better Health — Quit Smoking', url: 'https://www.nhs.uk/better-health/quit-smoking/' },
];

export default function Settings() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, reload } = useQuitState();

  const [perDay, setPerDay] = useState(String(state?.settings.cigarettesPerDay ?? 15));
  const [price, setPrice] = useState(((state?.settings.packPriceMinor ?? 1100) / 100).toFixed(2));
  const [status, setStatus] = useState<string | null>(null);

  const save = async () => {
    if (!state) return;
    const cigarettesPerDay = /^\d+$/.test(perDay.trim()) ? Number(perDay) : null;
    const packPriceMinor = /^\d+(\.\d{1,2})?$/.test(price.replace(',', '.').trim())
      ? Math.round(Number(price.replace(',', '.')) * 100)
      : null;

    if (cigarettesPerDay === null || cigarettesPerDay <= 0) return setStatus('Cigarettes per day must be a whole number above zero.');
    if (packPriceMinor === null) return setStatus('Pack price must look like 11 or 11.50.');

    await saveSettings(db, { ...state.settings, cigarettesPerDay, packPriceMinor }, new Date());
    await reload();
    setStatus('Saved. Every figure has been recalculated.');
  };

  const exportData = async () => {
    const json = await exportAll(db);

    const file = new File(Paths.cache, 'smokefree-export.json');
    // The cache file is overwritten on every export, so delete any previous one first.
    if (file.exists) file.delete();
    file.create();
    file.write(json);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export your data' });
    } else {
      setStatus(`Saved to ${file.uri}`);
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
            await deleteEverything(db);
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
      <Text style={styles.label}>Cigarettes per day</Text>
      <TextInput style={styles.input} value={perDay} onChangeText={setPerDay} keyboardType="number-pad" accessibilityLabel="Cigarettes per day" />
      <Text style={styles.label}>Price per pack</Text>
      <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" accessibilityLabel="Price per pack" />
      <Pressable style={styles.cta} onPress={save}><Text style={styles.ctaText}>Save</Text></Pressable>

      <Text style={styles.h2}>Your data</Text>
      <Text style={styles.hint}>
        Everything lives in a database file on this phone. Nothing is uploaded, there is no account, and no
        analytics are collected. That also means an export is your only backup.
      </Text>
      <Pressable style={[styles.cta, styles.ctaMuted]} onPress={exportData}><Text style={styles.ctaText}>Export as JSON</Text></Pressable>
      <Pressable style={[styles.cta, styles.ctaDanger]} onPress={confirmDelete}><Text style={styles.ctaText}>Delete everything</Text></Pressable>

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

      {status ? <Text style={styles.status}>{status}</Text> : null}
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
});
