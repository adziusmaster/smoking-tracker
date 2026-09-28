import { StyleSheet, TextInput, View } from 'react-native';
import { makeStyles, useTheme } from '../theme';
import { Caption, Label } from './Type';

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    field: { gap: t.space.xs },
    input: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: t.color.line,
      borderRadius: t.radius.md,
      backgroundColor: t.color.surface,
      paddingHorizontal: t.space.md,
      fontFamily: t.family.medium,
      fontSize: t.font.body,
      color: t.color.ink,
    },
    multiline: { minHeight: 96, paddingTop: t.space.sm, paddingBottom: t.space.sm },
  }),
);

export function Field(props: {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (next: string) => void;
  keyboardType?: 'number-pad' | 'decimal-pad' | 'default';
  placeholder?: string;
  accessibilityLabel?: string;
  /** Renders just the input, for callers that lay out their own label. */
  bare?: boolean;
  /** A taller, wrapping input for free text. */
  multiline?: boolean;
  maxLength?: number;
}) {
  const t = useTheme();
  const styles = useStyles();
  const input = (
    <TextInput
      style={styles.input}
      value={props.value}
      onChangeText={props.onChangeText}
      keyboardType={props.keyboardType ?? 'default'}
      accessibilityLabel={props.accessibilityLabel ?? props.label}
      placeholderTextColor={t.color.faint}
      selectionColor={t.color.accent}
      cursorColor={t.color.accent}
      {...(props.multiline ? { multiline: true, textAlignVertical: 'top' as const, style: [styles.input, styles.multiline] } : {})}
      {...(props.maxLength !== undefined ? { maxLength: props.maxLength } : {})}
      {...(props.placeholder !== undefined ? { placeholder: props.placeholder } : {})}
    />
  );
  if (props.bare) return <View style={{ flex: 1 }}>{input}</View>;
  return (
    <View style={styles.field}>
      <Label>{props.label}</Label>
      {props.hint ? <Caption tone="faint">{props.hint}</Caption> : null}
      {input}
    </View>
  );
}
