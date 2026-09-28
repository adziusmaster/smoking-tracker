import { StyleSheet, View } from 'react-native';
import { SLIP_LABEL } from '@/content/products';
import { slipProductOptions } from '@/domain/products';
import type { ProductId } from '@/domain/types';
import { Chip, Label } from './kit';
import { makeStyles } from './theme';

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    wrap: { gap: t.space.xs },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
  }),
);

/** "What did you use?" — any product, the user's own preselected by the caller. */
export function SlipProductPicker(props: { own: ProductId; value: ProductId; onChange: (product: ProductId) => void }) {
  const styles = useStyles();
  return (
    <View style={styles.wrap}>
      <Label>What did you use?</Label>
      <View style={styles.chips}>
        {slipProductOptions(props.own).map((product) => (
          <Chip key={product} label={SLIP_LABEL[product]} selected={props.value === product} onPress={() => props.onChange(product)} />
        ))}
      </View>
    </View>
  );
}
