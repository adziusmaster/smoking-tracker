# Release notes — 1.3.0 (versionCode 8)

Previous Play build: **1.2.0 / versionCode 7** (closed testing). EAS manages the versionCode
remotely (`autoIncrement`), so the next local production build gets 8.

Play allows 500 characters per language. Checked by `node store-assets/_src/count.mjs`.

---

## For Play

```
Craving help got better. Bubbles pop with a sound and a buzz, block drop has levels, a next-piece preview and scoring, and memory pairs has new picture decks. Every game keeps your best score.

The breathing guide changes colour and counts down each phase, so you always know how long is left.

Rate how strong a craving is, add your reason for quitting, and see when cravings hit on the Log.

Sound and vibration can be turned off in Settings.
```

---

## What changed, for your own reference

**Games**
- Bubble pop: burst animation, synthesised pop sound, short vibration, gentle speed-up,
  multi-finger popping, best score.
- Block drop: next piece, landing ghost, levels every 10 lines, scoring, wall kicks, hold ▼ to
  drop faster, line-clear flash, best score (kept even when you leave mid-game).
- Memory pairs: five emoji decks that change every round, card flip and match bounce, best
  score (fewest moves).
- Breathing: colour per phase, seconds countdown, outline of the full breath, vibration at
  each phase change.
- "New best!" only when an earlier best is beaten; stored bests can only improve.

**Cravings**
- "How strong is it?" (1–5, optional) at the start and when it passes.
- "Your reason" (onboarding and Settings), shown during SOS.
- Log → Cravings: beaten count, strength trend, time of day, what set slips off.
- A passed craving is saved the moment you tap "It's passed".

**Settings**
- Sound and vibration switches; speaker button in the games that make a sound.

**Privacy**
- Still no internet permission. The sound library's microphone and background-service
  permissions are blocked; only the normal audio-settings permission is added.

**Not in this release (next one):** R8 shrinking + deobfuscation file (the Play warning).
