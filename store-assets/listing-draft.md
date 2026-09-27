# Play listing — ASO draft

**Status:** draft for review, 2026-09-28. Nothing here is live and nothing in `docs/play-store-listing.md`
has been changed.

**Scope of claims:** only what ships today, plus what `2026-09-28-nicotine-products-design.md` adds
(five products, product-filtered milestones, new sources). The daily cards, savings goals, insights,
widget and dark mode are **not** mentioned anywhere below. Add them when they ship.

**Counts** are Unicode code points, which is how Play counts. They were checked with a script, not by
eye. Re-check after any edit.

---

## 0. Two findings to settle before choosing a name

1. **"Smoke Free" is already a well-known quit app on Play.** "Smoke Free – Quit Smoking Now"
   (David Crane / 23 Limited) has been a top result for years and is widely cited in research. Ours
   would be a second "Smoke Free" in the same category. That means confusion, weak ranking for the
   brand word, and a real risk of a trademark or impersonation complaint. **This app needs a new
   display name for that reason alone.** The package name `com.adziusmaster.smokefree` is invisible
   to users and can stay.
2. **"Smoke Free" is also the wrong word** for a vape or pouch user. The products spec already
   raises this under *Open items*.

Before committing to any name, search Play, EUIPO and USPTO (class 9 and 44) for the brand word.
None of the brands below was checked against trademark registers.

---

## 1. App name (Play title, max 30)

Pattern: `Brand: keyword phrase`. The keyword part is always one of these two, because Play indexes
each title word on its own:

- `Quit Smoking & Vaping` (21) matches *quit smoking*, *quit vaping*, *stop vaping*, *smoking* and
  *vaping*.
- `Quit Smoking Tracker` (20) matches *quit smoking*, *quit tracker* and *smoking tracker*.

*Stop smoking*, *nicotine*, *smoke free*, *IQOS* and *pouches* go in the short and full
descriptions instead.

| # | Title | Count | Rationale | Risk |
|---|---|---|---|---|
| 1 | `Cleared: Quit Smoking & Vaping` | 30 | "Cleared" works for every product: nicotine cleared, lungs clearing, a clear head. The app's own milestone is literally "Nicotine fully cleared". A short, ownable word with no other quit app using it. | Generic English word, so the trademark will be thin. Check "Cleared" in class 9. |
| 2 | `Unlit: Quit Smoking & Vaping` | 28 | Short and memorable. Strong for cigarettes and roll-your-own. | IQOS, vapes and pouches are already "unlit", so the metaphor breaks for 3 of 5 products. |
| 3 | `Nicotine Free: Quit Tracker` | 27 | Says what it is for every product, and puts *nicotine* in the title. | "Free" in a title is flagged by Play's promotional-terms filter. Here it means nicotine-free, not price-free, but automated review may not see the difference. A descriptive brand is also hard to protect. |
| 4 | `Quitwise: Quit Smoking & Vape` | 29 | Suggests evidence and good sense, which fits the citations. | "Vape" instead of "Vaping", because "Vaping" would make it 31. Several apps already use "Quitwise" or similar names. |
| 5 | `Honest Quit: Smoking & Vaping` | 29 | The brand *is* the differentiator: honest slips, sourced claims. | Drops the word "quit" from the keyword part (it is still in the brand). Reviewers could read "Honest" as a quality claim, though it is a weak one. |
| 6 | `Exhale: Quit Smoking & Vaping` | 29 | A warm word that suggests relief. | "Exhale" is heavily used (meditation and breathing apps), so ranking and trademark are both harder. Doesn't fit pouches. |
| 7 | `Smoke Free: Quit Smoking` | 24 | Keeps the current name. | Collides with the existing Smoke Free app (see §0). Not recommended. |
| 8 | `Clean Slate: Quit Nicotine` | 26 | Fits every product, and forgiving after a slip. | "Clean" can read as a recovery-program term. Loses *smoking* and *vaping* in the title, which are the biggest search terms. |

**Recommendation: #1, `Cleared: Quit Smoking & Vaping` (30/30).** It covers all five products, it is
the only option that owns a word no other quit app uses, and the keyword part carries the two
highest-volume intents. Fallback: #4.

**Title policy check (all rows):** no "free" as a price, no "no ads", no "#1" or "best", no emoji,
no ALL CAPS, no performance claims ("quit in 7 days"), no third-party brands.

