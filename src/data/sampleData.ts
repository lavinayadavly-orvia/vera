/**
 * Curated Sample Data for Vera (Medical Affairs / RWE Focus)
 * All samples use free, non-licensed images and icons only
 * Sources: Unsplash, Pexels, Pixabay, Lucide Icons
 */

import type { Sample } from '@/services/sampleRepository';
import { createFreeAsset } from '@/services/sampleRepository';

export const sampleData: Sample[] = [
  {
    id: 'sample_rwe_glp1',
    title: 'Real-World Effectiveness of GLP-1s',
    description: 'A clinical infographic comparing real-world A1C reductions and weight loss outcomes versus clinical trial data.',
    contentType: 'infographic',
    format: 'image',
    previewImage: createFreeAsset(
      'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800',
      'unsplash'
    ),
    content: `# Real-World Effectiveness of GLP-1 RAs

## Clinical Trial vs. Real-World Variance
- Clinical trial outcomes often show higher adherence rates
- Real-world A1C reductions average 1.2% at 6 months
- Weight loss trajectories differ by baseline BMI
- Adherence drops by 30% at the 12-month mark in broad populations

## Key Findings (RWE)
✓ 45% of patients achieved >5% body weight reduction
✓ Statistically significant reduction in MACE events
✓ Gastrointestinal adverse events match trial frequencies
✓ Dose titration adherence is the primary driver of efficacy

Sources: Real-World Claims Database (2023), Observational Registry Data`,
    assets: [
      createFreeAsset('https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800', 'unsplash'),
      createFreeAsset('https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400', 'unsplash')
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['rwe', 'endocrinology', 'heor', 'infographic']
  },

  {
    id: 'sample_heor_carousel',
    title: 'HEOR Value Dossier Summary',
    description: '5-slide LinkedIn carousel breaking down the economic value proposition of targeted oncology therapies.',
    contentType: 'social-post',
    format: 'carousel',
    previewImage: createFreeAsset(
      'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800',
      'unsplash'
    ),
    content: `# HEOR: Targeted Therapy Value Proposition

Slide 1: Title Slide
- "Demonstrating Value in Precision Oncology"
- Abstract cellular imagery

Slide 2: Clinical Burden
- High unmet need in mutation-specific cohorts
- Rapid disease progression with standard of care

Slide 3: Economic Impact
- Reduced hospitalization days (ICU and General Ward)
- Lower utilization of symptomatic rescue therapies

Slide 4: QALY Gains
- Incremental cost-effectiveness ratio (ICER) analysis
- Significant Quality-Adjusted Life Year (QALY) improvements

Slide 5: Conclusion
- "Value-Based Healthcare Demands Precision"`,
    assets: [
      createFreeAsset('https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800', 'unsplash'),
      createFreeAsset('https://images.unsplash.com/photo-1576091160649-112d4d3f6f65?w=400', 'unsplash')
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['heor', 'oncology', 'value-dossier', 'social']
  },

  {
    id: 'sample_trial_diversity',
    title: 'Clinical Trial Diversity',
    description: 'Strategic social post emphasizing the critical need for diverse population representation in phase 3 clinical trials.',
    contentType: 'social-post',
    format: 'image',
    previewImage: createFreeAsset(
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800',
      'unsplash'
    ),
    content: `# Bridging the Gap: Clinical Trial Diversity

1. Decentralized Trial Sites (DCTs)
2. Community Engagement Programs
3. Culturally Competent Recruitment Materials
4. Removing Logistical Barriers (Transportation/Childcare)
5. Broadened Eligibility Criteria

"Scientific truth requires population truth."
#ClinicalResearch #TrialDiversity #HealthEquity`,
    assets: [
      createFreeAsset('https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800', 'unsplash')
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['clinical-trials', 'diversity', 'research', 'social-post']
  },

  {
    id: 'sample_cardiology_presentation',
    title: 'Heart Failure Readmission Models',
    description: '8-slide presentation detailing predictive modeling for heart failure readmissions using EMR data.',
    contentType: 'presentation',
    format: 'pptx',
    previewImage: createFreeAsset(
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
      'unsplash'
    ),
    content: `# Predictive Modeling: HF Readmissions

Slide 1: Title
- 30-Day Heart Failure Readmission Risk Stratification

Slide 2: The Challenge
- 24% of HF patients readmitted within 30 days
- Substantial CMS penalty implications

Slide 3: EMR Data Utilization
- Integrating lab values (BNP, Creatinine)
- Social Determinants of Health (SDoH) proxies
- Comorbidity indexing

Slide 4: Algorithm Development
- Random Forest predictive modeling
- Natural Language Processing on clinical notes

Slide 5: Intervention Workflows
- High-risk patient identification at discharge
- Automated pharmacy reconciliation triggers

Slide 6: Preliminary Results
- 18% reduction in targeted cohort readmissions
- High positive predictive value (PPV)

Slide 7: Workflow Integration
- Embedding risk scores into the EHR interface
- Alert fatigue mitigation strategies

Slide 8: Future Directions
- "Moving from Reactive to Proactive Cardiology"`,
    assets: [
      createFreeAsset('https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800', 'unsplash'),
      createFreeAsset('https://images.unsplash.com/photo-1576091160597-112c08073e83?w=400', 'unsplash')
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['cardiology', 'emr', 'predictive-modeling', 'presentation']
  },

  {
    id: 'sample_oncology_pathways',
    title: 'Clinical Pathways in NSCLC',
    description: 'Detailed infographic mapping the evolving treatment algorithms for Non-Small Cell Lung Cancer.',
    contentType: 'infographic',
    format: 'image',
    previewImage: createFreeAsset(
      'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=800',
      'unsplash'
    ),
    content: `# NSCLC Evolving Clinical Pathways

## Biomarker-Driven Paradigms
1. EGFR mutant targets changing front-line therapy
2. ALK/ROS1 translocations
3. PD-L1 expression >50% driving immunotherapy
4. KRAS G12C emerging inhibitors
5. NGS reflex testing protocols

## Treatment Sequencing
- First-line IO vs IO-Chemo combinations
- Managing immune-mediated adverse events (irAEs)
- Resistance mechanisms and second-line TKIs
- Role of consolidative radiation

## Key Takeaways
✓ Comprehensive genomic profiling is mandatory
✓ Tissue stewardship is critical for sequential biopsies
✓ Multidisciplinary tumor boards improve algorithm adherence
✓ Palliative integration should begin at diagnosis
✓ Community oncology pathway compliance is rising`,
    assets: [
      createFreeAsset('https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=800', 'unsplash')
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['oncology', 'nsclc', 'pathways', 'infographic']
  },

  {
    id: 'sample_immunology_report',
    title: 'Biosimilar Penetration Report',
    description: 'Market analysis report on biosimilar uptake in immunology and subsequent budget impact.',
    contentType: 'report',
    format: 'docx',
    previewImage: createFreeAsset(
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800',
      'unsplash'
    ),
    content: `# Biosimilar Penetration in Immunology: 2024 Report

## Executive Summary
The introduction of adalimumab and infliximab biosimilars has profoundly altered the health economic landscape of immunological therapeutics.

## Market Uptake Variations
- Regional differences built on formulary preferences
- "First-mover" advantage among PBMs (Pharmacy Benefit Managers)
- Interchangeability designations heavily influence pharmacy-level substitution

## Budget Impact Analysis
- Estimated $12B aggregate savings over 3 years
- Shift toward broader patient access for early-stage biological intervention
- Reinvestment of savings into novel target therapies (e.g., JAK inhibitors)

## Real-World Evidence (RWE)
1. No significant differences in loss of response (LOR)
2. Immunogenicity profiles matching reference products
3. No-cebo effects observed during non-medical switching
4. Patient support program (PSP) continuity is a barrier
5. Provider confidence increases post-first transition

## Conclusion
Biosimilars are fully integrated into standard rheumatology and gastroenterology pathways, but payer contracting still dictates specific product selection over clinical preference.`,
    assets: [
      createFreeAsset('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800', 'unsplash')
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['immunology', 'biosimilars', 'heor', 'market-access']
  },

  {
    id: 'sample_msl_deck',
    title: 'MSL Engagement Strategy',
    description: 'Video script intended for internal Medical Affairs alignment on Key Opinion Leader (KOL) engagement.',
    contentType: 'video',
    format: 'mp4',
    previewImage: createFreeAsset(
      'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800',
      'unsplash'
    ),
    content: `# Medical Science Liaison (MSL) Engagement Script

[0-5s] Hook
"How do we move from informational interactions to strategic scientific partnerships?"

[5-15s] The Shift
"Today's KOLs are overwhelmed with data. They don't need another slide deck; they need actionable clinical context."

[15-30s] The 3 Pillars of Engagement
"Our MSL strategy centers on three pillars:
1. Identifying evidence gaps in local practice
2. Co-generating Real-World Evidence
3. Navigating complex patient phenotypes"

[30-50s] Value Delivery
"When an MSL walks into a clinic, they bring the full weight of our HEOR and RWE capabilities, tailored to that specific institution's patient demographic."

[50-60s] Outro
"Elevating the scientific dialogue. That's the Medical Affairs mandate."`,
    assets: [
      createFreeAsset('https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800', 'unsplash')
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['medical-affairs', 'msl', 'strategy', 'kol']
  },

  {
    id: 'sample_neurology_data',
    title: 'Alzheimer’s Biomarker Utility',
    description: 'Educational infographic on the transition from syndromic to biomarker-based diagnosis in Alzheimer’s Disease.',
    contentType: 'infographic',
    format: 'image',
    previewImage: createFreeAsset(
      'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800',
      'unsplash'
    ),
    content: `# Revolutionizing Alzheimer’s Diagnostics

## The Biomarker Shift
- Moving away from purely cognitive assessments
- ATN Framework (Amyloid, Tau, Neurodegeneration)
- Blood-based biomarkers (BBMs) reducing reliance on PET/CSF

## Clinical Implementation
1. Primary care screening via plasma p-tau217
2. Confirmatory PET scans only for ambiguous cases
3. Monitoring disease-modifying therapy (DMT) efficacy
4. Identifying pre-clinical populations for early intervention
5. Reducing diagnostic timelines from 18 months to 3 months

## Economic Considerations
- PET scans: High cost, limited geographic access
- CSF testing: Invasive, requires specialist lumbar puncture
- Plasma assays: Scalable, highly cost-effective, easily drawn

## The Future
✓ Democratizing access to novel therapeutics
✓ Streamlining clinical trial recruitment
✓ Empowering primary care networks`,
    assets: [
      createFreeAsset('https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800', 'unsplash')
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['neurology', 'biomarkers', 'diagnostics', 'alzheimers']
  },

  {
    id: 'sample_rare_disease',
    title: 'Rare Disease Patient Journey',
    description: 'Social post outlining the diagnostic odyssey in rare genetic disorders.',
    contentType: 'social-post',
    format: 'image',
    previewImage: createFreeAsset(
      'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800',
      'unsplash'
    ),
    content: `# The Diagnostic Odyssey in Rare Diseases

The average rare disease patient visits 7.3 physicians over 4.8 years before receiving an accurate diagnosis.

## Shortening the Timeline
✓ Implementing newborn genomic sequencing
✓ Utilizing AI for pattern recognition in EHRs
✓ Expanding access to genetic counseling
✓ Empowering patient advocacy groups
✓ Educating front-line clinicians on "zebra" presentations

"A rare disease is only rare until it's diagnosed."
#RareDiseaseDay #Genomics #PatientAdvocacy #MedicalAffairs`,
    assets: [
      createFreeAsset('https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800', 'unsplash')
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['rare-disease', 'genetics', 'patient-journey', 'medical-affairs']
  }
];
