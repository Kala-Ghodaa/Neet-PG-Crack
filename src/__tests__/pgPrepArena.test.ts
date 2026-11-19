import { describe, it, expect } from 'vitest';
import {
  validateExamConfig,
  derivePaletteState,
  applyResponseTransition,
  validateQuestionBankImportPayload,
} from '../services/examEngine.ts';
import {
  scoreQuestionResponse,
  calculateCompleteExamAnalytics,
  EvaluatedQuestionInput,
} from '../services/analyticsEngine.ts';
import {
  DEFAULT_NEET_PG_FULL_MOCK_CONFIG,
  DEFAULT_INICET_FULL_MOCK_CONFIG,
  BUILTIN_MOCK_CONFIGS,
  BUILTIN_MOCK_PAPERS_METADATA,
  SAMPLE_IMPORTABLE_MOCK_PAPER,
  SAMPLE_IMPORTABLE_INICET_PAPER,
  NEET_PG_SUBJECTS,
  generateFull200QuestionBank,
} from '../data/seedQuestions.ts';
import { StudentResponseRecord } from '../types/domain.ts';

describe('PG-PREP ARENA — Core Examination, Guess Intelligence & Analytics Test Suite', () => {
  describe('1. Exam Configuration & 200-Question Bank Validation', () => {
    it('validates the NBEMS 2026 NEET-PG (180 Q · 5×36 · 42m · +4/-1) and AIIMS INI-CET (200 Q · 4×50 · 45m · +1/-⅓) configs', () => {
      const neetResult = validateExamConfig(DEFAULT_NEET_PG_FULL_MOCK_CONFIG);
      expect(neetResult.valid).toBe(true);
      expect(neetResult.errors).toHaveLength(0);
      expect(DEFAULT_NEET_PG_FULL_MOCK_CONFIG.pattern.sections).toHaveLength(5);
      expect(DEFAULT_NEET_PG_FULL_MOCK_CONFIG.pattern.totalQuestions).toBe(180);
      expect(DEFAULT_NEET_PG_FULL_MOCK_CONFIG.pattern.durationSeconds).toBe(12600);
      expect(DEFAULT_NEET_PG_FULL_MOCK_CONFIG.markingScheme).toEqual({
        correct: 4,
        incorrect: -1,
        unattempted: 0,
      });

      const inicetResult = validateExamConfig(DEFAULT_INICET_FULL_MOCK_CONFIG);
      expect(inicetResult.valid).toBe(true);
      expect(inicetResult.errors).toHaveLength(0);
      expect(DEFAULT_INICET_FULL_MOCK_CONFIG.pattern.sections).toHaveLength(4);
      expect(DEFAULT_INICET_FULL_MOCK_CONFIG.pattern.totalQuestions).toBe(200);
      expect(DEFAULT_INICET_FULL_MOCK_CONFIG.pattern.durationSeconds).toBe(10800);
      expect(DEFAULT_INICET_FULL_MOCK_CONFIG.markingScheme.correct).toBe(1);
      expect(DEFAULT_INICET_FULL_MOCK_CONFIG.markingScheme.incorrect).toBeCloseTo(-1 / 3, 4);
    });

    it('rejects sectional exam configs where section counts do not sum to totalQuestions', () => {
      const brokenConfig = {
        ...DEFAULT_NEET_PG_FULL_MOCK_CONFIG,
        pattern: {
          ...DEFAULT_NEET_PG_FULL_MOCK_CONFIG.pattern,
          totalQuestions: 100, // mismatch with 180
        },
      };
      const result = validateExamConfig(brokenConfig);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('do not add up');
    });

    it('contains all 19 NEET PG subjects and generates 200 unique question codes', () => {
      expect(NEET_PG_SUBJECTS).toHaveLength(19);
      const bank = generateFull200QuestionBank();
      expect(bank).toHaveLength(200);
      const uniqueIds = new Set(bank.map((q) => q.questionId));
      expect(uniqueIds.size).toBe(200);
      const coveredSubjects = new Set(bank.map((q) => q.subjectId));
      expect(coveredSubjects.size).toBe(19);
    });
  });

  describe('2. NBEMS Question Palette State Derivation & Strict Save Mode', () => {
    it('derives all 5 NBEMS palette states accurately from persisted response and review flags', () => {
      expect(
        derivePaletteState({ visited: false, savedOption: null, isMarkedForReview: false })
      ).toBe('not_visited');
      expect(
        derivePaletteState({ visited: true, savedOption: null, isMarkedForReview: false })
      ).toBe('not_answered');
      expect(
        derivePaletteState({ visited: true, savedOption: 'B', isMarkedForReview: false })
      ).toBe('answered');
      expect(
        derivePaletteState({ visited: true, savedOption: null, isMarkedForReview: true })
      ).toBe('marked_for_review');
      expect(
        derivePaletteState({ visited: true, savedOption: 'C', isMarkedForReview: true })
      ).toBe('answered_and_marked_for_review');
    });

    it('discards unsaved pending selection when navigating away in Strict NBEMS Save Mode', () => {
      const initial: StudentResponseRecord = {
        testQuestionId: 1,
        questionId: 101,
        questionOrder: 1,
        sectionIndex: 0,
        visited: true,
        savedOption: null,
        pendingOption: 'B',
        isMarkedForReview: false,
        confidence: 'sure',
        secondGuessOption: null,
        eliminatedOptions: [],
        timeSpentSeconds: 10,
        visitCount: 1,
      };

      const navResult = applyResponseTransition({
        current: initial,
        selectedPendingOption: 'B',
        guessModeActive: false,
        secondGuessOption: null,
        eliminatedOptions: [],
        action: 'navigate_away',
        strictSaveMode: true,
        additionalTimeSeconds: 5,
      });

      expect(navResult.updated.savedOption).toBeNull();
      expect(derivePaletteState(navResult.updated)).toBe('not_answered');
      expect(navResult.answerRevisionCreated).toBe(false);
    });

    it('commits pending selection and records answer revision when Save & Next is clicked', () => {
      const initial: StudentResponseRecord = {
        testQuestionId: 1,
        questionId: 101,
        questionOrder: 1,
        sectionIndex: 0,
        visited: true,
        savedOption: 'A',
        pendingOption: 'C',
        isMarkedForReview: false,
        confidence: 'sure',
        secondGuessOption: null,
        eliminatedOptions: ['C', 'D'],
        timeSpentSeconds: 15,
        visitCount: 1,
      };

      const saveResult = applyResponseTransition({
        current: initial,
        selectedPendingOption: 'C',
        guessModeActive: true,
        secondGuessOption: 'B',
        eliminatedOptions: ['C', 'D'],
        action: 'save_and_next',
        strictSaveMode: true,
        additionalTimeSeconds: 10,
      });

      expect(saveResult.updated.savedOption).toBe('C');
      expect(saveResult.updated.confidence).toBe('main_guess');
      expect(saveResult.updated.secondGuessOption).toBe('B');
      // Selecting option C automatically removes C from eliminatedOptions
      expect(saveResult.updated.eliminatedOptions).toEqual(['D']);
      expect(saveResult.answerRevisionCreated).toBe(true);
      expect(saveResult.previousSavedOption).toBe('A');
    });

    it('records guess_intent_unattempted when Guess Mode is enabled without a saved answer', () => {
      const initial: StudentResponseRecord = {
        testQuestionId: 2,
        questionId: 102,
        questionOrder: 2,
        sectionIndex: 0,
        visited: true,
        savedOption: null,
        pendingOption: null,
        isMarkedForReview: false,
        confidence: 'sure',
        secondGuessOption: null,
        eliminatedOptions: ['A'],
        timeSpentSeconds: 12,
        visitCount: 1,
      };

      const res = applyResponseTransition({
        current: initial,
        selectedPendingOption: null,
        guessModeActive: true,
        secondGuessOption: null,
        eliminatedOptions: ['A'],
        action: 'navigate_away',
        strictSaveMode: true,
      });

      expect(res.updated.savedOption).toBeNull();
      expect(res.updated.confidence).toBe('guess_intent_unattempted');
    });

    it('clears saved answer and Main Guess while preserving review status and respecting Second Guess retention choice', () => {
      const initial: StudentResponseRecord = {
        testQuestionId: 3,
        questionId: 103,
        questionOrder: 3,
        sectionIndex: 0,
        visited: true,
        savedOption: 'B',
        pendingOption: 'B',
        isMarkedForReview: true,
        confidence: 'main_guess',
        secondGuessOption: 'D',
        eliminatedOptions: ['A', 'C'],
        timeSpentSeconds: 20,
        visitCount: 1,
      };

      const cleared = applyResponseTransition({
        current: initial,
        selectedPendingOption: null,
        guessModeActive: false,
        secondGuessOption: 'D',
        eliminatedOptions: ['A', 'C'],
        action: 'clear_response',
        strictSaveMode: true,
        clearOptions: { clearSecondGuess: false, clearEliminations: false },
      });

      expect(cleared.updated.savedOption).toBeNull();
      expect(cleared.updated.confidence).toBe('sure');
      expect(cleared.updated.isMarkedForReview).toBe(true);
      expect(cleared.updated.secondGuessOption).toBe('D');
      expect(cleared.updated.eliminatedOptions).toEqual(['A', 'C']);
    });

    it('clears isMarkedForReview when Save & Next is clicked on a previously reviewed question (BUG-NEET-02)', () => {
      const reviewed: StudentResponseRecord = {
        testQuestionId: 4,
        questionId: 104,
        questionOrder: 4,
        sectionIndex: 0,
        visited: true,
        savedOption: 'B',
        pendingOption: 'B',
        isMarkedForReview: true,
        confidence: 'sure',
        secondGuessOption: null,
        eliminatedOptions: [],
        timeSpentSeconds: 30,
        visitCount: 2,
      };

      expect(derivePaletteState(reviewed)).toBe('answered_and_marked_for_review');

      const saved = applyResponseTransition({
        current: reviewed,
        selectedPendingOption: 'B',
        guessModeActive: false,
        secondGuessOption: null,
        eliminatedOptions: [],
        action: 'save_and_next',
        strictSaveMode: true,
        additionalTimeSeconds: 5,
      });

      expect(saved.updated.savedOption).toBe('B');
      expect(saved.updated.isMarkedForReview).toBe(false);
      expect(derivePaletteState(saved.updated)).toBe('answered');
    });

    it('enforces mutual exclusion between Second Guess and Eliminated Options (BUG-NEET-04)', () => {
      const initial: StudentResponseRecord = {
        testQuestionId: 5,
        questionId: 105,
        questionOrder: 5,
        sectionIndex: 0,
        visited: true,
        savedOption: null,
        pendingOption: 'A',
        isMarkedForReview: false,
        confidence: 'sure',
        secondGuessOption: null,
        eliminatedOptions: ['C', 'D'],
        timeSpentSeconds: 18,
        visitCount: 1,
      };

      const res = applyResponseTransition({
        current: initial,
        selectedPendingOption: 'A',
        guessModeActive: true,
        secondGuessOption: 'C',
        eliminatedOptions: ['C', 'D'],
        action: 'save_and_next',
        strictSaveMode: true,
        additionalTimeSeconds: 6,
      });

      expect(res.updated.savedOption).toBe('A');
      expect(res.updated.secondGuessOption).toBe('C');
      // Option C must be removed from eliminatedOptions because it is tagged as Second Guess
      expect(res.updated.eliminatedOptions).toEqual(['D']);
    });
  });

  describe('3. Official Scoring Verification (Section 25.C Acceptance Table)', () => {
    const scheme = { correct: 4, incorrect: -1, unattempted: 0 };

    it('scores all 9 acceptance scenarios accurately', () => {
      // 1. Correct = +4
      expect(scoreQuestionResponse('B', 'B', scheme).marksAwarded).toBe(4);
      // 2. Incorrect = -1
      expect(scoreQuestionResponse('A', 'B', scheme).marksAwarded).toBe(-1);
      // 3. Unattempted = 0
      expect(scoreQuestionResponse(null, 'B', scheme).marksAwarded).toBe(0);

      // 4-9 verified through full analytics engine (Main Guess, Second Guess, Marked for Review)
      const sampleItems: EvaluatedQuestionInput[] = [
        // Q1: Correct Main Guess (+4)
        {
          testQuestionId: 1,
          questionId: 1,
          questionCode: 'PATH-1',
          subjectSlug: 'pathology',
          subjectName: 'Pathology',
          systemName: 'Hematology',
          topicName: 'Anemia',
          subtopicName: 'IDA',
          difficulty: 'medium',
          correctOption: 'B',
          savedOption: 'B',
          isMarkedForReview: false,
          confidence: 'main_guess',
          secondGuessOption: 'C',
          eliminatedOptions: ['A', 'D'],
          timeSpentSeconds: 40,
          visitCount: 1,
        },
        // Q2: Incorrect Main Guess with Correct Second Guess (-1 official score; Second Guess never graded!)
        {
          testQuestionId: 2,
          questionId: 2,
          questionCode: 'PATH-2',
          subjectSlug: 'pathology',
          subjectName: 'Pathology',
          systemName: 'Hematology',
          topicName: 'Anemia',
          subtopicName: 'Thalassemia',
          difficulty: 'medium',
          correctOption: 'D',
          savedOption: 'B',
          isMarkedForReview: false,
          confidence: 'main_guess',
          secondGuessOption: 'D',
          eliminatedOptions: ['A', 'C'],
          timeSpentSeconds: 65,
          visitCount: 2,
        },
        // Q3: Correct + Marked for Review (+4)
        {
          testQuestionId: 3,
          questionId: 3,
          questionCode: 'PHAR-1',
          subjectSlug: 'pharmacology',
          subjectName: 'Pharmacology',
          systemName: 'ANS',
          topicName: 'Cholinergic',
          subtopic: 'OP Poisoning',
          subtopicName: 'OP Poisoning',
          difficulty: 'easy',
          correctOption: 'A',
          savedOption: 'A',
          isMarkedForReview: true,
          confidence: 'sure',
          secondGuessOption: null,
          eliminatedOptions: [],
          timeSpentSeconds: 30,
          visitCount: 1,
        } as any,
        // Q4: Incorrect + Marked for Review (-1)
        {
          testQuestionId: 4,
          questionId: 4,
          questionCode: 'PHAR-2',
          subjectSlug: 'pharmacology',
          subjectName: 'Pharmacology',
          systemName: 'ANS',
          topicName: 'Cholinergic',
          subtopicName: 'Atropine',
          difficulty: 'hard',
          correctOption: 'C',
          savedOption: 'A',
          isMarkedForReview: true,
          confidence: 'sure',
          secondGuessOption: null,
          eliminatedOptions: [],
          timeSpentSeconds: 70,
          visitCount: 1,
        },
        // Q5: Unanswered + Marked for Review + Guess Intent (0)
        {
          testQuestionId: 5,
          questionId: 5,
          questionCode: 'ANAT-1',
          subjectSlug: 'anatomy',
          subjectName: 'Anatomy',
          systemName: 'Neuroanatomy',
          topicName: 'Brainstem',
          subtopicName: 'Wallenberg',
          difficulty: 'medium',
          correctOption: 'B',
          savedOption: null,
          isMarkedForReview: true,
          confidence: 'guess_intent_unattempted',
          secondGuessOption: null,
          eliminatedOptions: ['A'],
          timeSpentSeconds: 25,
          visitCount: 1,
        },
      ];

      const analytics = calculateCompleteExamAnalytics(
        sampleItems,
        [
          {
            testQuestionId: 1,
            questionId: 1,
            revisionNumber: 1,
            previousOption: 'C',
            newOption: 'B',
            previousConfidence: 'main_guess',
            newConfidence: 'main_guess',
            wasReviewedBeforeChange: false,
            timeSpentBeforeChangeSeconds: 20,
            changedAt: new Date().toISOString(),
          },
        ],
        scheme
      );

      // Total score = +4 (Q1) - 1 (Q2) + 4 (Q3) - 1 (Q4) + 0 (Q5) = 6
      expect(analytics.score).toBe(6);
      expect(analytics.correctCount).toBe(2);
      expect(analytics.incorrectCount).toBe(2);
      expect(analytics.unattemptedCount).toBe(1);
      expect(analytics.accuracy).toBe(50);

      // 50-50 & Guess Intelligence verification
      expect(analytics.guessIntelligence.mainGuessCount).toBe(2);
      expect(analytics.guessIntelligence.mainGuessCorrect).toBe(1);
      expect(analytics.guessIntelligence.mainGuessAccuracy).toBe(50);
      expect(analytics.guessIntelligence.secondGuessCount).toBe(2);
      expect(analytics.guessIntelligence.secondGuessMatchingCorrect).toBe(1);
      expect(analytics.guessIntelligence.guessIntentUnattemptedCount).toBe(1);
      expect(
        analytics.guessIntelligence.eliminationAnalysis.twoOptionsEliminatedCount
      ).toBe(2);
      expect(
        analytics.guessIntelligence.eliminationAnalysis.correctAnswerSurvivalRate
      ).toBe(100);
      expect(analytics.answerChangeIntelligence.incorrectToCorrect).toBe(1);
    });
  });

  describe('4. Bulk Question Bank JSON Schema Validation & AI Authoring Kit', () => {
    it('validates clean schema items and catches duplicate IDs or invalid subjects', () => {
      const validItem = generateFull200QuestionBank()[0];
      const passReport = validateQuestionBankImportPayload([validItem]);
      expect(passReport.valid).toBe(true);
      expect(passReport.validCount).toBe(1);

      const duplicateReport = validateQuestionBankImportPayload([validItem, validItem]);
      expect(duplicateReport.valid).toBe(false);
      expect(duplicateReport.duplicateIdsInPayload).toContain(validItem.questionId);
    });

    it('verifies that the AI authoring sample questions payload passes all 14 validation steps', async () => {
      const { SAMPLE_QUESTIONS_PAYLOAD } = await import('../data/questionBankGuide.ts');
      expect(SAMPLE_QUESTIONS_PAYLOAD).toHaveLength(3);
      const report = validateQuestionBankImportPayload(SAMPLE_QUESTIONS_PAYLOAD);
      expect(report.valid).toBe(true);
      expect(report.validCount).toBe(3);
      expect(report.errors).toHaveLength(0);
      expect(report.duplicateIdsInPayload).toHaveLength(0);
    });

    it('catches and reports corrupted questions (wrong key, missing options, invalid subject)', () => {
      const corruptedItem = {
        schemaVersion: '1.0',
        questionId: 'BAD-01',
        subjectId: 'astronomy_invalid_subject',
        question: { text: 'Short' },
        options: [
          { id: 'A', text: 'Opt A' },
          { id: 'B', text: 'Opt B' },
        ], // only 2 options instead of 4
        correctAnswer: 'Z', // invalid option key
      };

      const report = validateQuestionBankImportPayload([corruptedItem as any]);
      expect(report.valid).toBe(false);
      expect(report.errors.length).toBeGreaterThan(0);
      const errMsgs = report.errors.map((e) => e.message).join(' | ');
      expect(errMsgs).toContain('subject');
    });

    it('handles ultra-long clinical vignettes and chemical names without text processing failures', () => {
      const longVignette =
        'Patient presents with severe hypercholesterolemia. Diagnostic investigation reveals a missense mutation in 3-hydroxy-3-methylglutaryl-coenzyme A reductase, accompanied by persistent hyperapobetalipoproteinemia and severe familial dysbetalipoproteinemia. ' +
        'A'.repeat(1200);

      const testQ: any = {
        ...generateFull200QuestionBank()[0],
        questionId: 'LONG-STR-01',
        question: {
          text: 'What is the molecular defect responsible for this metabolic condition?',
          clinicalVignette: longVignette,
          images: [],
          tables: [],
        },
      };

      const report = validateQuestionBankImportPayload([testQ]);
      expect(report.valid).toBe(true);
      expect(report.validCount).toBe(1);
    });

    it('correctly executes Clear Response sub-options (Preserve 2nd Guess vs Clear All)', () => {
      const initial: StudentResponseRecord = {
        testQuestionId: 10,
        questionId: 110,
        questionOrder: 10,
        sectionIndex: 0,
        visited: true,
        savedOption: 'A',
        pendingOption: 'A',
        isMarkedForReview: false,
        confidence: 'main_guess',
        secondGuessOption: 'C',
        eliminatedOptions: ['B', 'D'],
        timeSpentSeconds: 40,
        visitCount: 1,
      };

      // Option 1: Clear Answer & Main Guess, but PRESERVE Second Guess & Eliminations
      const resPreserve = applyResponseTransition({
        current: initial,
        selectedPendingOption: null,
        guessModeActive: false,
        secondGuessOption: 'C',
        eliminatedOptions: ['B', 'D'],
        action: 'clear_response',
        strictSaveMode: true,
        clearOptions: { clearSecondGuess: false, clearEliminations: false },
      });
      expect(resPreserve.updated.savedOption).toBeNull();
      expect(resPreserve.updated.confidence).toBe('sure');
      expect(resPreserve.updated.secondGuessOption).toBe('C');
      expect(resPreserve.updated.eliminatedOptions).toEqual(['B', 'D']);

      // Option 3: Reset Everything
      const resResetAll = applyResponseTransition({
        current: initial,
        selectedPendingOption: null,
        guessModeActive: false,
        secondGuessOption: null,
        eliminatedOptions: [],
        action: 'clear_response',
        strictSaveMode: true,
        clearOptions: { clearSecondGuess: true, clearEliminations: true },
      });
      expect(resResetAll.updated.savedOption).toBeNull();
      expect(resResetAll.updated.secondGuessOption).toBeNull();
      expect(resResetAll.updated.eliminatedOptions).toEqual([]);
    });
  });

  describe('5. Full Mock Test Series (10 NEET-PG 2026 + 10 INI-CET) & Import Packages', () => {
    it('provides exactly 20 built-in full mock papers: 10 NEET-PG 2026 (180 Qs, 5×36, +4/-1) and 10 INI-CET (200 Qs, 4×50, +1/-⅓)', () => {
      expect(BUILTIN_MOCK_PAPERS_METADATA).toHaveLength(20);
      expect(BUILTIN_MOCK_CONFIGS).toHaveLength(20);

      const neetPapers = BUILTIN_MOCK_PAPERS_METADATA.filter((p) => p.targetExam === 'NEET-PG');
      const inicetPapers = BUILTIN_MOCK_PAPERS_METADATA.filter((p) => p.targetExam === 'INI-CET');
      expect(neetPapers).toHaveLength(10);
      expect(inicetPapers).toHaveLength(10);

      for (const p of neetPapers) {
        expect(p.totalQuestions).toBe(180);
        expect(p.durationMinutes).toBe(210);
        expect(p.sectionCount).toBe(5);
        expect(p.questionsPerSection).toBe(36);
        expect(p.sectionDurationMinutes).toBe(42);
        expect(p.maxMarks).toBe(720);
        expect(p.markingScheme).toEqual({ correct: 4, incorrect: -1, unattempted: 0 });
      }

      for (const p of inicetPapers) {
        expect(p.totalQuestions).toBe(200);
        expect(p.durationMinutes).toBe(180);
        expect(p.sectionCount).toBe(4);
        expect(p.questionsPerSection).toBe(50);
        expect(p.sectionDurationMinutes).toBe(45);
        expect(p.maxMarks).toBe(200);
        expect(p.markingScheme.correct).toBe(1);
        expect(p.markingScheme.incorrect).toBeCloseTo(-1 / 3, 4);
      }
    });

    it('validates the underlying ExamConfigs for all 20 built-in full mock papers', () => {
      for (const cfg of BUILTIN_MOCK_CONFIGS) {
        const res = validateExamConfig(cfg);
        expect(res.valid).toBe(true);
        expect(res.errors).toHaveLength(0);
      }
    });

    it('computes clean 2-decimal fractional INI-CET scores (+1 / -1/3)', () => {
      const inicetScheme = { correct: 1, incorrect: -1 / 3, unattempted: 0 };
      const items: EvaluatedQuestionInput[] = [
        {
          testQuestionId: 1,
          questionId: 1,
          questionCode: 'INI-1',
          subjectSlug: 'pharmacology',
          subjectName: 'Pharmacology',
          systemName: 'CVS',
          topicName: 'ARNI',
          subtopicName: 'Neprilysin',
          difficulty: 'hard',
          correctOption: 'B',
          savedOption: 'B',
          isMarkedForReview: false,
          confidence: 'sure',
          secondGuessOption: null,
          eliminatedOptions: [],
          timeSpentSeconds: 30,
          visitCount: 1,
        },
        {
          testQuestionId: 2,
          questionId: 2,
          questionCode: 'INI-2',
          subjectSlug: 'pathology',
          subjectName: 'Pathology',
          systemName: 'Hematology',
          topicName: 'PV',
          subtopicName: 'JAK2',
          difficulty: 'medium',
          correctOption: 'B',
          savedOption: 'A',
          isMarkedForReview: false,
          confidence: 'main_guess',
          secondGuessOption: 'B',
          eliminatedOptions: ['C', 'D'],
          timeSpentSeconds: 45,
          visitCount: 1,
        },
      ];
      const analytics = calculateCompleteExamAnalytics(items, [], inicetScheme);
      // +1 - 0.3333... = 0.67
      expect(analytics.score).toBe(0.67);
      expect(analytics.maxMarks).toBe(2);
      expect(analytics.negativeMarks).toBe(0.33);
    });

    it('validates both NEET-PG 2026 and INI-CET sample importable mock packages', () => {
      expect(SAMPLE_IMPORTABLE_MOCK_PAPER.targetExam).toBe('NEET-PG');
      expect(SAMPLE_IMPORTABLE_MOCK_PAPER.durationMinutes).toBe(210);
      expect(SAMPLE_IMPORTABLE_MOCK_PAPER.sections).toHaveLength(5);
      expect(
        SAMPLE_IMPORTABLE_MOCK_PAPER.sections.reduce((acc, s) => acc + s.questionCount, 0)
      ).toBe(180);
      expect(validateQuestionBankImportPayload(SAMPLE_IMPORTABLE_MOCK_PAPER.questions as any).valid).toBe(true);

      expect(SAMPLE_IMPORTABLE_INICET_PAPER.targetExam).toBe('INI-CET');
      expect(SAMPLE_IMPORTABLE_INICET_PAPER.durationMinutes).toBe(180);
      expect(SAMPLE_IMPORTABLE_INICET_PAPER.sections).toHaveLength(4);
      expect(
        SAMPLE_IMPORTABLE_INICET_PAPER.sections.reduce((acc, s) => acc + s.questionCount, 0)
      ).toBe(200);
      expect(validateQuestionBankImportPayload(SAMPLE_IMPORTABLE_INICET_PAPER.questions as any).valid).toBe(true);
    });
  });

  describe('6. Knowledge Heatmap Mastery Tiers & Subject Slug Resolution', () => {
    it('resolves all 19 NEET PG subject names, codes, and slugs accurately (including OBGY)', async () => {
      const { resolveSubjectSlug } = await import('../components/KnowledgeHeatmap.tsx');
      for (const s of NEET_PG_SUBJECTS) {
        expect(resolveSubjectSlug(s.name)).toBe(s.slug);
        expect(resolveSubjectSlug(s.code)).toBe(s.slug);
        expect(resolveSubjectSlug(s.slug)).toBe(s.slug);
      }
      expect(resolveSubjectSlug('Obstetrics and Gynecology')).toBe('obstetrics-gynecology');
      expect(resolveSubjectSlug('Community Medicine (PSM)')).toBe('community-medicine');
      expect(resolveSubjectSlug('Internal Medicine')).toBe('medicine');
    });

    it('classifies mastery tiers accurately across all clinical accuracy thresholds', async () => {
      const { classifyMasteryTier } = await import('../components/KnowledgeHeatmap.tsx');
      expect(classifyMasteryTier(0, 0)).toBe('unattempted');
      expect(classifyMasteryTier(10, 82)).toBe('mastered');
      expect(classifyMasteryTier(10, 75)).toBe('mastered');
      expect(classifyMasteryTier(10, 68)).toBe('proficient');
      expect(classifyMasteryTier(10, 52)).toBe('developing');
      expect(classifyMasteryTier(10, 35)).toBe('critical');
    });

    it('builds a complete 19-subject heatmap dataset for both cumulative and latest scopes', async () => {
      const { buildHeatmapSubjects } = await import('../components/KnowledgeHeatmap.tsx');
      const mockAnalytics = {
        latestAnalysis: {
          subjectBreakdown: [
            {
              subjectSlug: 'pathology',
              subjectName: 'Pathology',
              totalQuestions: 15,
              attempted: 12,
              correct: 10,
              incorrect: 2,
              unattempted: 3,
              accuracy: 83.3,
              attemptRate: 80,
              netScore: 38,
              maxMarks: 60,
              avgTimeSeconds: 42,
              guessPercentage: 16.7,
              sureAccuracy: 90,
              mainGuessAccuracy: 50,
            },
          ],
        },
      };

      const rows = buildHeatmapSubjects(mockAnalytics, 'latest');
      expect(rows).toHaveLength(19);
      const pathRow = rows.find((r) => r.subjectSlug === 'pathology');
      expect(pathRow?.masteryTier).toBe('mastered');
      expect(pathRow?.accuracy).toBe(83.3);
      const dermRow = rows.find((r) => r.subjectSlug === 'dermatology');
      expect(dermRow?.masteryTier).toBe('unattempted');
      expect(dermRow?.attempted).toBe(0);
    });
  });
});
