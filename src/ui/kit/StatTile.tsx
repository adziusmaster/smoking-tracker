import { StyleSheet, Text, View } from 'react-native';
import { makeStyles } from '../theme';

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    tile: { flex: 1, backgroundColor: t.color.heroTile, borderRadius: t.radius.sm + 2, paddingVertical: t.space.sm, paddingHorizontal: t.space.sm + 2 },
    value: { fontFamily: t.family.bold, fontSize: t.font.body, color: t.color.onHero, fontVariant: ['tabular-nums'] },
    label: { fontFamily: t.family.semi, fontSize: t.font.micro, letterSpacing: 0.6, textTransform: 'uppercase', color: t.color.onHero, opacity: 0.8, marginTop: 2 },
  }),
);

export function StatTile(props: { value: string; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${props.value} ${props.label}`}>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{props.value}</Text>
      <Text style={styles.label} numberOfLines={2}>{props.label}</Text>
    </View>
  );
}
