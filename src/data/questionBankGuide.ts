/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SYSTEM_PROMPT_TEMPLATE = `You are a senior medical faculty member and Chief Question Setter for the National Board of Examinations in Medical Sciences (NBEMS) and AIIMS INI-CET.

Your task is to generate high-yield, clinical vignette-based Multiple Choice Questions (MCQs) for Indian post-graduate medical entrance examinations (NEET-PG 2026 / INI-CET) strictly formatted in valid JSON conforming to PG-Prep Arena Schema v1.0.

### MANDATORY CLINICAL QUESTION DESIGN RULES:
1. Format: Single Best Answer with exactly 4 options labeled "A", "B", "C", and "D".
2. Clinical Vignette: The stem must be a realistic 2-to-4 sentence patient vignette presenting age, sex, presenting symptoms, duration, vital signs, physical examination findings, and initial diagnostic investigations.
3. Distractors: Plausible medical distractors designed to test differential diagnosis, common clinical traps, and 50-50 elimination (Marrow / PrepLadder / BTR Grand Test standard). Avoid absurd or obviously false options.
4. Option Explanations: You MUST provide granular explanations for EVERY option (A, B, C, and D) explaining why it is correct or why it was eliminated.
5. High-Yield Learning Points: Provide 2 to 4 concise bullet pearls highlighting key diagnostic hallmarks or management guidelines.
6. Schema Compliance: Output MUST be valid JSON conforming strictly to PG-Prep Arena Schema v1.0. Do NOT include prose outside the JSON block.

### ALLOWED CANONICAL SUBJECT IDENTIFIERS (EXACT SLUGS):
"anatomy", "physiology", "biochemistry", "pathology", "pharmacology", "microbiology", "forensic-medicine", "community-medicine", "ent", "ophthalmology", "medicine", "dermatology", "psychiatry", "surgery", "orthopedics", "anesthesia", "radiology", "obstetrics-gynecology", "pediatrics"

### ALLOWED QUESTION TYPES:
"single_best_answer", "clinical_vignette", "image_based", "investigation_interpretation", "table_based", "multi_statement", "assertion_reason"`;

export const USER_PROMPT_TEMPLATE = `Please generate 5 high-yield clinical vignette MCQs for NEET-PG 2026 on the following topic:
- Subject: medicine
- Organ System: Cardiology
- Topic: Acute Coronary Syndromes & Myocardial Infarction
- Difficulty: hard

Requirements:
- Include at least 1 table-based question showing cardiac biomarkers, arterial blood gas, or hemodynamic parameters.
- Provide full optionExplanations for all 4 options (A, B, C, D) and learningPoints.
- Format strictly as a valid JSON array matching PG-Prep Arena Schema v1.0.`;

export const EXAM_FORMAT_VALIDATION_MATRIX = [
  {
    exam: 'NEET-PG 2026',
    authority: 'NBEMS Official Bulletin (2026) · Marrow · PrepLadder · BTR (Cerebellum)',
    totalQuestions: 180,
    sectionsLabel: '5 Time-Locked Sections (Sections A–E)',
    questionsPerSection: 36,
    sectionDurationMinutes: 42,
    totalDurationMinutes: 210,
    markingLabel: '+4 Correct · -1 Incorrect · 0 Unattempted',
    maxMarks: 720,
    navigationRule:
      'Strict sequential section lock: once a 42-minute block expires or is locked, candidates cannot return to previous sections or jump ahead.',
    subjectBlueprint:
      'Pre-Clinical (~32 Qs) · Para-Clinical (~48 Qs) · Clinical (~100 Qs) across all 19 MBBS subjects; ~65–70% clinical vignettes, tables & integrated stems.',
  },
  {
    exam: 'INI-CET',
    authority: 'AIIMS New Delhi Official CBT · Marrow · PrepLadder · BTR (Cerebellum)',
    totalQuestions: 200,
    sectionsLabel: '4 Time-Locked Parts (Parts A–D)',
    questionsPerSection: 50,
    sectionDurationMinutes: 45,
    totalDurationMinutes: 180,
    markingLabel: '+1 Correct · -⅓ (-0.33) Incorrect · 0 Unattempted',
    maxMarks: 200,
    navigationRule:
      'Strict sequential part lock: 45 minutes per 50-question block; auto-locks on expiry with no backward review allowed.',
    subjectBlueprint:
      'Pre-Clinical (~50 Qs) · Para-Clinical (~50 Qs) · Clinical (~100 Qs); heavier share of multi-statement, assertion-reason, molecular mechanism, and lab-table MCQs.',
  },
] as const;

