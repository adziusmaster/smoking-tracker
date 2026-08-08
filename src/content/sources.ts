import type { Source } from '@/domain/types';

/**
 * Tier 'a' is a primary or authoritative secondary source (ACS, peer-reviewed).
 * Tier 'b' is general health media — phrase tier-b milestone copy more tentatively.
 */
export const SOURCES: Record<string, Source> = {
  acs: {
    id: 'acs',
    label: 'American Cancer Society — Health Benefits of Quitting Smoking Over Time',
    url: 'https://www.cancer.org/cancer/risk-prevention/tobacco/benefits-of-quitting-smoking-over-time.html',
    tier: 'a',
  },
  'co-halflife': {
    id: 'co-halflife',
    label: 'Carbon monoxide half-life 4–5 hours; nicotine ~2 h, cotinine ~16–20 h',
    url: 'https://www.healthline.com/health/quit-smoking/how-long-does-nicotine-stay-in-your-system',
    tier: 'b',
  },
  'withdrawal-peak': {
    id: 'withdrawal-peak',
    label: 'Cleveland Clinic — Nicotine withdrawal begins 4–24 h, peaks around day 3, fades over 3–4 weeks',
    url: 'https://my.clevelandclinic.org/health/diseases/21587-nicotine-withdrawal',
    tier: 'a',
  },
  'taste-smell': {
    id: 'taste-smell',
    label: 'Medical News Today — Timeline after quitting smoking',
    url: 'https://www.medicalnewstoday.com/articles/317956',
    tier: 'b',
  },
  nachr: {
    id: 'nachr',
    label: 'Cosgrove et al. — Smoking upregulates α4β2* nicotinic receptors in the human brain (2007)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/17997038/',
    tier: 'a',
  },
  'life-expectancy': {
    id: 'life-expectancy',
    label: 'Jackson et al. — The price of a cigarette: 20 minutes of life? (Addiction, 2025)',
    url: 'https://onlinelibrary.wiley.com/doi/10.1111/add.16757',
    tier: 'a',
  },
  'lapse-relapse': {
    id: 'lapse-relapse',
    label: 'NHS — Getting back on track after a smoking relapse',
    url: 'https://www.nhs.uk/better-health/quit-smoking/staying-smoke-free/get-back-on-track-after-a-smoking-relapse/',
    tier: 'a',
  },
};
