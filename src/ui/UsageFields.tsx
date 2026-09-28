import { StyleSheet, View } from 'react-native';
import { PRODUCT_CONTENT, VAPE_FREQUENCY_CHIPS } from '@/content/products';
import { isCombustible } from '@/domain/products';
import type { SetupFormValues } from '@/domain/setupForm';
import { Caption, Chip, Field, Label } from './kit';
import { makeStyles } from './theme';

type Props = {
  values: SetupFormValues;
  onChange: (next: SetupFormValues) => void;
  /** Onboarding shows usage and history on separate steps; Settings shows both. */
  section: 'usage' | 'history';
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    group: { gap: t.space.md },
    field: { gap: t.space.xs },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
    duo: { flexDirection: 'row', gap: t.space.sm },
  }),
);

export function UsageFields({ values, onChange, section }: Props) {
  const styles = useStyles();
  const content = PRODUCT_CONTENT[values.product];
  const set = (patch: Partial<SetupFormValues>) => onChange({ ...values, ...patch });

  const yearsMonths = (
    <View style={styles.duo}>
      <Field bare label="Years smoked" value={values.historyYears} onChangeText={(historyYears) => set({ historyYears })} keyboardType="number-pad" placeholder="years" />
      <Field bare label="Additional months smoked" value={values.historyMonths} onChangeText={(historyMonths) => set({ historyMonths })} keyboardType="number-pad" placeholder="months" />
    </View>
  );

  if (section === 'history') {
    if (isCombustible(values.product)) {
      return (
        <View style={styles.field}>
          <Label>How long did you smoke? (optional)</Label>
          <Caption tone="faint">Used only for an estimate of your lifetime cigarette total. Leave blank to skip.</Caption>
          {yearsMonths}
        </View>
      );
    }
    return (
      <View style={styles.group}>
        <View style={styles.field}>
          <Label>Did you smoke cigarettes before?</Label>
          <Caption tone="faint">This decides whether the long-term smoking-recovery milestones apply to you.</Caption>
          <View style={styles.chips}>
            <Chip label="Yes" selected={values.smokedBefore} onPress={() => set({ smokedBefore: true })} />
            <Chip label="No" selected={!values.smokedBefore} onPress={() => set({ smokedBefore: false })} />
          </View>
        </View>
        {values.smokedBefore ? (
          <>
            <View style={styles.field}>
              <Label>For how long?</Label>
              {yearsMonths}
            </View>
            <Field label="Cigarettes per day back then" value={values.priorPerDay} onChangeText={(priorPerDay) => set({ priorPerDay })} keyboardType="number-pad" />
          </>
        ) : null}
      </View>
    );
  }

  if (values.product === 'vape') {
    return (
      <View style={styles.group}>
        <View style={styles.field}>
          <Label>How often did you vape?</Label>
          <View style={styles.chips}>
            {VAPE_FREQUENCY_CHIPS.map((chip) => (
              <Chip
                key={chip.label}
                label={chip.label}
                selected={values.unitsPerDay === String(chip.usesPerDay)}
                onPress={() => set({ unitsPerDay: String(chip.usesPerDay) })}
              />
            ))}
          </View>
        </View>
        <Field label="Uses per day (edit if you like)" value={values.unitsPerDay} onChangeText={(unitsPerDay) => set({ unitsPerDay })} keyboardType="number-pad" />
        <Field label="Spend per week (€)" value={values.weeklySpend} onChangeText={(weeklySpend) => set({ weeklySpend })} keyboardType="decimal-pad" />
      </View>
    );
  }

  return (
    <View style={styles.group}>
      <Field label={content.perDayLabel} hint="Roughly what you used before quitting." value={values.unitsPerDay} onChangeText={(unitsPerDay) => set({ unitsPerDay })} keyboardType="number-pad" />
      <Field label={content.perPackLabel ?? 'Per pack'} value={values.unitsPerPack} onChangeText={(unitsPerPack) => set({ unitsPerPack })} keyboardType="number-pad" />
      <Field label={`${content.packPriceLabel ?? 'Price'} (€)`} value={values.packPrice} onChangeText={(packPrice) => set({ packPrice })} keyboardType="decimal-pad" />
    </View>
  );
}
