import type { Citation, ResearchResponse, SessionItem } from '../api/types'

const baseCitations: Citation[] = [
  {
    id: 'demo-1',
    paper_title: 'Cardiometabolic effects of GLP‑1 receptor agonists',
    authors: ['Smith J', 'Chen L'],
    journal: 'Journal of Metabolic Science',
    year: 2024,
    confidence: 0.9,
    excerpt:
      'Across pooled analyses, GLP‑1 RAs reduced MACE by 17% (HR 0.83, 95% CI 0.78–0.89) in high‑risk T2D cohorts.',
    study_type: 'Meta-analysis',
    risk_of_bias: 'low',
    risk_of_bias_note: 'Large RCTs, pre-registered outcomes.',
  },
  {
    id: 'demo-2',
    paper_title: 'Weight‑loss outcomes with weekly semaglutide',
    authors: ['Wilding J', 'Batterham R'],
    journal: 'New England Journal of Medicine',
    year: 2023,
    confidence: 0.86,
    excerpt:
      'Participants receiving 2.4 mg semaglutide achieved a mean 14.9% weight loss vs 2.4% with placebo at 68 weeks.',
    study_type: 'RCT',
    risk_of_bias: 'low',
    risk_of_bias_note: 'Double-blind, multi-center.',
  },
  {
    id: 'demo-3',
    paper_title: 'SGLT2 inhibitors in CKD: KDIGO 2024 update',
    authors: ['Kidney Disease Global Outcomes'],
    journal: 'Kidney International',
    year: 2024,
    confidence: 0.92,
    excerpt: 'SGLT2 inhibitors recommended for CKD with eGFR ≥20 and albuminuria, with sick-day guidance.',
    study_type: 'Guideline',
    risk_of_bias: 'low',
    risk_of_bias_note: 'International consensus guideline.',
  },
  {
    id: 'demo-4',
    paper_title: 'Real-world discontinuation of GLP-1 RAs',
    authors: ['Patel A', 'Davis K'],
    journal: 'Diabetes Care',
    year: 2023,
    confidence: 0.78,
    excerpt: 'Discontinuation rates in routine care were higher than in trials, driven by GI intolerance.',
    study_type: 'Observational',
    risk_of_bias: 'medium',
    risk_of_bias_note: 'Single health system, selection bias possible.',
  },
]

function buildResponse(overrides: Partial<ResearchResponse> & { answer: string }): ResearchResponse {
  return {
    answer: overrides.answer,
    sources: overrides.sources ?? baseCitations.slice(0, 2),
    confidence: overrides.confidence ?? 0.87,
    query_time: overrides.query_time ?? 2.4,
    total_sources: overrides.total_sources ?? 6,
    evidence: overrides.evidence ?? [
      'Multiple phase 3 RCTs demonstrate durable weight loss over 68–104 weeks with weekly GLP‑1 RA dosing.',
      'CVOTs such as LEADER, SUSTAIN‑6 and SELECT show statistically significant reductions in composite CV endpoints.',
    ],
    conflicts: overrides.conflicts ?? [
      'Some real‑world studies report higher discontinuation rates due to GI intolerance than pivotal trials.',
    ],
    limitations: overrides.limitations ?? [
      'Most trials exclude frail older adults and patients with advanced heart failure or severe renal impairment.',
    ],
    metadata: {},
    evidence_cutoff: overrides.evidence_cutoff ?? 'December 2024',
    caution_note: overrides.caution_note ?? 'This summary is not a substitute for clinical guidelines or individualised care.',
  }
}

