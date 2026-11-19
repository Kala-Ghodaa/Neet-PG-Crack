/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SYSTEM_PROMPT_TEMPLATE = `You are a senior medical faculty member and Chief Question Setter for the National Board of Examinations in Medical Sciences (NBEMS) and INI-CET.

Your task is to generate high-yield, clinical vignette-based Multiple Choice Questions (MCQs) for Indian post-graduate medical entrance examinations (NEET-PG / NEXT / INI-CET) strictly formatted in valid JSON conforming to PG-Prep Arena Schema v1.0.

### MANDATORY CLINICAL QUESTION DESIGN RULES:
1. Format: Single Best Answer with exactly 4 options labeled "A", "B", "C", and "D".
2. Clinical Vignette: The stem must be a realistic 2-to-4 sentence patient vignette presenting age, sex, presenting symptoms, duration, vital signs, physical examination findings, and initial diagnostic investigations.
3. Distractors: Plausible medical distractors designed to test differential diagnosis, common clinical traps, and 50-50 elimination. Avoid absurd or obviously false options.
4. Option Explanations: You MUST provide granular explanations for EVERY option (A, B, C, and D) explaining why it is correct or why it was eliminated.
5. High-Yield Learning Points: Provide 2 to 4 concise bullet pearls highlighting key diagnostic hallmarks or management guidelines.
6. Schema Compliance: Output MUST be a valid JSON array containing objects matching PG-Prep Arena Schema v1.0. Do NOT wrap in markdown explanation text outside the JSON code block.

### ALLOWED SUBJECT IDENTIFIERS:
"anatomy", "physiology", "biochemistry", "pathology", "pharmacology", "microbiology", "forensic_medicine", "community_medicine", "ent", "ophthalmology", "general_medicine", "general_surgery", "obstetrics_gynecology", "pediatrics", "orthopedics", "dermatology", "psychiatry", "radiology", "anesthesia"

### ALLOWED QUESTION TYPES:
"single_best_answer", "clinical_vignette", "image_based", "investigation_interpretation", "table_based", "multi_statement", "assertion_reason"`;

export const USER_PROMPT_TEMPLATE = `Please generate 5 high-yield clinical vignette MCQs for NEET-PG on the following topic:
- Subject: general_medicine
- Organ System: Cardiology
- Topic: Acute Coronary Syndromes & Myocardial Infarction
- Difficulty: hard

Requirements:
- Include at least 1 table-based question showing cardiac biomarkers, arterial blood gas, or hemodynamic parameters.
- Provide full optionExplanations for all 4 options (A, B, C, D) and learningPoints.
- Format strictly as a valid JSON array matching PG-Prep Arena Schema v1.0.`;

