import { MS_PER_DAY, type DangerTips, type Phase } from '@/domain/types';

const DAYS = (n: number) => n * MS_PER_DAY;
const MONTHS = (n: number) => n * 30.44 * MS_PER_DAY;
const YEARS = (n: number) => n * 365.25 * MS_PER_DAY;

/*
 * Each field has one job, so the two paragraphs never say the same thing twice:
 *   whatsHappening     — your body and brain right now: physical, specific, sourced.
 *   whyYouFeelThisWay  — the psychology of this stage: why the feelings take the shape they do.
 *   howToCope          — concrete things to do.
 * `sources` lists every source id the phase copy leans on; the app renders them as links.
 */

/** Ordered and contiguous: each phase starts exactly where the previous one ends. */
export const PHASES: Phase[] = [
  {
    id: 'crash',
    name: 'The Crash',
    startMs: 0,
    endMs: DAYS(3),
    whatsHappening:
      "Two things are leaving your blood at once. Carbon monoxide, which was taking up room that oxygen should use, is back to a non-smoker’s level within about a day. Nicotine drops fast too — half of it is gone every couple of hours — and within about three days it has cleared.",
    whatsHappeningNicotine:
      "Nicotine is clearing out fast: about half of what is in your blood is gone every couple of hours, and within about three days it has cleared. For the first time in a long while, your brain is running without its regular top-up.",
    whatsHappeningOral:
      "Nicotine is clearing out fast and will be gone within about three days. Pouches deliver more than most people think — a 4 mg pouch gives roughly nine-tenths of a cigarette’s total nicotine exposure — so your brain is noticing the difference.",
    whyYouFeelThisWay:
      "Withdrawal usually starts within hours and peaks around day three. A short fuse, restlessness, headaches and a mind that keeps circling back to it are the textbook signs of a brain recalibrating. They say nothing about your character, and they do not last.",
    howToCope: [
      "Use the 4 Ds when a craving hits: delay, deep breathe, drink water, distract. It peaks and passes in 3–5 minutes.",
      "Avoid alcohol entirely this week. It removes exactly the judgement you are relying on.",
      "Change the routines you used to pair with it — a different route, a different coffee spot, a different break.",
      "Nicotine replacement is not cheating. Patches, gum or lozenges roughly double your odds.",
      "This is the worst it gets. Every hour from here is downhill.",
    ],
    howToCopeSmokeOnly: [],
    nameNicotine: null,
    sources: ['acs', 'benowitz-2009', 'withdrawal-peak', 'heshmati-2025'],
  },
  {
    id: 'fog',
    name: 'The Fog',
    startMs: DAYS(3),
    endMs: DAYS(28),
    whatsHappening:
      "The nicotine is gone and your senses are waking up. Many people notice food tasting of more and smells getting sharper in these first weeks, and the withdrawal curve is already on its way down.",
    whatsHappeningNicotine:
      "The nicotine is gone and the withdrawal curve has turned. Symptoms peak in the first week and fade over the next two to four, so each day now is a little easier on your body than the one before.",
    whatsHappeningOral: null,
    whyYouFeelThisWay:
      "This stretch feels less dramatic and more draining. Broken sleep, a bigger appetite and a foggy head are recognised withdrawal symptoms, not new problems. Cravings change shape too: fewer sudden waves, more moments that catch you at the old times of day.",
    howToCope: [
      "Protect your sleep: same bedtime, no caffeine after mid-afternoon, screens down early.",
      "Eat properly and drink water. Appetite changes are normal and usually settle.",
      "Move your body daily, even a walk. It blunts cravings and helps you sleep.",
      "Expect the brain fog. Do not make this the week you take on something hard at work.",
    ],
    howToCopeSmokeOnly: [],
    nameNicotine: null,
    sources: ['hughes-2007', 'nhs-withdrawal', 'taste-smell'],
  },
  {
    id: 'consolidation',
    name: 'Consolidation',
    startMs: DAYS(28),
    endMs: MONTHS(6),
    whatsHappening:
      "Your lungs are doing repair work. Coughing and shortness of breath ease over the months ahead, and your blood has been carrying a normal amount of oxygen for weeks.",
    whatsHappeningNicotine:
      "Physically, the hard part is over. Your brain grew extra nicotine receptors to cope with a steady supply, and they are settling back — one small brain-imaging study saw them back at normal levels after six to twelve weeks.",
    whatsHappeningOral: null,
    whyYouFeelThisWay:
      "What’s left is learned. For years, certain moments came with nicotine — coffee, a work break, a drink, the end of a meal, a stressful call — and your brain still expects it there. That is why a craving can appear out of nowhere at the same time every day. Each one still passes in a few minutes.",
    howToCope: [
      "The risk now is complacency. \"I could handle just one\" is a symptom, not a plan.",
      "Name your remaining triggers and have a specific answer ready for each one.",
      "Bank the money somewhere visible. Abstract savings do not motivate; a number that grows does.",
    ],
    howToCopeSmokeOnly: [],
    nameNicotine: null,
    sources: ['acs', 'nachr', 'hse-cravings'],
  },
  {
    id: 'long-haul',
    name: 'The Long Haul',
    startMs: MONTHS(6),
    endMs: YEARS(10),
    whatsHappening:
      "The risk curves bend. Heart attack risk drops sharply in years one to two; mouth, throat and larynx cancer risk halves across years five to ten.",
    whatsHappeningNicotine:
      "Nicotine has been out of your life for months. How quickly long-term risk falls after stopping this product has not been measured yet, but the exposure itself has stopped.",
    whatsHappeningOral: null,
    whyYouFeelThisWay:
      "Most days it barely crosses your mind, which is exactly how it should feel. Now and then an ambush craving arrives with stress, grief or alcohol, sometimes years in. It is an old memory firing, not a need.",
    howToCope: [
      "An ambush craving after two years is normal and means nothing about your progress.",
      "Do not test yourself. There is no version of one {unit} that proves you are in control.",
      "Keep the reason you quit somewhere you will see it.",
    ],
    howToCopeSmokeOnly: [],
    nameNicotine: null,
    sources: ['acs', 'who-htp-2020'],
  },
  {
    id: 'non-smoker',
    name: 'Non-Smoker',
    startMs: YEARS(10),
    endMs: null,
    whatsHappening:
      "Lung cancer risk is about half a smoker’s. By year fifteen coronary heart disease risk is close to someone who never smoked, and by year twenty several cancer risks are too.",
    whatsHappeningNicotine:
      "More than ten years without nicotine. Whatever your body adjusted to back then, it has had a decade to adjust back.",
    whatsHappeningOral: null,
    whyYouFeelThisWay:
      "It is simply something you used to do. If a craving ever surprises you now, it passes like any other stray thought.",
    howToCope: ["You are statistically close to someone who never started. That is the whole point."],
    howToCopeSmokeOnly: [],
    nameNicotine: 'Nicotine-Free',
    sources: ['acs'],
  },
];

/** Overrides the active phase's tips while a post-slip danger window is open. */
export const DANGER_WINDOW_TIPS: DangerTips = {
  whatsHappening: {
    smoke:
      "The fast-moving markers — carbon monoxide and nicotine — restarted from that slip. Everything measured in months and years kept going, because those depend on cumulative exposure, and one slip barely registers against it.",
    nicotine:
      "The fast-moving markers — nicotine and withdrawal — restarted from that slip. Everything measured in weeks and months kept going, because one slip barely registers against them.",
  },
  whyYouFeelThisWay:
    "A slip is one of the strongest predictors of a full return, and on average the slide from lapse to relapse takes about 19 days. You are in that window now. The pull you feel is real and well documented — it is not weakness.",
  howToCope: [
    "Re-commit today, not tomorrow.",
    "One {unit} is not a failed quit attempt. Treating it as one is what turns it into a relapse.",
    "Write down what actually happened before you forget — where you were, who you were with, what you felt.",
    "Remove the means. Get rid of anything you bought.",
    "If you are near the person or place it happened, avoid it for the rest of this window.",
  ],
  sources: ['lapse-relapse', 'kenford-1994'],
};
