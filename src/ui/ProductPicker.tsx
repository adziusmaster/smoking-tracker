import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PICKER_CARDS } from '@/content/products';
import type { ProductId } from '@/domain/types';
import { Chip, Label } from './kit';
import { makeStyles } from './theme';

const ORAL: ProductId[] = ['snus', 'pouches'];

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    list: { gap: t.space.sm },
    card: { borderWidth: 1, borderColor: t.color.line, borderRadius: t.radius.lg, backgroundColor: t.color.surface, paddingVertical: t.space.md, paddingHorizontal: t.space.lg },
    cardSelected: { borderColor: t.color.accent, borderWidth: 2, backgroundColor: t.color.doneWash },
    cardLabel: { fontFamily: t.family.bold, fontSize: t.font.heading, color: t.color.ink },
    cardHint: { fontFamily: t.family.medium, fontSize: t.font.small, color: t.color.muted, marginTop: 2 },
    sub: { gap: t.space.xs },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
  }),
);

/**
 * Five cards; snus and tobacco-free pouches share one, followed by a two-way choice, because
 * one milestone (mouth-lining recovery) is evidenced for snus only.
 */
export function ProductPicker(props: { value: ProductId | null; onChange: (product: ProductId) => void }) {
  const styles = useStyles();
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
              // Tapping the shared card defaults to tobacco-free pouches, the more common product.
              const next = card.key === 'oral' ? 'pouches' : card.products[0];
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
        <View style={styles.sub}>
          <Label>Which kind?</Label>
          <View style={styles.chips}>
            <Chip label="Snus (tobacco)" selected={value === 'snus'} onPress={() => onChange('snus')} />
            <Chip label="Tobacco-free pouches" selected={value === 'pouches'} onPress={() => onChange('pouches')} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
