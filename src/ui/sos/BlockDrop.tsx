import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BOARD_HEIGHT, BOARD_WIDTH, hardDrop, moveBy, newBlocks, rotate, tick, visibleBoard } from '@/domain/games/blocks';
import { Body, Button, Caption } from '../kit';
import { makeStyles, useTheme } from '../theme';

const GRAVITY_MS = 550;

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    wrap: { alignItems: 'center', gap: t.space.sm },
    board: { borderWidth: 1, borderColor: t.color.line, backgroundColor: t.color.surface, borderRadius: t.radius.sm, overflow: 'hidden' },
    row: { flexDirection: 'row' },
    cell: { borderWidth: 0.5, borderColor: t.color.surfaceSunken },
    controls: { flexDirection: 'row', gap: t.space.sm },
    control: { width: 64, height: 48, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.line, backgroundColor: t.color.surface, alignItems: 'center', justifyContent: 'center' },
    controlText: { fontFamily: t.family.bold, fontSize: 20, color: t.color.ink },
  }),
);

/** Falling-blocks puzzle. Buttons for every move; swipes and taps on the board as a shortcut. */
export function BlockDrop() {
  const t = useTheme();
  const styles = useStyles();
  const { width, height } = useWindowDimensions();
  const [game, setGame] = useState(() => newBlocks(Date.now() & 0x7fffffff));
  const cell = Math.floor(Math.min((width - 64) / BOARD_WIDTH, (height * 0.5) / BOARD_HEIGHT));

  useEffect(() => {
    if (game.over) return;
    const id = setInterval(() => setGame((current) => tick(current)), GRAVITY_MS);
    return () => clearInterval(id);
  }, [game.over]);

  const pan = useRef(
    PanResponder.create({
      // The board sits inside a ScrollView: claim the gesture first and keep it, so a swipe
      // moves the piece instead of scrolling the page.
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        if (g.dy > 60 && Math.abs(g.dy) > Math.abs(g.dx)) setGame(hardDrop);
        else if (g.dx > 24) setGame((s) => moveBy(s, 1));
        else if (g.dx < -24) setGame((s) => moveBy(s, -1));
        else setGame(rotate);
      },
    }),
  ).current;

  const board = useMemo(() => visibleBoard(game), [game]);

  return (
    <View style={styles.wrap}>
      <Caption tone="faint">Lines cleared: {game.lines}</Caption>
      <View style={styles.board} {...pan.panHandlers} accessible accessibilityLabel={`Block drop board, ${game.lines} lines cleared`}>
        {board.map((row, y) => (
          <View key={y} style={styles.row}>
            {row.map((value, x) => (
              <View
                key={x}
                style={[styles.cell, { width: cell, height: cell, backgroundColor: value === 0 ? t.color.surface : t.game[value - 1] }]}
              />
            ))}
          </View>
        ))}
      </View>
      {game.over ? (
        <>
          <Body>Game over — {game.lines} {game.lines === 1 ? 'line' : 'lines'}.</Body>
          <Button label="Play again" variant="secondary" onPress={() => setGame(newBlocks(Date.now() & 0x7fffffff))} />
        </>
      ) : (
        <View style={styles.controls}>
          <Control label="◀" name="Move left" onPress={() => setGame((s) => moveBy(s, -1))} />
          <Control label="⟳" name="Rotate" onPress={() => setGame(rotate)} />
          <Control label="▶" name="Move right" onPress={() => setGame((s) => moveBy(s, 1))} />
          <Control label="⤓" name="Drop" onPress={() => setGame(hardDrop)} />
        </View>
      )}
    </View>
  );
}

function Control(props: { label: string; name: string; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable style={styles.control} onPress={props.onPress} accessibilityRole="button" accessibilityLabel={props.name}>
      <Text style={styles.controlText}>{props.label}</Text>
    </Pressable>
  );
}
