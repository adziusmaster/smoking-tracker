/** Picture decks for memory pairs; a different one each round. Six cards per deck. */
export interface MemoryDeck {
  name: string;
  cards: { glyph: string; name: string }[];
}

export const MEMORY_DECKS: MemoryDeck[] = [
  {
    name: 'What you get back',
    cards: [
      { glyph: '😴', name: 'sleep' },
      { glyph: '🌿', name: 'fresh air' },
      { glyph: '🏃', name: 'running' },
      { glyph: '🍓', name: 'taste' },
      { glyph: '💰', name: 'money' },
      { glyph: '⏰', name: 'time' },
    ],
  },
  {
    name: 'Animals',
    cards: [
      { glyph: '🦊', name: 'fox' },
      { glyph: '🐙', name: 'octopus' },
      { glyph: '🦉', name: 'owl' },
      { glyph: '🐢', name: 'turtle' },
      { glyph: '🦋', name: 'butterfly' },
      { glyph: '🐳', name: 'whale' },
    ],
  },
  {
    name: 'Space',
    cards: [
      { glyph: '🚀', name: 'rocket' },
      { glyph: '🌙', name: 'moon' },
      { glyph: '☄️', name: 'comet' },
      { glyph: '🛸', name: 'flying saucer' },
      { glyph: '🌍', name: 'earth' },
      { glyph: '⭐', name: 'star' },
    ],
  },
  {
    name: 'Snacks',
    cards: [
      { glyph: '🍕', name: 'pizza' },
      { glyph: '🍩', name: 'doughnut' },
      { glyph: '🍉', name: 'watermelon' },
      { glyph: '🌮', name: 'taco' },
      { glyph: '🍣', name: 'sushi' },
      { glyph: '🧁', name: 'cupcake' },
    ],
  },
  {
    name: 'Ocean',
    cards: [
      { glyph: '🐠', name: 'fish' },
      { glyph: '🦀', name: 'crab' },
      { glyph: '🐚', name: 'shell' },
      { glyph: '🐬', name: 'dolphin' },
      { glyph: '🦑', name: 'squid' },
      { glyph: '🌊', name: 'wave' },
    ],
  },
];
