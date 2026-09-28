import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PRODUCT_CONTENT } from '@/content/products';
import { saveSettings } from '@/data/repositories';
import { defaultValues, parseSetupForm, type SetupFormValues } from '@/domain/setupForm';
import type { ProductId } from '@/domain/types';
import { Body, Button, Caption, Eyebrow, Screen, Title } from '@/ui/kit';
import { ProductPicker } from '@/ui/ProductPicker';
import QuitMomentPicker from '@/ui/QuitMomentPicker';
import { makeStyles } from '@/ui/theme';
import { UsageFields } from '@/ui/UsageFields';

const STEPS = ['What are you quitting?', 'How much did you use?', 'Your smoking history', 'When did you quit?'] as const;

export default function Onboarding() {
  const db = useSQLiteContext();
  const router = useRouter();
  const styles = useStyles();

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

  // Back / Next are pinned to the bottom of every step, so they never move as the form changes.
  const nav = (
    <View style={styles.nav}>
      {step > 0 ? (
        <View style={styles.navItem}><Button label="Back" variant="secondary" onPress={back} /></View>
      ) : null}
      <View style={styles.navItem}>
        <Button label={isLast ? 'Start tracking' : 'Next'} onPress={isLast ? submit : next} />
      </View>
    </View>
  );

  return (
    <Screen footer={nav} footerSpace={88}>
      <Eyebrow>Step {step + 1} of {STEPS.length}</Eyebrow>
      <Title accessibilityRole="header">{STEPS[step]}</Title>

      {step === 0 ? (
        <>
          <Body tone="muted">Everything stays on this phone — no account, no server, nothing leaves the device.</Body>
          <ProductPicker value={values?.product ?? null} onChange={chooseProduct} />
        </>
      ) : null}

      {step === 1 && values ? <UsageFields values={values} onChange={setValues} section="usage" /> : null}
      {step === 2 && values ? <UsageFields values={values} onChange={setValues} section="history" /> : null}

      {step === 3 ? (
        <>
          <Caption tone="faint">Defaults to right now. Tap to change either part.</Caption>
          <QuitMomentPicker value={quitMoment} onChange={setQuitMoment} maximumDate={new Date()} />
        </>
      ) : null}

      {error ? <Body tone="danger">{error}</Body> : null}

      {isLast ? (
        <Caption tone="faint">
          This app is not medical advice. If you want real support, your GP or a national quitline will do more for
          your odds than any app.
        </Caption>
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    nav: { flexDirection: 'row', gap: t.space.sm },
    navItem: { flex: 1 },
  }),
);
