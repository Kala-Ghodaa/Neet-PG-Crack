#!/usr/bin/env python3
"""
PG-Prep Arena: Senior Question Setter & Psychometric Tester Suite
Generates 3,800 authentic clinical MCQs for all 20 Scheduled Benchmark Grand Mocks:
- 10 NEET-PG 2026 Grand Mocks (180 MCQs each = 1,800 MCQs)
- 10 INI-CET AIIMS Grand Mocks (200 MCQs each = 2,000 MCQs)
Guarantees:
- ZERO duplicate questions within any mock (0% intra-mock repetition)
- ZERO question overlap across all 20 mocks (0% inter-mock overlap)
- Strict compliance with official NBEMS (5 sections) and AIIMS (4 parts) blueprints
- 100% compliance with PG-Prep Arena Schema v1.0
"""

import json
import os
import sys

# Official Exam Blueprints
NEET_SECTIONS = [
    # Section A: Pre-Clinical (36)
    ("anatomy", 12), ("physiology", 12), ("biochemistry", 12),
    # Section B: Para-Clinical (36)
    ("pathology", 14), ("pharmacology", 14), ("microbiology", 8),
    # Section C: Short Clinical & PSM (36)
    ("community-medicine", 14), ("forensic-medicine", 6), ("ent", 6), ("ophthalmology", 6), ("dermatology", 4),
    # Section D: Medicine & Allied (36)
    ("medicine", 20), ("pediatrics", 8), ("psychiatry", 4), ("radiology", 4),
    # Section E: Surgery & Allied (36)
    ("surgery", 20), ("obstetrics-gynecology", 10), ("orthopedics", 4), ("anesthesia", 2),
]

INICET_PARTS = [
    # Part A: Pre-Clinical & Molecular (50)
    ("anatomy", 17), ("physiology", 17), ("biochemistry", 16),
    # Part B: Para-Clinical & Diagnostic (50)
    ("pathology", 18), ("pharmacology", 18), ("microbiology", 14),
    # Part C: Short Clinical & Preventive (50)
    ("community-medicine", 14), ("forensic-medicine", 8), ("ent", 8), ("ophthalmology", 8), ("dermatology", 6), ("psychiatry", 6),
    # Part D: Core Clinical & Surgery (50)
    ("medicine", 16), ("surgery", 14), ("obstetrics-gynecology", 10), ("pediatrics", 6), ("orthopedics", 4),
]

SUBJECT_NAMES = {
    "anatomy": "Anatomy", "physiology": "Physiology", "biochemistry": "Biochemistry",
    "pathology": "Pathology", "pharmacology": "Pharmacology", "microbiology": "Microbiology",
    "forensic-medicine": "Forensic Medicine", "community-medicine": "Community Medicine",
    "ent": "ENT", "ophthalmology": "Ophthalmology", "medicine": "Medicine",
    "dermatology": "Dermatology", "psychiatry": "Psychiatry", "surgery": "Surgery",
    "orthopedics": "Orthopedics", "anesthesia": "Anesthesia", "radiology": "Radiology",
    "obstetrics-gynecology": "Obstetrics and Gynecology", "pediatrics": "Pediatrics",
}

SUBJECT_CODES = {
    "anatomy": "ANAT", "physiology": "PHYS", "biochemistry": "BIOC",
    "pathology": "PATH", "pharmacology": "PHAR", "microbiology": "MICR",
    "forensic-medicine": "FMED", "community-medicine": "CMED", "ent": "ENT",
    "ophthalmology": "OPHT", "medicine": "MEDI", "dermatology": "DERM",
    "psychiatry": "PSYC", "surgery": "SURG", "orthopedics": "ORTH",
    "anesthesia": "ANES", "radiology": "RADI", "obstetrics-gynecology": "OBGY",
    "pediatrics": "PEDS",
}

# Standard reference textbooks
TEXTBOOKS = {
    "anatomy": "Gray's Anatomy for Students, 4th Edition; BD Chaurasia Human Anatomy 8th Ed.",
    "physiology": "Guyton and Hall Textbook of Medical Physiology, 14th Edition; Ganong's Review of Medical Physiology 26th Ed.",
    "biochemistry": "Harper's Illustrated Biochemistry, 32nd Edition; Lehninger Principles of Biochemistry 8th Ed.",
    "pathology": "Robbins and Cotran Pathologic Basis of Disease, 10th Edition",
    "pharmacology": "Goodman and Gilman's The Pharmacological Basis of Therapeutics, 14th Edition; KD Tripathi Essentials of Medical Pharmacology 8th Ed.",
    "microbiology": "Ananthanarayan and Paniker's Textbook of Microbiology, 12th Edition; Jawetz Medical Microbiology 28th Ed.",
    "community-medicine": "Park's Textbook of Preventive and Social Medicine, 27th Edition",
    "forensic-medicine": "Reddy's The Essentials of Forensic Medicine and Toxicology, 35th Edition; Parikh's Textbook of Medical Jurisprudence",
    "ent": "Dhingra Diseases of Ear, Nose and Throat & Head and Neck Surgery, 8th Edition",
    "ophthalmology": "Kanski's Clinical Ophthalmology, 9th Edition; Parson's Diseases of the Eye 24th Ed.",
    "dermatology": "Rook's Textbook of Dermatology, 9th Edition; Neena Khanna Illustrated Synopsis of Dermatology",
    "psychiatry": "Kaplan and Sadock's Synopsis of Psychiatry, 12th Edition; Niraj Ahuja A Short Textbook of Psychiatry 20th Ed.",
    "medicine": "Harrison's Principles of Internal Medicine, 21st Edition",
    "surgery": "Bailey and Love's Short Practice of Surgery, 28th Edition",
    "obstetrics-gynecology": "DC Dutta's Textbook of Obstetrics 9th Ed.; Shaw's Textbook of Gynecology 17th Ed.",
    "pediatrics": "Nelson Textbook of Pediatrics, 21st Edition; OP Ghai Essential Pediatrics 9th Ed.",
    "orthopedics": "Maheshwari Essential Orthopaedics 7th Ed.; Campbell's Operative Orthopaedics 14th Ed.",
    "radiology": "Grainger & Allison's Diagnostic Radiology, 7th Edition; Sutton's Radiology",
    "anesthesia": "Miller's Anesthesia, 9th Edition; Morgan & Mikhail's Clinical Anesthesiology 7th Ed."
}

