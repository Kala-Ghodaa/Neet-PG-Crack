// src/__tests__/mockNonIdentical.test.ts
import { describe, it, expect } from 'vitest';
import {
  ALL_BUILTIN_MOCK_QUESTIONS,
  MOCK_PREFERRED_CODES,
  getQuestionsForMock,
} from '../data/mockPaperQuestionBank';
import {
  NEET_PG_10_MOCK_CONFIGS,
  INICET_10_MOCK_CONFIGS,
  BUILTIN_MOCK_CONFIGS,
  BUILTIN_MOCK_PAPERS_METADATA,
  NEET_PG_SUBJECTS,
} from '../data/seedQuestions';
import { validateQuestionBankImportPayload } from '../services/examEngine';

describe('Senior Question Setter & Psychometric Audit: 20 Scheduled Grand Mocks Non-Identical Verification', () => {
  it('AUDIT-01: Configures all 20 benchmark grand mocks (10 NEET-PG + 10 INI-CET) with dedicated preferredQuestionCodes', () => {
    expect(NEET_PG_10_MOCK_CONFIGS).toHaveLength(10);
    expect(INICET_10_MOCK_CONFIGS).toHaveLength(10);
    expect(BUILTIN_MOCK_CONFIGS).toHaveLength(20);
    expect(BUILTIN_MOCK_PAPERS_METADATA).toHaveLength(20);

    for (let i = 1; i <= 10; i++) {
      const neetConfig = NEET_PG_10_MOCK_CONFIGS.find((c) => c.examId === `neet-pg-full-mock-${i}`);
      expect(neetConfig).toBeDefined();
      expect((neetConfig as any).preferredQuestionCodes).toHaveLength(180);

      const inicetConfig = INICET_10_MOCK_CONFIGS.find((c) => c.examId === `inicet-full-mock-${i}`);
      expect(inicetConfig).toBeDefined();
      expect((inicetConfig as any).preferredQuestionCodes).toHaveLength(200);
    }
  });

  it('AUDIT-02: Generates exactly 3,800 total unique questions across the complete 20-mock ecosystem', () => {
    expect(ALL_BUILTIN_MOCK_QUESTIONS).toHaveLength(3800);

    const allQuestionIds = new Set(ALL_BUILTIN_MOCK_QUESTIONS.map((q) => q.questionId));
    expect(allQuestionIds.size).toBe(3800);

    const allNormalizedStems = new Set(
      ALL_BUILTIN_MOCK_QUESTIONS.map((q) => q.question.text.trim().toLowerCase())
    );
    expect(allNormalizedStems.size).toBe(3800);
  });

  it('AUDIT-03: Zero intra-mock question repetition - every mock has 100% distinct questions internally', () => {
    const mockIds = Object.keys(MOCK_PREFERRED_CODES);
    expect(mockIds).toHaveLength(20);

    for (const mockId of mockIds) {
      const mockQuestions = getQuestionsForMock(mockId);
      const isNeet = mockId.startsWith('neet');
      const expectedCount = isNeet ? 180 : 200;

      expect(mockQuestions).toHaveLength(expectedCount);

      const seenIds = new Set<string>();
      const seenStems = new Set<string>();

      for (const q of mockQuestions) {
        expect(seenIds.has(q.questionId)).toBe(false);
        seenIds.add(q.questionId);

        const normStem = q.question.text.trim().toLowerCase();
        expect(seenStems.has(normStem)).toBe(false);
        seenStems.add(normStem);
      }

      // Assert zero intra-mock duplication
      expect(seenIds.size).toBe(expectedCount);
      expect(seenStems.size).toBe(expectedCount);
    }
  });

  it('AUDIT-04: Zero inter-mock question overlap across all 190 distinct mock pairs (i, j)', () => {
    const mockIds = Object.keys(MOCK_PREFERRED_CODES);
    let totalPairsEvaluated = 0;
    let totalQuestionCollisions = 0;

    for (let i = 0; i < mockIds.length; i++) {
      const mockA = mockIds[i];
      const codesA = new Set(MOCK_PREFERRED_CODES[mockA]);
      const questionsA = getQuestionsForMock(mockA);
      const stemsA = new Set(questionsA.map((q) => q.question.text.trim().toLowerCase()));

      for (let j = i + 1; j < mockIds.length; j++) {
        const mockB = mockIds[j];
        const codesB = new Set(MOCK_PREFERRED_CODES[mockB]);
        const questionsB = getQuestionsForMock(mockB);
        const stemsB = new Set(questionsB.map((q) => q.question.text.trim().toLowerCase()));

        // Check ID collisions
        const idOverlap = [...codesA].filter((id) => codesB.has(id));
        // Check stem text collisions
        const stemOverlap = [...stemsA].filter((stem) => stemsB.has(stem));

        if (idOverlap.length > 0 || stemOverlap.length > 0) {
          totalQuestionCollisions += idOverlap.length + stemOverlap.length;
        }

        expect(idOverlap).toEqual([]);
        expect(stemOverlap).toEqual([]);
        totalPairsEvaluated++;
      }
    }

    expect(totalPairsEvaluated).toBe((20 * 19) / 2); // 190 unique pairs
    expect(totalQuestionCollisions).toBe(0);
  });

  it('AUDIT-05: 100% schema compliance - passes validateQuestionBankImportPayload with 0 errors and 0 duplicate warnings', () => {
    const validationReport = validateQuestionBankImportPayload(ALL_BUILTIN_MOCK_QUESTIONS);

    expect(validationReport.valid).toBe(true);
    expect(validationReport.totalSubmitted).toBe(3800);
    expect(validationReport.validCount).toBe(3800);
    expect(validationReport.errors).toHaveLength(0);
    expect(validationReport.duplicateIdsInPayload).toHaveLength(0);
    expect(validationReport.probableContentDuplicates).toHaveLength(0);
  });

  it('AUDIT-06: Strict clinical blueprint adherence - covers all 19 MBBS subjects with correct section distribution', () => {
    const allSubjects = new Set(ALL_BUILTIN_MOCK_QUESTIONS.map((q) => q.subjectId));
    expect(allSubjects.size).toBe(19);

    for (const subj of NEET_PG_SUBJECTS) {
      expect(allSubjects.has(subj.slug)).toBe(true);
    }

    // Verify NEET Mock 1 subject sequence (Section A: Anat, Physio, Biochem)
    const neet1Questions = getQuestionsForMock('neet-pg-full-mock-1');
    const secASubjects = neet1Questions.slice(0, 36).map((q) => q.subjectId);
    expect(secASubjects.slice(0, 12).every((s) => s === 'anatomy')).toBe(true);
    expect(secASubjects.slice(12, 24).every((s) => s === 'physiology')).toBe(true);
    expect(secASubjects.slice(24, 36).every((s) => s === 'biochemistry')).toBe(true);

    // Verify INI-CET Mock 1 subject sequence (Part A: 50 Pre-clinical questions)
    const inicet1Questions = getQuestionsForMock('inicet-full-mock-1');
    const partASubjects = inicet1Questions.slice(0, 50).map((q) => q.subjectId);
    expect(partASubjects.slice(0, 17).every((s) => s === 'anatomy')).toBe(true);
    expect(partASubjects.slice(17, 34).every((s) => s === 'physiology')).toBe(true);
    expect(partASubjects.slice(34, 50).every((s) => s === 'biochemistry')).toBe(true);
  });

  it('AUDIT-07: Every question has 4 unique options, valid answer, complete summary, details, and 3 learning points', () => {
    for (const q of ALL_BUILTIN_MOCK_QUESTIONS) {
      expect(q.options).toHaveLength(4);
      const optionIds = q.options.map((o: any) => o.id);
      expect(optionIds).toEqual(['A', 'B', 'C', 'D']);

      expect(['A', 'B', 'C', 'D']).toContain(q.correctAnswer);

      expect(q.explanation.summary.length).toBeGreaterThan(10);
      expect(q.explanation.details.length).toBeGreaterThan(10);
      expect(q.explanation.learningPoints).toHaveLength(3);
      expect(q.explanation.optionExplanations).toHaveProperty('A');
      expect(q.explanation.optionExplanations).toHaveProperty('B');
      expect(q.explanation.optionExplanations).toHaveProperty('C');
      expect(q.explanation.optionExplanations).toHaveProperty('D');
    }
  });
});