const DEMO_RESPONSES: Record<string, ResearchResponse> = {
  default: buildResponse({
    answer:
      'GLP-1 receptor agonists such as semaglutide and tirzepatide consistently produce 10–15% weight loss and ~1.0–1.5% reductions in HbA1c in people with type 2 diabetes. Large cardiovascular outcomes trials show a relative risk reduction of ~15–20% in major adverse cardiovascular events, particularly in high‑risk patients. Benefits are greatest when combined with lifestyle modification and careful titration to minimise GI side‑effects.',
  }),
  'evidence-summary': buildResponse({
    answer:
      'Evidence summary: (1) Weight loss 10–15% with GLP-1 RAs; (2) HbA1c reduction ~1.0–1.5%; (3) MACE RR 15–20% in high-risk T2D; (4) GI side effects common but manageable with titration.',
    evidence: [
      'RCTs: SUSTAIN, STEP, SELECT.',
      'Meta-analyses support class effect for CV and renal outcomes.',
      'Real-world data show higher discontinuation than trials.',
    ],
  }),
  'compare-treatments': buildResponse({
    answer:
      'GLP-1 RAs vs SGLT2i: Both improve CV and renal outcomes in T2D. GLP-1 RAs offer greater weight loss and HbA1c reduction; SGLT2i have more robust heart failure and CKD evidence and lower cost. Choice depends on phenotype, comorbidities, and access.',
    evidence: ['Head-to-head data limited; indirect comparison via meta-analysis.', 'Guidelines recommend both; sequence often GLP-1 for weight, SGLT2i for HF/CKD.'],
  }),
  'patient-friendly': buildResponse({
    answer:
      'In simple terms: Newer diabetes medicines (like Ozempic or Mounjaro) help with weight and blood sugar and can lower the risk of heart attacks and strokes. They are given as a weekly injection. Stomach upset is common at first but often improves. Your doctor will help you choose if one is right for you.',
    caution_note: 'This is a simplified summary. Always follow your care team’s advice.',
  }),
  'limitations-only': buildResponse({
    answer:
      'Limitations of the current evidence: (1) Trials often exclude older frail adults and advanced HF/CKD; (2) Real-world discontinuation higher than in trials; (3) Long-term data beyond 2–3 years limited; (4) Cost and access vary by region.',
    evidence: [],
    limitations: [
      'Generalizability to complex patients unclear.',
      'Discontinuation and adherence in routine care understudied.',
      'Limited head-to-head and sequencing data.',
    ],
  }),
  'heart-failure': buildResponse({
    answer:
      'Practice-changing heart failure trials in 2024 include EMPACT-MI (empagliflozin post-MI), STEP-HFpEF DM (semaglutide in HFpEF and diabetes), and DELIVER subgroup analyses. SGLT2i and GLP-1 RAs both show benefit in HFpEF; selection depends on phenotype and comorbidities.',
    evidence_cutoff: 'November 2024',
    sources: baseCitations.slice(0, 3),
  }),
  'sglt2-ckd': buildResponse({
    answer:
      'When starting SGLT2 inhibitors in CKD: monitor eGFR (expect initial small dip that stabilises), volume status, and BP. Follow sick-day guidance (hold during dehydration/acute illness). Check K+ in those on RAASi. Benefits are well established down to eGFR ~20; use guideline-directed dosing.',
    evidence: ['CREDENCE, DAPA-CKD, EMPA-KIDNEY support use in CKD.', 'KDIGO 2024 reinforces SGLT2i in CKD with albuminuria.'],
    sources: [baseCitations[2], baseCitations[1]],
  }),
  'glp1-cv': buildResponse({
    answer:
      'GLP-1 agonists reduce cardiovascular risk in high-risk type 2 diabetes: weight loss 10–15%, HbA1c ~1–1.5% lower, and ~15–20% relative risk reduction in MACE. Use with lifestyle and gradual titration to limit GI side effects.',
    sources: baseCitations.slice(0, 2),
  }),
}

export const SUGGESTED_QUESTIONS: { label: string; demoKey: string }[] = [
  { label: 'GLP-1 and CV risk', demoKey: 'glp1-cv' },
  { label: 'SGLT2 in CKD', demoKey: 'sglt2-ckd' },
  { label: 'Heart failure 2024', demoKey: 'heart-failure' },
  { label: 'Compare GLP-1 vs SGLT2', demoKey: 'compare-treatments' },
]

