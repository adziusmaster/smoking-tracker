import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PICKER_CARDS } from '@/content/products';
import type { ProductId } from '@/domain/types';
import { formStyles } from './formStyles';
import { theme } from './theme';

const ORAL: ProductId[] = ['snus', 'pouches'];

/**
 * Five cards; snus and tobacco-free pouches share one, followed by a two-way choice, because
 * one milestone (mouth-lining recovery) is evidenced for snus only.
 */
export function ProductPicker(props: { value: ProductId | null; onChange: (product: ProductId) => void }) {
  const { value, onChange } = props;
  const oralSelected = value !== null && ORAL.includes(value);

  return (
    <View style={styles.list}>
      {PICKER_CARDS.map((card) => {
        const selected = value !== null && card.products.includes(value);
        return (
          <Pressable
            key={card.key}
            onPress={() => {
              if (selected) return;
              const first = card.products[0];
              // Tapping the shared card defaults to tobacco-free pouches, the more common product.
              const next = card.key === 'oral' ? 'pouches' : first;
              if (next) onChange(next);
            }}
            style={[styles.card, selected && styles.cardSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${card.label}. ${card.hint}`}
          >
            <Text style={styles.cardLabel}>{card.label}</Text>
            <Text style={styles.cardHint}>{card.hint}</Text>
          </Pressable>
        );
      })}

      {oralSelected ? (
        <View style={formStyles.field}>
          <Text style={formStyles.label}>Which kind?</Text>
          <View style={formStyles.chips}>
            {([['snus', 'Snus (tobacco)'], ['pouches', 'Tobacco-free pouches']] as const).map(([id, label]) => (
              <Pressable
                key={id}
                onPress={() => onChange(id)}
                style={[formStyles.chip, value === id && formStyles.chipActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: value === id }}
              >
                <Text style={[formStyles.chipText, value === id && formStyles.chipTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: theme.space.sm },
  card: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surface,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.lg,
  },
  cardSelected: { borderColor: theme.color.heroBg, borderWidth: 2, backgroundColor: theme.color.doneBg },
  cardLabel: { fontSize: theme.font.body, fontWeight: '700', color: theme.color.text },
  cardHint: { fontSize: theme.font.tiny, color: theme.color.textMuted, marginTop: 2 },
});
