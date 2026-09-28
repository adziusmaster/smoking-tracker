import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { bubbleTop, hitBubble, type RisingBubble } from '@/domain/games/bubbles';
import { Caption, Label } from '../kit';
import { makeStyles, useTheme } from '../theme';
import { useGameRecord } from '../useGameRecord';

const MAX_BUBBLES = 8;
const RISE_MS_START = 6000;
const RISE_MS_FASTEST = 3200;
const SPAWN_MS = 800;
const FIELD_HEIGHT = 460;
const BURST_MS = 280;
const DROPLETS = 7;

interface Bubble extends RisingBubble {
  colour: number;
  rise: Animated.Value;
  animation: Animated.CompositeAnimation;
}

interface Burst {
  id: number;
  x: number;
  y: number;
  size: number;
  colour: number;
  progress: Animated.Value;
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    wrap: { gap: t.space.sm },
    stats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    field: { height: FIELD_HEIGHT, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.line, backgroundColor: t.color.surface, overflow: 'hidden' },
  }),
);

/**
 * Bubbles float up, a little faster as you go; tap to pop them. The bubbles are drawn only
 * (`pointerEvents="none"`): the field takes every touch and asks `hitBubble` which one is under
 * the finger, because Android's hit testing ignores native-driver transforms.
 */
export function BubblePop(props: { onPop: () => void }) {
  const t = useTheme();
  const styles = useStyles();
  const record = useGameRecord('bubbles');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [popped, setPopped] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [width, setWidth] = useState(0);
  const live = useRef<Bubble[]>([]);
  const poppedRef = useRef(0);
  const nextId = useRef(0);

  const remove = (id: number) => {
    live.current = live.current.filter((b) => b.id !== id);
    setBubbles(live.current);
  };

  useEffect(() => {
    if (width === 0) return;
    const spawn = setInterval(() => {
      if (live.current.length >= MAX_BUBBLES) return;
      // Every pop shaves a little off the rise time, down to a floor: it speeds up gently.
      const riseMs = Math.max(RISE_MS_FASTEST, RISE_MS_START - poppedRef.current * 60);
      const size = 44 + Math.round(Math.random() * 28);
      const rise = new Animated.Value(0);
      const animation = Animated.timing(rise, { toValue: 1, duration: riseMs, easing: Easing.linear, useNativeDriver: true });
      const bubble: Bubble = {
        id: nextId.current++,
        x: Math.random() * Math.max(0, width - size),
        size,
        startedAt: Date.now(),
        riseMs,
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
    const now = Date.now();
    const id = hitBubble(live.current, locationX, locationY, now, FIELD_HEIGHT);
    if (id === null) return;
    const bubble = live.current.find((b) => b.id === id);
    if (!bubble) return;
    bubble.animation.stop();
    remove(id);
    props.onPop();

    const burst: Burst = { id, x: bubble.x, y: bubbleTop(bubble, now, FIELD_HEIGHT), size: bubble.size, colour: bubble.colour, progress: new Animated.Value(0) };
    setBursts((list) => [...list, burst]);
    Animated.timing(burst.progress, { toValue: 1, duration: BURST_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() =>
      setBursts((list) => list.filter((b) => b.id !== burst.id)),
    );

    poppedRef.current += 1;
    setPopped(poppedRef.current);
    if (record.submit(poppedRef.current)) setNewBest(true);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.stats}>
        <Label>Popped: {popped}</Label>
        <Caption tone={newBest ? 'achieve' : 'faint'}>
          {newBest ? 'New best!' : record.best !== null ? `Best: ${record.best}` : 'Pop as many as you can'}
        </Caption>
      </View>
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
        {bursts.map((burst) => (
          <PopBurst key={`burst-${burst.id}`} burst={burst} colour={t.game[burst.colour] ?? t.color.accent} />
        ))}
      </View>
    </View>
  );
}

/** The pop: the ring swells and fades while droplets fly outward and fade. */
function PopBurst(props: { burst: Burst; colour: string }) {
  const { burst, colour } = props;
  const radius = burst.size / 2;
  const cx = burst.x + radius;
  const cy = burst.y + radius;
  const fade = burst.progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const swell = burst.progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={{
          position: 'absolute',
          left: burst.x,
          top: burst.y,
          width: burst.size,
          height: burst.size,
          borderRadius: radius,
          borderWidth: 3,
          borderColor: colour,
          opacity: fade,
          transform: [{ scale: swell }],
        }}
      />
      {Array.from({ length: DROPLETS }, (_, i) => {
        const angle = (i / DROPLETS) * Math.PI * 2 + burst.id;
        const distance = radius + 18 + (i % 3) * 8;
        const dot = 7 - (i % 3);
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: cx - dot / 2,
              top: cy - dot / 2,
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: colour,
              opacity: fade,
              transform: [
                { translateX: burst.progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * distance] }) },
                { translateY: burst.progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * distance] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
