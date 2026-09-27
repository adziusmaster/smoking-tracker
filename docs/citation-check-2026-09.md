# Citation check — 2026-09-28

I checked every entry in `src/content/sources.ts` against the copy that cites it in
`src/content/milestones.ts` and `src/content/phases.ts`. PubMed and PMC pages block automated
fetches with a captcha, so I read abstracts through NCBI E-utilities (`efetch`) and full texts
through Europe PMC. Both return the same records as the URLs cited.

Legend: **Y** = yes, **N** = no, **P** = partial.

| id | URL resolves | label correct | supports claim | tier ok | action needed |
|---|---|---|---|---|---|
| benowitz-2009 | Y (PMID 19184645) | Y | P | Y | Change cotinine "16–20" to "about 16 hours". Drop "Nothing left in your bloodstream". |
| kenford-1994 | Y (PMID 8301790 is correct) | Y | P | Y | Soften "strongest early predictor". |
| larsson-1991 | Y (PMID 1890661) | P (title wording) | Y (for 3–6 months) | Y | Fix the title. Make this the primary source for `snus-mucosa`. |
| snus-lesions-2026 | Y (PMC13499737) | **N** | P | P (industry-funded) | Relabel it. Demote it to secondary or remove it. |
| af-geijerstam-2025 | Y (PMC12001473) | **N** (invented title) | Y | Y | Relabel. |
| heshmati-2025 | Y (PMC12617622) | P (no authors, title paraphrased) | Y (91.7%) | Y | Relabel. |
| nicotine-hr-acute | Y (403 to bots; PMID 28931527) | **N** (no authors, wrong title) | **N** | Y | Replace the source for the vape/heated override. |
| hughes-2007 | P (OUP PDF returns 403 to scripts) | Y | Y | Y | Point the URL at PubMed 17365764. |
| hughes-2020 | Y (PMID 31352486) | P (subtitle missing) | P (inverted-U shape, no day-3 peak) | Y | Add the subtitle. Optionally soften the copy. |
| jaehne-2015 | Y (PMID 24797355) | **N** (the label is the title of a different Jaehne paper) | **N** | Y | Re-source `first-week` to hughes-2007 / hse-cravings. |
| taylor-2021 | Y (PMID 33687070) | Y | Y (small effects, low certainty) | Y | Optionally add "small". |
| aubin-2012 | Y (PMID 22782848) | Y | P (weight, not appetite) | Y | Tweak the title and add a "measured in smokers" note. |
| hse-cravings | Y | Y | P | Y | Soften "far less often / occasional rather than constant". |
| nhs-withdrawal | Y | Y | Y (not cited by any milestone) | Y | None. |
| who-htp-2020 | Y | P (2nd edition, March 2020) | Y | Y | Label tweak only. |
| cochrane-ecig-2025 | Y (403 to bots; PMID 41212103, pub10, Nov 2025) | Y | P | Y | Covered by the `long-term-unknown` rewording. |
| fda-snus-mrtp | Y | P | **N** (contradicts "not studied long enough") | Y | Reword `long-term-unknown`. |
| fda-zyn-mrtp | Y (30 Jun 2026) | P | P | Y | Reword `long-term-unknown`. |
| ryo-harm | Y | Y | Y | Y | None. |
| acs | Y | Y | P | Y | Fix `carbon-monoxide`, `cough-breathlessness` and `heart-attack-risk` copy. |
| co-halflife | Y | **N** (page has no CO or nicotine half-life) | N | Y (b) | Relabel or delete. Not cited by any milestone. |
| withdrawal-peak | Y | Y (the page says peak on "second or third day") | Y | Y | None. |
| taste-smell | Y | Y | P (the page puts it at days 2–3, not 2 weeks) | Y (b) | Reword. |
| nachr | Y | **N** (PMID 17997038 is Wüllner et al. 2008, not Cosgrove 2007) | P | Y | Replace with Cosgrove 2009. |
| life-expectancy | Y (403 to bots; PMID 39734064) | Y | n/a | Y | None. |
| lapse-relapse | Y | Y | **N** (no 19 days, no "strongest predictor") | Y | Replace the source and soften the copy. |

