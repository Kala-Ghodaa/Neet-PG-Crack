export type ConfidenceLevel = 'sure' | 'main_guess' | 'guess_intent_unattempted';

export type PaletteQuestionState =
  | 'not_visited'
  | 'not_answered'
  | 'answered'
  | 'marked_for_review'
  | 'answered_and_marked_for_review';

export interface ExamSectionConfig {
  sectionId: string;
  name: string;
  questionCount: number;
  durationSeconds: number;
  allowReturnAfterLock: boolean;
}

export interface ExamConfig {
  configVersion: string;
  examId: string;
  examName: string;
  mode: 'exam' | 'practice' | 'custom';
  pattern: {
    totalQuestions: number;
    questionType: 'single_best_answer';
    optionsPerQuestion: number;
    durationSeconds: number;
    sectional: boolean;
    sections: ExamSectionConfig[];
  };
  markingScheme: {
    correct: number;
    incorrect: number;
    unattempted: number;
  };
  settings: {
    strictSaveMode: boolean;
    allowClearResponse: boolean;
    allowMarkForReview: boolean;
    allowGuessTagging: boolean;
    allowOptionElimination: boolean;
    showResultAfterSubmit: boolean;
    showExplanationDuringExam: boolean;
    explanationTiming?: 'immediate' | 'after_selection' | 'after_save';
  };
}