export const SAMPLE_QUESTIONS_PAYLOAD = [
  {
    schemaVersion: '1.0',
    questionId: 'MED-CARD-001',
    questionVersion: 1,
    subjectId: 'general_medicine',
    subjectName: 'General Medicine',
    systemId: 'cardiology',
    systemName: 'Cardiology',
    topicId: 'acute-coronary-syndrome',
    topicName: 'Acute Coronary Syndromes',
    subtopic: 'Right Ventricular Infarction',
    questionType: 'clinical_vignette',
    difficulty: 'hard',
    question: {
      text: 'What is the most appropriate immediate medical intervention in this patient?',
      clinicalVignette:
        'A 58-year-old male presents to the emergency department with 2 hours of crushing retrosternal chest pain and diaphoresis. Blood pressure is 82/50 mmHg, heart rate is 54 bpm, and oxygen saturation is 96% on room air. Physical examination reveals elevated jugular venous pressure (JVP) with clear lung fields bilaterally. 12-lead ECG shows ST-segment elevation in leads II, III, and aVF.',
      images: [],
      tables: [],
    },
    options: [
      { id: 'A', text: 'Sublingual Nitroglycerin spray and IV Furosemide' },
      { id: 'B', text: 'Intravenous isotonic fluid resuscitation (Normal Saline bolus)' },
      { id: 'C', text: 'Immediate intravenous beta-blocker (Metoprolol)' },
      { id: 'D', text: 'IV Morphine sulfate and emergency pericardiocentesis' },
    ],
    correctAnswer: 'B',
    explanation: {
      summary:
        'Right ventricular infarction (RVI) causes preload-dependent hypotension; nitrates and diuretics are strictly contraindicated, and intravenous isotonic saline bolus is the initial therapy.',
      details:
        'The classic triad of right ventricular myocardial infarction comprises hypotension, elevated JVP, and clear lung fields in the setting of an inferior wall STEMI. The ischemic right ventricle is highly preload-dependent to maintain forward left-ventricular cardiac output. Administering nitrates or diuretics reduces right ventricular filling pressures precipitously, triggering catastrophic cardiogenic shock.',
      optionExplanations: {
        A: 'Incorrect. Nitroglycerin and loop diuretics decrease preload, which causes profound refractory hypotension in right ventricular infarction.',
        B: 'Correct. Volume expansion with normal saline optimizes right ventricular preload, augmenting left ventricular filling and restoring cardiac output.',
        C: 'Incorrect. Beta-blockers are contraindicated in bradycardia (HR 54 bpm) and cardiogenic shock.',
        D: 'Incorrect. Clear lungs and elevated JVP in acute inferior STEMI represent RVI, not cardiac tamponade, so pericardiocentesis is inappropriate.',
      },
      learningPoints: [
        'Inferior STEMI (leads II, III, aVF) + hypotension + elevated JVP + clear lung fields = Right Ventricular Infarction.',
        'Perform a right-sided ECG (V4R lead) in all patients with inferior STEMI.',
        'Treatment of choice for hypotension in RVI is IV isotonic fluids. Avoid nitrates, diuretics, and opioids.',
      ],
    },
    metadata: {
      isPYQ: true,
      year: 2023,
      source: 'NEET-PG 2023 Recall Pattern',
      references: ["Harrison's Principles of Internal Medicine, 21st Edition, Chapter 275"],
      tags: ['cardiology', 'stemi', 'right-ventricular-infarct', 'hypotension'],
    },
    status: 'published',
  },
  {
    schemaVersion: '1.0',
    questionId: 'PATH-HEM-002',
    questionVersion: 1,
    subjectId: 'pathology',
    subjectName: 'Pathology',
    systemId: 'hematology',
    systemName: 'Hematopathology',
    topicId: 'microcytic-anemia',
    topicName: 'Microcytic Hypochromic Anemias',
    subtopic: 'Mentzer Index & Serum Ferritin Differentiation',
    questionType: 'table_based',
    difficulty: 'medium',
    question: {
      text: 'Based on the hematological parameters shown in the table, what is the most likely diagnosis?',
      clinicalVignette:
        'A 22-year-old asymptomatic medical student is found to have mild pallor on a routine physical exam. Complete blood count and iron studies are obtained.',
      images: [],
      tables: [
        {
          title: 'Laboratory Investigation Profile',
          headers: ['Investigation', 'Patient Value', 'Reference Range'],
          rows: [
            ['Hemoglobin', '10.2 g/dL', '13.0–17.0 g/dL'],
            ['RBC Count', '5.8 × 10^12/L', '4.5–5.5 × 10^12/L'],
            ['MCV', '64 fL', '80–100 fL'],
            ['RDW', '12.8%', '11.5–14.5%'],
            ['Serum Ferritin', '145 ng/mL', '20–250 ng/mL'],
            ['Total Iron Binding Capacity', '310 mcg/dL', '250–400 mcg/dL'],
          ],
        },
      ],
    },
    options: [
      { id: 'A', text: 'Iron Deficiency Anemia' },
      { id: 'B', text: 'Beta-Thalassemia Minor (Trait)' },
      { id: 'C', text: 'Anemia of Chronic Disease' },
      { id: 'D', text: 'Sideroblastic Anemia' },
    ],
    correctAnswer: 'B',
    explanation: {
      summary:
        'High RBC count with severe microcytosis (Mentzer index MCV/RBC = 64/5.8 = 11.0 < 13), normal RDW, and normal ferritin is diagnostic of Beta-Thalassemia Minor.',
      details:
        'Mentzer index is calculated as MCV (fL) / RBC count (millions/mcL). A Mentzer index < 13 strongly suggests Thalassemia trait, whereas > 13 suggests Iron Deficiency Anemia. In beta-thalassemia trait, bone marrow erythroid hyperplasia maintains an elevated or high-normal RBC count despite disproportionate microcytosis and target cells.',
      optionExplanations: {
        A: 'Incorrect. Iron deficiency anemia features reduced RBC count, elevated RDW (>15%), low serum ferritin (<15 ng/mL), and Mentzer index > 13.',
        B: 'Correct. High RBC count (5.8), low MCV (64), Mentzer index 11.0 (<13), normal RDW, and normal ferritin indicate Beta-Thalassemia Minor. Confirm with HbA2 > 3.5% on HPLC.',
        C: 'Incorrect. Anemia of chronic disease usually exhibits normocytic or mildly microcytic indices with elevated ferritin and low TIBC.',
        D: 'Incorrect. Sideroblastic anemia typically shows dimorphic blood picture with high ferritin and ring sideroblasts on bone marrow Prussian blue stain.',
      },
      learningPoints: [
        'Mentzer index = MCV / RBC. Value < 13 indicates Thalassemia Trait; > 13 indicates Iron Deficiency Anemia.',
        'Normal RDW with profound microcytosis + erythrocytosis points toward hemoglobinopathy, not nutritional iron deficiency.',
      ],
    },
    metadata: {
      isPYQ: false,
      year: null,
      source: 'AI-Authoring Standard Demonstration',
      references: ['Robbins and Cotran Pathologic Basis of Disease, 10th Edition'],
      tags: ['hematology', 'mentzer-index', 'thalassemia-minor', 'microcytic-anemia'],
    },
    status: 'published',
  },
  {
    schemaVersion: '1.0',
    questionId: 'PHARM-ANS-003',
    questionVersion: 1,
    subjectId: 'pharmacology',
    subjectName: 'Pharmacology',
    systemId: 'autonomic-nervous-system',
    systemName: 'Autonomic Pharmacology',
    topicId: 'cholinergic-drugs',
    topicName: 'Anticholinesterase Poisoning & Management',
    subtopic: 'Oxime Reactivation & Atropinization Endpoints',
    questionType: 'clinical_vignette',
    difficulty: 'hard',
    question: {
      text: 'Which clinical parameter is the most critical physiological endpoint when titrating Atropine in this patient?',
      clinicalVignette:
        'A 34-year-old agricultural laborer is brought to the emergency department in a state of severe respiratory distress, profuse salivation, lacrimation, urinary incontinence, and pinpoint pupils (1 mm) after spraying an organophosphate insecticide. Chest auscultation reveals diffuse rhonchi and wheezing throughout all lung zones. Pulse is 48 bpm, and BP is 90/60 mmHg.',
      images: [],
      tables: [],
    },
    options: [
      { id: 'A', text: 'Pupillary dilation (mydriasis ≥ 5 mm)' },
      { id: 'B', text: 'Clearing of tracheobronchial secretions and dry pulmonary crackles' },
      { id: 'C', text: 'Tachycardia with heart rate exceeding 120 bpm' },
      { id: 'D', text: 'Resolution of skeletal muscle fasciculations' },
    ],
    correctAnswer: 'B',
    explanation: {
      summary:
        'The primary endpoint of atropinization in organophosphate poisoning is clearing of bronchosecretions (dry chest) and normalization of pulmonary airway resistance, NOT pupillary dilation or tachycardia.',
      details:
        'Death in acute organophosphate poisoning occurs due to respiratory failure resulting from severe bronchospasm and drowning in excessive bronchial secretions (muscarinic M3 effects). Atropine blocks muscarinic receptors. Atropinization endpoints: dry axillae, clear lungs without crepitations, systolic BP > 80 mmHg, and heart rate > 80 bpm. Pupils and tachycardia are unreliable markers because hypoxia itself causes autonomic shifts, and atropine does NOT reverse nicotinic muscle fasciculations (which requires Pralidoxime).',
      optionExplanations: {
        A: 'Incorrect. Mydriasis is an unreliable endpoint and may occur late; titrating to pupillary dilation risks dangerous atropine toxicity.',
        B: 'Correct. Clearing of bronchial secretions and reversal of bronchoconstriction is the life-saving endpoint of atropine administration.',
        C: 'Incorrect. Moderate heart rate (>80 bpm) is sufficient; severe tachycardia (>120 bpm) indicates excessive atropinization or hypoxia.',
        D: 'Incorrect. Atropine acts strictly on muscarinic receptors; skeletal muscle fasciculations are nicotinic receptor mediated and respond only to oximes (Pralidoxime).',
      },
      learningPoints: [
        'Endpoint of atropinization: "Dry chest" (cessation of tracheobronchial secretions), clear chest on auscultation, heart rate > 80 bpm, systolic BP > 80 mmHg.',
        'Atropine crosses the blood-brain barrier and relieves CNS depression and muscarinic crisis.',
        'Pralidoxime (2-PAM) reactivates phosphorylated acetylcholinesterase before "aging" occurs and relieves nicotinic signs (fasciculations, weakness).'
      ],
    },
    metadata: {
      isPYQ: true,
      year: 2022,
      source: 'INI-CET Recall Reference',
      references: ['K.D. Tripathi Essentials of Medical Pharmacology, 8th Edition, Chapter 7'],
      tags: ['pharmacology', 'autonomic', 'organophosphate', 'atropine', 'pralidoxime'],
    },
    status: 'published',
  },
];
