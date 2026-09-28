import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT, BOARD_WIDTH, hardDrop, moveBy, newBlocks, rotate, tick, visibleBoard, type BlocksState, type Cell } from './blocks';

const emptyBoard = (): Cell[][] => Array.from({ length: BOARD_HEIGHT }, () => Array<Cell>(BOARD_WIDTH).fill(0));
const withPiece = (s: BlocksState, piece: BlocksState['piece']): BlocksState => ({ ...s, piece });
const filled = (board: Cell[][]) => board.flat().filter((c) => c !== 0).length;

describe('blocks', () => {
  it('newBlocks_freshGame_hasEmptyBoardAndAPieceAtTheTop', () => {
    // Arrange & Act
    const s = newBlocks(1);

    // Assert
    expect(filled(s.board)).toBe(0);
    expect(s.piece.y).toBe(0);
    expect(s.over).toBe(false);
    expect(filled(visibleBoard(s))).toBe(4);
  });

  it('moveBy_intoTheLeftWall_returnsTheSameState', () => {
    // Arrange — an O piece hugging the left wall
    const s = withPiece(newBlocks(1), { kind: 'O', rotation: 0, x: 0, y: 5 });

    // Act
    const moved = moveBy(s, -1);

    // Assert
    expect(moved).toBe(s);
  });

  it('rotate_iPieceAgainstTheRightWall_kicksInsideTheBoard', () => {
    // Arrange — a vertical I in the last column cannot rotate flat without a kick
    const s = withPiece(newBlocks(1), { kind: 'I', rotation: 1, x: BOARD_WIDTH - 3, y: 5 });

    // Act
    const rotated = rotate(s);

    // Assert
    expect(rotated).not.toBe(s);
    expect(visibleBoard(rotated).flat().filter((c) => c !== 0)).toHaveLength(4);
    expect(rotated.piece.rotation).toBe(2);
  });

  it('tick_pieceOnTheFloor_locksItAndSpawnsTheNextPiece', () => {
    // Arrange — an O resting on the floor
    const s = withPiece(newBlocks(3), { kind: 'O', rotation: 0, x: 4, y: BOARD_HEIGHT - 2 });

    // Act
    const next = tick(s);

    // Assert
    expect(filled(next.board)).toBe(4);
    expect(next.piece.y).toBe(0);
    expect(next.piece.kind).toBe(s.next);
  });

  it('tick_lockingCompletesARow_clearsItAndCountsTheLine', () => {
    // Arrange — bottom row full except the two cells an O will fill
    const board = emptyBoard();
    const bottom = board[BOARD_HEIGHT - 1];
    const above = board[BOARD_HEIGHT - 2];
    if (!bottom || !above) throw new Error('fixture');
    for (let x = 0; x < BOARD_WIDTH; x += 1) if (x !== 4 && x !== 5) bottom[x] = 1;
    const s: BlocksState = { ...newBlocks(3), board, piece: { kind: 'O', rotation: 0, x: 4, y: BOARD_HEIGHT - 2 } };

    // Act
    const next = tick(s);

    // Assert — the full row is gone; the O's top half dropped into the bottom row
    expect(next.lines).toBe(1);
    expect(filled(next.board)).toBe(2);
    expect(next.board[BOARD_HEIGHT - 1]?.[4]).not.toBe(0);
  });

  it('tick_spawnBlocked_endsTheGame', () => {
    // Arrange — the spawn rows are occupied but not full (full rows would simply clear)
    const board = emptyBoard();
    for (let y = 0; y < 3; y += 1) board[y] = Array.from({ length: BOARD_WIDTH }, (_, x): Cell => (x === BOARD_WIDTH - 1 ? 0 : 2));
    const s: BlocksState = { ...newBlocks(3), board, piece: { kind: 'O', rotation: 0, x: 4, y: BOARD_HEIGHT - 2 } };

    // Act
    const next = tick(s);

    // Assert
    expect(next.over).toBe(true);
  });

  it('hardDrop_emptyBoard_locksThePieceOnTheFloor', () => {
    // Arrange
    const s = withPiece(newBlocks(5), { kind: 'O', rotation: 0, x: 4, y: 0 });

    // Act
    const next = hardDrop(s);

    // Assert
    expect(next.board[BOARD_HEIGHT - 1]?.[4]).not.toBe(0);
    expect(next.board[BOARD_HEIGHT - 2]?.[5]).not.toBe(0);
    expect(filled(next.board)).toBe(4);
  });

  it('moveBy_whenGameOver_doesNothing', () => {
    // Arrange
    const s = { ...newBlocks(1), over: true };

    // Act
    const moved = moveBy(s, 1);

    // Assert
    expect(moved).toBe(s);
  });
});
