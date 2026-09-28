# Release notes — 1.2.0 (versionCode 7)

Previous Play build: **1.0.0 / versionCode 4** (internal testing, cigarettes only, named "Smoke Free").
Cloud builds 5 and 6 were cancelled before finishing, so 7 is the next code. These notes cover
everything since versionCode 4. This is the first **closed testing** release.

Play allows 500 characters per language. Checked by `node store-assets/_src/count.mjs`.

---

## For Play

```
Smoke Free is now Cleared, and it covers cigarettes, roll-ups, heated tobacco, vapes, snus and nicotine pouches. Milestones match what you quit, and every claim links to its source.

New craving help: wait a minute, then breathe, play block drop, memory pairs or bubble pop, or try 5-4-3-2-1. Every craving you ride out is counted.

Log a slip as whatever you used. A new look, with dark mode.

Something not working? Write to andrzej@lechdigital.nl
```

---

## What changed, for your own reference

**Products**
- Choose what you quit: cigarettes, roll-your-own, heated tobacco, vape, snus or tobacco-free pouches.
- Costs per product (packs, cans, or weekly spend for vapes); "sticks / pouches / vapes not used".
- Milestones filtered by what the evidence supports for each product; switchers keep the long-term
  smoking milestones through their cigarette history.
- Every source checked against its page; unsupported claims removed.

**Craving SOS**
- One-minute delay, then six activities: breathing guide, block drop, memory pairs, bubble pop,
  5-4-3-2-1 grounding, drink water. A five-minute bar runs throughout.
- "Cravings beaten" recorded and shown on home.

**Slips**
- Product-neutral buttons ("I'm having a craving", "I slipped"); log what was actually used.
- Only own-product slips reduce "units not used"; every slip restarts the fast clocks.
- The lifetime cigarette figure is no longer shown after a slip.

**Content and design**
- New Clear Air look: light and dark mode, Fraunces and Manrope bundled, new tally-mark icon.
- Rewritten phase text ("what's happening" vs "why you feel this way"), tappable source links.
- Onboarding: Back/Next pinned to the bottom; smoking history as one number plus a unit.

**Fixes**
- Check-ins and Export restored after an internal regression (never released).
- Slip plus craving saved together, so a retry cannot double-count.
- Status bar no longer overlaps scrolling content; navigation-bar scrim removed.