export const QUERY_TEMPLATES = [
  { id: 'evidence-summary', label: 'Evidence summary', description: 'Structured bullet summary', question: 'Summarise the key evidence in bullets.', demoKey: 'evidence-summary' },
  { id: 'compare-treatments', label: 'Compare treatments', description: 'Head-to-head comparison', question: 'Compare GLP-1 receptor agonists and SGLT2 inhibitors for type 2 diabetes.', demoKey: 'compare-treatments' },
  { id: 'patient-friendly', label: 'Patient-friendly', description: 'Plain-language summary', question: 'Explain the main benefits and side effects in simple terms for patients.', demoKey: 'patient-friendly' },
  { id: 'limitations-only', label: 'Limitations only', description: 'Critical appraisal', question: 'What are the main limitations of the evidence?', demoKey: 'limitations-only' },
] as const

export const DEMO_SESSIONS: SessionItem[] = [
  {
    id: 'session-1',
    name: 'GLP-1 & cardiometabolic',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    queries: [
      {
        id: 'h-1',
        question: 'How effective are GLP‑1 agonists for cardiometabolic risk reduction?',
        answer: 'They provide clinically meaningful weight loss, HbA1c reductions, and ~15–20% MACE reduction in high‑risk T2D.',
        created_at: new Date().toISOString(),
        metadata: {},
      },
      {
        id: 'h-2',
        question: 'What are key limitations of GLP-1 trials?',
        answer: 'Trials often exclude frail elderly, advanced HF/CKD; real-world discontinuation is higher than in RCTs.',
        created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        metadata: {},
      },
    ],
  },
  {
    id: 'session-2',
    name: 'Heart failure 2024',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    queries: [
      {
        id: 'h-3',
        question: '3 practice-changing trials in heart failure in 2024?',
        answer: 'EMPACT-MI (empagliflozin post-MI), STEP-HFpEF DM (semaglutide in HFpEF + DM), DELIVER subgroup analyses.',
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        metadata: {},
      },
    ],
  },
]

/** Segments of the default answer with optional citation IDs for inline provenance */
export const DEFAULT_ANSWER_SEGMENTS: { text: string; citationIds?: string[] }[] = [
  { text: 'GLP-1 receptor agonists such as semaglutide and tirzepatide consistently produce 10–15% weight loss and ~1.0–1.5% reductions in HbA1c in people with type 2 diabetes. ' },
  { text: 'Large cardiovascular outcomes trials show a relative risk reduction of ~15–20% in major adverse cardiovascular events, particularly in high‑risk patients. ', citationIds: ['demo-1'] },
  { text: 'Benefits are greatest when combined with lifestyle modification and careful titration to minimise GI side‑effects.', citationIds: ['demo-2'] },
]

export function getDemoResponse(key: string): ResearchResponse {
  return DEMO_RESPONSES[key] ?? DEMO_RESPONSES.default
}

export function getDefaultAnswerSegments(): { text: string; citationIds?: string[] }[] {
  return DEFAULT_ANSWER_SEGMENTS
}

export function getDemoKeyFromQuestion(question: string): string {
  const q = question.toLowerCase()
  if (q.includes('glp-1') && (q.includes('cv') || q.includes('cardiometabolic'))) return 'glp1-cv'
  if (q.includes('sglt2') && (q.includes('ckd') || q.includes('kidney'))) return 'sglt2-ckd'
  if (q.includes('heart failure') && (q.includes('2024') || q.includes('trial'))) return 'heart-failure'
  if (q.includes('compare') && q.includes('treatment')) return 'compare-treatments'
  if (q.includes('evidence') && q.includes('summary')) return 'evidence-summary'
  if (q.includes('patient') && q.includes('simple')) return 'patient-friendly'
  if (q.includes('limitation')) return 'limitations-only'
  return 'default'
}
