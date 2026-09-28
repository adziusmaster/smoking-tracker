import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SOURCES } from '@/content/sources';
import { makeStyles } from './theme';

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: t.space.sm, rowGap: 2 },
    lead: { fontFamily: t.family.medium, fontSize: t.font.tiny, color: t.color.faint },
    link: { fontFamily: t.family.semi, fontSize: t.font.tiny, color: t.color.accentText, textDecorationLine: 'underline', paddingVertical: 4 },
  }),
);

/** The short name before " — " in a source label, e.g. "American Cancer Society". */
function shortName(label: string): string {
  return label.split(' — ')[0] ?? label;
}

/**
 * Tappable citations. Opening one hands the URL to the browser; the app itself still makes no
 * network request (its INTERNET permission is removed).
 */
export function SourceLinks(props: { ids: readonly string[]; lead?: string }) {
  const styles = useStyles();
  const sources = props.ids.map((id) => SOURCES[id]).filter((source) => source !== undefined);
  if (sources.length === 0) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.lead}>{props.lead ?? (sources.length === 1 ? 'Source:' : 'Sources:')}</Text>
      {sources.map((source) => (
        <Pressable
          key={source.id}
          onPress={() => void Linking.openURL(source.url)}
          accessibilityRole="link"
          accessibilityLabel={`Open source: ${source.label}`}
          hitSlop={6}
        >
          <Text style={styles.link}>{shortName(source.label)}</Text>
        </Pressable>
      ))}
    </View>
  );
}
