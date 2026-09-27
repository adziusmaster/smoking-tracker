import { StyleSheet } from 'react-native';
import { theme } from './theme';

/** Field styles shared by onboarding and Settings, so the same inputs look the same in both. */
export const formStyles = StyleSheet.create({
  field: { gap: theme.space.xs },
  label: { fontSize: theme.font.small, fontWeight: '600', color: theme.color.text },
  hint: { fontSize: theme.font.tiny, color: theme.color.textFaint, lineHeight: 16 },
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
  duo: { flexDirection: 'row', gap: theme.space.sm },
  duoInput: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  chip: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.md,
    paddingVertical: 6,
    backgroundColor: theme.color.surface,
  },
  chipActive: { backgroundColor: theme.color.heroBg, borderColor: theme.color.heroBg },
  chipText: { fontSize: theme.font.tiny, color: theme.color.textMuted },
  chipTextActive: { color: theme.color.heroText, fontWeight: '600' },
});