**Trademarks:**
- **IQOS** (Philip Morris), **glo** (BAT) and **Zyn** (Swedish Match / PMI) must never appear in the
  title, the short description, the icon, the feature graphic or the screenshot headlines.
- **Description mentions (flag for your call):** naming IQOS and glo once, to describe what the app
  supports ("heated tobacco such as IQOS or glo"), is nominative use. The onboarding card itself
  says "Heated tobacco (IQOS, glo…)", so the mention is accurate. Play's metadata policy allows a
  relevant third-party reference and forbids repeating one for keyword stuffing. The draft uses each
  name **once** and adds a not-affiliated line at the end. **Zyn is left out:** the app names it
  only in a source title (the FDA authorisation), so it is not a supported-product description and
  would read as keyword bait.

---

## 2. Short description (max 80)

| # | Text | Count |
|---|---|---|
| A | `Stop smoking, vaping, IQOS or pouches. Every health claim cited. Fully offline.` | 79 |
| B | `Stop smoking or vaping with sourced recovery milestones. No account, no ads.` | 76 |
| C | `A quit tracker that never goes online: sourced milestones, honest about slips.` | 78 |

**Recommendation: B.** It carries *stop smoking* and *vaping*, which the title doesn't (it has
*quit*). A carries more keywords, but it puts a third-party trademark in the most prominent text
field after the title. Use A only if you accept the IQOS risk from §1.

---

## 3. Full description (recommended name) — 3,150 / 4,000

```
Cleared tracks how long you have been off nicotine, what that is doing to your body, and what comes next. Every health claim comes with a source. It is honest about slips, and it cannot go online.

Quit smoking, quit vaping, or stop heated tobacco, snus or nicotine pouches. Cleared shows each product only what the evidence supports for it.

WHAT YOU CAN QUIT
• Cigarettes and roll-your-own
• Heated tobacco, such as IQOS or glo
• Vapes and e-cigarettes
• Snus and tobacco-free nicotine pouches
Switched to vaping or pouches after years of cigarettes? Tell it, and you still get the long-term smoking recovery milestones. Your cigarette history is what those milestones measure.

A RECOVERY TIMELINE WITH SOURCES
• One scrollable timeline, split into phases and opened at where you are today.
• Milestones for your product: heart rate, carbon monoxide, nicotine clearing, withdrawal peaking and fading, cravings easing, mood, and the long-term risk changes.
• Every milestone links to its source: the American Cancer Society, the NHS, Cochrane reviews, the FDA, the WHO and peer-reviewed studies.
• If there is no evidence for your product, the milestone is not shown. No claims measured in smokers are stretched to fit vapers.
• Coping advice for the phase you are actually in, so you know why you feel the way you feel.

HONEST ABOUT SLIPS
• Logging a slip does not wipe out your quit.
• Some markers really do restart after one cigarette, and Cleared restarts those. Recovery built up over years does not reset, and the app will not pretend it does.
• It never invents a "days of healing lost" number.
• After a slip, a 19-day danger window starts. That is roughly how long a lapse takes on average to turn into a relapse. The advice switches to relapse prevention until you are through it.

CRAVING SOS
• One tap, five minutes. A craving peaks and passes within minutes, so SOS takes you through it one timed step at a time.
• Afterwards, record "it passed" or a slip. Neither one comes with a lecture.

MONEY AND PROGRESS
• Money saved and cigarettes, sticks, pouches or vapes not used, worked out from your own numbers.
• A lifetime cigarette estimate, always labelled as an estimate.
• Daily craving and mood check-ins, a craving chart, and slip triggers.
• Local reminders when you reach a milestone, and more check-ins during a danger window.

PRIVATE BY DESIGN
• No account, no sign-up, no email.
• No ads, no analytics, no tracking, no in-app purchases. Free, with nothing to unlock.
• Cleared does not have the internet permission, so it physically cannot send your data anywhere. It works the same in aeroplane mode.
• Export all your data as a file, or delete everything in one tap.

A NOTE ON HEALTH
Cleared is not a medical device and does not give medical advice. Milestones are population averages from the cited research, not a diagnosis. A doctor, a pharmacist or your national quitline will do more for your chances than any app. Cleared lists real support services in Settings.

IQOS and glo are trademarks of their owners. Cleared is not affiliated with them.

Privacy policy: https://adziusmaster.github.io/smokefree-privacy/
```

