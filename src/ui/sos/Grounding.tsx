import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GROUNDING_STEPS } from '@/content/sos';
import { Body, Button } from '../kit';
import { makeStyles } from '../theme';

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    wrap: { gap: t.space.md, alignItems: 'center', paddingVertical: t.space.md },
    big: { fontFamily: t.family.display, fontSize: 64, lineHeight: 72, color: t.color.accentText },
    prompt: { fontFamily: t.family.semi, fontSize: t.font.heading, color: t.color.ink, textAlign: 'center' },
    dots: { flexDirection: 'row', gap: t.space.sm },
    dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: t.color.accent },
    dotOn: { backgroundColor: t.color.accent },
  }),
);

/** 5-4-3-2-1: name things around you, one sense at a time. */
export function Grounding() {
  const styles = useStyles();
  const [stepIndex, setStepIndex] = useState(0);
  const [named, setNamed] = useState(0);
  const step = GROUNDING_STEPS[stepIndex];

  if (!step) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.prompt}>Done. Notice how you feel now.</Text>
        <Button label="Go again" variant="secondary" onPress={() => { setStepIndex(0); setNamed(0); }} />
      </View>
    );
  }

  const nameOne = () => {
    if (named + 1 >= step.count) {
      setStepIndex((i) => i + 1);
      setNamed(0);
    } else {
      setNamed((n) => n + 1);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.big}>{step.count}</Text>
      <Text style={styles.prompt}>{step.prompt}</Text>
      <View style={styles.dots} accessible accessibilityLabel={`${named} of ${step.count} named`}>
        {Array.from({ length: step.count }, (_, i) => (
          <View key={i} style={[styles.dot, i < named && styles.dotOn]} />
        ))}
      </View>
      <Body tone="muted">Say each one to yourself, then tap.</Body>
      <Button label="Named one" onPress={nameOne} />
    </View>
  );
}
