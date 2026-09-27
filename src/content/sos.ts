import type { CopyVariants } from '@/domain/types';

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

/** Shown on the slip screen. The smoke variant names carbon monoxide; the other cannot. */
export const SLIP_REASSURANCE: CopyVariants<string> = {
  smoke:
    'One {unit} is not a failed quit attempt — treating it as one is what turns it into a relapse. Your carbon monoxide and nicotine clocks restart from this. Everything measured in months and years keeps running, because those depend on cumulative exposure and this barely registers against it.',
  nicotine:
    'One {unit} is not a failed quit attempt — treating it as one is what turns it into a relapse. Your nicotine clocks restart from this. Everything measured in weeks and months keeps running.',
};
