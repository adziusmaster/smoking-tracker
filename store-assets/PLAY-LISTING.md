# Cleared — Play Store listing

Copy for Play Console → Grow → Store presence → Main store listing. Every sentence must be true of
the build being published; the character counts are checked by `node store-assets/_src/count.mjs`.

## App name (max 30)

```
Cleared: Quit Smoking & Vaping
```

## Short description (max 80)

```
Stop smoking or vaping with sourced recovery milestones. No account, no ads.
```

## Full description (max 4000)

```
Cleared tracks how long you have been off nicotine, what that is doing to your body, and what comes next. Every health claim links to its source. It is honest about slips, and it cannot go online.

Quit smoking, quit vaping, or stop heated tobacco, snus or nicotine pouches. Cleared shows each product only what the evidence supports for it.

WHAT YOU CAN QUIT
• Cigarettes and roll-your-own
• Heated tobacco, such as IQOS or glo
• Vapes and e-cigarettes
• Snus and tobacco-free nicotine pouches
Switched to vaping or heated tobacco after years of cigarettes? Tell it, and you still get the long-term smoking recovery milestones, because your cigarette history is what those milestones measure.

A RECOVERY TIMELINE WITH SOURCES
• One timeline, split into phases and opened at where you are today.
• Milestones for your product: nicotine clearing, withdrawal peaking and fading, sleep, cravings easing, mood, and the long-term risk changes for people who smoked.
• Every milestone and every phase links to its source: the American Cancer Society, the NHS, Cochrane reviews, the FDA, the WHO and peer-reviewed studies.
• If there is no evidence for your product, the milestone is not shown. Nothing measured in smokers is stretched to fit vapers.
• For the phase you are in: what is happening in your body, why you feel the way you feel, and what helps.

WHEN A CRAVING HITS
• Tap once. Wait one minute, then pick something to do while it passes: a guided breathing circle, a falling-blocks puzzle, memory pairs, bubble pop, a 5-4-3-2-1 grounding exercise, or a glass of water.
• In a small real-world study, three minutes of Tetris weakened cravings, nicotine included. The block game is there for that reason.
• A five-minute bar shows how long it has been. Most cravings pass within three to five minutes.
• Every craving you ride out is counted: "cravings beaten" sits next to your money saved.

HONEST ABOUT SLIPS
• Log what you actually used, whatever it was: a cigarette, a stick, a vape or a pouch.
• A slip does not wipe out your quit. The fast markers restart; recovery built up over months does not, and the app will not pretend it does.
• It never invents a "days of healing lost" number.
• After a slip, a 19-day danger window starts. That is roughly how long a lapse takes on average to turn into a relapse. The advice switches to relapse prevention until you are through it.

MONEY AND PROGRESS
• Money saved and cigarettes, sticks, pouches or vapes not used, worked out from your own numbers.
• Daily craving and mood check-ins, with a chart of the last 30 days.
• Local reminders when you reach a milestone, and extra check-ins during a danger window.
• Light and dark mode, following your phone.

PRIVATE BY DESIGN
• No account, no sign-up, no email.
• No ads, no analytics, no tracking, no in-app purchases. Free, with nothing to unlock.
• Cleared does not have the internet permission, so it cannot send your data anywhere. It works the same in aeroplane mode. Source links open in your browser.
• Export all your data as a file, or delete everything in one tap.

A NOTE ON HEALTH
Cleared is not a medical device and does not give medical advice. Milestones are population averages from the cited research, not a diagnosis. A doctor, a pharmacist or your national quitline will do more for your chances than any app, and Cleared links to real support services in Settings.

IQOS and glo are trademarks of their owners. Cleared is not affiliated with them.
```

## Screenshots (8, in this order)

| File | Headline / subline | Screen |
|---|---|---|
| `phone/phone-1-progress.png` | Every hour off nicotine, *counted.* / Money saved, sticks not used and cravings beaten | Home |
| `phone/phone-2-why.png` | Why you feel *the way you feel.* | Current phase text |
| `phone/phone-3-sources.png` | Every claim *has a source.* | Citations list (dark mode) |
| `phone/phone-4-craving.png` | A craving passes *in minutes.* | SOS activity picker |
| `phone/phone-5-game.png` | A game studied *for cravings.* | Block drop |
| `phone/phone-6-products.png` | Cigarettes, heated tobacco, *vapes or pouches.* | Product choice (Settings) |
| `phone/phone-7-slip.png` | A slip is *not a reset.* | "What did you use?" slip screen |
| `phone/phone-8-private.png` | Nothing leaves *your phone.* | Export / delete everything / citations |

Screenshot 1 uses example data for "cravings beaten" (23), approved by the owner: the capture
read 0 on the day it was taken. `_src/patch-shots.py` paints it over `shots/home.png` →
`shots/home-sample.png`; re-run it after recapturing home.

## Graphics

| Asset | File | Size |
|---|---|---|
| App icon | `play-icon-512.png` | 512×512, 32-bit RGBA (from `icon/build.mjs`) |
| Feature graphic | `feature-1024x500.png` | 1024×500 |
| Phone screenshots | `phone/*.png` | 1080×1920 (9:16) |

Regenerate: `node store-assets/_src/build.mjs` (screens come from real phone captures in `_src/shots/`).

## Store settings

- **Category:** Health & Fitness. **Tags:** quit smoking, health tracker, habit tracker.
- **Contact email:** required by Play — use the address already on the developer account.
- **Privacy policy:** https://lechdigital.nl/projects/cleared/privacy/ (source: `lech-digital/projects/cleared/privacy/index.html`, deployed by pushing the site's `main`).
- **Target audience:** 18+ only (tobacco and nicotine subject matter).
- **Content rating questionnaire:** references to tobacco — yes (cessation, not promotion); no
  purchases, no user interaction, no shared location.
- **Data safety:** collects nothing, shares nothing; data deletion in-app (Delete everything).
- **Health apps declaration:** a health and fitness app that is **not** a medical device.
- **Ads:** no.
