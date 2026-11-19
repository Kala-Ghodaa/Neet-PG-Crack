import type {
  AnswerChangeSummary,
  AnswerRevisionItem,
  ConfidenceLevel,
  GuessIntelligenceSummary,
  SubjectAnalyticsItem,
  TopicAnalyticsItem,
} from '../types/domain.ts';

export interface EvaluatedQuestionInput {
  testQuestionId: number;
  questionId: number;
  questionCode: string;
  subjectSlug: string;
  subjectName: string;
  systemName: string;
  topicName: string;
  subtopicName: string;
  difficulty: string;
  correctOption: string;
  savedOption: string | null;
  isMarkedForReview: boolean;
  confidence: ConfidenceLevel;
  secondGuessOption: string | null;
  eliminatedOptions: string[];
  timeSpentSeconds: number;
  visitCount: number;
}

export interface MarkingSchemeConfig {
  correct: number;
  incorrect: number;
  unattempted: number;
}

/**
 * Scores a single question strictly from its committed savedOption and the configured marking scheme.
 * Note:
 * - Answered & Marked for Review IS evaluated during scoring.
 * - Confidence (Sure vs Main Guess) NEVER alters the official mark (+4 or -1).
 * - Second Guess is NEVER graded (0 effect on official score).
 */
export function scoreQuestionResponse(
  savedOption: string | null,
  correctOption: string,
  scheme: MarkingSchemeConfig
): {
  status: 'correct' | 'incorrect' | 'unattempted';
  marksAwarded: number;
  positiveMarks: number;
  negativeMarks: number;
} {
  if (!savedOption) {
    return {
      status: 'unattempted',
      marksAwarded: scheme.unattempted,
      positiveMarks: 0,
      negativeMarks: 0,
    };
  }
  if (savedOption === correctOption) {
    return {
      status: 'correct',
      marksAwarded: scheme.correct,
      positiveMarks: scheme.correct,
      negativeMarks: 0,
    };
  }
  const absNeg = Math.abs(scheme.incorrect);
  return {
    status: 'incorrect',
    marksAwarded: scheme.incorrect,
    positiveMarks: 0,
    negativeMarks: absNeg,
  };
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));
}

export interface FullExamAnalyticsOutput {
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  score: number;
  maxMarks: number;
  percentageScore: number;
  accuracy: number;
  attemptRate: number;
  positiveMarks: number;
  negativeMarks: number;
  totalTimeSeconds: number;
  avgTimeSeconds: number;
  medianTimeSeconds: number;
  fastestCorrectSeconds: number | null;
  slowestIncorrectSeconds: number | null;
  subjectBreakdown: SubjectAnalyticsItem[];
  topicBreakdown: TopicAnalyticsItem[];
  guessIntelligence: GuessIntelligenceSummary;
  answerChangeIntelligence: AnswerChangeSummary;
  speedThresholdSeconds: number;
  accuracyThresholdPercent: number;
  formulaVersion: string;
}

