import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { flip, hideUnmatched, isWon, needsHide, newMemory } from '@/domain/games/memory';
import { Body, Button, Caption } from '../kit';
import { makeStyles, useTheme } from '../theme';
import { useGameRecord } from '../useGameRecord';

const GLYPHS = ['●', '■', '▲', '◆', '★', '♥'];
const NAMES = ['circle', 'square', 'triangle', 'diamond', 'star', 'heart'];
const HIDE_AFTER_MS = 700;

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    wrap: { gap: t.space.sm, alignItems: 'center' },
    stats: { flexDirection: 'row', gap: t.space.lg },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, justifyContent: 'center' },
    card: { borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.line, backgroundColor: t.color.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
    faceUp: { backgroundColor: t.color.surface, borderColor: t.color.accent },
    matched: { backgroundColor: t.color.doneWash, borderColor: t.color.doneLine },
    glyph: { fontSize: 32 },
  }),
);

export function MemoryPairs(props: { onMatch: () => void }) {
  const t = useTheme();
  const record = useGameRecord('memory');
  const [newBest, setNewBest] = useState(false);
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const [game, setGame] = useState(() => newMemory(Date.now() & 0x7fffffff));
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
        <Caption tone="faint">Moves: {game.moves}</Caption>
        <Caption tone={newBest ? 'achieve' : 'faint'}>
          {newBest ? 'New best!' : record.best !== null ? `Best: ${record.best} moves` : 'Fewest moves wins'}
        </Caption>
      </View>
      <View style={styles.grid}>
        {game.cards.map((card, index) => {
          const shown = card.faceUp || card.matched;
          return (
            <Pressable
              key={index}
              onPress={() => setGame((s) => flip(s, index))}
              style={[styles.card, { width: size, height: size }, card.faceUp && styles.faceUp, card.matched && styles.matched]}
              accessibilityRole="button"
              accessibilityLabel={shown ? `${NAMES[card.symbol] ?? 'card'}${card.matched ? ', matched' : ''}` : 'Hidden card'}
            >
              {shown ? <Text style={[styles.glyph, { color: t.game[card.symbol] }]}>{GLYPHS[card.symbol]}</Text> : null}
            </Pressable>
          );
        })}
      </View>
      {won ? (
        <>
          <Body>All six pairs in {game.moves} moves.</Body>
          <Button label="Play again" variant="secondary" onPress={() => { setNewBest(false); lastMatched.current = 0; setGame(newMemory(Date.now() & 0x7fffffff)); }} />
        </>
      ) : null}
    </View>
  );
}