## Notes per problem

### benowitz-2009
The full text (PMC2953858) says the plasma half-life of nicotine "averages about 2 h". The
terminal half-life measured from urine is 11 h. Cotinine has "an average half-life of about 16 h"
and "levels reflect … exposure … over the past 3–4 days". So cotinine is still present at day 3,
and "Nothing left in your bloodstream" overclaims.
Proposed `nicotine-cleared` body: "Nicotine itself has cleared your blood — its half-life is about
2 hours. Its breakdown product, cotinine, lasts longer (half-life about 16 hours) and fades over
the next few days."

### kenford-1994
The PMID is correct: JAMA 1994;271(8):589-94, Kenford SL, Fiore MC, Jorenby DE, Smith SS,
Wetter D, Baker TB. The abstract says "any smoking during the second week … was a consistent and
powerful predictor of failure". It also says "74% [patch] / 86% [placebo] of those smoking at
6 months began smoking during week 1 or 2". The study compared only a few predictors, and the
abstract never calls early smoking "the strongest".
Proposed `two-week-window` body: "In nicotine-patch trials, any smoking in the first two weeks —
especially week two — was a powerful predictor of going back, and most people who relapsed had
started in those two weeks. Two clean weeks puts that behind you. Measured in smokers; for other
products it is inferred."

### snus-mucosa (snus-lesions-2026, larsson-1991)
- PMC13499737 is **Alizadehgharib S, Östberg AK, Lehrkinder A, et al. — Oral health effects of
  nicotine pouches in snus users: clinical and immunological findings. Clin Oral Investig 2026.
  doi:10.1007/s00784-026-07087-0**. It is a 28-day study of snus users switching to ZYN, funded by
  Swedish Match. It is not a cessation study. Its background states that lesions "are generally
  reversible within weeks after cessation", "often within 2–6 weeks", and cites Larsson 1991 for
  this. The Larsson abstract does not give that time frame.