export function calculateCompleteExamAnalytics(
  items: EvaluatedQuestionInput[],
  revisions: AnswerRevisionItem[],
  scheme: MarkingSchemeConfig = { correct: 4, incorrect: -1, unattempted: 0 },
  configThresholds = { speedThresholdSeconds: 50, accuracyThresholdPercent: 65 }
): FullExamAnalyticsOutput {
  const totalQuestions = items.length;
  let attemptedCount = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;
  let positiveMarks = 0;
  let negativeMarks = 0;
  let totalTimeSeconds = 0;

  const allTimes: number[] = [];
  const correctTimes: number[] = [];
  const incorrectTimes: number[] = [];

  // Guess & Confidence counters
  let sureCount = 0;
  let sureCorrect = 0;
  let sureIncorrect = 0;

  let mainGuessCount = 0;
  let mainGuessCorrect = 0;
  let mainGuessIncorrect = 0;
  let marksEarnedFromMainGuesses = 0;
  let negativeMarksFromMainGuesses = 0;
  let guessIntentUnattemptedCount = 0;

  let secondGuessCount = 0;
  let secondGuessMatchingCorrect = 0;
  let secondGuessNotMatchingCorrect = 0;

  // Elimination & 50-50 counters
  let questionsWithEliminations = 0;
  let twoOptionsEliminatedCount = 0;
  let twoOptionsEliminatedMainGuessCorrect = 0;
  let twoOptionsEliminatedSecondGuessCorrect = 0;
  let correctAnswerSurvivedEliminationCount = 0;
  let correctAnswerEliminatedByMistakeCount = 0;
  let marksLostWhenSecondGuessWasCorrect = 0;

  const subjectMap = new Map<
    string,
    {
      subjectSlug: string;
      subjectName: string;
      totalQuestions: number;
      attempted: number;
      correct: number;
      incorrect: number;
      unattempted: number;
      marksEarned: number;
      marksLost: number;
      times: number[];
      mainGuessCount: number;
      mainGuessCorrect: number;
      secondGuessCount: number;
      secondGuessCorrect: number;
      sureCount: number;
      sureCorrect: number;
    }
  >();

  const topicMap = new Map<
    string,
    {
      subjectName: string;
      systemName: string;
      topicName: string;
      subtopicName: string;
      totalQuestions: number;
      attempted: number;
      correct: number;
      incorrect: number;
      unattempted: number;
      times: number[];
      guessCount: number;
      negativeMarks: number;
    }
  >();

  for (const q of items) {
    const evalResult = scoreQuestionResponse(q.savedOption, q.correctOption, scheme);
    totalTimeSeconds += q.timeSpentSeconds;
    allTimes.push(q.timeSpentSeconds);

    if (evalResult.status === 'correct') {
      attemptedCount++;
      correctCount++;
      positiveMarks += evalResult.positiveMarks;
      if (q.timeSpentSeconds > 0) correctTimes.push(q.timeSpentSeconds);
    } else if (evalResult.status === 'incorrect') {
      attemptedCount++;
      incorrectCount++;
      negativeMarks += evalResult.negativeMarks;
      if (q.timeSpentSeconds > 0) incorrectTimes.push(q.timeSpentSeconds);
    } else {
      unattemptedCount++;
    }

    // Confidence & Guess tracking
    if (q.savedOption) {
      if (q.confidence === 'main_guess') {
        mainGuessCount++;
        if (evalResult.status === 'correct') {
          mainGuessCorrect++;
          marksEarnedFromMainGuesses += evalResult.positiveMarks;
        } else {
          mainGuessIncorrect++;
          negativeMarksFromMainGuesses += evalResult.negativeMarks;
        }
      } else {
        sureCount++;
        if (evalResult.status === 'correct') {
          sureCorrect++;
        } else {
          sureIncorrect++;
        }
      }
    } else if (q.confidence === 'guess_intent_unattempted') {
      guessIntentUnattemptedCount++;
    }

    // Second Guess tracking (never graded, analytical only)
    if (q.secondGuessOption) {
      secondGuessCount++;
      if (q.secondGuessOption === q.correctOption) {
        secondGuessMatchingCorrect++;
        if (evalResult.status === 'incorrect') {
          marksLostWhenSecondGuessWasCorrect += scheme.correct + Math.abs(scheme.incorrect);
        }
      } else {
        secondGuessNotMatchingCorrect++;
      }
    }

    // Elimination & 50-50 analysis
    const elims = Array.isArray(q.eliminatedOptions) ? q.eliminatedOptions : [];
    if (elims.length > 0) {
      questionsWithEliminations++;
      if (elims.includes(q.correctOption)) {
        correctAnswerEliminatedByMistakeCount++;
      } else {
        correctAnswerSurvivedEliminationCount++;
      }

      if (elims.length === 2) {
        // Reduced to 2 surviving options
        twoOptionsEliminatedCount++;
        if (q.savedOption === q.correctOption) {
          twoOptionsEliminatedMainGuessCorrect++;
        }
        if (q.secondGuessOption === q.correctOption) {
          twoOptionsEliminatedSecondGuessCorrect++;
        }
      }
    }

    // Subject aggregation
    if (!subjectMap.has(q.subjectSlug)) {
      subjectMap.set(q.subjectSlug, {
        subjectSlug: q.subjectSlug,
        subjectName: q.subjectName,
        totalQuestions: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        unattempted: 0,
        marksEarned: 0,
        marksLost: 0,
        times: [],
        mainGuessCount: 0,
        mainGuessCorrect: 0,
        secondGuessCount: 0,
        secondGuessCorrect: 0,
        sureCount: 0,
        sureCorrect: 0,
      });
    }
    const sEntry = subjectMap.get(q.subjectSlug)!;
    sEntry.totalQuestions++;
    sEntry.times.push(q.timeSpentSeconds);
    if (evalResult.status === 'correct') {
      sEntry.attempted++;
      sEntry.correct++;
      sEntry.marksEarned += evalResult.positiveMarks;
    } else if (evalResult.status === 'incorrect') {
      sEntry.attempted++;
      sEntry.incorrect++;
      sEntry.marksLost += evalResult.negativeMarks;
    } else {
      sEntry.unattempted++;
    }
    if (q.savedOption) {
      if (q.confidence === 'main_guess') {
        sEntry.mainGuessCount++;
        if (evalResult.status === 'correct') sEntry.mainGuessCorrect++;
      } else {
        sEntry.sureCount++;
        if (evalResult.status === 'correct') sEntry.sureCorrect++;
      }
    }
    if (q.secondGuessOption) {
      sEntry.secondGuessCount++;
      if (q.secondGuessOption === q.correctOption) sEntry.secondGuessCorrect++;
    }

    // Topic aggregation
    const topicKey = `${q.subjectName}::${q.topicName}`;
    if (!topicMap.has(topicKey)) {
      topicMap.set(topicKey, {
        subjectName: q.subjectName,
        systemName: q.systemName,
        topicName: q.topicName,
        subtopicName: q.subtopicName,
        totalQuestions: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        unattempted: 0,
        times: [],
        guessCount: 0,
        negativeMarks: 0,
      });
    }
    const tEntry = topicMap.get(topicKey)!;
    tEntry.totalQuestions++;
    tEntry.times.push(q.timeSpentSeconds);
    if (evalResult.status === 'correct') {
      tEntry.attempted++;
      tEntry.correct++;
    } else if (evalResult.status === 'incorrect') {
      tEntry.attempted++;
      tEntry.incorrect++;
      tEntry.negativeMarks += evalResult.negativeMarks;
    } else {
      tEntry.unattempted++;
    }
    if (q.confidence === 'main_guess' || q.confidence === 'guess_intent_unattempted') {
      tEntry.guessCount++;
    }
  }

  const maxMarks = totalQuestions * scheme.correct;
  const score = positiveMarks - negativeMarks;
  const percentageScore = maxMarks > 0 ? Number(((score / maxMarks) * 100).toFixed(1)) : 0;
  const accuracy =
    attemptedCount > 0 ? Number(((correctCount / attemptedCount) * 100).toFixed(1)) : 0;
  const attemptRate =
    totalQuestions > 0 ? Number(((attemptedCount / totalQuestions) * 100).toFixed(1)) : 0;
  const avgTimeSeconds =
    totalQuestions > 0 ? Number((totalTimeSeconds / totalQuestions).toFixed(1)) : 0;
  const medianTimeSeconds = computeMedian(allTimes);
  const fastestCorrectSeconds =
    correctTimes.length > 0 ? Math.min(...correctTimes) : null;
  const slowestIncorrectSeconds =
    incorrectTimes.length > 0 ? Math.max(...incorrectTimes) : null;

  const subjectBreakdown: SubjectAnalyticsItem[] = Array.from(subjectMap.values()).map((s) => {
    const subjAcc = s.attempted > 0 ? Number(((s.correct / s.attempted) * 100).toFixed(1)) : 0;
    const subjAtt =
      s.totalQuestions > 0 ? Number(((s.attempted / s.totalQuestions) * 100).toFixed(1)) : 0;
    const subjAvgTime =
      s.times.length > 0
        ? Number((s.times.reduce((a, b) => a + b, 0) / s.times.length).toFixed(1))
        : 0;
    const guessPct =
      s.attempted > 0 ? Number(((s.mainGuessCount / s.attempted) * 100).toFixed(1)) : 0;
    const mgAcc =
      s.mainGuessCount > 0
        ? Number(((s.mainGuessCorrect / s.mainGuessCount) * 100).toFixed(1))
        : 0;
    const sgAcc =
      s.secondGuessCount > 0
        ? Number(((s.secondGuessCorrect / s.secondGuessCount) * 100).toFixed(1))
        : 0;
    const srAcc =
      s.sureCount > 0 ? Number(((s.sureCorrect / s.sureCount) * 100).toFixed(1)) : 0;

    return {
      subjectSlug: s.subjectSlug,
      subjectName: s.subjectName,
      totalQuestions: s.totalQuestions,
      attempted: s.attempted,
      correct: s.correct,
      incorrect: s.incorrect,
      unattempted: s.unattempted,
      accuracy: subjAcc,
      attemptRate: subjAtt,
      marksEarned: s.marksEarned,
      marksLost: s.marksLost,
      netScore: s.marksEarned - s.marksLost,
      maxMarks: s.totalQuestions * scheme.correct,
      avgTimeSeconds: subjAvgTime,
      medianTimeSeconds: computeMedian(s.times),
      guessPercentage: guessPct,
      mainGuessCount: s.mainGuessCount,
      mainGuessCorrect: s.mainGuessCorrect,
      mainGuessAccuracy: mgAcc,
      secondGuessCount: s.secondGuessCount,
      secondGuessCorrect: s.secondGuessCorrect,
      secondGuessAccuracy: sgAcc,
      sureCount: s.sureCount,
      sureCorrect: s.sureCorrect,
      sureAccuracy: srAcc,
    };
  });

  // Transparent Knowledge-Gap Score & Speed/Accuracy Classification per Topic
  const topicBreakdown: TopicAnalyticsItem[] = Array.from(topicMap.values()).map((t) => {
    const tAcc = t.attempted > 0 ? Number(((t.correct / t.attempted) * 100).toFixed(1)) : 0;
    const tAtt =
      t.totalQuestions > 0 ? Number(((t.attempted / t.totalQuestions) * 100).toFixed(1)) : 0;
    const tAvgTime =
      t.times.length > 0
        ? Number((t.times.reduce((a, b) => a + b, 0) / t.times.length).toFixed(1))
        : 0;
    const guessFreq =
      t.totalQuestions > 0 ? Number(((t.guessCount / t.totalQuestions) * 100).toFixed(1)) : 0;

    const isHighAcc = tAcc >= configThresholds.accuracyThresholdPercent;
    const isFast = tAvgTime <= configThresholds.speedThresholdSeconds;

    let quadrant: TopicAnalyticsItem['quadrant'] = 'Strong Mastery';
    if (isHighAcc && isFast) {
      quadrant = 'Strong Mastery';
    } else if (isHighAcc && !isFast) {
      quadrant = 'Knowledge Exists — Speed Needs Work';
    } else if (!isHighAcc && isFast) {
      quadrant = 'Superficial / Careless Risk';
    } else {
      quadrant = 'Priority Revision';
    }

    // Transparent Knowledge-Gap Formula v1.0-transparent (0 to 100 scale)
    const incorrectRate = t.totalQuestions > 0 ? (t.incorrect + t.unattempted * 0.5) / t.totalQuestions : 0;
    const incorrectFrequencyWeight = Number((incorrectRate * 40).toFixed(1)); // max 40 pts
    const negativeImpactWeight = Number(
      Math.min(25, (t.negativeMarks / Math.max(1, t.totalQuestions)) * 25).toFixed(1)
    ); // max 25 pts
    const guessDependencyWeight = Number(((guessFreq / 100) * 20).toFixed(1)); // max 20 pts
    const timePenaltyWeight = Number(
      Math.min(15, Math.max(0, ((tAvgTime - configThresholds.speedThresholdSeconds) / 40) * 15)).toFixed(1)
    ); // max 15 pts

    const knowledgeGapScore = Number(
      Math.min(
        100,
        incorrectFrequencyWeight +
          negativeImpactWeight +
          guessDependencyWeight +
          timePenaltyWeight
      ).toFixed(1)
    );

    const reasons: string[] = [];
    if (t.incorrect > 0) {
      reasons.push(`${t.incorrect}/${t.totalQuestions} incorrect (${tAcc}% accuracy)`);
    }
    if (t.unattempted > 0) {
      reasons.push(`${t.unattempted} unattempted questions`);
    }
    if (guessFreq >= 40) {
      reasons.push(`High guess dependency (${guessFreq}% guessed)`);
    }
    if (tAvgTime > configThresholds.speedThresholdSeconds) {
      reasons.push(`Elevated solving time (${tAvgTime}s avg vs ${configThresholds.speedThresholdSeconds}s benchmark)`);
    }
    if (reasons.length === 0) {
      reasons.push('High accuracy and timely execution demonstrated');
    }

    return {
      subjectName: t.subjectName,
      systemName: t.systemName,
      topicName: t.topicName,
      subtopicName: t.subtopicName,
      totalQuestions: t.totalQuestions,
      attempted: t.attempted,
      correct: t.correct,
      incorrect: t.incorrect,
      unattempted: t.unattempted,
      accuracy: tAcc,
      attemptRate: tAtt,
      avgTimeSeconds: tAvgTime,
      guessFrequency: guessFreq,
      negativeMarksImpact: t.negativeMarks,
      quadrant,
      knowledgeGapScore,
      knowledgeGapReasons: reasons,
      factorBreakdown: {
        incorrectFrequencyWeight,
        negativeImpactWeight,
        guessDependencyWeight,
        timePenaltyWeight,
      },
    };
  });

  // Guess Intelligence summary
  const sureAccuracy =
    sureCount > 0 ? Number(((sureCorrect / sureCount) * 100).toFixed(1)) : 0;
  const mainGuessAccuracy =
    mainGuessCount > 0 ? Number(((mainGuessCorrect / mainGuessCount) * 100).toFixed(1)) : 0;
  const secondGuessAccuracy =
    secondGuessCount > 0
      ? Number(((secondGuessMatchingCorrect / secondGuessCount) * 100).toFixed(1))
      : 0;
  const guessingPercentage =
    attemptedCount > 0 ? Number(((mainGuessCount / attemptedCount) * 100).toFixed(1)) : 0;
  const correctAnswerSurvivalRate =
    questionsWithEliminations > 0
      ? Number(
          ((correctAnswerSurvivedEliminationCount / questionsWithEliminations) * 100).toFixed(1)
        )
      : 0;
  const eliminationEfficiency =
    twoOptionsEliminatedCount > 0
      ? Number(
          ((twoOptionsEliminatedMainGuessCorrect / twoOptionsEliminatedCount) * 100).toFixed(1)
        )
      : 0;

  const guessInsights: string[] = [];
  if (sureCount >= 3 && mainGuessCount >= 2) {
    guessInsights.push(
      `Your confident (Sure) answers achieved ${sureAccuracy}% accuracy (n=${sureCount}), compared to ${mainGuessAccuracy}% accuracy on Main Guesses (n=${mainGuessCount}).`
    );
  } else if (sureCount > 0) {
    guessInsights.push(
      `Your Sure responses recorded ${sureAccuracy}% accuracy across ${sureCount} attempted questions.`
    );
  }
  if (mainGuessCount > 0) {
    const netGuessMarks = marksEarnedFromMainGuesses - negativeMarksFromMainGuesses;
    guessInsights.push(
      `Main Guesses generated +${marksEarnedFromMainGuesses} marks and cost -${negativeMarksFromMainGuesses} negative marks (Net impact: ${
        netGuessMarks >= 0 ? '+' : ''
      }${netGuessMarks} marks across n=${mainGuessCount} questions).`
    );
  }
  if (secondGuessCount > 0) {
    guessInsights.push(
      `Your ungraded Second Guess matched the actual correct answer in ${secondGuessMatchingCorrect} out of ${secondGuessCount} tagged questions (${secondGuessAccuracy}%).`
    );
  }
  if (questionsWithEliminations > 0) {
    guessInsights.push(
      `Across ${questionsWithEliminations} questions using option elimination, the correct answer survived your strike-through in ${correctAnswerSurvivedEliminationCount} cases (${correctAnswerSurvivalRate}% survival rate).`
    );
  }

  // Answer-Change Intelligence
  const revisionsByQuestion = new Map<number, AnswerRevisionItem[]>();
  for (const rev of revisions) {
    const list = revisionsByQuestion.get(rev.testQuestionId) || [];
    list.push(rev);
    revisionsByQuestion.set(rev.testQuestionId, list);
  }

  let incorrectToCorrect = 0;
  let correctToIncorrect = 0;
  let incorrectToIncorrect = 0;
  let unchangedCorrect = 0;
  let unchangedIncorrect = 0;

  for (const q of items) {
    const qRevs = revisionsByQuestion.get(q.testQuestionId) || [];
    // A revision change occurs when there was a prior committed option that was later changed
    const meaningfulRevs = qRevs.filter((r) => r.previousOption !== null && r.previousOption !== r.newOption);

    if (meaningfulRevs.length === 0) {
      if (q.savedOption === q.correctOption) unchangedCorrect++;
      else if (q.savedOption) unchangedIncorrect++;
    } else {
      const firstCommittedOption = meaningfulRevs[0].previousOption;
      const finalOption = q.savedOption;
      if (firstCommittedOption && finalOption) {
        const wasInitiallyCorrect = firstCommittedOption === q.correctOption;
        const isFinallyCorrect = finalOption === q.correctOption;
        if (!wasInitiallyCorrect && isFinallyCorrect) {
          incorrectToCorrect++;
        } else if (wasInitiallyCorrect && !isFinallyCorrect) {
          correctToIncorrect++;
        } else if (!wasInitiallyCorrect && !isFinallyCorrect) {
          incorrectToIncorrect++;
        }
      }
    }
  }

  const questionsChangedCount = incorrectToCorrect + correctToIncorrect + incorrectToIncorrect;
  const swingValue = scheme.correct + Math.abs(scheme.incorrect);
  const netMarksImpactFromChanges =
    incorrectToCorrect * swingValue - correctToIncorrect * swingValue;

  const changeInsights: string[] = [];
  if (questionsChangedCount >= 2) {
    changeInsights.push(
      `You modified a previously saved answer on ${questionsChangedCount} questions: ${incorrectToCorrect} shifted Incorrect → Correct, ${correctToIncorrect} shifted Correct → Incorrect, and ${incorrectToIncorrect} remained Incorrect (Net score impact: ${
        netMarksImpactFromChanges >= 0 ? '+' : ''
      }${netMarksImpactFromChanges} marks).`
    );
  } else {
    changeInsights.push(
      `Insufficient answer-revision sample size (n=${questionsChangedCount} changed questions) to establish a behavioral revision bias.`
    );
  }

  return {
    totalQuestions,
    attemptedCount,
    correctCount,
    incorrectCount,
    unattemptedCount,
    score,
    maxMarks,
    percentageScore,
    accuracy,
    attemptRate,
    positiveMarks,
    negativeMarks,
    totalTimeSeconds,
    avgTimeSeconds,
    medianTimeSeconds,
    fastestCorrectSeconds,
    slowestIncorrectSeconds,
    subjectBreakdown,
    topicBreakdown,
    guessIntelligence: {
      sureCount,
      sureCorrect,
      sureIncorrect,
      sureAccuracy,
      mainGuessCount,
      mainGuessCorrect,
      mainGuessIncorrect,
      mainGuessAccuracy,
      marksEarnedFromMainGuesses,
      negativeMarksFromMainGuesses,
      netMarksFromMainGuesses: marksEarnedFromMainGuesses - negativeMarksFromMainGuesses,
      guessingPercentage,
      guessIntentUnattemptedCount,
      secondGuessCount,
      secondGuessMatchingCorrect,
      secondGuessNotMatchingCorrect,
      secondGuessAccuracy,
      eliminationAnalysis: {
        questionsWithEliminations,
        twoOptionsEliminatedCount,
        twoOptionsEliminatedMainGuessCorrect,
        twoOptionsEliminatedSecondGuessCorrect,
        correctAnswerSurvivedEliminationCount,
        correctAnswerEliminatedByMistakeCount,
        correctAnswerSurvivalRate,
        eliminationEfficiency,
        marksLostWhenSecondGuessWasCorrect,
      },
      insights: guessInsights,
    },
    answerChangeIntelligence: {
      totalRevisions: revisions.length,
      questionsChangedCount,
      avgChangesPerQuestion:
        totalQuestions > 0 ? Number((questionsChangedCount / totalQuestions).toFixed(2)) : 0,
      incorrectToCorrect,
      correctToIncorrect,
      incorrectToIncorrect,
      unchangedCorrect,
      unchangedIncorrect,
      netMarksImpactFromChanges,
      insights: changeInsights,
    },
    speedThresholdSeconds: configThresholds.speedThresholdSeconds,
    accuracyThresholdPercent: configThresholds.accuracyThresholdPercent,
    formulaVersion: 'v1.0-transparent',
  };
}
