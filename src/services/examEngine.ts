import type {
  ConfidenceLevel,
  ExamConfig,
  PaletteQuestionState,
  QuestionBankSchemaItem,
  StudentResponseRecord,
} from '../types/domain.ts';
import { NEET_PG_SUBJECTS } from '../data/seedQuestions.ts';

export interface ExamConfigValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateExamConfig(config: ExamConfig): ExamConfigValidationResult {
  const errors: string[] = [];

  if (!config.examId || !config.examName) {
    errors.push('Exam configuration requires examId and examName.');
  }
  if (!config.pattern || config.pattern.totalQuestions <= 0) {
    errors.push('pattern.totalQuestions must be a positive integer.');
  }
  if (!config.pattern || config.pattern.durationSeconds <= 0) {
    errors.push('pattern.durationSeconds must be a positive integer.');
  }

  if (config.pattern?.sectional) {
    if (!Array.isArray(config.pattern.sections) || config.pattern.sections.length === 0) {
      errors.push('Sectional exam requires at least one section in pattern.sections.');
    } else {
      const sumQuestions = config.pattern.sections.reduce((acc, s) => acc + s.questionCount, 0);
      const sumDuration = config.pattern.sections.reduce((acc, s) => acc + s.durationSeconds, 0);

      if (sumQuestions !== config.pattern.totalQuestions) {
        errors.push(
          `Section question counts (${sumQuestions}) do not add up to pattern.totalQuestions (${config.pattern.totalQuestions}).`
        );
      }
      if (sumDuration !== config.pattern.durationSeconds) {
        errors.push(
          `Section durations (${sumDuration}s) do not add up to pattern.durationSeconds (${config.pattern.durationSeconds}s).`
        );
      }
    }
  }