- Larsson 1991 (correct title: "Reversibility of snuff dippers' lesion in Swedish moist snuff
  users: a clinical and histologic follow-up study"). Twenty users who stopped, or who switched to
  portion bags and moved where they placed them, all showed "healthy mucosa … and normal tissue"
  when re-examined at 3–6 months. The study was independent and matches the claim, so it should
  be the primary source.
- "Gum recession … does not reverse" is not supported by either source.
- Proposed body (sourceId `larsson-1991`): "The white, wrinkled patch where snus sat usually
  heals after you stop. In a follow-up study, the tissue looked healthy and normal when re-checked
  three to six months later. Gum recession is a separate issue, so mention it to your dentist."
  Consider changing the offset to `MONTHS(3)` → `MONTHS(6)`. If "within weeks" is kept, cite
  snus-lesions-2026 with an industry-funding note.

### af-geijerstam-2025
Correct label: **af Geijerstam P, Joelsson A, Rådholm K, Nyström FH — Cardiovascular and metabolic
changes following 12 weeks of tobacco and nicotine pouch cessation: a Swedish cohort study (Harm
Reduct J, 2025)**. The results support the `oral-heart-rate` copy: "heart rate decreased by a mean
5.7 … beats/minute during the first week, and to a lesser degree during weeks 2 to 7, after which
it was no longer different" from the run-in (n=37). Systolic home BP rose 3.7 mmHg by week 12,
which matches the code comment.

### heshmati-2025
Correct label: **Heshmati J, Bates EL, Shahen S, et al. — Nicotine pouch pharmacokinetics
compared to smoked tobacco: a systematic review and meta-analysis (Drug Alcohol Depend Rep,
2025)**. The paper reports that "4 mg pouches delivered 91.73% (95% CI 85.03–98.42%) of cigarette
total nicotine exposure" (3 trials). "Roughly nine-tenths" is accurate.

### nicotine-hr-acute
The DOI is **Moheimani RS et al. — Sympathomimetic effects of acute e-cigarette use: role of
nicotine and non-nicotine constituents (J Am Heart Assoc, 2017), PMID 28931527**. The
participants did not use e-cigarettes or tobacco, measurements stopped about 30 minutes after
exposure, and no heated tobacco was tested. The paper does not support "heart rate returns toward
normal within about an hour".
Proposed: point the vape override at `hughes-2020`, whose abstract says "heart rate decreased with
abstinence" in daily vapers, and use `offsetMs: DAYS(1)` rather than an hour. For heated tobacco
there is no direct data, so drop the heated override and exclude heated from this milestone, or
label it inferred. If the source is kept anywhere, relabel it with the correct title.

### hughes-2007 / hughes-2020
- Hughes 2007: "Anger, anxiety, depression, difficulty concentrating, impatience, insomnia, and
  restlessness are valid withdrawal symptoms that peak within the first week and last 2-4 weeks."
  This supports `withdrawal-fades`. Stable URL: https://pubmed.ncbi.nlm.nih.gov/17365764/
- Hughes 2020 title: "Withdrawal Symptoms From E-Cigarette Abstinence Among Former Smokers: A
  Pre-Post Clinical Trial". The paper found a "prototypical inverted U time pattern" over 6 days.
  A day-3 peak is not stated for vaping, so the day-3 wording in `withdrawal-peak` is inferred
  for vapers.

### jaehne-2015 (first-week)
PMID 24797355 is **Jaehne A et al. — Sleep changes in smokers before, during and 3 months after
nicotine withdrawal (Addict Biol, 2015)**. The label's title belongs to a different Jaehne paper
(Sleep Med 2012). The study took polysomnography at 24–36 h and at 3 months only. It shows more
waking during withdrawal but contains nothing about "worst in week one" or "settling by the end of
the first month".
Proposed `first-week` (sourceId `hughes-2007`): body "Trouble sleeping is a recognised withdrawal
symptom. It usually peaks in the first week and fades over two to four weeks." HSE says the same:
"Sleep problems after you quit usually stop after 2 to 3 weeks."
The fog phase line "Withdrawal insomnia usually resolves within 1–2 weeks" is also contradicted.
Change it to "Sleep problems usually settle within 2–4 weeks".

### hse-cravings
The page says: "Individual cravings usually pass in 3 to 5 minutes." and "They usually improve 4
to 6 weeks after you stop smoking."
Proposed `cravings-rarer`: title "Cravings usually ease"; body "Cravings gradually ease the longer
you stay stopped, and for most people they improve noticeably between week four and week six.
Each one usually passes within 3 to 5 minutes."

### taylor-2021
The review is supported: follow-up had to be at least six weeks, and quitting was associated with
lower anxiety, depression and stress than continuing to smoke. The effects were small to moderate
and the evidence was very low to moderate certainty. Suggested wording: "…found somewhat less
anxiety, depression and stress…".

### aubin-2012
The paper says: "most weight gain occurs within three months of quitting". It measured weight,
not appetite, in cigarette quitters. Suggested title: "Weight change is mostly early". Add
"Measured in people who quit smoking."

### long-term-unknown (who-htp-2020, cochrane-ecig-2025, fda-snus-mrtp, fda-zyn-mrtp)
- The WHO HTP sheet (2nd ed., March 2020) supports the claim fully: HTPs "have an unknown
  long-term health impact" and "this generation of HTPs has not been on the market long enough
  for the potential effects to be studied".
- The Cochrane review (pub10, 10 Nov 2025) says: "longer, larger trials are needed to fully
  evaluate safety". It is partial support.
- The FDA General Snus page says nothing about unknown effects. The FDA renewed (7 Nov 2024,
  expires 2032) a claim that snus lowers the risk of mouth cancer, heart disease and other
  conditions, and that claim rests on long-term epidemiology. So "because it has not been studied
  for long enough" is false for snus.
- The FDA ZYN page (30 Jun 2026) is a modified-risk order. It says "There is no safe tobacco
  product" and that quitting all tobacco is healthiest, but says nothing about unknown effects.
- Proposed: title "No published recovery timeline"; body "No health authority publishes a dated
  recovery timeline for stopping this product, so there are no dated milestones here. What is
  certain is that stopping ends the ongoing exposure." Alternatively, give heated tobacco and vape
  a separate "not studied long enough" line, which WHO and Cochrane support.

### acs
The current page says:
- "A few minutes after quitting — Your heart rate drops."
- "24 hours to a few days — Nicotine … drop to zero. The carbon monoxide level … drops to normal."
- "1 to 12 months — Coughing and shortness of breath decrease."
- "1 to 2 years — risk of heart attack drops dramatically."
- 5–10, 10, 15 and 20 years as in the milestones.

Unsupported copy:
- `carbon-monoxide`: "CO has a half-life of 4–5 hours". ACS does not say this, and co-halflife
  (Healthline) does not either. Remove the sentence.
- `cough-breathlessness`: "cilia … regrown enough to clear tar … cough can get worse". This is not
  on the page. Change to "Coughing and shortness of breath decrease over the first year." The
  consolidation `howToCopeSmokeOnly` cilia line is also unsourced.
- `heart-attack-risk`: "The single biggest cardiovascular payoff of quitting" is not on the page.
  Remove it.
- `heart-rate` at 20 minutes is consistent with "a few minutes", since it is later.

### co-halflife
The Healthline page only gives "cotinine half-life takes 16 to 40 hours". It does not mention a
CO half-life or a nicotine half-life. The source is not cited in current copy, so delete it, or
relabel it "Healthline — How long does nicotine stay in your system?".

### taste-smell
MNT says "After 2 days … heightened sense of smell and more vivid tastes", "After 3 days … easier
to breathe … energy levels increase", and "After about two weeks, circulation begins to improve …
lung function also begins to improve".
Proposed body: "Many people notice sharper taste and smell, easier breathing and more energy by
now — for some it starts within the first few days." The fog phase line "Taste and smell start
returning around two weeks" should say "within the first few days".

### nachr
PMID 17997038 is **Wüllner U et al. — Smoking upregulates α4β2* nicotinic acetylcholine receptors
in the human brain (Neurosci Lett, 2008)**. It shows only upregulation in smokers.
Better source: **Cosgrove KP et al. — β2-nicotinic acetylcholine receptor availability during
acute and prolonged abstinence from tobacco smoking (Arch Gen Psychiatry, 2009),
https://pubmed.ncbi.nlm.nih.gov/19487632/**. It found receptors higher at 1 week of abstinence and
at non-smoker levels by 6–12 weeks, with only n=6 at the last time point.
Proposed `craving-adaptation` body: "Smoking increases the number of nicotine receptors in your
brain, and stopping lets that unwind. One small imaging study found levels back to a
non-smoker's by 6 to 12 weeks, but it was too small to set a date — so this milestone has no date
and no progress bar."

### lapse-relapse (danger window)
The NHS page only distinguishes a lapse from a relapse. The ~19-day figure is stated in **Perski O
et al. — Classification of lapses in smokers attempting to stop … (Nicotine Tob Res, 2023),
https://pmc.ncbi.nlm.nih.gov/articles/PMC10256890/**, which cites Shiffman et al. 1996 (J Consult
Clin Psychol 64:993, PMID 8916628). The Shiffman abstract itself does not give the number.
"Strongest known predictor" and "Immediacy is the single biggest factor" have no source.
Proposed:
- whyYouFeelThisWay: "Most people who slip and then go back to smoking do so within a few weeks —
  on average about 19 days — and smoking in the early weeks is one of the strongest predictors of
  relapse. You are in that window now…" (sources: lapse-relapse → Perski 2023, plus kenford-1994).
- howToCope[0]: "Re-commit today, not tomorrow."
