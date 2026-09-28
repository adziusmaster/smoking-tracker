import { describe, expect, it } from 'vitest';
import { MILESTONES } from './milestones';
import { SOURCES } from './sources';
import { DANGER_WINDOW_TIPS, PHASES } from './phases';
import { PRODUCT_CONTENT } from './products';
import { SLIP_REASSURANCE, SOS_STEPS } from './sos';
import { applicableMilestones, audienceIncludes } from '@/domain/products';
import { cigaretteSettings } from '@/domain/testSettings';
import type { ProductId, Settings } from '@/domain/types';

const PRODUCTS: ProductId[] = ['cigarettes', 'roll-your-own', 'heated', 'vape', 'snus', 'pouches'];
const settingsFor = (product: ProductId, withHistory: boolean): Settings =>
  cigaretteSettings({
    product,
    cost: product === 'vape' ? { kind: 'weekly', weeklySpendMinor: 1500 } : { kind: 'pack', unitsPerPack: 20, packPriceMinor: 1000 },
    cigaretteHistory: withHistory ? { months: 60, cigarettesPerDay: 10 } : null,
  });
const everyProfile = PRODUCTS.flatMap((p) => [settingsFor(p, false), settingsFor(p, true)]);
const label = (s: Settings) => `${s.product}/${s.cigaretteHistory ? 'history' : 'none'}`;

describe('MILESTONES', () => {
  it('MILESTONES_everyRecord_hasResolvableSourceId', () => {
    // Arrange
    const knownSourceIds = new Set(Object.keys(SOURCES));

    // Act
    const unresolved = MILESTONES.filter((m) => !knownSourceIds.has(m.sourceId));

    // Assert
    expect(unresolved.map((m) => m.id)).toEqual([]);
  });

  it('MILESTONES_everyRecord_hasUniqueId', () => {
    // Arrange
    const ids = MILESTONES.map((m) => m.id);

    // Act
    const unique = new Set(ids);

    // Assert
    expect(unique.size).toBe(ids.length);
  });

  it('MILESTONES_datedRecords_haveAnOffsetAndQualitativeOnesDoNot', () => {
    // Arrange & Act
    const datedWithoutOffset = MILESTONES.filter((m) => m.slipBehavior !== 'qualitative' && m.offsetMs === null);
    const qualitativeWithOffset = MILESTONES.filter((m) => m.slipBehavior === 'qualitative' && m.offsetMs !== null);

    // Assert
    expect(datedWithoutOffset).toEqual([]);
    expect(qualitativeWithOffset).toEqual([]);
  });

  it('MILESTONES_rangedRecords_haveEndAfterStart', () => {
    // Arrange & Act
    const inverted = MILESTONES.filter(
      (m) => m.offsetEndMs !== null && m.offsetMs !== null && m.offsetEndMs <= m.offsetMs,
    );

    // Assert
    expect(inverted.map((m) => m.id)).toEqual([]);
  });

  it('MILESTONES_excludedUnsourcedClaims_areAbsent', () => {
    // Arrange — these circulate widely online but are not in the ACS or CDC timelines
    const bannedIds = ['nerve-endings', 'bronchial-tubes'];
    const bannedPhrases = ['nerve ending', 'bronchial tube'];

    // Act
    const offendingIds: string[] = [];

    // Check for banned ids
    MILESTONES.forEach((m) => {
      if (bannedIds.includes(m.id)) {
        offendingIds.push(m.id);
      }
    });

    // Check for banned phrases in title and body (case-insensitive)
    MILESTONES.forEach((m) => {
      const titleLower = m.title.toLowerCase();
      const bodyLower = m.body.toLowerCase();
      for (const phrase of bannedPhrases) {
        if (titleLower.includes(phrase) || bodyLower.includes(phrase)) {
          if (!offendingIds.includes(m.id)) {
            offendingIds.push(m.id);
          }
          break;
        }
      }
    });

    // Assert
    expect(offendingIds).toEqual([]);
  });
});

describe('PHASES', () => {
  it('PHASES_wholeSet_coversTimeContiguouslyFromZero', () => {
    // Arrange
    const first = PHASES[0];

    // Act & Assert
    expect(first?.startMs).toBe(0);
    for (let i = 1; i < PHASES.length; i += 1) {
      expect(PHASES[i]?.startMs).toBe(PHASES[i - 1]?.endMs);
    }
  });

  it('PHASES_lastPhase_isOpenEnded', () => {
    // Arrange & Act
    const last = PHASES[PHASES.length - 1];

    // Assert
    expect(last?.endMs).toBeNull();
  });

  it('PHASES_everyPhase_hasAtLeastOneCopingTip', () => {
    // Arrange & Act
    const empty = PHASES.filter((phase) => phase.howToCope.length === 0);

    // Assert
    expect(empty.map((phase) => phase.id)).toEqual([]);
  });

  it('MILESTONES_everyPhaseId_matchesAKnownPhase', () => {
    // Arrange
    const knownPhaseIds = new Set(PHASES.map((phase) => phase.id));

    // Act
    const orphans = MILESTONES.filter((m) => !knownPhaseIds.has(m.phaseId));

    // Assert
    expect(orphans.map((m) => m.id)).toEqual([]);
  });
});