  if (typeof config.markingScheme?.correct !== 'number' || config.markingScheme.correct <= 0) {
    errors.push('markingScheme.correct must be a positive number.');
  }
  if (typeof config.markingScheme?.incorrect !== 'number') {
    errors.push('markingScheme.incorrect must be a valid number.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Derives the standard NBEMS question palette state strictly from persisted response and review flags.
 */
export function derivePaletteState(
  response: Pick<StudentResponseRecord, 'visited' | 'savedOption' | 'isMarkedForReview'>
): PaletteQuestionState {
  if (!response.visited && !response.savedOption && !response.isMarkedForReview) {
    return 'not_visited';
  }
  const hasSavedAnswer = Boolean(response.savedOption);
  if (hasSavedAnswer && response.isMarkedForReview) {
    return 'answered_and_marked_for_review';
  }
  if (hasSavedAnswer && !response.isMarkedForReview) {
    return 'answered';
  }
  if (!hasSavedAnswer && response.isMarkedForReview) {
    return 'marked_for_review';
  }
  return 'not_answered';
}

export interface SaveMutationInput {
  current: StudentResponseRecord;
  selectedPendingOption: string | null;
  guessModeActive: boolean;
  secondGuessOption: string | null;
  eliminatedOptions: string[];
  action:
    | 'save_and_next'
    | 'save_and_mark_review'
    | 'mark_review_and_next'
    | 'navigate_away'
    | 'clear_response';
  strictSaveMode: boolean;
  clearOptions?: {
    clearSecondGuess: boolean;
    clearEliminations: boolean;
  };
  additionalTimeSeconds?: number;
}

export function applyResponseTransition(input: SaveMutationInput): {
  updated: StudentResponseRecord;
  answerRevisionCreated: boolean;
  previousSavedOption: string | null;
} {
  const {
    current,
    selectedPendingOption,
    guessModeActive,
    secondGuessOption,
    eliminatedOptions,
    action,
    strictSaveMode,
    clearOptions,
    additionalTimeSeconds = 0,
  } = input;

  const previousSavedOption = current.savedOption;
  const nowIso = new Date().toISOString();

  // Sanitize eliminations: a committed saved option cannot remain eliminated
  const sanitizeEliminations = (targetOption: string | null, elims: string[]) => {
    if (!targetOption) return [...new Set(elims)];
    return [...new Set(elims.filter((opt) => opt !== targetOption))];
  };

  // Sanitize second guess: must differ from main saved option
  const sanitizeSecondGuess = (
    targetOption: string | null,
    secGuess: string | null,
    isGuessOn: boolean
  ) => {
    if (!isGuessOn && !secGuess) return null;
    if (targetOption && secGuess === targetOption) return null;
    return secGuess;
  };

  if (action === 'clear_response') {
    const keepSecondGuess = clearOptions ? !clearOptions.clearSecondGuess : false;
    const keepEliminations = clearOptions ? !clearOptions.clearEliminations : true;

    return {
      updated: {
        ...current,
        visited: true,
        savedOption: null,
        pendingOption: null,
        // Preserve review status unless separately removed
        isMarkedForReview: current.isMarkedForReview,
        confidence: 'sure',
        secondGuessOption: keepSecondGuess ? current.secondGuessOption : null,
        eliminatedOptions: keepEliminations ? current.eliminatedOptions : [],
        timeSpentSeconds: current.timeSpentSeconds + additionalTimeSeconds,
        lastSavedAt: nowIso,
      },
      answerRevisionCreated: false,
      previousSavedOption,
    };
  }

  if (action === 'navigate_away') {
    if (strictSaveMode) {
      // In strict NBEMS save mode, navigating away WITHOUT clicking Save discards uncommitted pending selection
      const preservedSaved = current.savedOption;
      let nextConfidence: ConfidenceLevel = current.confidence;
      if (!preservedSaved && guessModeActive) {
        nextConfidence = 'guess_intent_unattempted';
      }
      return {
        updated: {
          ...current,
          visited: true,
          savedOption: preservedSaved,
          pendingOption: null,
          confidence: nextConfidence,
          eliminatedOptions: sanitizeEliminations(preservedSaved, eliminatedOptions),
          timeSpentSeconds: current.timeSpentSeconds + additionalTimeSeconds,
        },
        answerRevisionCreated: false,
        previousSavedOption,
      };
    } else {
      // Non-strict mode commits pending option on navigation
      const committed = selectedPendingOption ?? current.savedOption;
      const nextConfidence: ConfidenceLevel = committed
        ? guessModeActive
          ? 'main_guess'
          : 'sure'
        : guessModeActive
        ? 'guess_intent_unattempted'
        : 'sure';
      return {
        updated: {
          ...current,
          visited: true,
          savedOption: committed,
          pendingOption: committed,
          confidence: nextConfidence,
          secondGuessOption: sanitizeSecondGuess(committed, secondGuessOption, guessModeActive),
          eliminatedOptions: sanitizeEliminations(committed, eliminatedOptions),
          timeSpentSeconds: current.timeSpentSeconds + additionalTimeSeconds,
          firstAnsweredAt: current.firstAnsweredAt || (committed ? nowIso : null),
          lastSavedAt: committed ? nowIso : current.lastSavedAt,
        },
        answerRevisionCreated: Boolean(committed && committed !== previousSavedOption),
        previousSavedOption,
      };
    }
  }

  // Save actions: save_and_next, save_and_mark_review, mark_review_and_next
  const effectiveOption =
    selectedPendingOption !== undefined ? selectedPendingOption : current.savedOption;

  const isReviewAction =
    action === 'save_and_mark_review' || action === 'mark_review_and_next';

  const nextReviewState = isReviewAction ? true : current.isMarkedForReview;

  let nextConfidence: ConfidenceLevel = 'sure';
  if (effectiveOption) {
    nextConfidence = guessModeActive ? 'main_guess' : 'sure';
  } else if (guessModeActive) {
    nextConfidence = 'guess_intent_unattempted';
  }

  const cleanedElims = sanitizeEliminations(effectiveOption, eliminatedOptions);
  const cleanedSecondGuess = sanitizeSecondGuess(
    effectiveOption,
    secondGuessOption,
    guessModeActive || Boolean(secondGuessOption)
  );

  const answerRevisionCreated = Boolean(
    effectiveOption && effectiveOption !== previousSavedOption
  );

  return {
    updated: {
      ...current,
      visited: true,
      savedOption: effectiveOption,
      pendingOption: effectiveOption,
      isMarkedForReview: nextReviewState,
      confidence: nextConfidence,
      secondGuessOption: cleanedSecondGuess,
      eliminatedOptions: cleanedElims,
      timeSpentSeconds: current.timeSpentSeconds + additionalTimeSeconds,
      firstAnsweredAt: current.firstAnsweredAt || (effectiveOption ? nowIso : null),
      lastSavedAt: nowIso,
    },
    answerRevisionCreated,
    previousSavedOption,
  };
}

export interface BulkImportValidationReport {
  valid: boolean;
  totalSubmitted: number;
  validCount: number;
  duplicateIdsInPayload: string[];
  probableContentDuplicates: string[];
  errors: Array<{ index: number; questionId?: string; message: string }>;
  validatedItems: QuestionBankSchemaItem[];
}

export function validateQuestionBankImportPayload(
  payload: unknown,
  existingQuestionCodes: Set<string> = new Set(),
  existingQuestionTexts: Set<string> = new Set()
): BulkImportValidationReport {
  const errors: Array<{ index: number; questionId?: string; message: string }> = [];
  const duplicateIdsInPayload: string[] = [];
  const probableContentDuplicates: string[] = [];
  const validatedItems: QuestionBankSchemaItem[] = [];

  if (!Array.isArray(payload)) {
    return {
      valid: false,
      totalSubmitted: 0,
      validCount: 0,
      duplicateIdsInPayload: [],
      probableContentDuplicates: [],
      errors: [{ index: -1, message: 'Payload root must be a JSON array of question objects.' }],
      validatedItems: [],
    };
  }

  const seenIds = new Set<string>();
  const seenTexts = new Set<string>();
  const validSubjectSlugs = new Set<string>(NEET_PG_SUBJECTS.map((s) => s.slug));

  payload.forEach((rawItem: any, idx: number) => {
    if (!rawItem || typeof rawItem !== 'object') {
      errors.push({ index: idx, message: 'Item must be a valid JSON object.' });
      return;
    }

    const qId = String(rawItem.questionId || '').trim();
    if (!qId) {
      errors.push({ index: idx, message: 'Missing mandatory field: questionId.' });
      return;
    }

    if (seenIds.has(qId) || existingQuestionCodes.has(qId)) {
      duplicateIdsInPayload.push(qId);
      errors.push({
        index: idx,
        questionId: qId,
        message: `Duplicate questionId detected: "${qId}".`,
      });
      return;
    }
    seenIds.add(qId);

    let subjectId = String(rawItem.subjectId || '').trim().toLowerCase().replace(/_/g, '-');
    if (subjectId === 'general-medicine') subjectId = 'medicine';
    if (subjectId === 'general-surgery') subjectId = 'surgery';

    if (!subjectId || !validSubjectSlugs.has(subjectId)) {
      errors.push({
        index: idx,
        questionId: qId,
        message: `Invalid or unsupported subjectId "${rawItem.subjectId}". Must match one of the 19 NEET PG subjects.`,
      });
      return;
    }

    const qText = String(rawItem.question?.text || '').trim();
    if (!qText || qText.length < 10) {
      errors.push({
        index: idx,
        questionId: qId,
        message: 'question.text must be at least 10 characters long.',
      });
      return;
    }

    const normalizedText = qText.toLowerCase().replace(/\s+/g, ' ');
    if (seenTexts.has(normalizedText) || existingQuestionTexts.has(normalizedText)) {
      probableContentDuplicates.push(qId);
    }
    seenTexts.add(normalizedText);

    const options = rawItem.options;
    if (!Array.isArray(options) || options.length !== 4) {
      errors.push({
        index: idx,
        questionId: qId,
        message: 'options must be an array of exactly 4 options (A, B, C, D).',
      });
      return;
    }

    const optionIds = new Set<string>();
    for (const opt of options) {
      if (!opt.id || !opt.text) {
        errors.push({
          index: idx,
          questionId: qId,
          message: 'Every option must contain non-empty id and text.',
        });
        return;
      }
      optionIds.add(String(opt.id));
    }

    if (optionIds.size !== 4) {
      errors.push({
        index: idx,
        questionId: qId,
        message: 'Option IDs within a question must be unique (A, B, C, D).',
      });
      return;
    }

    const correctAnswer = String(rawItem.correctAnswer || '').trim();
    if (!optionIds.has(correctAnswer)) {
      errors.push({
        index: idx,
        questionId: qId,
        message: `correctAnswer "${correctAnswer}" does not exist in option IDs.`,
      });
      return;
    }

    if (!rawItem.explanation?.summary || !rawItem.explanation?.details) {
      errors.push({
        index: idx,
        questionId: qId,
        message: 'explanation.summary and explanation.details are required.',
      });
      return;
    }

    const subjMeta = NEET_PG_SUBJECTS.find((s) => s.slug === subjectId);
    validatedItems.push({
      schemaVersion: rawItem.schemaVersion || '1.0',
      questionId: qId,
      questionVersion: Number(rawItem.questionVersion || 1),
      subjectId,
      subjectName: rawItem.subjectName || subjMeta?.name || subjectId,
      systemId: String(rawItem.systemId || 'general-system'),
      systemName: String(rawItem.systemName || rawItem.systemId || 'General System'),
      topicId: String(rawItem.topicId || 'general-topic'),
      topicName: String(rawItem.topicName || rawItem.topicId || 'General Topic'),
      subtopic: String(rawItem.subtopic || 'Core Concept'),
      questionType: rawItem.questionType || 'single_best_answer',
      difficulty: ['easy', 'medium', 'hard'].includes(rawItem.difficulty)
        ? rawItem.difficulty
        : 'medium',
      question: {
        text: qText,
        clinicalVignette: rawItem.question?.clinicalVignette || null,
        images: Array.isArray(rawItem.question?.images) ? rawItem.question.images : [],
        tables: Array.isArray(rawItem.question?.tables) ? rawItem.question.tables : [],
      },
      options: options.map((o: any) => ({ id: o.id, text: String(o.text) })),
      correctAnswer: correctAnswer as 'A' | 'B' | 'C' | 'D',
      explanation: {
        summary: String(rawItem.explanation.summary),
        details: String(rawItem.explanation.details),
        optionExplanations: rawItem.explanation.optionExplanations || {
          A: '',
          B: '',
          C: '',
          D: '',
        },
        learningPoints: Array.isArray(rawItem.explanation.learningPoints)
          ? rawItem.explanation.learningPoints
          : [],
      },
      metadata: {
        isPYQ: Boolean(rawItem.metadata?.isPYQ),
        year: rawItem.metadata?.year ? Number(rawItem.metadata.year) : null,
        source: String(rawItem.metadata?.source || 'Admin Imported Question'),
        references: Array.isArray(rawItem.metadata?.references)
          ? rawItem.metadata.references
          : [],
        tags: Array.isArray(rawItem.metadata?.tags) ? rawItem.metadata.tags : [],
      },
      status: rawItem.status || 'published',
    });
  });

  return {
    valid: errors.length === 0,
    totalSubmitted: payload.length,
    validCount: validatedItems.length,
    duplicateIdsInPayload,
    probableContentDuplicates,
    errors,
    validatedItems,
  };
}