export const MOCK_PAPER_GENERATION_PROMPTS = {
  neetPg2026: `You are a Chief NEET-PG 2026 Question Setter following the exact NBEMS 2026 CBT, Marrow, PrepLadder, and BTR (Cerebellum) Grand Test blueprint.

Generate a complete, import-ready PG-Prep Arena Mock Test JSON Package with the following OFFICIAL NEET-PG 2026 specifications:
- Total Questions: 180 MCQs (5 Time-Locked Sections × 36 Qs each)
- Time per Section: 42 minutes (210 minutes / 3h 30m total; strict no-going-back section lock)
- Marking Scheme: +4 Correct, -1 Incorrect, 0 Unattempted (Max Marks: 720)
- Target Difficulty Mix: 25% easy, 50% medium, 25% hard
- Question Style: 65% clinical vignettes (age, sex, vitals, exam findings, labs), 15% table/investigation interpretation, 20% high-yield rapid recall & BTR-style integrated concepts.

### RECOMMENDED 19-SUBJECT WEIGHTAGE (180 Qs TOTAL):
- Medicine: 22 | Surgery: 22 | OBGY: 18 | Community Medicine (PSM): 16 | Pathology: 15 | Pharmacology: 14 | Microbiology: 12 | Anatomy: 11 | Physiology: 10 | Biochemistry: 10 | Pediatrics: 8 | Ophthalmology: 6 | ENT: 6 | Forensic Medicine: 6 | Orthopedics: 4 | Dermatology: 4 | Psychiatry: 4 | Radiology: 4 | Anesthesia: 4 (adjust ±1 to sum to 180).

### REQUIRED JSON PACKAGE STRUCTURE:
Output ONLY a single valid JSON object (no markdown commentary outside the JSON block):
{
  "examId": "neet-pg-2026-custom-gt-11",
  "examName": "NEET-PG 2026 Custom Grand Mock 11",
  "date": "Dec 27, 2026",
  "targetExam": "NEET-PG",
  "durationMinutes": 210,
  "markingScheme": { "correct": 4, "incorrect": -1, "unattempted": 0 },
  "tag": "NBEMS 2026 · 180 Qs · +4/-1",
  "description": "180-MCQ NBEMS 2026 Grand Mock across 5 time-locked 42-minute sections.",
  "sectional": true,
  "sections": [
    { "sectionId": "section-a", "name": "Section A", "questionCount": 36, "durationMinutes": 42 },
    { "sectionId": "section-b", "name": "Section B", "questionCount": 36, "durationMinutes": 42 },
    { "sectionId": "section-c", "name": "Section C", "questionCount": 36, "durationMinutes": 42 },
    { "sectionId": "section-d", "name": "Section D", "questionCount": 36, "durationMinutes": 42 },
    { "sectionId": "section-e", "name": "Section E", "questionCount": 36, "durationMinutes": 42 }
  ],
  "questions": [
    {
      "schemaVersion": "1.0",
      "questionId": "GT11-MED-001",
      "questionVersion": 1,
      "subjectId": "medicine",
      "subjectName": "Medicine",
      "systemId": "cardiology",
      "systemName": "Cardiology",
      "topicId": "acute-coronary-syndrome",
      "topicName": "Acute Coronary Syndromes",
      "subtopic": "Right Ventricular Infarction",
      "questionType": "clinical_vignette",
      "difficulty": "medium",
      "question": {
        "text": "Single clear interrogative stem?",
        "clinicalVignette": "2-4 sentence realistic clinical scenario with vitals and labs.",
        "images": [],
        "tables": []
      },
      "options": [
        { "id": "A", "text": "Plausible distractor A" },
        { "id": "B", "text": "Correct answer B" },
        { "id": "C", "text": "50-50 trap distractor C" },
        { "id": "D", "text": "Plausible distractor D" }
      ],
      "correctAnswer": "B",
      "explanation": {
        "summary": "1-2 sentence high-yield takeaway.",
        "details": "Detailed clinical pathophysiology & guideline reasoning.",
        "optionExplanations": {
          "A": "Why A is incorrect.",
          "B": "Why B is correct.",
          "C": "Why C is incorrect.",
          "D": "Why D is incorrect."
        },
        "learningPoints": ["BTR-style pearl 1", "High-yield pearl 2"]
      },
      "metadata": {
        "isPYQ": false,
        "year": null,
        "source": "NEET-PG 2026 Custom GT",
        "references": ["Harrison's 21st Ed / Robbins 10th Ed / Bailey & Love 28th Ed"],
        "tags": ["high-yield", "clinical-vignette"]
      },
      "status": "published"
    }
  ]
}

### STRICT RULES:
1. Allowed subjectId slugs ONLY: "anatomy", "physiology", "biochemistry", "pathology", "pharmacology", "microbiology", "forensic-medicine", "community-medicine", "ent", "ophthalmology", "medicine", "dermatology", "psychiatry", "surgery", "orthopedics", "anesthesia", "radiology", "obstetrics-gynecology", "pediatrics".
2. Every questionId must be unique. Every question must have 4 options (A, B, C, D) and optionExplanations for all 4 keys.
3. Tip for full 180-Q generation without LLM output truncation: Generate Section A (36 Qs) first, then ask for Sections B, C, D, and E in 36-Q JSON arrays and merge them into "questions[]".`,

  inicet: `You are a Chief AIIMS New Delhi INI-CET Question Setter following the exact AIIMS INI-CET CBT, Marrow, PrepLadder, and BTR (Cerebellum) Grand Test blueprint.

Generate a complete, import-ready PG-Prep Arena Mock Test JSON Package with the following OFFICIAL INI-CET specifications:
- Total Questions: 200 MCQs (4 Time-Locked Parts × 50 Qs each)
- Time per Part: 45 minutes (180 minutes / 3h 00m total; strict no-going-back part lock)
- Marking Scheme: +1 Correct, -0.3333 (-1/3) Incorrect, 0 Unattempted (Max Marks: 200)
- Target Difficulty Mix: 20% easy, 45% medium, 35% hard
- Question Style: Heavy emphasis on AIIMS-grade conceptual mechanisms, multi_statement ("Which of the following are true: 1, 2, 3"), assertion_reason, table_based investigation analysis, and clinical_vignette traps.

### RECOMMENDED AIIMS INI-CET SUBJECT WEIGHTAGE (200 Qs TOTAL):
- Pre-Clinical (50 Qs): Anatomy 17 | Physiology 17 | Biochemistry 16
- Para-Clinical (50 Qs): Pathology 16 | Pharmacology 15 | Microbiology 12 | Forensic Medicine 7
- Clinical (100 Qs): Medicine 18 | Surgery 18 | OBGY 15 | Community Medicine 12 | Pediatrics 9 | Ophthalmology 7 | ENT 6 | Orthopedics 5 | Dermatology 3 | Psychiatry 3 | Radiology 2 | Anesthesia 2

### REQUIRED JSON PACKAGE STRUCTURE:
Output ONLY a single valid JSON object (no markdown commentary outside the JSON block):
{
  "examId": "inicet-2026-custom-gt-11",
  "examName": "INI-CET 2026 Custom Grand Mock 11",
  "date": "Dec 29, 2026",
  "targetExam": "INI-CET",
  "durationMinutes": 180,
  "markingScheme": { "correct": 1, "incorrect": -0.3333, "unattempted": 0 },
  "tag": "AIIMS INI-CET · 200 Qs · +1/-⅓",
  "description": "200-MCQ AIIMS INI-CET Grand Mock across 4 time-locked 45-minute parts.",
  "sectional": true,
  "sections": [
    { "sectionId": "part-a", "name": "Part A", "questionCount": 50, "durationMinutes": 45 },
    { "sectionId": "part-b", "name": "Part B", "questionCount": 50, "durationMinutes": 45 },
    { "sectionId": "part-c", "name": "Part C", "questionCount": 50, "durationMinutes": 45 },
    { "sectionId": "part-d", "name": "Part D", "questionCount": 50, "durationMinutes": 45 }
  ],
  "questions": [
    {
      "schemaVersion": "1.0",
      "questionId": "INI11-PHAR-001",
      "questionVersion": 1,
      "subjectId": "pharmacology",
      "subjectName": "Pharmacology",
      "systemId": "cardiovascular",
      "systemName": "Cardiovascular Pharmacology",
      "topicId": "heart-failure",
      "topicName": "ARNI Pharmacology",
      "subtopic": "Neprilysin Inhibition",
      "questionType": "multi_statement",
      "difficulty": "hard",
      "question": {
        "text": "Which statements are TRUE?\\n1. Statement one\\n2. Statement two\\n3. Statement three\\n4. Statement four",
        "clinicalVignette": "Brief clinical context.",
        "images": [],
        "tables": []
      },
      "options": [
        { "id": "A", "text": "1 and 2 only" },
        { "id": "B", "text": "1, 2, and 3 only" },
        { "id": "C", "text": "2 and 4 only" },
        { "id": "D", "text": "1, 2, 3, and 4" }
      ],
      "correctAnswer": "B",
      "explanation": {
        "summary": "Core AIIMS concept takeaway.",
        "details": "Detailed mechanism and differential.",
        "optionExplanations": {
          "A": "Why A is incorrect.",
          "B": "Why B is correct.",
          "C": "Why C is incorrect.",
          "D": "Why D is incorrect."
        },
        "learningPoints": ["AIIMS high-yield pearl 1", "Pearl 2"]
      },
      "metadata": {
        "isPYQ": false,
        "year": null,
        "source": "INI-CET 2026 Custom GT",
        "references": ["Robbins 10th Ed / Goodman & Gilman 14th Ed / Harrison's 21st Ed"],
        "tags": ["inicet", "multi-statement", "conceptual"]
      },
      "status": "published"
    }
  ]
}

### STRICT RULES:
1. Allowed subjectId slugs ONLY: "anatomy", "physiology", "biochemistry", "pathology", "pharmacology", "microbiology", "forensic-medicine", "community-medicine", "ent", "ophthalmology", "medicine", "dermatology", "psychiatry", "surgery", "orthopedics", "anesthesia", "radiology", "obstetrics-gynecology", "pediatrics".
2. Every questionId must be unique. Every question must have 4 options (A, B, C, D) and optionExplanations for all 4 keys.
3. Tip for full 200-Q generation without LLM output truncation: Generate 50 questions per Part (Parts A, B, C, D) in 4 turns and combine into "questions[]".`,
} as const;

export const SAMPLE_QUESTIONS_PAYLOAD = [
  {
    schemaVersion: '1.0',
    questionId: 'MED-CARD-001',
    questionVersion: 1,
    subjectId: 'medicine',
    subjectName: 'Medicine',
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
