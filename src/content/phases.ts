import { MS_PER_DAY, type Phase } from '@/domain/types';

const DAYS = (n: number) => n * MS_PER_DAY;
const MONTHS = (n: number) => n * 30.44 * MS_PER_DAY;
const YEARS = (n: number) => n * 365.25 * MS_PER_DAY;

/** Ordered and contiguous: each phase starts exactly where the previous one ends. */
export const PHASES: Phase[] = [
  {
    id: 'crash',
    name: 'The Crash',
    startMs: 0,
    endMs: DAYS(3),
    whatsHappening: "Nicotine is leaving your body. Blood carbon monoxide normalises within about a day, and nicotine is gone within three.",
    whyYouFeelThisWay: "Withdrawal starts within 4–24 hours and peaks around day 3. Irritability, headaches, mood swings and relentless cravings are your nervous system recalibrating, not a character flaw.",
    howToCope: [
      "Use the 4 Ds when a craving hits: delay, deep breathe, drink water, distract. It peaks and passes in 3–5 minutes.",
      "Avoid alcohol entirely this week. It removes exactly the judgement you are relying on.",
      "Change your routine where you used to smoke — different route, different coffee spot, different break.",
      "Nicotine replacement is not cheating. Patches, gum or lozenges roughly double your odds.",
      "This is the worst it gets. Every hour from here is downhill.",
    ],
  },
  {
    id: 'fog',
    name: 'The Fog',
    startMs: DAYS(3),
    endMs: DAYS(28),
    whatsHappening: "Physical withdrawal is fading. Taste and smell start returning around two weeks.",
    whyYouFeelThisWay: "The sharp cravings give way to something duller — broken sleep, a bigger appetite, and genuine trouble concentrating. Withdrawal insomnia usually resolves within 1–2 weeks and the rest fades over 3–4.",
    howToCope: [
      "Protect your sleep: same bedtime, no caffeine after mid-afternoon, screens down early.",
      "Eat properly and drink water. Appetite changes are normal and temporary.",
      "Move your body daily, even a walk. It blunts cravings and helps you sleep.",
      "Expect the brain fog. Do not make this the week you take on something hard at work.",
    ],
  },
  {
    id: 'consolidation',
    name: 'Consolidation',
    startMs: DAYS(28),
    endMs: MONTHS(6),
    whatsHappening: "Your airways are clearing. Coughing and breathlessness decrease across the first year.",
    whyYouFeelThisWay: "The chemistry is over. What is left is situational — cravings triggered by a place, a mood or a person, lasting 3–5 minutes whether you feed them or not.",
    howToCope: [
      "The risk now is complacency. \"I could handle just one\" is a symptom, not a plan.",
      "Name your remaining triggers and have a specific answer ready for each one.",
      "Bank the money somewhere visible. Abstract savings do not motivate; a number that grows does.",
      "If the cough got worse before it got better, that is cilia clearing tar. It is progress, not damage.",
    ],
  },
  {
    id: 'long-haul',
    name: 'The Long Haul',
    startMs: MONTHS(6),
    endMs: YEARS(10),
    whatsHappening: "The risk curves bend. Heart attack risk drops sharply in years 1–2; mouth, throat and larynx cancer risk halves across years 5–10.",
    whyYouFeelThisWay: "You are a non-smoker now, and it mostly feels like nothing. Occasional ambush cravings still arrive with stress, grief or alcohol, sometimes years in.",
    howToCope: [
      "An ambush craving after two years is normal and means nothing about your progress.",
      "Do not test yourself. There is no version of one cigarette that proves you are in control.",
      "Keep the reason you quit somewhere you will see it.",
    ],
  },
  {
    id: 'non-smoker',
    name: 'Non-Smoker',
    startMs: YEARS(10),
    endMs: null,
    whatsHappening: "Lung cancer risk is about half a smoker’s. By year 15 coronary heart disease risk is close to someone who never smoked, and by year 20 several cancer risks are too.",
    whyYouFeelThisWay: "Nothing to manage. Smoking is something you used to do.",
    howToCope: [
      "You are statistically close to someone who never started. That is the whole point.",
    ],
  },
];

/** Overrides the active phase's tips while a post-slip danger window is open. */
export const DANGER_WINDOW_TIPS = {
  whatsHappening: "You logged a slip. The fast-moving markers — carbon monoxide and nicotine — restarted from that cigarette. Everything measured in months and years kept going, because those depend on cumulative exposure and one cigarette barely registers against it.",
  whyYouFeelThisWay: "A single slip is the strongest known predictor of a full return to smoking, and the average slide from lapse to relapse takes about 19 days. You are in that window now. The pull you are feeling is real and well documented — it is not weakness.",
  howToCope: [
    "Re-commit today, not tomorrow. Immediacy is the single biggest factor in whether a slip stays a slip.",
    "One cigarette is not a failed quit attempt. Treating it as one is what turns it into a relapse.",
    "Write down what actually happened before you forget — where you were, who you were with, what you felt.",
    "Remove the means. Get rid of anything you bought.",
    "If you are near the person or place it happened, avoid it for the rest of this window.",
  ],
} as const;