**Honesty checks on the draft:**
- The Cochrane, FDA, WHO, snus and pouch lines are true **only once the products spec ships**, after
  its citation-verification task. Today's build cites ACS, NHS, Cleveland Clinic, Medical News Today
  and journal papers. Don't publish this text against the cigarette-only build.
- "Cravings easing" and "mood" rest on the † sources the spec says to verify first. If a milestone
  is dropped in verification, drop its word here too.
- "Cigarettes, sticks, pouches or vapes": the spec's avoided labels are "not smoked", "sticks not
  used" and "vapes skipped". Adjust to the final `avoidedLabel` copy.
- "Time not lost" is left out on purpose. It shows only for combustible products, and the listing
  speaks to every product.
- "Lists real support services in Settings": the design spec's Settings screen includes "links to
  real cessation services". **Check the shipped screen before publishing.** A link would need a
  browser intent, and the app has no internet permission of its own.
- Rename in the privacy policy too: it currently says "Smoke Free".

---

## 4. Screenshot headlines

Same format as PurePrep and CoreChoice: two lines, the second line (or one *word*) in the accent
colour, a subline, and a real capture below. The order follows what a stranger needs in order to
decide: what it shows me, why I can trust it, what it does when things go wrong, and what it
costs me in privacy.

| # | Headline (accent in *italics*) | Subline | Screen |
|---|---|---|---|
| 1 | Watch your body / *recover.* | A timeline of what has healed and what's next. | Timeline, hero figures and the current phase expanded |
| 2 | Milestones for / *what you quit.* | Cigarettes, heated tobacco, vapes, snus or pouches. | Onboarding product picker, or a vape/pouch timeline showing a product-only milestone |
| 3 | Every claim / has a *source.* | ACS, NHS, Cochrane, FDA. Tap any milestone to check. | Settings → sources list, or a milestone expanded with its citation |
| 4 | A craving passes. / *Five minutes.* | One timed step at a time, until it's over. | Craving SOS mid-countdown |
| 5 | A slip is / not a *reset.* | 19 days of extra support, and no invented setbacks. | Timeline in the danger-window state after a slip (STATE.md item 6) |
| 6 | See what / you've *saved.* | Money and units not used, from your own numbers. | Hero tiles close up, or the SOS "it passed" screen |
| 7 | It can't go online. / *By design.* | No account, no ads, no tracking. Works in aeroplane mode. | Settings: export, delete everything, privacy line |

Optional 8th: **Check in / every *day.*** — "Cravings and mood, charted over time." (Log screen with the craving
chart.)

Keep "Cochrane, FDA" in #3 only if those sources survive verification.

---

## 5. Feature graphic headlines (1024×500)

Two lines, one accent word, plus a strip of 3 pills. No brand names, no "#1".

| # | Headline | Pills |
|---|---|---|
| 1 | Quit nicotine. / Every claim *sourced.* | No account · No ads · Fully offline |
| 2 | Smoking, vaping, pouches. / Quit with *evidence.* | Every claim cited · Honest about slips · Offline |
| 3 | A slip is / not a *reset.* | Sourced milestones · 5-minute SOS · Offline |
| 4 | Your recovery, / *on the record.* | Cited sources · No account · Never online |

**Recommendation: 1.** It fits the product-agnostic name and leads with the claim nobody else can
make. Keep the existing timeline-dots motif from `feature-graphic-source.html` along the bottom: it
is the app's own UI and not a fake screen. "No ads" can go in a pill even though it can't go in the
title. Play restricts promotional wording in the title, icon and developer name, not in the feature
graphic, but performance or ranking claims ("#1", "Best") are banned there too.

---

## 6. Category, tags and health-app policy