describe('MILESTONES by product', () => {
  it('MILESTONES_everyOverride_hasResolvableSourceId', () => {
    // Arrange
    const known = new Set(Object.keys(SOURCES));

    // Act
    const unresolved = MILESTONES.flatMap((m) =>
      Object.values(m.overrides ?? {}).filter((o) => !known.has(o.sourceId)).map(() => m.id));

    // Assert
    expect(unresolved).toEqual([]);
  });

  it('MILESTONES_everyProfile_hasADatedMilestoneInEachEarlyPhase', () => {
    // Arrange
    const earlyPhases = ['crash', 'fog', 'consolidation'] as const;

    // Act
    const gaps = everyProfile.flatMap((settings) => {
      const visible = applicableMilestones(MILESTONES, settings);
      return earlyPhases
        .filter((phaseId) => !visible.some((m) => m.phaseId === phaseId && m.offsetMs !== null))
        .map((phaseId) => `${label(settings)}/${phaseId}`);
    });

    // Assert
    expect(gaps).toEqual([]);
  });

  it('MILESTONES_smokedAudience_neverReachesANonCombustibleProduct', () => {
    // Arrange
    const nonCombustible = everyProfile.filter((s) => s.product !== 'cigarettes' && s.product !== 'roll-your-own');

    // Act
    const leaks = nonCombustible.filter((s) => audienceIncludes('smoked', s));

    // Assert
    expect(leaks).toEqual([]);
  });

  it('MILESTONES_carbonMonoxide_isVisibleOnlyToCombustibleProducts', () => {
    // Arrange & Act
    const seeing = everyProfile
      .filter((s) => applicableMilestones(MILESTONES, s).some((m) => m.id === 'carbon-monoxide'))
      .map((s) => s.product);

    // Assert
    expect([...new Set(seeing)]).toEqual(['cigarettes', 'roll-your-own']);
  });

  it('MILESTONES_longTermUnknown_appearsExactlyWhenNoSmokingHistory', () => {
    // Arrange & Act
    const seeing = everyProfile
      .filter((s) => applicableMilestones(MILESTONES, s).some((m) => m.id === 'long-term-unknown'))
      .map(label);

    // Assert
    expect(seeing).toEqual(['heated/none', 'vape/none', 'snus/none', 'pouches/none']);
  });

  it('MILESTONES_bannedOverclaims_areAbsentFromEveryTitleAndBody', () => {
    // Arrange — excluded by the research for this release, see the spec
    const banned = ['95%', 'safer', 'gums grow', 'recession reverses', 'blood pressure normal', 'healing lost'];

    // Act
    const offending = MILESTONES.filter((m) => banned.some((b) => `${m.title} ${m.body}`.toLowerCase().includes(b)));

    // Assert
    expect(offending.map((m) => m.id)).toEqual([]);
  });
});

describe('PRODUCT_CONTENT', () => {
  it('PRODUCT_CONTENT_everyProduct_hasAnEntryWithMatchingId', () => {
    // Arrange & Act
    const mismatched = PRODUCTS.filter((p) => PRODUCT_CONTENT[p].id !== p);

    // Assert
    expect(mismatched).toEqual([]);
  });

  it('PRODUCT_CONTENT_packProducts_havePackLabelsAndVapeHasNone', () => {
    // Arrange & Act
    const missing = PRODUCTS.filter((p) => p !== 'vape' && PRODUCT_CONTENT[p].perPackLabel === null);

    // Assert
    expect(missing).toEqual([]);
    expect(PRODUCT_CONTENT.vape.perPackLabel).toBeNull();
  });

  it('PRODUCT_CONTENT_onlyCombustibleProducts_saySmokeFree', () => {
    // Arrange & Act
    const smokeFree = PRODUCTS.filter((p) => PRODUCT_CONTENT[p].freeWord === 'smoke-free');

    // Assert
    expect(smokeFree).toEqual(['cigarettes', 'roll-your-own']);
  });

  it('content_unitTokens_onlyUseKnownTokenNames', () => {
    // Arrange
    const texts = [
      ...SOS_STEPS.map((s) => s.instruction), SLIP_REASSURANCE.smoke, SLIP_REASSURANCE.nicotine,
      ...DANGER_WINDOW_TIPS.howToCope, ...PHASES.flatMap((p) => [...p.howToCope, ...p.howToCopeSmokeOnly]),
    ];

    // Act
    const unknown = texts.flatMap((t) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1])).filter((name) => name !== 'unit' && name !== 'units');

    // Assert
    expect(unknown).toEqual([]);
  });

  it('PHASES_nicotineVariants_neverMentionSmokeMarkers', () => {
    // Arrange
    const markers = /carbon monoxide|tar\b|cilia|smoke/i;

    // Act
    const offending = PHASES.filter((p) => markers.test(p.whatsHappeningNicotine) || (p.whatsHappeningOral !== null && markers.test(p.whatsHappeningOral)))
      .map((p) => p.id);

    // Assert
    expect(offending).toEqual([]);
    expect(markers.test(DANGER_WINDOW_TIPS.whatsHappening.nicotine)).toBe(false);
  });
});

