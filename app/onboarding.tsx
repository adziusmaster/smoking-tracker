import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveSettings } from '@/data/repositories';
import { parseMinorUnits, parseNonNegativeInt, parsePositiveInt } from '@/domain/parse';
import QuitMomentPicker from '@/ui/QuitMomentPicker';
import { theme } from '@/ui/theme';

export default function Onboarding() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [quitMoment, setQuitMoment] = useState(() => new Date());
  const [perDay, setPerDay] = useState('15');
  const [perPack, setPerPack] = useState('20');
  const [price, setPrice] = useState('11.00');
  const [years, setYears] = useState('');
  const [months, setMonths] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const cigarettesPerDay = parsePositiveInt(perDay);
    const cigarettesPerPack = parsePositiveInt(perPack);
    const packPriceMinor = parseMinorUnits(price);

    if (cigarettesPerDay === null) return setError('Cigarettes per day must be a whole number above zero.');
    if (cigarettesPerPack === null) return setError('Cigarettes per pack must be a whole number above zero.');
    if (packPriceMinor === null) return setError('Pack price must look like 11 or 11.50.');

    // Blank means "not given", which is 0 — but a non-empty unreadable value is an error
    // rather than a silent zero, so a typo cannot quietly become a wrong lifetime total.
    const yearsValue = years.trim() === '' ? 0 : parseNonNegativeInt(years);
    const monthsValue = months.trim() === '' ? 0 : parseNonNegativeInt(months);
    if (yearsValue === null) return setError('Years smoked must be a whole number, or left blank.');
    if (monthsValue === null) return setError('Months smoked must be a whole number, or left blank.');

    const now = new Date();
    if (quitMoment.getTime() > now.getTime()) return setError('Your quit date cannot be in the future.');

    try {
      await saveSettings(
        db,
        {
          quitDate: quitMoment.toISOString(),
          cigarettesPerDay,
          cigarettesPerPack,
          packPriceMinor,
          currency: 'EUR',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          smokedForMonths: yearsValue * 12 + monthsValue,
        },
        now,
      );
    } catch {
      return setError('Couldn’t save your setup. Nothing was stored — please try again.');
    }

    router.replace('/');
  };

  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + theme.space.xl }]}>
      <Text style={styles.h1}>Let’s set this up</Text>
      <Text style={styles.lede}>
        Five numbers and you’re done. Everything stays on this phone — no account, no server, nothing
        leaves the device.
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>When did you quit?</Text>
        <Text style={styles.hint}>Defaults to right now. Tap to change either part.</Text>
        <QuitMomentPicker value={quitMoment} onChange={setQuitMoment} maximumDate={new Date()} />
      </View>
      <Field label="Cigarettes per day" hint="Roughly what you smoked before quitting." value={perDay} onChange={setPerDay} keyboardType="number-pad" />
      <Field label="Cigarettes per pack" value={perPack} onChange={setPerPack} keyboardType="number-pad" />
      <Field label="Price per pack (€)" value={price} onChange={setPrice} keyboardType="decimal-pad" />
      <View style={styles.field}>
        <Text style={styles.label}>How long did you smoke? (optional)</Text>
        <Text style={styles.hint}>
          Used only for an estimate of your lifetime total, worked out from the daily rate above.
          Leave blank to skip.
        </Text>
        <View style={styles.duo}>
          <TextInput
            style={[styles.input, styles.duoInput]}
            value={years}
            onChangeText={setYears}
            keyboardType="number-pad"
            placeholder="years"
            accessibilityLabel="Years smoked"
          />
          <TextInput
            style={[styles.input, styles.duoInput]}
            value={months}
            onChangeText={setMonths}
            keyboardType="number-pad"
            placeholder="months"
            accessibilityLabel="Additional months smoked"
          />
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.cta} onPress={submit} accessibilityRole="button">
        <Text style={styles.ctaText}>Start tracking</Text>
      </Pressable>

      <Text style={styles.disclaimer}>
        This app is not medical advice. If you want real support, your GP or a national quitline will
        do more for your odds than any app.
      </Text>
    </ScrollView>
  );
}

function Field(props: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  keyboardType: 'number-pad' | 'decimal-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      {props.hint ? <Text style={styles.hint}>{props.hint}</Text> : null}
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChange}
        keyboardType={props.keyboardType}
        accessibilityLabel={props.label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: theme.space.lg, paddingBottom: theme.space.xxl, gap: theme.space.md },
  h1: { fontSize: theme.font.title, fontWeight: '700', color: theme.color.text },
  lede: { fontSize: theme.font.body, color: theme.color.textMuted, lineHeight: 21, marginBottom: theme.space.sm },
  field: { gap: theme.space.xs },
  duo: { flexDirection: 'row', gap: theme.space.sm },
  duoInput: { flex: 1 },
  label: { fontSize: theme.font.small, fontWeight: '600', color: theme.color.text },
  hint: { fontSize: theme.font.tiny, color: theme.color.textFaint },
  input: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    fontSize: theme.font.body,
    color: theme.color.text,
  },
  error: { color: theme.color.danger, fontSize: theme.font.small },
  cta: {
    backgroundColor: theme.color.heroBg,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.md,
    alignItems: 'center',
    marginTop: theme.space.sm,
  },
  ctaText: { color: theme.color.heroText, fontSize: theme.font.body, fontWeight: '700' },
  disclaimer: { fontSize: theme.font.tiny, color: theme.color.textFaint, lineHeight: 16, marginTop: theme.space.md },
});
