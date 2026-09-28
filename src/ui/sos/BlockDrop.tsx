import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  ghost,
  gravityMs,
  hardDrop,
  moveBy,
  newBlocks,
  pieceCells,
  rotate,
  softDrop,
  tick,
  visibleBoard,
  type PieceKind,
} from '@/domain/games/blocks';
import { Body, Button, Caption, Label } from '../kit';
import { makeStyles, useTheme } from '../theme';
import { useGameRecord } from '../useGameRecord';

const SOFT_DROP_MS = 60;
const FLASH_MS = 220;
const KIND_COLOUR: Record<PieceKind, number> = { I: 0, O: 1, T: 2, S: 3, Z: 4, J: 5, L: 6 };

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    wrap: { alignItems: 'center', gap: t.space.sm },
    stats: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'space-between', alignItems: 'flex-start' },
    stat: { alignItems: 'center', minWidth: 56 },
    statValue: { fontFamily: t.family.bold, fontSize: t.font.heading, color: t.color.ink, fontVariant: ['tabular-nums'] },
    playfield: { flexDirection: 'row', gap: t.space.md, alignItems: 'flex-start' },
    board: { borderWidth: 1, borderColor: t.color.line, backgroundColor: t.color.surface, borderRadius: t.radius.sm, overflow: 'hidden' },
    row: { flexDirection: 'row' },
    cell: { borderWidth: 0.5, borderColor: t.color.surfaceSunken },
    side: { alignItems: 'center', gap: t.space.xs },
    preview: { padding: 6, borderRadius: t.radius.sm, borderWidth: 1, borderColor: t.color.line, backgroundColor: t.color.surface },
    controls: { flexDirection: 'row', gap: t.space.sm },
    control: { width: 64, height: 52, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.line, backgroundColor: t.color.surface, alignItems: 'center', justifyContent: 'center' },
    controlPressed: { backgroundColor: t.color.doneWash, borderColor: t.color.accent },
    controlText: { fontFamily: t.family.bold, fontSize: 22, color: t.color.ink },
  }),
);

/**
 * Falling-blocks puzzle: next-piece preview, a ghost where the piece will land, levels that
 * speed up every 10 lines, and scoring. Buttons for every move (hold ▼ to drop faster); swipes
 * and taps on the board as a shortcut.
 */
