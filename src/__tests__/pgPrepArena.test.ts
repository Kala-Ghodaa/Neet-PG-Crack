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
  NEET_PG_FULL_MOCK_1_CONFIG,
  NEET_PG_FULL_MOCK_2_CONFIG,
  INICET_SUPER_MOCK_3_CONFIG,
  BUILTIN_MOCK_PAPERS_METADATA,
  SAMPLE_IMPORTABLE_MOCK_PAPER,
  NEET_PG_SUBJECTS,
  generateFull200QuestionBank,
} from '../data/seedQuestions.ts';
import { StudentResponseRecord } from '../types/domain.ts';

describe('PG-PREP ARENA — Core Examination, Guess Intelligence & Analytics Test Suite', () => {
  describe('1. Exam Configuration & 200-Question Bank Validation', () => {
    it('validates the default 200-question 5-section NEET PG Full Mock configuration', () => {
      const result = validateExamConfig(DEFAULT_NEET_PG_FULL_MOCK_CONFIG);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(DEFAULT_NEET_PG_FULL_MOCK_CONFIG.pattern.sections).toHaveLength(5);
      const totalQ = DEFAULT_NEET_PG_FULL_MOCK_CONFIG.pattern.sections.reduce(
        (acc, s) => acc + s.questionCount,
        0
      );
      expect(totalQ).toBe(200);
    });

    it('rejects sectional exam configs where section counts do not sum to totalQuestions', () => {
      const brokenConfig = {
        ...DEFAULT_NEET_PG_FULL_MOCK_CONFIG,
        pattern: {
          ...DEFAULT_NEET_PG_FULL_MOCK_CONFIG.pattern,
          totalQuestions: 100, // mismatch with 200
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

  describe('5. Full Mock Test Series (2-3 Papers with Dates) & Import Package Engine', () => {
    it('provides exactly 3 built-in mock papers with required dates, 200 questions, and 5 sections', () => {
      expect(BUILTIN_MOCK_PAPERS_METADATA).toHaveLength(3);

      const paper1 = BUILTIN_MOCK_PAPERS_METADATA.find((p) => p.id === 'neet-pg-full-mock-1');
      expect(paper1).toBeDefined();
      expect(paper1?.date).toBe('Oct 18, 2026');
      expect(paper1?.targetExam).toBe('NEET-PG');
      expect(paper1?.totalQuestions).toBe(200);
      expect(paper1?.durationMinutes).toBe(210);
      expect(paper1?.sectionCount).toBe(5);

      const paper2 = BUILTIN_MOCK_PAPERS_METADATA.find((p) => p.id === 'neet-pg-full-mock-2');
      expect(paper2).toBeDefined();
      expect(paper2?.date).toBe('Nov 02, 2026');
      expect(paper2?.targetExam).toBe('NEET-PG');
      expect(paper2?.totalQuestions).toBe(200);

      const paper3 = BUILTIN_MOCK_PAPERS_METADATA.find((p) => p.id === 'inicet-super-mock-3');
      expect(paper3).toBeDefined();
      expect(paper3?.date).toBe('Nov 08, 2026');
      expect(paper3?.targetExam).toBe('INI-CET');
      expect(paper3?.totalQuestions).toBe(200);
    });

    it('validates the underlying ExamConfigs for all 3 full mock papers', () => {
      const v1 = validateExamConfig(NEET_PG_FULL_MOCK_1_CONFIG);
      expect(v1.valid).toBe(true);
      expect(v1.errors).toHaveLength(0);

      const v2 = validateExamConfig(NEET_PG_FULL_MOCK_2_CONFIG);
      expect(v2.valid).toBe(true);
      expect(v2.errors).toHaveLength(0);

      const v3 = validateExamConfig(INICET_SUPER_MOCK_3_CONFIG);
      expect(v3.valid).toBe(true);
      expect(v3.errors).toHaveLength(0);
    });

    it('validates the structure and questions of the sample importable test package', () => {
      expect(SAMPLE_IMPORTABLE_MOCK_PAPER.examId).toBe('neet-pg-grand-mock-4');
      expect(SAMPLE_IMPORTABLE_MOCK_PAPER.date).toBe('Nov 15, 2026');
      expect(SAMPLE_IMPORTABLE_MOCK_PAPER.targetExam).toBe('NEET-PG');
      expect(SAMPLE_IMPORTABLE_MOCK_PAPER.durationMinutes).toBe(210);
      expect(SAMPLE_IMPORTABLE_MOCK_PAPER.sectional).toBe(true);
      expect(SAMPLE_IMPORTABLE_MOCK_PAPER.sections).toHaveLength(5);

      const sumQuestions = SAMPLE_IMPORTABLE_MOCK_PAPER.sections.reduce(
        (acc, s) => acc + s.questionCount,
        0
      );
      expect(sumQuestions).toBe(200);

      // Embedded questions validation
      expect(SAMPLE_IMPORTABLE_MOCK_PAPER.questions.length).toBeGreaterThanOrEqual(1);
      const q1 = SAMPLE_IMPORTABLE_MOCK_PAPER.questions[0];
      expect(q1.questionId).toBeDefined();
      expect(q1.question.text).toBeTruthy();
      expect(q1.options).toHaveLength(4);
      expect(q1.correctAnswer).toBe('B');
      expect(q1.explanation?.summary).toBeTruthy();
    });
  });
});
