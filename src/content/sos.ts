import type { ActivityId, CopyVariants } from '@/domain/types';

export interface SosStep {
  id: string;
  seconds: number;
  heading: string;
  instruction: string;
}

/** The 4 Ds, timed. Totals 300 seconds because a craving peaks and passes in 3–5 minutes. */
export const SOS_STEPS: SosStep[] = [
  {
    id: 'delay',
    seconds: 60,
    heading: 'Delay',
    instruction: 'You are not saying no forever. You are saying not in the next minute. That is all this screen is asking.',
  },
  {
    id: 'breathe',
    seconds: 90,
    heading: 'Breathe',
    instruction: 'In through your nose for four counts, hold for four, out through your mouth for six. Keep going until the number below runs out.',
  },
  {
    id: 'drink',
    seconds: 60,
    heading: 'Drink water',
    instruction: 'Get a full glass and finish it slowly. It occupies your hands and your mouth, which is most of what a {unit} was doing.',
  },
  {
    id: 'distract',
    seconds: 90,
    heading: 'Distract',
    instruction: 'Leave the room you are in. Walk somewhere, message someone, wash something. The craving needs your attention to survive.',
  },
];

export const SOS_TOTAL_SECONDS = SOS_STEPS.reduce((total, step) => total + step.seconds, 0);

/**
 * The same words for everyone: someone quitting IQOS can slip on a cigarette, and an ex-vaper on a
 * vape, so the craving and slip buttons never name a product.
 */
export const CRAVING_BUTTON = 'I’m having a craving';
export const SLIP_BUTTON = 'I slipped';

/** Shown on the slip screen. The smoke variant names carbon monoxide; the other cannot. */
export const SLIP_REASSURANCE: CopyVariants<string> = {
  smoke:
    'One {unit} is not a failed quit attempt — treating it as one is what turns it into a relapse. Your carbon monoxide and nicotine clocks restart from this. Everything measured in months and years keeps running, because those depend on cumulative exposure and this barely registers against it.',
  nicotine:
    'One {unit} is not a failed quit attempt — treating it as one is what turns it into a relapse. Your nicotine clocks restart from this. Everything measured in weeks and months keeps running.',
};

export interface Activity {
  id: ActivityId;
  title: string;
  blurb: string;
  /** Only for an activity with evidence behind it; rendered as a link. */
  sourceId: string | null;
}

/** "Ride it out" choices. Only block drop makes an evidence claim; the others are ways to keep busy. */
export const ACTIVITIES: Activity[] = [
  { id: 'breathe', title: 'Breathe', blurb: 'Follow the circle: in for four, hold for four, out for six.', sourceId: null },
  {
    id: 'blocks',
    title: 'Block drop',
    blurb: 'A small real-world study found that three minutes of a Tetris-style game weakened cravings, nicotine included.',
    sourceId: 'tetris-cravings',
  },
  { id: 'memory', title: 'Memory pairs', blurb: 'Find the six matching pairs. Slow and steady works.', sourceId: null },
  { id: 'bubbles', title: 'Bubble pop', blurb: 'Pop the bubbles as they float up. Something for your hands to do.', sourceId: null },
  { id: 'grounding', title: '5-4-3-2-1', blurb: 'Name what is around you, one sense at a time.', sourceId: null },
  { id: 'water', title: 'Drink water', blurb: 'A full glass, slowly. It keeps your hands and mouth busy.', sourceId: null },
];

export interface GroundingStep {
  count: number;
  prompt: string;
}

export const GROUNDING_STEPS: GroundingStep[] = [
  { count: 5, prompt: 'things you can see' },
  { count: 4, prompt: 'things you can touch' },
  { count: 3, prompt: 'things you can hear' },
  { count: 2, prompt: 'things you can smell' },
  { count: 1, prompt: 'thing you can taste' },
];