- **Category:** Health & Fitness. Not Medical, which invites stricter review and implies clinical use.
- **Tags** (up to 5, chosen from Play Console's fixed list; confirm the exact labels there): the
  quit-smoking / addiction tag if offered, *Habit tracker*, *Health*, *Motivation*, *Wellness*.
- **Target audience:** 18+ only. The app is about tobacco and nicotine. An under-18 audience pulls
  the app into the Families policy and extra review.
- **Content rating (IARC):** answer yes to "references to tobacco", in a cessation context only. Expect a
  low-teen rating. That is fine.
- **Health apps declaration** (App content → Health apps): mandatory for every app. Tick the health
  feature closest to addiction or substance-use management, or *Health management* if no
  cessation-specific option exists. Do **not** tick medical device / diagnosis. The listing and the
  app both say it is not a medical device, and that has to stay consistent.
- **Health Content & Services policy:** no misleading or unsubstantiated health claims. The
  sourced-milestone design is the defence, so keep the listing no stronger than the in-app copy.
  No "X% healthier", no "quit guaranteed", no "95% less harmful" (the spec already excludes that last
  one from the app).
- **Tobacco policy:** Play bans facilitating tobacco sales and promoting tobacco. A cessation app is
  fine, provided no product imagery (IQOS devices, pouch cans) appears in the graphics.
- **Data safety:** unchanged — collects nothing, shares nothing, deletion in-app.
- **Metadata policy:** no testimonials or user counts in the description until real ones exist, and
  no repeated keywords (each brand word appears once).

---

## 7. How the sibling projects make their store assets

Same pipeline in **PurePrep** and **CoreChoice**; reuse it here.

- **Everything is generated from HTML with headless Chrome.** `store-assets/_src/build.mjs` (Node 18+)
  builds each asset as an HTML string from `theme.js` (the app's own colour tokens and fonts) and
  `parts.js` (reusable fragments: headline, device frame). It writes the HTML to `_src/html/`, which
  is kept so any asset can be opened in a browser. Then it runs
  `/Applications/Google Chrome.app/.../Google Chrome --headless --screenshot` at the exact size.
  Fonts come from Google Fonts at render time, so the build needs the network (fine on the Mac; the
  app itself stays offline).
- **Sizes:** phone screenshots **1080×1920** (9:16), feature graphic **1024×500**, icon **512×512**.
  The icon is re-flattened to **32-bit RGBA** with Pillow inside the build, because Chrome writes
  24-bit RGB and Play rejects that for the icon. Tablet sets are not generated; they are only needed
  to be listed as tablet-optimised.
- **Screenshots are real device captures, framed.** `adb exec-out screencap -p` (1080×2424 on the
  Pixel) goes into `_src/shots/`. The build crops the status and navigation bars (PurePrep:
  `STATUS_BAR = 140`, `NAV_BAR = 126`; CoreChoice crops y 240→2292), embeds the image as base64 in
  a rounded device frame (radius ~46px, subtle border and deep shadow), and places it under the
  headline. Most phones bleed off the bottom edge. Check every capture for leaked system UI:
  CoreChoice had to re-shoot one with a "Used for 15m" pill in it.
- **Caption style:** dark background in the app's colours. A headline at about 62–100 px (CoreChoice:
  Lora serif, PurePrep: Manrope bold), with the second line or one word in the accent colour. A
  muted two-line subline at about 28 px underneath. PurePrep auto-fits one headline size across the
  whole set and joins slots 1–3 into one 3240 px panorama backdrop.
- **Copy lives in the listing markdown, not in code.** PurePrep's `shots.js` reads the slot table
  (`A / B` = line break, `*word*` = accent) straight from `PLAY-LISTING.md` §9, and
  `check-listing.mjs` verifies every character count in that file. Section 4 above uses the same
  table syntax so the same parser can read it.
- **Feature graphic:** dark field, one accent colour, a bold two-line headline with one accent word,
  trust pills ("No ads · No account · No tracking"), and one real visual from the app (PurePrep: the
  bundled sample photo, cut out so it breaks the frame). Never fake UI.
- **Listing doc shape:** `PLAY-LISTING.md` is a paste-ready Console sheet: name, short and full
  description in code blocks with `n / limit` counts, alternates with reasons, a graphics slot
  table, the screenshot slot plan, and a *Claims checked against the code* table mapping every claim
  to where it is true in the repo. Release notes are `release-notes/<version>.txt`, with locales in
  `<en-US>` tags and a limit of 500 per locale.
- **This repo today:** `store-assets/feature-graphic-source.html` (hand-rendered, system font, green
  `#0f3d2e` with an amber `#f5a524` accent, timeline-dot motif). `play-icon-512.png` is **24-bit
  RGB** and needs re-flattening to RGBA before upload. The four screenshots are 423×751 browser
  captures with no captions. Porting CoreChoice's `build.mjs`, `theme.js` and `parts.js` (the
  simpler of the two) and filling `_src/shots/` from the device is the shortest route.
