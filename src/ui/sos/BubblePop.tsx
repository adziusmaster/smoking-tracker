import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Caption } from '../kit';
import { makeStyles, useTheme } from '../theme';

const MAX_BUBBLES = 8;
const SPAWN_MS = 800;
const RISE_MS = 6000;

interface Bubble {
  id: number;
  x: number;
  size: number;
  colour: number;
  rise: Animated.Value;
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    wrap: { gap: t.space.sm },
    field: { height: 460, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.line, backgroundColor: t.color.surface, overflow: 'hidden' },
  }),
);

/** Bubbles float up; tap to pop. Something for restless hands. */
export function BubblePop() {
  const t = useTheme();
  const styles = useStyles();
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [popped, setPopped] = useState(0);
  const [area, setArea] = useState({ width: 0, height: 460 });
  const nextId = useRef(0);
  const live = useRef(new Map<number, Animated.CompositeAnimation>());

  useEffect(() => {
    if (area.width === 0) return;
    const animations = live.current;
    const id = setInterval(() => {
      setBubbles((current) => {
        if (current.length >= MAX_BUBBLES) return current;
        const size = 44 + Math.round(Math.random() * 28);
        const bubble: Bubble = {
          id: nextId.current++,
          x: Math.random() * Math.max(0, area.width - size),
          size,
          colour: Math.floor(Math.random() * t.game.length),
          rise: new Animated.Value(0),
        };
        const animation = Animated.timing(bubble.rise, { toValue: 1, duration: RISE_MS, easing: Easing.linear, useNativeDriver: true });
        animations.set(bubble.id, animation);
        animation.start(({ finished }) => {
          animations.delete(bubble.id);
          if (finished) setBubbles((list) => list.filter((b) => b.id !== bubble.id));
        });
        return [...current, bubble];
      });
    }, SPAWN_MS);
    return () => {
      clearInterval(id);
      animations.forEach((animation) => animation.stop());
      animations.clear();
    };
  }, [area.width, t.game.length]);

  const pop = (bubble: Bubble) => {
    live.current.get(bubble.id)?.stop();
    setBubbles((list) => list.filter((b) => b.id !== bubble.id));
    setPopped((n) => n + 1);
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea({ width, height });
  };

  return (
    <View style={styles.wrap}>
      <Caption tone="faint">Popped: {popped}</Caption>
      <View style={styles.field} onLayout={onLayout}>
        {bubbles.map((bubble) => (
          <Animated.View
            key={bubble.id}
            style={{
              position: 'absolute',
              left: bubble.x,
              top: 0,
              transform: [{ translateY: bubble.rise.interpolate({ inputRange: [0, 1], outputRange: [area.height, -bubble.size] }) }],
            }}
          >
            <Pressable
              onPress={() => pop(bubble)}
              accessibilityRole="button"
              accessibilityLabel="Bubble"
              hitSlop={8}
              style={{
                width: bubble.size,
                height: bubble.size,
                borderRadius: bubble.size / 2,
                borderWidth: 3,
                borderColor: t.game[bubble.colour],
                backgroundColor: t.color.surfaceSunken,
              }}
            />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}