describe('PHASES copy', () => {
  const words = (text: string) => new Set(text.toLowerCase().match(/[a-z’']{4,}/g) ?? []);
  const overlap = (a: string, b: string) => {
    const [x, y] = [words(a), words(b)];
    const shared = [...x].filter((w) => y.has(w)).length;
    return shared / Math.min(x.size, y.size);
  };

  it('PHASES_whyYouFeelThisWay_saysSomethingDifferentFromWhatsHappening', () => {
    // Arrange — each field has its own job (body now vs the psychology of the stage), so they
    // must not read as the same sentence twice
    const variants = PHASES.flatMap((p) =>
      [p.whatsHappening, p.whatsHappeningNicotine, p.whatsHappeningOral]
        .filter((text): text is string => text !== null)
        .map((text) => ({ id: p.id, text, why: p.whyYouFeelThisWay })),
    );

    // Act
    const repetitive = variants.filter((v) => overlap(v.text, v.why) > 0.3).map((v) => `${v.id}: ${v.text.slice(0, 40)}`);

    // Assert
    expect(repetitive).toEqual([]);
  });
});

describe('phase and danger-window sources', () => {
  it('PHASES_everySourceId_resolves', () => {
    // Arrange
    const known = new Set(Object.keys(SOURCES));

    // Act
    const unresolved = [
      ...PHASES.flatMap((p) => p.sources.filter((id) => !known.has(id)).map((id) => `${p.id}:${id}`)),
      ...DANGER_WINDOW_TIPS.sources.filter((id) => !known.has(id)).map((id) => `danger:${id}`),
    ];

    // Assert
    expect(unresolved).toEqual([]);
  });

  it('PHASES_everyPhase_citesAtLeastOneSource', () => {
    // Arrange & Act
    const uncited = PHASES.filter((p) => p.sources.length === 0).map((p) => p.id);

    // Assert
    expect(uncited).toEqual([]);
  });
});

describe('MILESTONES copy', () => {
  it('MILESTONES_body_addsSomethingBeyondTheTitle', () => {
    // Arrange — the body should explain or add context, not restate the title
    const words = (text: string) => new Set(text.toLowerCase().match(/[a-z’']{4,}/g) ?? []);

    // Act
    const restating = MILESTONES.filter((m) => {
      const title = words(m.title);
      const body = words(m.body);
      const shared = [...title].filter((w) => body.has(w)).length;
      return title.size > 0 && shared / title.size > 0.5;
    }).map((m) => m.id);

    // Assert
    expect(restating).toEqual([]);
  });
});

describe('SOS activities', () => {
  it('ACTIVITIES_ids_matchTheDatabaseCheckList', async () => {
    // Arrange — the craving_events.activity CHECK in migration v4 is the source of truth
    const { ACTIVITIES } = await import('./sos');
    const { MIGRATIONS } = await import('@/data/schema');
    const v4 = MIGRATIONS.find((m) => m.version === 4)?.up ?? '';
    const allowed = [...(/activity IN \(([^)]*)\)/.exec(v4)?.[1] ?? '').matchAll(/'([a-z]+)'/g)].map((m) => m[1]);

    // Act
    const ids = ACTIVITIES.map((a) => a.id);

    // Assert
    expect([...ids].sort()).toEqual([...allowed].sort());
  });

  it('ACTIVITIES_sourceIds_resolve', async () => {
    // Arrange
    const { ACTIVITIES } = await import('./sos');

    // Act
    const unresolved = ACTIVITIES.filter((a) => a.sourceId !== null && !(a.sourceId in SOURCES)).map((a) => a.id);

    // Assert
    expect(unresolved).toEqual([]);
  });

  it('GROUNDING_STEPS_countDownFromFiveToOne', async () => {
    // Arrange
    const { GROUNDING_STEPS } = await import('./sos');

    // Act
    const counts = GROUNDING_STEPS.map((s) => s.count);

    // Assert
    expect(counts).toEqual([5, 4, 3, 2, 1]);
  });
});
