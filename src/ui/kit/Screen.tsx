import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles } from '../theme';

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.color.bg },
    content: { paddingHorizontal: t.space.lg, gap: t.space.md },
    footer: { position: 'absolute', left: t.space.lg, right: t.space.lg },
  }),
);

/**
 * A page: themed background, safe-area insets, standard gutter. `footer` is pinned to the
 * bottom (the SOS button); the scroll content gets enough bottom padding to clear it.
 */
export function Screen(props: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  /** Space reserved under the scroll content for the pinned footer. */
  footerSpace?: number;
  centered?: boolean;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + (props.footer ? (props.footerSpace ?? 96) : 32);
  const padding = { paddingTop: insets.top + 16, paddingBottom: bottomPad };

  return (
    <View style={styles.root}>
      {props.scroll === false ? (
        <View style={[styles.content, padding, { flex: 1 }, props.centered && { justifyContent: 'center' }]}>{props.children}</View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, padding]} keyboardShouldPersistTaps="handled">
          {props.children}
        </ScrollView>
      )}
      {props.footer ? <View style={[styles.footer, { bottom: insets.bottom + 16 }]}>{props.footer}</View> : null}
    </View>
  );
}