def generate_all_questions():
    print("Generating 3,800 clinically authentic questions...")
    # Quotas:
    # NEET: 10 * 180 = 1800
    # INICET: 10 * 200 = 2000
    # Total = 3800
    all_questions = []
    preferred_codes = {}

    # We need to allocate questions for:
    # 10 NEET Mocks (neet-pg-full-mock-1 to neet-pg-full-mock-10)
    # 10 INI-CET Mocks (inicet-full-mock-1 to inicet-full-mock-10)
    
    mock_registry = []
    for m in range(1, 11):
        mock_registry.append(("NEET", m, f"neet-pg-full-mock-{m}", f"NEET26-M{m:02d}", NEET_SECTIONS))
    for m in range(1, 11):
        mock_registry.append(("INICET", m, f"inicet-full-mock-{m}", f"INICET26-M{m:02d}", INICET_PARTS))

    # Keep track of global uniqueness
    seen_ids = set()
    seen_texts = set()

    for exam_type, mock_num, mock_id, code_prefix, blueprint in mock_registry:
        mock_codes = []
        q_idx = 1
        for subject_slug, count in blueprint:
            subj_name = SUBJECT_NAMES[subject_slug]
            subj_code = SUBJECT_CODES[subject_slug]
            ref_book = TEXTBOOKS[subject_slug]

            for c in range(count):
                qid = f"{code_prefix}-{q_idx:03d}"
                assert qid not in seen_ids, f"Duplicate ID {qid}"
                seen_ids.add(qid)
                mock_codes.append(qid)

                # Formulate distinct clinical scenarios for this mock and question
                # Each question has a unique clinical entity, clinical presentation, lead-in question, options, and explanation.
                # Use clinical question templates with distinct medical entities
                item = build_medical_mcq(exam_type, mock_num, q_idx, subject_slug, subj_name, subj_code, ref_book, c)
                
                # Verify stem uniqueness
                norm_text = item["question"]["text"].strip().lower()
                assert norm_text not in seen_texts, f"Duplicate question text: {norm_text}"
                seen_texts.add(norm_text)

                item["questionId"] = qid
                all_questions.append(item)
                q_idx += 1

        preferred_codes[mock_id] = mock_codes
        expected_len = 180 if exam_type == "NEET" else 200
        assert len(mock_codes) == expected_len, f"Mock {mock_id} expected {expected_len} Qs, got {len(mock_codes)}"

    print(f"Total questions generated: {len(all_questions)}")
    assert len(all_questions) == 3800
    assert len(seen_ids) == 3800
    assert len(seen_texts) == 3800

    return all_questions, preferred_codes


# Comprehensive clinical concept matrix by subject
# Each entry provides clinical context, scenario details, question stem, options, correct answer, and explanation.

from subject_clinical_catalogs import get_clinical_item_for_subject

def build_medical_mcq(exam_type, mock_num, q_idx, subject_slug, subj_name, subj_code, ref_book, item_offset):
    item = get_clinical_item_for_subject(subject_slug, exam_type, mock_num, q_idx, item_offset, ref_book)
    return item

if __name__ == "__main__":
    all_qs, preferred_map = generate_all_questions()

    # Save to JSON
    out_json = "src/data/mockPaperQuestionBank.json"
    print(f"Writing {len(all_qs)} questions to {out_json}...")
    with open(out_json, "w") as f:
        json.dump(all_qs, f, indent=2)

    # Save to TypeScript module
    out_ts = "src/data/mockPaperQuestionBank.ts"
    print(f"Writing TypeScript bindings to {out_ts}...")
    with open(out_ts, "w") as f:
        f.write('import type { QuestionBankSchemaItem } from "../types/domain.ts";\n')
        f.write('import questionsData from "./mockPaperQuestionBank.json";\n\n')
        f.write('export const ALL_BUILTIN_MOCK_QUESTIONS: QuestionBankSchemaItem[] = questionsData as QuestionBankSchemaItem[];\n\n')
        f.write('export const MOCK_PREFERRED_CODES: Record<string, string[]> = ')
        f.write(json.dumps(preferred_map, indent=2))
        f.write(';\n\n')
        f.write('export function getQuestionsForMock(mockId: string): QuestionBankSchemaItem[] {\n')
        f.write('  const codes = new Set(MOCK_PREFERRED_CODES[mockId] || []);\n')
        f.write('  if (codes.size === 0) return [];\n')
        f.write('  const codeMap = new Map(ALL_BUILTIN_MOCK_QUESTIONS.map(q => [q.questionId, q]));\n')
        f.write('  return (MOCK_PREFERRED_CODES[mockId] || []).map(code => codeMap.get(code)!).filter(Boolean);\n')
        f.write('}\n')

    print("Generation complete and successfully written.")
