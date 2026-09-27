import { Pressable, Text, TextInput, View } from 'react-native';
import { PRODUCT_CONTENT, VAPE_FREQUENCY_CHIPS } from '@/content/products';
import { isCombustible } from '@/domain/products';
import type { SetupFormValues } from '@/domain/setupForm';
import { formStyles } from './formStyles';

type Props = {
  values: SetupFormValues;
  onChange: (next: SetupFormValues) => void;
  /** Onboarding shows usage and history on separate steps; Settings shows both. */
  section: 'usage' | 'history';
};

export function UsageFields({ values, onChange, section }: Props) {
  const content = PRODUCT_CONTENT[values.product];
  const set = (patch: Partial<SetupFormValues>) => onChange({ ...values, ...patch });

  if (section === 'history') {
    if (isCombustible(values.product)) {
      return (
        <View style={formStyles.field}>
          <Text style={formStyles.label}>How long did you smoke? (optional)</Text>
          <Text style={formStyles.hint}>
            Used only for an estimate of your lifetime cigarette total. Leave blank to skip.
          </Text>
          <YearsMonths values={values} set={set} />
        </View>
      );
    }
    return (
      <View style={formStyles.field}>
        <Text style={formStyles.label}>Did you smoke cigarettes before?</Text>
        <Text style={formStyles.hint}>
          This decides whether the long-term smoking-recovery milestones apply to you.
        </Text>
        <View style={formStyles.chips}>
          {([[true, 'Yes'], [false, 'No']] as const).map(([answer, label]) => (
            <Pressable
              key={label}
              onPress={() => set({ smokedBefore: answer })}
              style={[formStyles.chip, values.smokedBefore === answer && formStyles.chipActive]}
              accessibilityRole="radio"
              accessibilityState={{ selected: values.smokedBefore === answer }}
            >
              <Text style={[formStyles.chipText, values.smokedBefore === answer && formStyles.chipTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {values.smokedBefore ? (
          <>
            <Text style={formStyles.label}>For how long?</Text>
            <YearsMonths values={values} set={set} />
            <Field label="Cigarettes per day back then" value={values.priorPerDay} onChange={(priorPerDay) => set({ priorPerDay })} keyboardType="number-pad" />
          </>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {values.product === 'vape' ? (
        <View style={formStyles.field}>
          <Text style={formStyles.label}>How often did you vape?</Text>
          <View style={formStyles.chips}>
            {VAPE_FREQUENCY_CHIPS.map((chip) => {
              const active = values.unitsPerDay === String(chip.usesPerDay);
              return (
                <Pressable
                  key={chip.label}
                  onPress={() => set({ unitsPerDay: String(chip.usesPerDay) })}
                  style={[formStyles.chip, active && formStyles.chipActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[formStyles.chipText, active && formStyles.chipTextActive]}>{chip.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Field label="Uses per day (edit if you like)" value={values.unitsPerDay} onChange={(unitsPerDay) => set({ unitsPerDay })} keyboardType="number-pad" />
          <Field label="Spend per week (€)" value={values.weeklySpend} onChange={(weeklySpend) => set({ weeklySpend })} keyboardType="decimal-pad" />
        </View>
      ) : (
        <>
          <Field label={content.perDayLabel} hint="Roughly what you used before quitting." value={values.unitsPerDay} onChange={(unitsPerDay) => set({ unitsPerDay })} keyboardType="number-pad" />
          <Field label={content.perPackLabel ?? 'Per pack'} value={values.unitsPerPack} onChange={(unitsPerPack) => set({ unitsPerPack })} keyboardType="number-pad" />
          <Field label={`${content.packPriceLabel ?? 'Price'} (€)`} value={values.packPrice} onChange={(packPrice) => set({ packPrice })} keyboardType="decimal-pad" />
        </>
      )}
    </View>
  );
}

function YearsMonths({ values, set }: { values: SetupFormValues; set: (patch: Partial<SetupFormValues>) => void }) {
  return (
    <View style={formStyles.duo}>
      <TextInput
        style={[formStyles.input, formStyles.duoInput]}
        value={values.historyYears}
        onChangeText={(historyYears) => set({ historyYears })}
        keyboardType="number-pad"
        placeholder="years"
        accessibilityLabel="Years smoked"
      />
      <TextInput
        style={[formStyles.input, formStyles.duoInput]}
        value={values.historyMonths}
        onChangeText={(historyMonths) => set({ historyMonths })}
        keyboardType="number-pad"
        placeholder="months"
        accessibilityLabel="Additional months smoked"
      />
    </View>
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
    <View style={formStyles.field}>
      <Text style={formStyles.label}>{props.label}</Text>
      {props.hint ? <Text style={formStyles.hint}>{props.hint}</Text> : null}
      <TextInput
        style={formStyles.input}
        value={props.value}
        onChangeText={props.onChange}
        keyboardType={props.keyboardType}
        accessibilityLabel={props.label}
      />
    </View>
  );
}
