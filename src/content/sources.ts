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
  // ——— Multi-product sources (2026-09). See docs/superpowers/specs/2026-09-28-nicotine-products-design.md.
  'benowitz-2009': {
    id: 'benowitz-2009',
    label: 'Benowitz et al. — Nicotine chemistry, metabolism, kinetics and biomarkers (Handb Exp Pharmacol, 2009)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/19184645/',
    tier: 'a',
  },
  'hughes-2007': {
    id: 'hughes-2007',
    label: 'Hughes — Effects of abstinence from tobacco: valid symptoms and time course (Nicotine Tob Res, 2007)',
    url: 'https://academic.oup.com/ntr/article-pdf/9/3/315/3842403/9-3-315.pdf',
    tier: 'a',
  },
  'hughes-2020': {
    id: 'hughes-2020',
    label: 'Hughes et al. — Withdrawal symptoms from e-cigarette abstinence (Nicotine Tob Res, 2020)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/31352486/',
    tier: 'a',
  },
  'nhs-withdrawal': {
    id: 'nhs-withdrawal',
    label: 'NHS — Managing nicotine withdrawal symptoms',
    url: 'https://www.nhs.uk/better-health/quit-smoking/staying-smoke-free/managing-nicotine-withdrawal-symptoms/',
    tier: 'a',
  },
  'jaehne-2015': {
    id: 'jaehne-2015',
    label: 'Jaehne et al. — How smoking affects sleep: a polysomnographical analysis during smoking and abstinence (Addict Biol, 2015)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/24797355/',
    tier: 'a',
  },
  'kenford-1994': {
    id: 'kenford-1994',
    label: 'Kenford et al. — Predicting smoking cessation: who will quit with and without the nicotine patch (JAMA, 1994)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/8301790/',
    tier: 'a',
  },
  'hse-cravings': {
    id: 'hse-cravings',
    label: 'HSE Ireland — Cravings and withdrawal symptoms',
    url: 'https://www2.hse.ie/living-well/quit-smoking/get-help-to-quit/cravings-withdrawal/',
    tier: 'a',
  },
  'taylor-2021': {
    id: 'taylor-2021',
    label: 'Taylor et al. — Smoking cessation for improving mental health (Cochrane, 2021)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/33687070/',
    tier: 'a',
  },
  'aubin-2012': {
    id: 'aubin-2012',
    label: 'Aubin et al. — Weight gain in smokers after quitting cigarettes: meta-analysis (BMJ, 2012)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/22782848/',
    tier: 'a',
  },
  'nicotine-hr-acute': {
    id: 'nicotine-hr-acute',
    label: 'Acute heart-rate and blood-pressure effects of nicotine e-cigarettes (J Am Heart Assoc, 2017)',
    url: 'https://www.ahajournals.org/doi/10.1161/jaha.117.006579',
    tier: 'a',
  },
  'af-geijerstam-2025': {
    id: 'af-geijerstam-2025',
    label: 'af Geijerstam et al. — Health effects of stopping snus and nicotine pouches (Harm Reduct J, 2025)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12001473/',
    tier: 'a',
  },
  'snus-lesions-2026': {
    id: 'snus-lesions-2026',
    label: 'Snus-induced oral mucosal lesions and their reversibility after cessation (Clin Oral Investig, 2026)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13499737/',
    tier: 'a',
  },
  'larsson-1991': {
    id: 'larsson-1991',
    label: 'Larsson, Axéll & Andersson — Reversibility of snuff dippers’ lesions (J Oral Pathol Med, 1991)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/1890661/',
    tier: 'a',
  },
  'heshmati-2025': {
    id: 'heshmati-2025',
    label: 'Nicotine pouch pharmacokinetics compared with cigarettes: meta-analysis (Drug Alcohol Depend Rep, 2025)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12617622/',
    tier: 'a',
  },
  'ryo-harm': {
    id: 'ryo-harm',
    label: 'FDA — Roll-your-own tobacco is not safer than other cigarettes',
    url: 'https://www.fda.gov/tobacco-products/products-ingredients-components/roll-your-own-tobacco',
    tier: 'a',
  },
  'who-htp-2020': {
    id: 'who-htp-2020',
    label: 'WHO — Heated tobacco products: information sheet (2020)',
    url: 'https://www.who.int/publications/i/item/WHO-HEP-HPR-2020.2',
    tier: 'a',
  },
  'cochrane-ecig-2025': {
    id: 'cochrane-ecig-2025',
    label: 'Electronic cigarettes for smoking cessation (Cochrane review, 2025 update)',
    url: 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD010216.pub10/full',
    tier: 'a',
  },
  'fda-snus-mrtp': {
    id: 'fda-snus-mrtp',
    label: 'FDA — General Snus modified-risk tobacco product orders',
    url: 'https://www.fda.gov/tobacco-products/advertising-and-promotion/swedish-match-usa-inc-modified-risk-tobacco-product-mrtp-applications-general-snus-products',
    tier: 'a',
  },
  'fda-zyn-mrtp': {
    id: 'fda-zyn-mrtp',
    label: 'FDA — Zyn nicotine pouches modified-risk authorisation',
    url: 'https://www.fda.gov/tobacco-products/ctp-newsroom/fda-authorizes-20-zyn-nicotine-pouches-be-marketed-specific-modified-risk-claim',
    tier: 'a',
  },
};
