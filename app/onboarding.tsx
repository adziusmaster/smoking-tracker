import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveSettings } from '@/data/repositories';
import { parseMinorUnits, parseNonNegativeInt, parsePositiveInt } from '@/domain/parse';
import { MS_PER_DAY } from '@/domain/types';
import { theme } from '@/ui/theme';

export default function Onboarding() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [daysAgo, setDaysAgo] = useState('0');
  const [perDay, setPerDay] = useState('15');
  const [perPack, setPerPack] = useState('20');
  const [price, setPrice] = useState('11.00');
  const [baseline, setBaseline] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const cigarettesPerDay = parsePositiveInt(perDay);
    const cigarettesPerPack = parsePositiveInt(perPack);
    const packPriceMinor = parseMinorUnits(price);
    const backdatedDays = parseNonNegativeInt(daysAgo);

    if (cigarettesPerDay === null) return setError('Cigarettes per day must be a whole number above zero.');
    if (cigarettesPerPack === null) return setError('Cigarettes per pack must be a whole number above zero.');
    if (packPriceMinor === null) return setError('Pack price must look like 11 or 11.50.');
    if (backdatedDays === null) return setError('Days ago must be a whole number, or 0 if you are quitting now.');

    const now = new Date();
    const quitDate = new Date(now.getTime() - backdatedDays * MS_PER_DAY);

    try {
      await saveSettings(
        db,
        {
          quitDate: quitDate.toISOString(),
          cigarettesPerDay,
          cigarettesPerPack,
          packPriceMinor,
          currency: 'EUR',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          // An empty optional field means "I don't know", which the domain reads as 0.
          lifetimeBaseline: parseNonNegativeInt(baseline) ?? 0,
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

      <Field label="How many days ago did you quit?" hint="0 if you’re quitting right now." value={daysAgo} onChange={setDaysAgo} keyboardType="number-pad" />
      <Field label="Cigarettes per day" hint="Roughly what you smoked before quitting." value={perDay} onChange={setPerDay} keyboardType="number-pad" />
      <Field label="Cigarettes per pack" value={perPack} onChange={setPerPack} keyboardType="number-pad" />
      <Field label="Price per pack (€)" value={price} onChange={setPrice} keyboardType="decimal-pad" />
      <Field
        label="Cigarettes smoked in your life (optional)"
        hint="A rough guess is fine. Used only for your lifetime total."
        value={baseline}
        onChange={setBaseline}
        keyboardType="number-pad"
      />

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