export interface QuestionOptionItem {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface QuestionTableData {
  title?: string;
  headers: string[];
  rows: string[][];
}

export interface QuestionImageItem {
  url: string;
  caption: string;
  altText: string;
}

export interface QuestionBankSchemaItem {
  schemaVersion: string;
  questionId: string;
  questionVersion: number;
  subjectId: string;
  subjectName?: string;
  systemId: string;
  systemName?: string;
  topicId: string;
  topicName?: string;
  subtopic: string;
  questionType:
    | 'single_best_answer'
    | 'clinical_vignette'
    | 'image_based'
    | 'investigation_interpretation'
    | 'table_based'
    | 'multi_statement'
    | 'assertion_reason';
  difficulty: 'easy' | 'medium' | 'hard';
  question: {
    text: string;
    clinicalVignette: string | null;
    images: QuestionImageItem[];
    tables: QuestionTableData[];
  };
  options: QuestionOptionItem[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: {
    summary: string;
    details: string;
    optionExplanations: Record<'A' | 'B' | 'C' | 'D', string>;
    learningPoints: string[];
  };
  metadata: {
    isPYQ: boolean;
    year: number | null;
    source: string;
    references: string[];
    tags: string[];
  };
  status: 'published' | 'draft' | 'archived';
}

export interface StudentResponseRecord {
  testQuestionId: number;
  questionId: number;
  questionOrder: number;
  sectionIndex: number;
  visited: boolean;
  savedOption: string | null;
  pendingOption: string | null;
  isMarkedForReview: boolean;
  confidence: ConfidenceLevel;
  secondGuessOption: string | null;
  eliminatedOptions: string[];
  timeSpentSeconds: number;
  visitCount: number;
  firstAnsweredAt?: string | null;
  lastSavedAt?: string | null;
}

export interface AnswerRevisionItem {
  testQuestionId: number;
  questionId: number;
  revisionNumber: number;
  previousOption: string | null;
  newOption: string;
  previousConfidence: ConfidenceLevel;
  newConfidence: ConfidenceLevel;
  wasReviewedBeforeChange: boolean;
  timeSpentBeforeChangeSeconds: number;
  changedAt: string;
}

export interface SubjectAnalyticsItem {
  subjectSlug: string;
  subjectName: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  accuracy: number;
  attemptRate: number;
  marksEarned: number;
  marksLost: number;
  netScore: number;
  maxMarks: number;
  avgTimeSeconds: number;
  medianTimeSeconds: number;
  guessPercentage: number;
  mainGuessCount: number;
  mainGuessCorrect: number;
  mainGuessAccuracy: number;
  secondGuessCount: number;
  secondGuessCorrect: number;
  secondGuessAccuracy: number;
  sureCount: number;
  sureCorrect: number;
  sureAccuracy: number;
}

export interface TopicAnalyticsItem {
  subjectName: string;
  systemName: string;
  topicName: string;
  subtopicName: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  accuracy: number;
  attemptRate: number;
  avgTimeSeconds: number;
  guessFrequency: number;
  negativeMarksImpact: number;
  quadrant:
    | 'Strong Mastery'
    | 'Knowledge Exists — Speed Needs Work'
    | 'Superficial / Careless Risk'
    | 'Priority Revision';
  knowledgeGapScore: number;
  knowledgeGapReasons: string[];
  factorBreakdown: {
    incorrectFrequencyWeight: number;
    negativeImpactWeight: number;
    guessDependencyWeight: number;
    timePenaltyWeight: number;
  };
}

export interface GuessIntelligenceSummary {
  sureCount: number;
  sureCorrect: number;
  sureIncorrect: number;
  sureAccuracy: number;
  mainGuessCount: number;
  mainGuessCorrect: number;
  mainGuessIncorrect: number;
  mainGuessAccuracy: number;
  marksEarnedFromMainGuesses: number;
  negativeMarksFromMainGuesses: number;
  netMarksFromMainGuesses: number;
  guessingPercentage: number;
  guessIntentUnattemptedCount: number;
  secondGuessCount: number;
  secondGuessMatchingCorrect: number;
  secondGuessNotMatchingCorrect: number;
  secondGuessAccuracy: number;
  eliminationAnalysis: {
    questionsWithEliminations: number;
    twoOptionsEliminatedCount: number; // 2 surviving options
    twoOptionsEliminatedMainGuessCorrect: number;
    twoOptionsEliminatedSecondGuessCorrect: number;
    correctAnswerSurvivedEliminationCount: number;
    correctAnswerEliminatedByMistakeCount: number;
    correctAnswerSurvivalRate: number;
    eliminationEfficiency: number;
    marksLostWhenSecondGuessWasCorrect: number;
  };
  insights: string[];
}

export interface AnswerChangeSummary {
  totalRevisions: number;
  questionsChangedCount: number;
  avgChangesPerQuestion: number;
  incorrectToCorrect: number;
  correctToIncorrect: number;
  incorrectToIncorrect: number;
  unchangedCorrect: number;
  unchangedIncorrect: number;
  netMarksImpactFromChanges: number;
  insights: string[];
}

export interface MockPaperSummary {
  id: string;
  configKey: string;
  title: string;
  date: string;
  targetExam: 'NEET-PG' | 'INI-CET' | 'FMGE' | 'NEXT';
  totalQuestions: number;
  durationMinutes: number;
  sectionCount: number;
  questionsPerSection?: number;
  sectionDurationMinutes?: number;
  markingScheme?: {
    correct: number;
    incorrect: number;
    unattempted: number;
  };
  tag: string;
  description: string;
  isUserImported?: boolean;
  status: 'not_attempted' | 'in_progress' | 'completed';
  latestScore?: number;
  maxMarks?: number;
  accuracy?: number;
  lastAttemptSessionId?: number;
  attemptedAt?: string;
}

export interface ImportTestPackagePayload {
  examId: string;
  examName: string;
  date: string;
  targetExam: 'NEET-PG' | 'INI-CET' | 'FMGE' | 'NEXT';
  durationMinutes: number;
  tag?: string;
  description?: string;
  sectional: boolean;
  markingScheme?: {
    correct: number;
    incorrect: number;
    unattempted: number;
  };
  sections?: Array<{
    sectionId: string;
    name: string;
    questionCount: number;
    durationMinutes?: number;
  }>;
  questions: QuestionBankSchemaItem[];
}
