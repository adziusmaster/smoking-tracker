import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ACTIVITIES } from '@/content/sos';
import type { ActivityId } from '@/domain/types';
import { SourceLinks } from '../SourceLinks';
import { makeStyles } from '../theme';

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
    card: {
      flexBasis: '47%',
      flexGrow: 1,
      borderWidth: 1,
      borderColor: t.color.line,
      borderRadius: t.radius.md,
      backgroundColor: t.color.surface,
      padding: t.space.md,
      gap: t.space.xs,
    },
    pressed: { borderColor: t.color.accent },
    title: { fontFamily: t.family.bold, fontSize: t.font.body, color: t.color.ink },
    blurb: { fontFamily: t.family.body, fontSize: t.font.small, lineHeight: 18, color: t.color.muted },
  }),
);

export function ActivityPicker(props: { onPick: (id: ActivityId) => void }) {
  const styles = useStyles();
  return (
    <View style={styles.grid}>
      {ACTIVITIES.map((activity) => (
        <Pressable
          key={activity.id}
          onPress={() => props.onPick(activity.id)}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${activity.title}. ${activity.blurb}`}
        >
          <Text style={styles.title}>{activity.title}</Text>
          <Text style={styles.blurb}>{activity.blurb}</Text>
          {activity.sourceId ? <SourceLinks ids={[activity.sourceId]} /> : null}
        </Pressable>
      ))}
    </View>
  );
}
