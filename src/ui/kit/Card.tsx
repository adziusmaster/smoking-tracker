import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { makeStyles } from '../theme';

export type CardTone = 'plain' | 'now' | 'done' | 'danger';

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    base: { borderRadius: t.radius.md, borderWidth: 1, padding: t.space.md, gap: t.space.xs },
    plain: { backgroundColor: t.color.surface, borderColor: t.color.line },
    now: { backgroundColor: t.color.achieveWash, borderColor: t.color.achieve, borderWidth: 1.5 },
    done: { backgroundColor: t.color.doneWash, borderColor: t.color.doneLine },
    danger: { backgroundColor: t.color.dangerWash, borderColor: t.color.dangerLine },
  }),
);

export function Card(props: { children: ReactNode; tone?: CardTone; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return <View style={[styles.base, styles[props.tone ?? 'plain'], props.style]}>{props.children}</View>;
}