export function BlockDrop(props: { onClear: () => void }) {
  const t = useTheme();
  const styles = useStyles();
  const record = useGameRecord('blocks');
  const { width, height } = useWindowDimensions();
  const [game, setGame] = useState(() => newBlocks(Date.now() & 0x7fffffff));
  const [flashRows, setFlashRows] = useState<number[]>([]);
  const [newBest, setNewBest] = useState(false);
  const soft = useRef<ReturnType<typeof setInterval> | null>(null);
  const cell = Math.floor(Math.min((width - 150) / BOARD_WIDTH, (height * 0.46) / BOARD_HEIGHT));

  // Gravity follows the level: a new interval whenever the level (or game over) changes.
  useEffect(() => {
    if (game.over) return;
    const id = setInterval(() => setGame((current) => tick(current)), gravityMs(game.level));
    return () => clearInterval(id);
  }, [game.over, game.level]);

  // Flash the rows a lock just cleared, and give a little feedback.
  const lines = useRef(0);
  useEffect(() => {
    if (game.lines > lines.current && game.lastCleared.length > 0) {
      setFlashRows(game.lastCleared);
      props.onClear();
      const id = setTimeout(() => setFlashRows([]), FLASH_MS);
      lines.current = game.lines;
      return () => clearTimeout(id);
    }
    lines.current = game.lines;
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.lines]);

  useEffect(() => {
    // The held ▼ unmounts with the controls at game over without an onPressOut, so stop here.
    if (game.over) stopSoftDrop();
    if (game.over) setNewBest(record.submit(game.score));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.over]);

  // Leaving mid-game ("It's passed", another activity) still counts the score toward the best.
  const latest = useRef(game);
  latest.current = game;
  useEffect(
    () => () => {
      if (!latest.current.over) record.submit(latest.current.score);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const stopSoftDrop = () => {
    if (soft.current) clearInterval(soft.current);
    soft.current = null;
  };
  useEffect(() => stopSoftDrop, []);

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
  const ghostCells = useMemo(() => {
    if (game.over) return new Set<string>();
    return new Set(pieceCells(ghost(game)).map(([x, y]) => `${x},${y}`));
  }, [game]);
  const pieceColour = t.game[KIND_COLOUR[game.piece.kind]] ?? t.color.accent;

  const restart = () => {
    stopSoftDrop();
    setNewBest(false);
    lines.current = 0;
    setGame(newBlocks(Date.now() & 0x7fffffff));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.stats}>
        <Stat label="Score" value={game.score} />
        <Stat label="Lines" value={game.lines} />
        <Stat label="Level" value={game.level + 1} />
        <View style={styles.stat}>
          <Caption tone={newBest ? 'achieve' : 'faint'}>{newBest ? 'New best!' : 'Best'}</Caption>
          <Text style={styles.statValue}>{record.best ?? '—'}</Text>
        </View>
      </View>

      <View style={styles.playfield}>
        <View
          style={styles.board}
          {...pan.panHandlers}
          accessible
          accessibilityLabel={`Block drop board. Score ${game.score}, ${game.lines} lines, level ${game.level + 1}.`}
        >
          {board.map((row, y) => {
            const flashing = flashRows.includes(y);
            return (
              <View key={y} style={styles.row}>
                {row.map((value, x) => {
                  const isGhost = value === 0 && ghostCells.has(`${x},${y}`);
                  return (
                    <View
                      key={x}
                      style={[
                        styles.cell,
                        { width: cell, height: cell, backgroundColor: flashing ? t.color.achieve : value === 0 ? t.color.surface : t.game[value - 1] },
                        isGhost && { borderWidth: 2, borderColor: pieceColour, opacity: 0.45 },
                      ]}
                    />
                  );
                })}
              </View>
            );
          })}
        </View>
        <View style={styles.side}>
          <Caption tone="faint">Next</Caption>
          <NextPiece kind={game.next} cell={Math.max(10, Math.round(cell * 0.7))} />
        </View>
      </View>

      {game.over ? (
        <>
          <Body>Game over — {game.score} points, {game.lines} {game.lines === 1 ? 'line' : 'lines'}.</Body>
          <Button label="Play again" variant="secondary" onPress={restart} />
        </>
      ) : (
        <View style={styles.controls}>
          <Control label="◀" name="Move left" onPress={() => setGame((s) => moveBy(s, -1))} />
          <Control label="⟳" name="Rotate" onPress={() => setGame(rotate)} />
          <Control label="▶" name="Move right" onPress={() => setGame((s) => moveBy(s, 1))} />
          <Control
            label="▼"
            name="Drop faster (hold)"
            onPressIn={() => {
              stopSoftDrop();
              setGame(softDrop);
              soft.current = setInterval(() => setGame(softDrop), SOFT_DROP_MS);
            }}
            onPressOut={stopSoftDrop}
          />
          <Control label="⤓" name="Drop" onPress={() => setGame(hardDrop)} />
        </View>
      )}
    </View>
  );
}

function Stat(props: { label: string; value: number }) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Caption tone="faint">{props.label}</Caption>
      <Text style={styles.statValue}>{props.value}</Text>
    </View>
  );
}

function NextPiece(props: { kind: PieceKind; cell: number }) {
  const t = useTheme();
  const styles = useStyles();
  const cells = pieceCells({ kind: props.kind, rotation: 0, x: 0, y: 0 });
  const set = new Set(cells.map(([x, y]) => `${x},${y}`));
  const colour = t.game[KIND_COLOUR[props.kind]] ?? t.color.accent;
  return (
    <View style={styles.preview} accessible accessibilityLabel={`Next piece: ${props.kind}`}>
      {[0, 1].map((y) => (
        <View key={y} style={{ flexDirection: 'row' }}>
          {[0, 1, 2, 3].map((x) => (
            <View
              key={x}
              style={{ width: props.cell, height: props.cell, margin: 1, borderRadius: 2, backgroundColor: set.has(`${x},${y}`) ? colour : 'transparent' }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function Control(props: { label: string; name: string; onPress?: () => void; onPressIn?: () => void; onPressOut?: () => void }) {
  const styles = useStyles();
  return (
    <Pressable
      style={({ pressed }) => [styles.control, pressed && styles.controlPressed]}
      {...(props.onPress ? { onPress: props.onPress } : {})}
      {...(props.onPressIn ? { onPressIn: props.onPressIn } : {})}
      {...(props.onPressOut ? { onPressOut: props.onPressOut } : {})}
      accessibilityRole="button"
      accessibilityLabel={props.name}
    >
      <Text style={styles.controlText}>{props.label}</Text>
    </Pressable>
  );
}
