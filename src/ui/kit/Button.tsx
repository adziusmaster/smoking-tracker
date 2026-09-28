import { Pressable, StyleSheet, Text } from 'react-native';
import { makeStyles } from '../theme';

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger';

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    base: { minHeight: 48, borderRadius: t.radius.md, paddingHorizontal: t.space.lg, alignItems: 'center', justifyContent: 'center' },
    primary: { backgroundColor: t.color.accent },
    secondary: { backgroundColor: t.color.surface, borderWidth: 1, borderColor: t.color.line },
    quiet: { backgroundColor: 'transparent' },
    danger: { backgroundColor: t.color.dangerWash, borderWidth: 1, borderColor: t.color.dangerLine },
    pressed: { opacity: 0.85 },
    disabled: { opacity: 0.5 },
    text: { fontFamily: t.family.bold, fontSize: t.font.body },
    primaryText: { color: t.color.onAccent },
    secondaryText: { color: t.color.ink },
    quietText: { color: t.color.faint, fontFamily: t.family.semi, fontSize: t.font.small },
    dangerText: { color: t.color.danger },
  }),
);

export function Button(props: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const styles = useStyles();
  const variant = props.variant ?? 'primary';
  const disabled = props.disabled ?? false;
  return (
    <Pressable
      onPress={props.onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={props.accessibilityLabel ?? props.label}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={[styles.text, styles[`${variant}Text`]]}>{props.label}</Text>
    </Pressable>
  );
}
