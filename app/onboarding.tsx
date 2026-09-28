import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PRODUCT_CONTENT } from '@/content/products';
import { saveSettings } from '@/data/repositories';
import { defaultValues, parseSetupForm, type SetupFormValues } from '@/domain/setupForm';
import type { ProductId } from '@/domain/types';
import { formStyles } from '@/ui/formStyles';
import { ProductPicker } from '@/ui/ProductPicker';
import QuitMomentPicker from '@/ui/QuitMomentPicker';
import { theme } from '@/ui/theme';
import { UsageFields } from '@/ui/UsageFields';

const STEPS = ['What are you quitting?', 'How much did you use?', 'Your smoking history', 'When did you quit?'] as const;

export default function Onboarding() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<SetupFormValues | null>(null);
  const [quitMoment, setQuitMoment] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);

  const chooseProduct = (product: ProductId) => {
    setError(null);
    // Only reset when the product actually changes, so going back a step never wipes answers.
    if (values?.product === product) return;
    setValues(defaultValues(product, PRODUCT_CONTENT[product].defaultPerPack));
  };

  const next = () => {
    setError(null);
    if (step === 0 && values === null) return setError('Pick what you are quitting to continue.');
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const back = () => {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  };

  const submit = async () => {
    if (values === null) return setStep(0);
    const content = PRODUCT_CONTENT[values.product];
    const now = new Date();
    const result = parseSetupForm(values, {
      quitMoment,
      now,
      currency: 'EUR',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      labels: { perDay: content.perDayLabel, perPack: content.perPackLabel, packPrice: content.packPriceLabel },
    });
    if (!result.ok) return setError(result.error);

    try {
      await saveSettings(db, result.settings, now);
    } catch {
      return setError('Couldn’t save your setup. Nothing was stored — please try again.');
    }
    router.replace('/');
  };

  const isLast = step === STEPS.length - 1;

  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + theme.space.xl }]}>
      <Text style={styles.stepCount}>Step {step + 1} of {STEPS.length}</Text>
      <Text style={styles.h1}>{STEPS[step]}</Text>

      {step === 0 ? (
        <>
          <Text style={styles.lede}>
            Everything stays on this phone — no account, no server, nothing leaves the device.
          </Text>
          <ProductPicker value={values?.product ?? null} onChange={chooseProduct} />
        </>
      ) : null}

      {step === 1 && values ? <UsageFields values={values} onChange={setValues} section="usage" /> : null}
      {step === 2 && values ? <UsageFields values={values} onChange={setValues} section="history" /> : null}

      {step === 3 ? (
        <View style={formStyles.field}>
          <Text style={formStyles.hint}>Defaults to right now. Tap to change either part.</Text>
          <QuitMomentPicker value={quitMoment} onChange={setQuitMoment} maximumDate={new Date()} />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.nav}>
        {step > 0 ? (
          <Pressable style={[styles.cta, styles.ctaSecondary]} onPress={back} accessibilityRole="button">
            <Text style={[styles.ctaText, styles.ctaTextSecondary]}>Back</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.cta} onPress={isLast ? submit : next} accessibilityRole="button">
          <Text style={styles.ctaText}>{isLast ? 'Start tracking' : 'Next'}</Text>
        </Pressable>
      </View>

      {isLast ? (
        <Text style={styles.disclaimer}>
          This app is not medical advice. If you want real support, your GP or a national quitline will
          do more for your odds than any app.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: theme.space.lg, paddingBottom: theme.space.xxl, gap: theme.space.md },
  stepCount: { fontSize: theme.font.tiny, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: theme.color.textFaint },
  h1: { fontSize: theme.font.title, fontWeight: '700', color: theme.color.text },
  lede: { fontSize: theme.font.body, color: theme.color.textMuted, lineHeight: 21 },
  error: { color: theme.color.danger, fontSize: theme.font.small },
  nav: { flexDirection: 'row', gap: theme.space.sm, marginTop: theme.space.sm },
  cta: {
    flex: 1,
    backgroundColor: theme.color.heroBg,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.md,
    alignItems: 'center',
  },
  ctaSecondary: { backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border },
  ctaText: { color: theme.color.heroText, fontSize: theme.font.body, fontWeight: '700' },
  ctaTextSecondary: { color: theme.color.text },
  disclaimer: { fontSize: theme.font.tiny, color: theme.color.textFaint, lineHeight: 16, marginTop: theme.space.md },
});
