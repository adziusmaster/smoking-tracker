import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { hitBubble, type RisingBubble } from '@/domain/games/bubbles';
import { Caption } from '../kit';
import { makeStyles, useTheme } from '../theme';

const MAX_BUBBLES = 8;
const SPAWN_MS = 800;
const RISE_MS = 6000;
const FIELD_HEIGHT = 460;

interface Bubble extends RisingBubble {
  colour: number;
  rise: Animated.Value;
  animation: Animated.CompositeAnimation;
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    wrap: { gap: t.space.sm },
    field: { height: FIELD_HEIGHT, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.line, backgroundColor: t.color.surface, overflow: 'hidden' },
  }),
);

/**
 * Bubbles float up; tap to pop. The bubbles are drawn only (`pointerEvents="none"`): the field
 * takes every touch and asks `hitBubble` which one is under the finger, because Android's hit
 * testing ignores native-driver transforms and kept each bubble's touch area at the top.
 */
export function BubblePop() {
  const t = useTheme();
  const styles = useStyles();
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [popped, setPopped] = useState(0);
  const [width, setWidth] = useState(0);
  const live = useRef<Bubble[]>([]);
  const nextId = useRef(0);

  const remove = (id: number) => {
    live.current = live.current.filter((b) => b.id !== id);
    setBubbles(live.current);
  };

  useEffect(() => {
    if (width === 0) return;
    const spawn = setInterval(() => {
      if (live.current.length >= MAX_BUBBLES) return;
      const size = 44 + Math.round(Math.random() * 28);
      const rise = new Animated.Value(0);
      const animation = Animated.timing(rise, { toValue: 1, duration: RISE_MS, easing: Easing.linear, useNativeDriver: true });
      const bubble: Bubble = {
        id: nextId.current++,
        x: Math.random() * Math.max(0, width - size),
        size,
        startedAt: Date.now(),
        riseMs: RISE_MS,
        colour: Math.floor(Math.random() * t.game.length),
        rise,
        animation,
      };
      live.current = [...live.current, bubble];
      setBubbles(live.current);
      animation.start(({ finished }) => {
        if (finished) remove(bubble.id);
      });
    }, SPAWN_MS);
    return () => {
      clearInterval(spawn);
      live.current.forEach((b) => b.animation.stop());
      live.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, t.game.length]);

  const onTouch = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const id = hitBubble(live.current, locationX, locationY, Date.now(), FIELD_HEIGHT);
    if (id === null) return;
    live.current.find((b) => b.id === id)?.animation.stop();
    remove(id);
    setPopped((n) => n + 1);
  };

  return (
    <View style={styles.wrap}>
      <Caption tone="faint">Popped: {popped}</Caption>
      <View
        style={styles.field}
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={onTouch}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Bubble field. ${popped} popped. Tap a bubble to pop it.`}
      >
        {bubbles.map((bubble) => (
          <Animated.View
            key={bubble.id}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: bubble.x,
              top: 0,
              width: bubble.size,
              height: bubble.size,
              borderRadius: bubble.size / 2,
              borderWidth: 3,
              borderColor: t.game[bubble.colour],
              backgroundColor: t.color.surfaceSunken,
              transform: [{ translateY: bubble.rise.interpolate({ inputRange: [0, 1], outputRange: [FIELD_HEIGHT, -bubble.size] }) }],
            }}
          />
        ))}
      </View>
    </View>
  );
}
