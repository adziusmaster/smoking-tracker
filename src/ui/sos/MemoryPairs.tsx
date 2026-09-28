import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MEMORY_DECKS, type MemoryDeck } from '@/content/memoryDecks';
import { deckIndexForRound, flip, hideUnmatched, isWon, needsHide, newMemory } from '@/domain/games/memory';
import { Body, Button, Caption } from '../kit';
import { makeStyles } from '../theme';
import { useGameRecord } from '../useGameRecord';

const HIDE_AFTER_MS = 700;
const HALF_FLIP_MS = 90;

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    wrap: { gap: t.space.sm, alignItems: 'center' },
    stats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: t.space.lg },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, justifyContent: 'center' },
    cardSlot: { alignItems: 'center', justifyContent: 'center' },
    card: { borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.line, backgroundColor: t.color.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
    faceUp: { backgroundColor: t.color.surface, borderColor: t.color.accent },
    matched: { backgroundColor: t.color.doneWash, borderColor: t.color.doneLine },
    glyph: { fontSize: 34 },
    back: { width: 14, height: 14, borderRadius: 7, backgroundColor: t.color.line },
  }),
);

export function MemoryPairs(props: { onMatch: () => void }) {
  const record = useGameRecord('memory');
  const [newBest, setNewBest] = useState(false);
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const [game, setGame] = useState(() => newMemory(Date.now() & 0x7fffffff));
  // A different picture deck every round, starting from a random one.
  const [round, setRound] = useState(() => Date.now() & 0x7fffffff);
  const deck: MemoryDeck = MEMORY_DECKS[deckIndexForRound(round, MEMORY_DECKS.length)] ?? MEMORY_DECKS[0]!;
  const size = Math.floor(Math.min((width - 32 - 3 * 8) / 4, 88));

  useEffect(() => {
    if (!needsHide(game)) return;
    const id = setTimeout(() => setGame(hideUnmatched), HIDE_AFTER_MS);
    return () => clearTimeout(id);
  }, [game]);

  const won = isWon(game);
  const matchedCount = game.cards.filter((c) => c.matched).length;
  const lastMatched = useRef(0);
  useEffect(() => {
    if (matchedCount > lastMatched.current) props.onMatch();
    lastMatched.current = matchedCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedCount]);
  useEffect(() => {
    if (won) setNewBest(record.submit(game.moves));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  return (
    <View style={styles.wrap}>
      <View style={styles.stats}>
        <Caption tone="faint">{deck.name}</Caption>
        <Caption tone="faint">Moves: {game.moves}</Caption>
        <Caption tone={newBest ? 'achieve' : 'faint'}>
          {newBest ? 'New best!' : record.best !== null ? `Best: ${record.best} moves` : 'Fewest moves wins'}
        </Caption>
      </View>
      <View style={styles.grid}>
        {game.cards.map((card, index) => (
          <FlipCard
            key={`${round}-${index}`}
            face={deck.cards[card.symbol] ?? { glyph: '?', name: 'card' }}
            shown={card.faceUp || card.matched}
            faceUp={card.faceUp}
            matched={card.matched}
            size={size}
            onPress={() => setGame((s) => flip(s, index))}
          />
        ))}
      </View>
      {won ? (
        <>
          <Body>All six pairs in {game.moves} moves.</Body>
          <Button label="Play again" variant="secondary" onPress={() => { setNewBest(false); lastMatched.current = 0; setRound((n) => n + 1); setGame(newMemory(Date.now() & 0x7fffffff)); }} />
        </>
      ) : null}
    </View>
  );
}

/**
 * One card. Turning over squashes it to nothing and back, swapping the face at the midpoint; a
 * match gives a small bounce. The Pressable stays still and only the inner view animates, so
 * the touch target never moves. With reduce-motion on, faces swap instantly.
 */
function FlipCard(props: {
  face: { glyph: string; name: string };
  shown: boolean;
  faceUp: boolean;
  matched: boolean;
  size: number;
  onPress: () => void;
}) {
  const styles = useStyles();
  const squash = useRef(new Animated.Value(1)).current;
  const bounce = useRef(new Animated.Value(1)).current;
  const [visible, setVisible] = useState(props.shown);
  const reduced = useRef(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      reduced.current = value;
    });
  }, []);

  useEffect(() => {
    if (props.shown === visible) return;
    if (reduced.current) {
      setVisible(props.shown);
      return;
    }
    const half = { duration: HALF_FLIP_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true };
    const out = Animated.timing(squash, { ...half, toValue: 0 });
    out.start(({ finished }) => {
      if (!finished) return;
      setVisible(props.shown);
      Animated.timing(squash, { ...half, toValue: 1 }).start();
    });
    return () => {
      // Interrupted halfway (a quick re-flip): never leave the card squashed.
      out.stop();
      squash.setValue(1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.shown]);

  useEffect(() => {
    if (!props.matched || reduced.current) return;
    Animated.sequence([
      Animated.delay(HALF_FLIP_MS * 2),
      Animated.spring(bounce, { toValue: 1.12, speed: 40, bounciness: 12, useNativeDriver: true }),
      Animated.spring(bounce, { toValue: 1, speed: 20, bounciness: 8, useNativeDriver: true }),
    ]).start();
  }, [props.matched, bounce]);

  return (
    <Pressable
      onPress={props.onPress}
      style={[styles.cardSlot, { width: props.size, height: props.size }]}
      accessibilityRole="button"
      accessibilityLabel={props.shown ? `${props.face.name}${props.matched ? ', matched' : ''}` : 'Hidden card'}
    >
      <Animated.View
        style={[
          styles.card,
          { width: props.size, height: props.size, transform: [{ scaleX: squash }, { scale: bounce }] },
          visible && props.faceUp && styles.faceUp,
          visible && props.matched && styles.matched,
        ]}
      >
        {visible ? <Text style={styles.glyph}>{props.face.glyph}</Text> : <View style={styles.back} />}
      </Animated.View>
    </Pressable>
  );
}
