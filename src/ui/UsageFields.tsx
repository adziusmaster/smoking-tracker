import { StyleSheet, View } from 'react-native';
import { PRODUCT_CONTENT, VAPE_FREQUENCY_CHIPS } from '@/content/products';
import { isCombustible } from '@/domain/products';
import type { DurationUnit, SetupFormValues } from '@/domain/setupForm';
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
    amount: { flexDirection: 'row' },
  }),
);

const DURATION_UNITS: [DurationUnit, string][] = [
  ['years', 'Years'],
  ['months', 'Months'],
  ['weeks', 'Weeks'],
  ['days', 'Days'],
];

export function UsageFields({ values, onChange, section }: Props) {
  const styles = useStyles();
  const content = PRODUCT_CONTENT[values.product];
  const set = (patch: Partial<SetupFormValues>) => onChange({ ...values, ...patch });

  const duration = (
    <View style={styles.field}>
      <View style={styles.amount}>
        <Field bare label="How long you smoked" value={values.historyAmount} onChangeText={(historyAmount) => set({ historyAmount })} keyboardType="number-pad" placeholder="e.g. 10" />
      </View>
      <View style={styles.chips}>
        {DURATION_UNITS.map(([unit, label]) => (
          <Chip key={unit} label={label} selected={values.historyUnit === unit} onPress={() => set({ historyUnit: unit })} />
        ))}
      </View>
    </View>
  );

  if (section === 'history') {
    if (isCombustible(values.product)) {
      return (
        <View style={styles.field}>
          <Label>How long did you smoke? (optional)</Label>
          <Caption tone="faint">Used only for the estimate of cigarettes smoked, shown in Settings. Leave blank to skip.</Caption>
          {duration}
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
              <Label>How long did you smoke cigarettes?</Label>
              {duration}
            </View>
            <Field label="About how many cigarettes a day?" value={values.priorPerDay} onChangeText={(priorPerDay) => set({ priorPerDay })} keyboardType="number-pad" />
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
