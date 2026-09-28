import { Pressable, StyleSheet, Text } from 'react-native';
import { makeStyles } from '../theme';

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    chip: {
      minHeight: 36,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.color.line,
      borderRadius: t.radius.pill,
      paddingHorizontal: t.space.md,
      backgroundColor: t.color.surface,
    },
    selected: { backgroundColor: t.color.accent, borderColor: t.color.accent },
    text: { fontFamily: t.family.medium, fontSize: t.font.small, color: t.color.muted },
    selectedText: { color: t.color.onAccent, fontFamily: t.family.semi },
  }),
);

export function Chip(props: { label: string; selected: boolean; onPress: () => void; role?: 'radio' | 'checkbox' }) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole={props.role ?? 'radio'}
      accessibilityState={props.role === 'checkbox' ? { checked: props.selected } : { selected: props.selected }}
      style={[styles.chip, props.selected && styles.selected]}
    >
      <Text style={[styles.text, props.selected && styles.selectedText]}>{props.label}</Text>
    </Pressable>
  );
}
