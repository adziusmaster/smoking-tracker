import { nextRandom } from './random';

/** A falling-blocks puzzle, kept small enough to play in the few minutes a craving lasts. */
export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 18;

export type PieceKind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
/** 0 is empty; 1–7 is the colour of the piece that left the block there. */
export type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Rotation = 0 | 1 | 2 | 3;

export interface Piece {
  kind: PieceKind;
  rotation: Rotation;
  x: number;
  y: number;
}

export interface BlocksState {
  board: Cell[][];
  piece: Piece;
  next: PieceKind;
  lines: number;
  score: number;
  /** floor(lines / 10); raises gravity speed and line points. */
  level: number;
  /** Rows cleared by the most recent lock, top to bottom, for the flash. */
  lastCleared: number[];
  over: boolean;
  seed: number;
}

const LINE_POINTS = [0, 100, 300, 500, 800];

/** Milliseconds per gravity step at `level`: 600 at level 0, 50 faster per level, never below 120. */
export function gravityMs(level: number): number {
  return Math.max(120, 600 - level * 50);
}

const KINDS: readonly PieceKind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
const COLOUR: Record<PieceKind, Cell> = { I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7 };

/** Cells of each piece at rotation 0, inside a square box of `size`. */
const SHAPES: Record<PieceKind, { size: number; cells: readonly [number, number][] }> = {
  I: { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  T: { size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};

/** Absolute board cells a piece covers. Rotation is clockwise inside the piece's box. */
export function pieceCells(piece: Piece): [number, number][] {
  const { size, cells } = SHAPES[piece.kind];
  return cells.map(([cx, cy]) => {
    let x = cx;
    let y = cy;
    for (let r = 0; r < piece.rotation; r += 1) [x, y] = [size - 1 - y, x];
    return [piece.x + x, piece.y + y];
  });
}

function fits(board: Cell[][], piece: Piece): boolean {
  return pieceCells(piece).every(
    ([x, y]) => x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_HEIGHT && board[y]?.[x] === 0,
  );
}

function randomKind(seed: number): { kind: PieceKind; seed: number } {
  const r = nextRandom(seed);
  return { kind: KINDS[Math.floor(r.value * KINDS.length)] ?? 'I', seed: r.seed };
}

const spawn = (kind: PieceKind): Piece => ({ kind, rotation: 0, x: 3, y: 0 });
const emptyRow = (): Cell[] => Array<Cell>(BOARD_WIDTH).fill(0);

export function newBlocks(seed: number): BlocksState {
  const first = randomKind(seed);
  const second = randomKind(first.seed);
  return {
    board: Array.from({ length: BOARD_HEIGHT }, emptyRow),
    piece: spawn(first.kind),
    next: second.kind,
    lines: 0,
    score: 0,
    level: 0,
    lastCleared: [],
    over: false,
    seed: second.seed,
  };
}

function lockAndSpawn(s: BlocksState): BlocksState {
  const board = s.board.map((row) => [...row]);
  for (const [x, y] of pieceCells(s.piece)) {
    const row = board[y];
    if (row) row[x] = COLOUR[s.piece.kind];
  }
  const lastCleared = board.flatMap((row, y) => (row.every((cell) => cell !== 0) ? [y] : []));
  const kept = board.filter((row) => row.some((cell) => cell === 0));
  const cleared = BOARD_HEIGHT - kept.length;
  const lines = s.lines + cleared;
  const nextBoard = [...Array.from({ length: cleared }, emptyRow), ...kept];

  const upcoming = randomKind(s.seed);
  const piece = spawn(s.next);
  return {
    board: nextBoard,
    piece,
    next: upcoming.kind,
    lines,
    score: s.score + (LINE_POINTS[cleared] ?? 0) * (s.level + 1),
    level: Math.floor(lines / 10),
    lastCleared,
    over: !fits(nextBoard, piece),
    seed: upcoming.seed,
  };
}

/** Gravity: move the piece down one row, or lock it, clear full rows and spawn the next. */
export function tick(s: BlocksState): BlocksState {
  if (s.over) return s;
  const down = { ...s.piece, y: s.piece.y + 1 };
  return fits(s.board, down) ? { ...s, piece: down } : lockAndSpawn(s);
}

export function moveBy(s: BlocksState, dx: -1 | 1): BlocksState {
  if (s.over) return s;
  const moved = { ...s.piece, x: s.piece.x + dx };
  return fits(s.board, moved) ? { ...s, piece: moved } : s;
}

/** Clockwise, trying one cell left then right if the plain rotation is blocked. */
export function rotate(s: BlocksState): BlocksState {
  if (s.over) return s;
  const turned = { ...s.piece, rotation: ((s.piece.rotation + 1) % 4) as Rotation };
  for (const kick of [0, -1, 1, -2, 2]) {
    const candidate = { ...turned, x: turned.x + kick };
    if (fits(s.board, candidate)) return { ...s, piece: candidate };
  }
  return s;
}

/** Where the falling piece would land if dropped now, for the ghost outline. */
export function ghost(s: BlocksState): Piece {
  let piece = s.piece;
  while (fits(s.board, { ...piece, y: piece.y + 1 })) piece = { ...piece, y: piece.y + 1 };
  return piece;
}

/** Drop straight to the landing row: 2 points per row fallen, then lock. */
export function hardDrop(s: BlocksState): BlocksState {
  if (s.over) return s;
  const landing = ghost(s);
  return lockAndSpawn({ ...s, piece: landing, score: s.score + (landing.y - s.piece.y) * 2 });
}

/** Holding "down": one row and 1 point, or lock if the piece is resting. */
export function softDrop(s: BlocksState): BlocksState {
  if (s.over) return s;
  const down = { ...s.piece, y: s.piece.y + 1 };
  return fits(s.board, down) ? { ...s, piece: down, score: s.score + 1 } : lockAndSpawn(s);
}

/** The board with the falling piece drawn in, for rendering. */
export function visibleBoard(s: BlocksState): Cell[][] {
  const board = s.board.map((row) => [...row]);
  if (!s.over) {
    for (const [x, y] of pieceCells(s.piece)) {
      const row = board[y];
      if (row && x >= 0 && x < BOARD_WIDTH) row[x] = COLOUR[s.piece.kind];
    }
  }
  return board;
}
