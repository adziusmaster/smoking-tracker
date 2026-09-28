import { nextRandom } from './random';

export interface MemoryCard {
  symbol: number;
  faceUp: boolean;
  matched: boolean;
}

export interface MemoryState {
  cards: MemoryCard[];
  moves: number;
  seed: number;
}

/** A shuffled deck with each symbol twice, all face down. */
export function newMemory(seed: number, pairs = 6): MemoryState {
  const symbols = Array.from({ length: pairs * 2 }, (_, i) => Math.floor(i / 2));
  let current = seed;
  // Fisher–Yates, driven by the seeded generator so a given seed always deals the same deck.
  for (let i = symbols.length - 1; i > 0; i -= 1) {
    const r = nextRandom(current);
    current = r.seed;
    const j = Math.floor(r.value * (i + 1));
    const a = symbols[i];
    const b = symbols[j];
    if (a === undefined || b === undefined) continue;
    symbols[i] = b;
    symbols[j] = a;
  }
  return { cards: symbols.map((symbol) => ({ symbol, faceUp: false, matched: false })), moves: 0, seed: current };
}

const unresolved = (s: MemoryState) => s.cards.filter((c) => c.faceUp && !c.matched);

/** Two cards are showing and they do not match: the UI hides them after a short pause. */
export function needsHide(s: MemoryState): boolean {
  return unresolved(s).length === 2;
}

export function flip(s: MemoryState, index: number): MemoryState {
  const card = s.cards[index];
  if (!card || card.faceUp || card.matched || needsHide(s)) return s;

  const cards = s.cards.map((c, i) => (i === index ? { ...c, faceUp: true } : c));
  const open = cards.filter((c) => c.faceUp && !c.matched);
  if (open.length < 2) return { ...s, cards };

  const [first, second] = open;
  const matched = first !== undefined && second !== undefined && first.symbol === second.symbol;
  return {
    ...s,
    moves: s.moves + 1,
    cards: matched ? cards.map((c) => (c.faceUp && !c.matched ? { ...c, matched: true } : c)) : cards,
  };
}

export function hideUnmatched(s: MemoryState): MemoryState {
  return { ...s, cards: s.cards.map((c) => (c.faceUp && !c.matched ? { ...c, faceUp: false } : c)) };
}

export function isWon(s: MemoryState): boolean {
  return s.cards.every((c) => c.matched);
}

/** Which picture deck a round uses: cycles through all of them, so the next round always differs. */
export function deckIndexForRound(round: number, deckCount: number): number {
  if (deckCount <= 0) return 0;
  return ((round % deckCount) + deckCount) % deckCount;
}
