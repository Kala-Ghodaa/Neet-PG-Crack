import { db } from './index.ts';
import {
  subjects,
  systems,
  topics,
  subtopics,
  questions,
  questionOptions,
  questionExplanations,
  questionImages,
  questionVersions,
  examConfigs,
  testSessions,
  testSections,
  testQuestions,
  studentResponses,
  answerRevisions,
  guessClassifications,
  eliminatedOptions,
  reviewFlags,
  bookmarks,
  questionEvents,
  testResults,
  analyticsSnapshots,
  studyRecommendations,
  revisionRecords,
  adminAuditLogs,
} from './schema.ts';
import { eq, desc, and, inArray } from 'drizzle-orm';
import {
  NEET_PG_SUBJECTS,
  CORE_ARCHETYPE_QUESTIONS,
  generateFull200QuestionBank,
  DEFAULT_NEET_PG_FULL_MOCK_CONFIG,
  DEFAULT_INICET_FULL_MOCK_CONFIG,
  BUILTIN_MOCK_CONFIGS,
  BUILTIN_MOCK_PAPERS_METADATA,
  RAPID_SECTIONAL_MOCK_CONFIG,
  TUTOR_PRACTICE_CONFIG,
} from '../data/seedQuestions.ts';
import type {
  ConfidenceLevel,
  ExamConfig,
  QuestionBankSchemaItem,
  StudentResponseRecord,
  MockPaperSummary,
  ImportTestPackagePayload,
} from '../types/domain.ts';
import {
  applyResponseTransition,
  validateExamConfig,
} from '../services/examEngine.ts';
import {
  calculateCompleteExamAnalytics,
  type EvaluatedQuestionInput,
} from '../services/analyticsEngine.ts';

let isSeededInMemoryFlag = false;

export async function ensureSeeded(defaultUserUid = 'demo-candidate-01') {
  if (isSeededInMemoryFlag) return;
  try {
    const existingSubjects = await db.select().from(subjects);
    if (existingSubjects.length === 0) {
      await db
        .insert(subjects)
        .values(
          NEET_PG_SUBJECTS.map((s) => ({
            slug: s.slug,
            name: s.name,
            code: s.code,
            orderIndex: s.orderIndex,
          }))
        )
        .onConflictDoNothing();
    }

    const existingConfigs = await db.select().from(examConfigs);
    const existingByKey = new Map(existingConfigs.map((c) => [c.configKey, c]));

    const allBuiltInConfigs: ExamConfig[] = [
      DEFAULT_NEET_PG_FULL_MOCK_CONFIG,
      DEFAULT_INICET_FULL_MOCK_CONFIG,
      ...BUILTIN_MOCK_CONFIGS,
      RAPID_SECTIONAL_MOCK_CONFIG,
      TUTOR_PRACTICE_CONFIG,
    ];

    const configsToInsert = allBuiltInConfigs
      .filter((cfg) => !existingByKey.has(cfg.examId))
      .map((cfg) => ({
        configKey: cfg.examId,
        configVersion: cfg.configVersion,
        examName: cfg.examName,
        mode: cfg.mode,
        configJson: cfg,
      }));

    if (configsToInsert.length > 0) {
      await db.insert(examConfigs).values(configsToInsert).onConflictDoNothing();
    }

    // Upgrade any previously seeded built-in v1.0 configs to the validated NBEMS 2026 / AIIMS INI-CET v2.0 specs
    for (const cfg of allBuiltInConfigs) {
      const existing = existingByKey.get(cfg.examId);
      if (existing && existing.configVersion !== cfg.configVersion) {
        await db
          .update(examConfigs)
          .set({
            configVersion: cfg.configVersion,
            examName: cfg.examName,
            mode: cfg.mode,
            configJson: cfg,
          })
          .where(eq(examConfigs.configKey, cfg.examId));
      }
    }

    const existingQuestions = await db.select().from(questions);
    if (existingQuestions.length < 200) {
      const full200 = generateFull200QuestionBank();
      const existingCodes = new Set(existingQuestions.map((q) => q.questionCode));
      const toInsert = full200.filter((q) => !existingCodes.has(q.questionId));

      if (toInsert.length > 0) {
        // Seed taxonomy systems/topics idempotently without duplicating existing rows
        const existingSystems = await db.select().from(systems);
        const existingTopics = await db.select().from(topics);
        const sysSeen = new Set<string>(
          existingSystems.map((s) => `${s.subjectSlug}:${s.slug}`)
        );
        const topSeen = new Set<string>(
          existingTopics.map((t) => `${t.subjectSlug}:${t.systemSlug}:${t.slug}`)
        );
        const sysBatch: Array<{ subjectSlug: string; slug: string; name: string }> = [];
        const topBatch: Array<{
          subjectSlug: string;
          systemSlug: string;
          slug: string;
          name: string;
        }> = [];

        for (const item of CORE_ARCHETYPE_QUESTIONS) {
          const sysKey = `${item.subjectId}:${item.systemId}`;
          if (!sysSeen.has(sysKey)) {
            sysSeen.add(sysKey);
            sysBatch.push({
              subjectSlug: item.subjectId,
              slug: item.systemId,
              name: item.systemName || item.systemId,
            });
          }
          const topKey = `${item.subjectId}:${item.systemId}:${item.topicId}`;
          if (!topSeen.has(topKey)) {
            topSeen.add(topKey);
            topBatch.push({
              subjectSlug: item.subjectId,
              systemSlug: item.systemId,
              slug: item.topicId,
              name: item.topicName || item.topicId,
            });
          }
        }
        if (sysBatch.length > 0) {
          await db.insert(systems).values(sysBatch).onConflictDoNothing();
        }
        if (topBatch.length > 0) {
          await db.insert(topics).values(topBatch).onConflictDoNothing();
        }

        // Batch insert questions
        const insertedQs = await db
          .insert(questions)
          .values(
            toInsert.map((q) => ({
              questionCode: q.questionId,
              version: q.questionVersion,
              subjectSlug: q.subjectId,
              subjectName: q.subjectName || q.subjectId,
              systemSlug: q.systemId,
              systemName: q.systemName || q.systemId,
              topicSlug: q.topicId,
              topicName: q.topicName || q.topicId,
              subtopicName: q.subtopic,
              questionType: q.questionType,
              difficulty: q.difficulty,
              questionText: q.question.text,
              clinicalVignette: q.question.clinicalVignette,
              tablesJson: q.question.tables,
              correctOption: q.correctAnswer,
              isPyq: q.metadata.isPYQ,
              pyqYear: q.metadata.year,
              source: q.metadata.source,
              referencesJson: q.metadata.references,
              tagsJson: q.metadata.tags,
              status: q.status,
            }))
          )
          .returning();

        const codeToItem = new Map(toInsert.map((item) => [item.questionId, item]));
        const optionsBatch: Array<{
          questionId: number;
          optionKey: string;
          optionText: string;
          optionExplanation: string;
        }> = [];
        const explanationsBatch: Array<{
          questionId: number;
          summary: string;
          details: string;
          learningPointsJson: string[];
          optionExplanationsJson: Record<string, string>;
        }> = [];
        const imagesBatch: Array<{
          questionId: number;
          imageUrl: string;
          caption: string;
          altText: string;
        }> = [];
        const versionsBatch: Array<{
          questionId: number;
          version: number;
          snapshotJson: QuestionBankSchemaItem;
        }> = [];

        for (const dbQ of insertedQs) {
          const item = codeToItem.get(dbQ.questionCode);
          if (!item) continue;

          for (const opt of item.options) {
            optionsBatch.push({
              questionId: dbQ.id,
              optionKey: opt.id,
              optionText: opt.text,
              optionExplanation: item.explanation.optionExplanations[opt.id] || '',
            });
          }

          explanationsBatch.push({
            questionId: dbQ.id,
            summary: item.explanation.summary,
            details: item.explanation.details,
            learningPointsJson: item.explanation.learningPoints,
            optionExplanationsJson: item.explanation.optionExplanations,
          });

          for (const img of item.question.images) {
            imagesBatch.push({
              questionId: dbQ.id,
              imageUrl: img.url,
              caption: img.caption,
              altText: img.altText,
            });
          }

          versionsBatch.push({
            questionId: dbQ.id,
            version: item.questionVersion,
            snapshotJson: item,
          });
        }

        if (optionsBatch.length > 0) {
          await db.insert(questionOptions).values(optionsBatch);
        }
        if (explanationsBatch.length > 0) {
          await db.insert(questionExplanations).values(explanationsBatch);
        }
        if (imagesBatch.length > 0) {
          await db.insert(questionImages).values(imagesBatch);
        }
        if (versionsBatch.length > 0) {
          await db.insert(questionVersions).values(versionsBatch);
        }
      }
    }

    // Seed baseline completed mock examinations for the default candidate so longitudinal trends,
    // guess intelligence, speed-accuracy matrix, and knowledge-gap analytics are immediately populated
    const userSessions = await db
      .select()
      .from(testSessions)
      .where(eq(testSessions.userUid, defaultUserUid));

    if (userSessions.length === 0) {
      await seedHistoricalSessionsForCandidate(defaultUserUid);
    }

    isSeededInMemoryFlag = true;
  } catch (error) {
    console.error('Error in ensureSeeded:', error);
    throw new Error('Failed to initialize baseline database seed.', { cause: error });
  }
}

async function seedHistoricalSessionsForCandidate(userUid: string) {
  const allDbQuestions = await db.select().from(questions);
  if (allDbQuestions.length === 0) return;

  const sampleQuestions = allDbQuestions.slice(0, 38); // All 19 subjects (2 Qs per subject)
  const allOpts = await db
    .select()
    .from(questionOptions)
    .where(
      inArray(
        questionOptions.questionId,
        sampleQuestions.map((q) => q.id)
      )
    );
  const allExps = await db
    .select()
    .from(questionExplanations)
    .where(
      inArray(
        questionExplanations.questionId,
        sampleQuestions.map((q) => q.id)
      )
    );

  const optsByQId = new Map<number, typeof allOpts>();
  for (const o of allOpts) {
    const arr = optsByQId.get(o.questionId) || [];
    arr.push(o);
    optsByQId.set(o.questionId, arr);
  }
  const expByQId = new Map(allExps.map((e) => [e.questionId, e]));

  // Create 3 historical mock tests showing realistic progression across 3 dates
  const mockProfiles = [
    {
      code: `MOCK-HIST-01-${Date.now()}`,
      name: 'NEET PG Grand Mock #1 — Baseline Diagnostic',
      daysAgo: 18,
      targetAccuracyMod: 0.58,
      baseTimeSec: 54,
    },
    {
      code: `MOCK-HIST-02-${Date.now()}`,
      name: 'NEET PG Grand Mock #2 — Mid-Cycle Assessment',
      daysAgo: 9,
      targetAccuracyMod: 0.68,
      baseTimeSec: 46,
    },
    {
      code: `MOCK-HIST-03-${Date.now()}`,
      name: 'NEET PG Grand Mock #3 — Pre-Exam Simulation',
      daysAgo: 2,
      targetAccuracyMod: 0.76,
      baseTimeSec: 39,
    },
  ];

  for (let mIdx = 0; mIdx < mockProfiles.length; mIdx++) {
    const profile = mockProfiles[mIdx];
    const startedDate = new Date(Date.now() - profile.daysAgo * 86400 * 1000);
    const submittedDate = new Date(startedDate.getTime() + 95 * 60 * 1000);

    const customConfig: ExamConfig = {
      ...RAPID_SECTIONAL_MOCK_CONFIG,
      examId: `neet-pg-grand-mock-${mIdx + 1}`,
      examName: profile.name,
      pattern: {
        ...RAPID_SECTIONAL_MOCK_CONFIG.pattern,
        totalQuestions: sampleQuestions.length,
        durationSeconds: 4500,
        sectional: true,
        sections: [
          { sectionId: 'sec-a', name: 'Section A', questionCount: 10, durationSeconds: 1200, allowReturnAfterLock: false },
          { sectionId: 'sec-b', name: 'Section B', questionCount: 10, durationSeconds: 1200, allowReturnAfterLock: false },
          { sectionId: 'sec-c', name: 'Section C', questionCount: 9, durationSeconds: 1050, allowReturnAfterLock: false },
          { sectionId: 'sec-d', name: 'Section D', questionCount: 9, durationSeconds: 1050, allowReturnAfterLock: false },
        ],
      },
    };

    const [createdSession] = await db
      .insert(testSessions)
      .values({
        sessionCode: profile.code,
        userUid,
        examName: profile.name,
        mode: 'exam',
        status: 'submitted',
        configSnapshotJson: customConfig,
        activeSectionIndex: 3,
        currentQuestionIndex: 0,
        totalQuestions: sampleQuestions.length,
        startedAt: startedDate,
        overallDeadlineAt: new Date(startedDate.getTime() + 4500 * 1000),
        submittedAt: submittedDate,
      })
      .returning();

    // Insert sections
    await db.insert(testSections).values(
      customConfig.pattern.sections.map((sec, idx) => ({
        sessionId: createdSession.id,
        sectionIndex: idx,
        sectionId: sec.sectionId,
        name: sec.name,
        questionCount: sec.questionCount,
        durationSeconds: sec.durationSeconds,
        allowReturnAfterLock: false,
        status: 'locked',
        startedAt: startedDate,
        deadlineAt: submittedDate,
        lockedAt: submittedDate,
      }))
    );

    const tqRows = await db
      .insert(testQuestions)
      .values(
        sampleQuestions.map((q, qIdx) => {
          const secIdx = qIdx < 10 ? 0 : qIdx < 20 ? 1 : qIdx < 29 ? 2 : 3;
          const qOpts = optsByQId.get(q.id) || [];
          const qExp = expByQId.get(q.id);
          return {
            sessionId: createdSession.id,
            sectionIndex: secIdx,
            questionOrder: qIdx + 1,
            questionId: q.id,
            questionCode: q.questionCode,
            questionVersion: q.version,
            subjectSlug: q.subjectSlug,
            subjectName: q.subjectName,
            systemName: q.systemName,
            topicName: q.topicName,
            subtopicName: q.subtopicName,
            difficulty: q.difficulty,
            questionSnapshotJson: {
              text: q.questionText,
              clinicalVignette: q.clinicalVignette,
              tables: q.tablesJson,
              options: qOpts.map((o) => ({ id: o.optionKey, text: o.optionText })),
              explanation: qExp
                ? {
                    summary: qExp.summary,
                    details: qExp.details,
                    optionExplanations: qExp.optionExplanationsJson,
                    learningPoints: qExp.learningPointsJson,
                  }
                : null,
            },
            correctOptionSnapshot: q.correctOption,
          };
        })
      )
      .returning();

    const respValues: Array<typeof studentResponses.$inferInsert> = [];
    const revValues: Array<typeof answerRevisions.$inferInsert> = [];

    for (let i = 0; i < tqRows.length; i++) {
      const tq = tqRows[i];
      const correctOpt = tq.correctOptionSnapshot;
      const wrongOptions = ['A', 'B', 'C', 'D'].filter((k) => k !== correctOpt);

      // Make Pathology, Pharmacology, and Medicine intentionally nuanced for rich knowledge-gap detection
      const isWeakSubject =
        tq.subjectSlug === 'pathology' ||
        tq.subjectSlug === 'pharmacology' ||
        tq.subjectSlug === 'medicine';

      const isUnattempted = i % 14 === 13;
      const isCorrect =
        !isUnattempted &&
        (isWeakSubject
          ? (i + mIdx) % 3 === 0
          : (i + mIdx * 2) % 10 < Math.round(profile.targetAccuracyMod * 10));

      const savedOpt = isUnattempted ? null : isCorrect ? correctOpt : wrongOptions[i % 3];
      const isMainGuess = !isUnattempted && (i % 3 === 1 || isWeakSubject);
      const confidence: ConfidenceLevel = isUnattempted
        ? i % 2 === 0
          ? 'guess_intent_unattempted'
          : 'sure'
        : isMainGuess
        ? 'main_guess'
        : 'sure';

      const hasSecondGuess = isMainGuess && i % 2 === 1;
      const secondGuessOpt = hasSecondGuess
        ? isCorrect
          ? wrongOptions[0]
          : i % 4 === 1
          ? correctOpt // Classic 50-50 trap where Second Guess was actually the correct answer!
          : wrongOptions[1]
        : null;

      const eliminatedOpts =
        isMainGuess && i % 2 === 1
          ? wrongOptions.filter((w) => w !== savedOpt && w !== secondGuessOpt).slice(0, 2)
          : i % 5 === 0
          ? [wrongOptions[2]]
          : [];

      const timeSpent =
        profile.baseTimeSec +
        (isWeakSubject ? 26 : 0) +
        ((i * 7) % 25);

      respValues.push({
        sessionId: createdSession.id,
        testQuestionId: tq.id,
        questionId: tq.questionId,
        visited: true,
        savedOption: savedOpt,
        pendingOption: savedOpt,
        isMarkedForReview: i % 6 === 0,
        confidence,
        secondGuessOption: secondGuessOpt,
        eliminatedOptionsJson: eliminatedOpts,
        timeSpentSeconds: timeSpent,
        visitCount: i % 4 === 0 ? 2 : 1,
        firstAnsweredAt: startedDate,
        lastSavedAt: submittedDate,
      });

      // Add committed answer revisions on select questions
      if (savedOpt && i % 5 === 2) {
        const initialOpt = isCorrect ? wrongOptions[0] : correctOpt;
        revValues.push({
          sessionId: createdSession.id,
          testQuestionId: tq.id,
          questionId: tq.questionId,
          revisionNumber: 1,
          previousOption: initialOpt,
          newOption: savedOpt,
          previousConfidence: 'main_guess',
          newConfidence: confidence,
          wasReviewedBeforeChange: true,
          timeSpentBeforeChangeSeconds: Math.floor(timeSpent * 0.6),
          changedAt: submittedDate,
        });
      }
    }

    await db.insert(studentResponses).values(respValues);
    if (revValues.length > 0) {
      await db.insert(answerRevisions).values(revValues);
    }

    await computeAndPersistSessionResult(createdSession.id, userUid);
  }

  // Also seed 2 bookmarks for the candidate
  if (sampleQuestions.length >= 4) {
    await db.insert(bookmarks).values([
      {
        userUid,
        questionId: sampleQuestions[0].id,
        questionCode: sampleQuestions[0].questionCode,
        notes: 'Review PICA territory vs AICA territory cranial nerve nuclei.',
      },
      {
        userUid,
        questionId: sampleQuestions[6].id,
        questionCode: sampleQuestions[6].questionCode,
        notes: 'Remember Mentzer index < 13 in Beta-thalassemia trait vs > 13 in IDA.',
      },
    ]);
  }
}

export async function computeAndPersistSessionResult(sessionId: number, userUid: string) {
  try {
    const [session] = await db
      .select()
      .from(testSessions)
      .where(eq(testSessions.id, sessionId));
    if (!session) throw new Error('Session not found');

    const config = session.configSnapshotJson as ExamConfig;
    const tqs = await db
      .select()
      .from(testQuestions)
      .where(eq(testQuestions.sessionId, sessionId));
    const resps = await db
      .select()
      .from(studentResponses)
      .where(eq(studentResponses.sessionId, sessionId));
    const revs = await db
      .select()
      .from(answerRevisions)
      .where(eq(answerRevisions.sessionId, sessionId));

    const respByTqId = new Map(resps.map((r) => [r.testQuestionId, r]));

    const evalInputs: EvaluatedQuestionInput[] = tqs.map((tq) => {
      const r = respByTqId.get(tq.id);
      return {
        testQuestionId: tq.id,
        questionId: tq.questionId,
        questionCode: tq.questionCode,
        subjectSlug: tq.subjectSlug,
        subjectName: tq.subjectName,
        systemName: tq.systemName,
        topicName: tq.topicName,
        subtopicName: tq.subtopicName,
        difficulty: tq.difficulty,
        correctOption: tq.correctOptionSnapshot,
        savedOption: r?.savedOption || null,
        isMarkedForReview: r?.isMarkedForReview || false,
        confidence: (r?.confidence as ConfidenceLevel) || 'sure',
        secondGuessOption: r?.secondGuessOption || null,
        eliminatedOptions: (r?.eliminatedOptionsJson as string[]) || [],
        timeSpentSeconds: r?.timeSpentSeconds || 0,
        visitCount: r?.visitCount || 0,
      };
    });

    const formattedRevs = revs.map((rv) => ({
      testQuestionId: rv.testQuestionId,
      questionId: rv.questionId,
      revisionNumber: rv.revisionNumber,
      previousOption: rv.previousOption,
      newOption: rv.newOption,
      previousConfidence: rv.previousConfidence as ConfidenceLevel,
      newConfidence: rv.newConfidence as ConfidenceLevel,
      wasReviewedBeforeChange: rv.wasReviewedBeforeChange,
      timeSpentBeforeChangeSeconds: rv.timeSpentBeforeChangeSeconds,
      changedAt: rv.changedAt.toISOString(),
    }));

    const analytics = calculateCompleteExamAnalytics(
      evalInputs,
      formattedRevs,
      config.markingScheme || { correct: 4, incorrect: -1, unattempted: 0 }
    );

    // Upsert test_results
    const existingResult = await db
      .select()
      .from(testResults)
      .where(eq(testResults.sessionId, sessionId));

    if (existingResult.length === 0) {
      await db.insert(testResults).values({
        sessionId,
        userUid,
        totalQuestions: analytics.totalQuestions,
        attemptedCount: analytics.attemptedCount,
        correctCount: analytics.correctCount,
        incorrectCount: analytics.incorrectCount,
        unattemptedCount: analytics.unattemptedCount,
        score: analytics.score,
        maxMarks: analytics.maxMarks,
        percentageScore: analytics.percentageScore,
        accuracy: analytics.accuracy,
        attemptRate: analytics.attemptRate,
        positiveMarks: analytics.positiveMarks,
        negativeMarks: analytics.negativeMarks,
        totalTimeSeconds: analytics.totalTimeSeconds,
        avgTimeSeconds: analytics.avgTimeSeconds,
        medianTimeSeconds: analytics.medianTimeSeconds,
        fastestCorrectSeconds: analytics.fastestCorrectSeconds,
        slowestIncorrectSeconds: analytics.slowestIncorrectSeconds,
        markingSchemeSnapshotJson: config.markingScheme,
        subjectBreakdownJson: analytics.subjectBreakdown,
        topicBreakdownJson: analytics.topicBreakdown,
        guessAnalyticsJson: analytics.guessIntelligence,
        answerChangeAnalyticsJson: analytics.answerChangeIntelligence,
      });

      await db.insert(analyticsSnapshots).values({
        userUid,
        sessionId,
        formulaVersion: analytics.formulaVersion,
        overallMetricsJson: {
          score: analytics.score,
          maxMarks: analytics.maxMarks,
          accuracy: analytics.accuracy,
          attemptRate: analytics.attemptRate,
          avgTimeSeconds: analytics.avgTimeSeconds,
          negativeMarks: analytics.negativeMarks,
        },
        knowledgeGapsJson: analytics.topicBreakdown
          .sort((a, b) => b.knowledgeGapScore - a.knowledgeGapScore)
          .slice(0, 10),
        speedAccuracyMatrixJson: analytics.topicBreakdown.map((t) => ({
          topicName: t.topicName,
          subjectName: t.subjectName,
          accuracy: t.accuracy,
          avgTimeSeconds: t.avgTimeSeconds,
          quadrant: t.quadrant,
          sampleSize: t.totalQuestions,
        })),
        retentionMetricsJson: {},
      });
    }

    // Regenerate study recommendations & revision records from latest knowledge gaps
    await refreshStudyRecommendationsAndRevisions(userUid, analytics.topicBreakdown);

    return analytics;
  } catch (error) {
    console.error('Database query failed in computeAndPersistSessionResult:', error);
    throw new Error('Failed to compute and persist examination results.', { cause: error });
  }
}

async function refreshStudyRecommendationsAndRevisions(
  userUid: string,
  topicsList: ReturnType<typeof calculateCompleteExamAnalytics>['topicBreakdown']
) {
  const sortedByGap = [...topicsList].sort(
    (a, b) => b.knowledgeGapScore - a.knowledgeGapScore
  );

  await db
    .delete(studyRecommendations)
    .where(eq(studyRecommendations.userUid, userUid));

  const topRecommendations = sortedByGap.slice(0, 6).map((t, index) => {
    let activity = `Revise ${t.topicName} (${t.subtopicName}) core concepts and attempt a 15-question targeted practice block.`;
    if (t.quadrant === 'Knowledge Exists — Speed Needs Work') {
      activity = `Attempt timed clinical vignettes on ${t.topicName} targeting < 45 seconds per question.`;
    } else if (t.guessFrequency >= 40) {
      activity = `Review differential diagnosis tables for ${t.topicName} to eliminate 50-50 guesswork.`;
    }

    return {
      userUid,
      priority: index + 1,
      subjectName: t.subjectName,
      topicName: `${t.topicName} — ${t.subtopicName}`,
      reason: t.knowledgeGapReasons.join(' · '),
      evidence: `${t.accuracy}% accuracy across ${t.attempted}/${t.totalQuestions} attempted questions | Avg time: ${t.avgTimeSeconds}s | Negative marks: -${t.negativeMarksImpact}`,
      sampleSize: t.totalQuestions,
      suggestedActivity: activity,
      improvementMetric: `Raise topic accuracy above 75% and reduce knowledge-gap score from ${t.knowledgeGapScore} to < 25.`,
      knowledgeGapScore: t.knowledgeGapScore,
      status: 'active',
    };
  });

  if (topRecommendations.length > 0) {
    await db.insert(studyRecommendations).values(topRecommendations);
  }

  // Update revision queue with spaced intervals (1d, 3d, 7d, 15d, 30d)
  await db.delete(revisionRecords).where(eq(revisionRecords.userUid, userUid));
  const revEntries = sortedByGap.slice(0, 10).map((t) => {
    let intervalDays = 15;
    let retentionState = 'strong_retention';
    if (t.knowledgeGapScore >= 55) {
      intervalDays = 1;
      retentionState = 'critical_decay_1d';
    } else if (t.knowledgeGapScore >= 40) {
      intervalDays = 3;
      retentionState = 'needs_revision_3d';
    } else if (t.knowledgeGapScore >= 25) {
      intervalDays = 7;
      retentionState = 'scheduled_review_7d';
    } else {
      intervalDays = 15;
      retentionState = 'consolidating_15d';
    }

    return {
      userUid,
      topicName: `${t.topicName} (${t.subtopicName})`,
      subjectName: t.subjectName,
      lastAttemptedAt: new Date(),
      nextRevisionDueAt: new Date(Date.now() + intervalDays * 86400 * 1000),
      intervalDays,
      retentionState,
      accuracyHistoryJson: [t.accuracy],
      knowledgeGapScore: t.knowledgeGapScore,
    };
  });

  if (revEntries.length > 0) {
    await db.insert(revisionRecords).values(revEntries);
  }
}

// Per-user mutex to serialize concurrent POST /api/v1/exams/start requests (prevents double-click race)
const startSessionMutexByUser = new Map<string, Promise<any>>();

export async function startNewExamSession(params: {
  userUid: string;
  configKey?: string;
  customConfig?: Partial<ExamConfig>;
  filters?: {
    subjects?: string[];
    difficulty?: string;
    onlyPyq?: boolean;
    onlyBookmarked?: boolean;
    onlyIncorrect?: boolean;
    questionCount?: number;
    mode?: 'exam' | 'practice' | 'custom';
    sectional?: boolean;
    strictSaveMode?: boolean;
    durationMinutes?: number;
  };
}) {
  const prevLock = startSessionMutexByUser.get(params.userUid) || Promise.resolve();
  let releaseLock!: () => void;
  const currentLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  const chainedLock = prevLock.then(() => currentLock);
  startSessionMutexByUser.set(params.userUid, chainedLock);

  await prevLock;
  try {
    return await executeStartNewExamSession(params);
  } finally {
    releaseLock();
    if (startSessionMutexByUser.get(params.userUid) === chainedLock) {
      startSessionMutexByUser.delete(params.userUid);
    }
  }
}

async function executeStartNewExamSession(params: {
  userUid: string;
  configKey?: string;
  customConfig?: Partial<ExamConfig>;
  filters?: {
    subjects?: string[];
    difficulty?: string;
    onlyPyq?: boolean;
    onlyBookmarked?: boolean;
    onlyIncorrect?: boolean;
    questionCount?: number;
    mode?: 'exam' | 'practice' | 'custom';
    sectional?: boolean;
    strictSaveMode?: boolean;
    durationMinutes?: number;
  };
}) {
  try {
    await ensureSeeded(params.userUid);

    // Idempotency guard: if a double-click / duplicate request arrives within 15s for the exact same
    // mock configKey while a brand-new unattempted session is already in_progress, return it directly
    // instead of auto-submitting it and causing the first request to redirect to Post-Exam Analysis!
    if (params.configKey && !params.filters) {
      const existingActive = await db
        .select()
        .from(testSessions)
        .where(
          and(
            eq(testSessions.userUid, params.userUid),
            eq(testSessions.status, 'in_progress')
          )
        )
        .orderBy(desc(testSessions.startedAt))
        .limit(1);

      const recentLive = existingActive[0];
      if (
        recentLive &&
        (recentLive.configSnapshotJson as any)?.examId === params.configKey &&
        Date.now() - recentLive.startedAt.getTime() < 15000 &&
        new Date() < recentLive.overallDeadlineAt
      ) {
        return recentLive;
      }
    }

    // Finalize any previously abandoned or expired in_progress sessions for this user
    // so starting a new exam never accumulates multiple simultaneous "Resume" states
    await reconcileUserActiveSessions(params.userUid, true);

    let baseConfig: ExamConfig = DEFAULT_NEET_PG_FULL_MOCK_CONFIG;
    const builtInMatch = BUILTIN_MOCK_CONFIGS.find((c) => c.examId === params.configKey);

    if (params.configKey === 'neet-pg-mini-sectional') {
      baseConfig = RAPID_SECTIONAL_MOCK_CONFIG;
    } else if (params.configKey === 'neet-pg-tutor-mode') {
      baseConfig = TUTOR_PRACTICE_CONFIG;
    } else if (params.configKey === 'inicet-full-mock') {
      baseConfig = DEFAULT_INICET_FULL_MOCK_CONFIG;
    } else if (builtInMatch) {
      baseConfig = builtInMatch;
    } else if (params.configKey) {
      const [customCfg] = await db
        .select()
        .from(examConfigs)
        .where(eq(examConfigs.configKey, params.configKey));
      if (customCfg) {
        baseConfig = customCfg.configJson as ExamConfig;
      }
    }

    if (params.customConfig) {
      baseConfig = {
        ...baseConfig,
        ...params.customConfig,
        pattern: {
          ...baseConfig.pattern,
          ...(params.customConfig.pattern || {}),
        },
        markingScheme: {
          ...baseConfig.markingScheme,
          ...(params.customConfig.markingScheme || {}),
        },
        settings: {
          ...baseConfig.settings,
          ...(params.customConfig.settings || {}),
        },
      };
    }

    // Fetch candidate questions matching filters
    let allPublished = await db
      .select()
      .from(questions)
      .where(eq(questions.status, 'published'));

    if (params.filters?.subjects && params.filters.subjects.length > 0) {
      const allowed = new Set(params.filters.subjects);
      allPublished = allPublished.filter((q) => allowed.has(q.subjectSlug));
    }
    if (params.filters?.difficulty && params.filters.difficulty !== 'all') {
      allPublished = allPublished.filter((q) => q.difficulty === params.filters?.difficulty);
    }
    if (params.filters?.onlyPyq) {
      allPublished = allPublished.filter((q) => q.isPyq);
    }
    if (params.filters?.onlyBookmarked) {
      const userBms = await db
        .select()
        .from(bookmarks)
        .where(eq(bookmarks.userUid, params.userUid));
      const bmIds = new Set(userBms.map((b) => b.questionId));
      allPublished = allPublished.filter((q) => bmIds.has(q.id));
      if (allPublished.length === 0) {
        throw new Error(
          'No bookmarked questions match your selected filters yet. Bookmark questions during an exam or review first.'
        );
      }
    }
    if (params.filters?.onlyIncorrect) {
      // Find questions previously answered incorrectly by this user
      const userSessions = await db
        .select()
        .from(testSessions)
        .where(eq(testSessions.userUid, params.userUid));
      const wrongQIds = new Set<number>();
      if (userSessions.length > 0) {
        const sIds = userSessions.map((s) => s.id);
        const tqs = await db
          .select()
          .from(testQuestions)
          .where(inArray(testQuestions.sessionId, sIds));
        const resps = await db
          .select()
          .from(studentResponses)
          .where(inArray(studentResponses.sessionId, sIds));
        const respMap = new Map(resps.map((r) => [r.testQuestionId, r]));
        for (const tq of tqs) {
          const r = respMap.get(tq.id);
          if (r?.savedOption && r.savedOption !== tq.correctOptionSnapshot) {
            wrongQIds.add(tq.questionId);
          }
        }
      }
      allPublished = allPublished.filter((q) => wrongQIds.has(q.id));
      if (allPublished.length === 0) {
        throw new Error(
          'No previously incorrect questions match your selected filters yet. Complete a test to build your mistake bank.'
        );
      }
    }

    const desiredCount =
      params.filters?.questionCount ||
      baseConfig.pattern.totalQuestions;

    // Order questions deterministically for scheduled numbered Grand Mocks (so each of the
    // 10 NEET-PG and 10 INI-CET mocks stays a consistent benchmark paper), while using
    // true randomized Fisher-Yates shuffling for repeatable sprints, tutor sessions, and custom tests.
    const preferredCodes = new Set<string>(
      Array.isArray((baseConfig as any).preferredQuestionCodes)
        ? (baseConfig as any).preferredQuestionCodes
        : []
    );

    const effectiveKey = params.configKey || baseConfig.examId || '';
    const isScheduledBenchmarkMock =
      !params.filters &&
      (effectiveKey.startsWith('neet-pg-full-mock-') ||
        effectiveKey.startsWith('inicet-full-mock-') ||
        preferredCodes.size > 0);

    let orderedPool: typeof allPublished;
    if (isScheduledBenchmarkMock) {
      orderedPool = deterministicShuffleBySeed(
        allPublished,
        effectiveKey || 'default-seed'
      );
    } else {
      orderedPool = [...allPublished];
      for (let i = orderedPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [orderedPool[i], orderedPool[j]] = [orderedPool[j], orderedPool[i]];
      }
    }

    if (preferredCodes.size > 0) {
      const preferredFirst = orderedPool.filter((q) => preferredCodes.has(q.questionCode));
      const remainingPool = orderedPool.filter((q) => !preferredCodes.has(q.questionCode));
      allPublished = [...preferredFirst, ...remainingPool];
    } else {
      allPublished = orderedPool;
    }

    const selectedQuestions = allPublished.slice(
      0,
      Math.min(desiredCount, allPublished.length)
    );

    if (selectedQuestions.length === 0) {
      throw new Error('No questions match the selected test criteria.');
    }

    const actualTotal = selectedQuestions.length;
    const isCustomBuilder = Boolean(
      params.filters?.questionCount || params.configKey === 'neet-pg-custom'
    );
    const requestedSectional =
      params.filters?.sectional !== undefined
        ? params.filters.sectional
        : baseConfig.pattern.sectional && actualTotal >= 5;
    // Prevent short custom drills (< 20 Qs) from fragmenting into absurd 2-Q locked sections
    const isSectional = isCustomBuilder
      ? requestedSectional && actualTotal >= 20
      : requestedSectional;

    const baseDurationSec = baseConfig.pattern?.durationSeconds;
    const totalDurationSec = params.filters?.durationMinutes
      ? params.filters.durationMinutes * 60
      : baseDurationSec && baseDurationSec > 0 && actualTotal === baseConfig.pattern.totalQuestions
      ? baseDurationSec
      : actualTotal === 200
      ? 12600
      : Math.max(60, actualTotal * 63);

    let sectionsConfig = baseConfig.pattern.sections;
    if (isSectional) {
      const secCount = isCustomBuilder
        ? Math.min(5, Math.max(2, Math.floor(actualTotal / 10)))
        : Math.min(
            baseConfig.pattern?.sections?.length ? baseConfig.pattern.sections.length : 5,
            actualTotal
          );
      const basePerSec = Math.floor(actualTotal / secCount);
      const remainder = actualTotal % secCount;
      const baseDurSec = Math.floor(totalDurationSec / secCount);
      const durRemainder = totalDurationSec % secCount;

      const secNames = ['Section A', 'Section B', 'Section C', 'Section D', 'Section E'];
      sectionsConfig = Array.from({ length: secCount }, (_, idx) => ({
        sectionId: `section-${String.fromCharCode(97 + idx)}`,
        name:
          (!isCustomBuilder && baseConfig.pattern?.sections?.[idx]?.name) ||
          secNames[idx] ||
          `Section ${idx + 1}`,
        questionCount: basePerSec + (idx < remainder ? 1 : 0),
        durationSeconds: baseDurSec + (idx === secCount - 1 ? durRemainder : 0),
        allowReturnAfterLock: false,
      }));
    } else {
      sectionsConfig = [
        {
          sectionId: 'section-all',
          name: 'All Questions',
          questionCount: actualTotal,
          durationSeconds: totalDurationSec,
          allowReturnAfterLock: true,
        },
      ];
    }

    const finalMode = params.filters?.mode || baseConfig.mode;
    const finalConfig: ExamConfig = {
      ...baseConfig,
      ...params.customConfig,
      mode: finalMode,
      examName:
        params.customConfig?.examName ||
        (params.filters?.questionCount
          ? `Custom NEET PG Assessment (${actualTotal} Questions)`
          : baseConfig.examName),
      pattern: {
        totalQuestions: actualTotal,
        questionType: 'single_best_answer',
        optionsPerQuestion: 4,
        durationSeconds: totalDurationSec,
        sectional: isSectional,
        sections: sectionsConfig,
      },
      settings: {
        ...baseConfig.settings,
        strictSaveMode:
          params.filters?.strictSaveMode !== undefined
            ? params.filters.strictSaveMode
            : finalMode === 'practice'
            ? false
            : true,
        showExplanationDuringExam: finalMode === 'practice',
      },
    };

    const validation = validateExamConfig(finalConfig);
    if (!validation.valid) {
      throw new Error(`Invalid exam configuration: ${validation.errors.join(', ')}`);
    }

    const now = new Date();
    const firstSecDuration = finalConfig.pattern.sections[0].durationSeconds;
    const overallDeadline = new Date(now.getTime() + finalConfig.pattern.durationSeconds * 1000);

    const sessionCode = `CBT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const [createdSession] = await db
      .insert(testSessions)
      .values({
        sessionCode,
        userUid: params.userUid,
        examName: finalConfig.examName,
        mode: finalConfig.mode,
        status: 'in_progress',
        configSnapshotJson: finalConfig,
        activeSectionIndex: 0,
        currentQuestionIndex: 0,
        totalQuestions: actualTotal,
        startedAt: now,
        overallDeadlineAt: overallDeadline,
      })
      .returning();

    // Insert test_sections
    await db.insert(testSections).values(
      finalConfig.pattern.sections.map((sec, idx) => ({
        sessionId: createdSession.id,
        sectionIndex: idx,
        sectionId: sec.sectionId,
        name: sec.name,
        questionCount: sec.questionCount,
        durationSeconds: sec.durationSeconds,
        allowReturnAfterLock: sec.allowReturnAfterLock,
        status: idx === 0 ? 'active' : 'pending',
        startedAt: idx === 0 ? now : null,
        deadlineAt:
          idx === 0 ? new Date(now.getTime() + firstSecDuration * 1000) : null,
      }))
    );

    // Fetch options, explanations, images for selected questions in parallel
    const qIds = selectedQuestions.map((q) => q.id);
    const [allOpts, allExps, allImgs] = await Promise.all([
      db.select().from(questionOptions).where(inArray(questionOptions.questionId, qIds)),
      db.select().from(questionExplanations).where(inArray(questionExplanations.questionId, qIds)),
      db.select().from(questionImages).where(inArray(questionImages.questionId, qIds)),
    ]);

    const optsMap = new Map<number, typeof allOpts>();
    for (const o of allOpts) {
      const list = optsMap.get(o.questionId) || [];
      list.push(o);
      optsMap.set(o.questionId, list);
    }
    const expMap = new Map(allExps.map((e) => [e.questionId, e]));
    const imgMap = new Map<number, typeof allImgs>();
    for (const img of allImgs) {
      const list = imgMap.get(img.questionId) || [];
      list.push(img);
      imgMap.set(img.questionId, list);
    }

    // Assign each question to its section based on section questionCounts
    let currentSecIdx = 0;
    let countInCurrentSec = 0;

    const tqValues = selectedQuestions.map((q, idx) => {
      if (
        currentSecIdx < finalConfig.pattern.sections.length - 1 &&
        countInCurrentSec >= finalConfig.pattern.sections[currentSecIdx].questionCount
      ) {
        currentSecIdx++;
        countInCurrentSec = 0;
      }
      countInCurrentSec++;

      const qOpts = (optsMap.get(q.id) || []).sort((a, b) =>
        a.optionKey.localeCompare(b.optionKey)
      );
      const qExp = expMap.get(q.id);
      const qImgs = imgMap.get(q.id) || [];

      return {
        sessionId: createdSession.id,
        sectionIndex: currentSecIdx,
        questionOrder: idx + 1,
        questionId: q.id,
        questionCode: q.questionCode,
        questionVersion: q.version,
        subjectSlug: q.subjectSlug,
        subjectName: q.subjectName,
        systemName: q.systemName,
        topicName: q.topicName,
        subtopicName: q.subtopicName,
        difficulty: q.difficulty,
        questionSnapshotJson: {
          text: q.questionText,
          clinicalVignette: q.clinicalVignette,
          tables: q.tablesJson,
          images: qImgs.map((im) => ({
            url: im.imageUrl,
            caption: im.caption,
            altText: im.altText,
          })),
          options: qOpts.map((o) => ({ id: o.optionKey, text: o.optionText })),
          explanation: qExp
            ? {
                summary: qExp.summary,
                details: qExp.details,
                optionExplanations: qExp.optionExplanationsJson,
                learningPoints: qExp.learningPointsJson,
              }
            : null,
        },
        correctOptionSnapshot: q.correctOption,
      };
    });

    const insertedTqs = await db.insert(testQuestions).values(tqValues).returning();

    // Initialize student_responses rows (Question 1 starts visited)
    await db.insert(studentResponses).values(
      insertedTqs.map((tq, idx) => ({
        sessionId: createdSession.id,
        testQuestionId: tq.id,
        questionId: tq.questionId,
        visited: idx === 0,
        savedOption: null,
        pendingOption: null,
        isMarkedForReview: false,
        confidence: 'sure',
        secondGuessOption: null,
        eliminatedOptionsJson: [],
        timeSpentSeconds: 0,
        visitCount: idx === 0 ? 1 : 0,
      }))
    );

    // Record session start event
    await db.insert(questionEvents).values({
      eventId: `evt-start-${createdSession.id}-${Date.now()}`,
      sessionId: createdSession.id,
      userUid: params.userUid,
      questionId: insertedTqs[0]?.questionId || null,
      eventType: 'section_started',
      metadataJson: { sectionIndex: 0, examName: finalConfig.examName },
    });

    return createdSession;
  } catch (error) {
    console.error('Database query failed in startNewExamSession:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to start examination session.',
      { cause: error }
    );
  }
}

export async function getExamSessionState(sessionId: number, userUid: string) {
  try {
    const [session] = await db
      .select()
      .from(testSessions)
      .where(eq(testSessions.id, sessionId));

    if (!session) throw new Error('Examination session not found.');
    if (session.userUid !== userUid) {
      throw new Error('Unauthorized access to examination session.');
    }

    const sections = await db
      .select()
      .from(testSections)
      .where(eq(testSections.sessionId, sessionId));
    sections.sort((a, b) => a.sectionIndex - b.sectionIndex);

    // Check server-side timer auto-transitions if session is in_progress
    // IMPORTANT: Check overall exam deadline FIRST so an expired exam submits immediately
    // rather than unlocking a fresh section past overallDeadlineAt.
    const now = new Date();
    const config = session.configSnapshotJson as ExamConfig;
    let activeSecIdx = session.activeSectionIndex;

    if (session.status === 'in_progress') {
      if (now >= session.overallDeadlineAt) {
        await submitExamSession(sessionId, userUid, true);
        return getExamSessionState(sessionId, userUid);
      }

      const currentSec = sections[activeSecIdx];
      if (
        config.pattern.sectional &&
        currentSec &&
        currentSec.deadlineAt &&
        now >= currentSec.deadlineAt
      ) {
        // Auto-lock expired section and open next section or auto-submit
        await transitionToNextSection(sessionId, userUid, true);
        return getExamSessionState(sessionId, userUid);
      }
    }

    const tqs = await db
      .select()
      .from(testQuestions)
      .where(eq(testQuestions.sessionId, sessionId));
    tqs.sort((a, b) => a.questionOrder - b.questionOrder);

    const resps = await db
      .select()
      .from(studentResponses)
      .where(eq(studentResponses.sessionId, sessionId));
    const respByTqId = new Map(resps.map((r) => [r.testQuestionId, r]));

    const userBms = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.userUid, userUid));
    const bookmarkedQIds = new Set(userBms.map((b) => b.questionId));

    const concealAnswers =
      session.status === 'in_progress' &&
      session.mode !== 'practice' &&
      !config.settings.showExplanationDuringExam;

    const questionsPayload = tqs.map((tq) => {
      const r = respByTqId.get(tq.id);
      const snap = tq.questionSnapshotJson as any;

      return {
        testQuestionId: tq.id,
        questionId: tq.questionId,
        questionCode: tq.questionCode,
        questionOrder: tq.questionOrder,
        sectionIndex: tq.sectionIndex,
        subjectSlug: tq.subjectSlug,
        subjectName: tq.subjectName,
        systemName: tq.systemName,
        topicName: tq.topicName,
        subtopicName: tq.subtopicName,
        difficulty: tq.difficulty,
        isBookmarked: bookmarkedQIds.has(tq.questionId),
        question: {
          text: snap.text,
          clinicalVignette: snap.clinicalVignette,
          tables: snap.tables || [],
          images: snap.images || [],
          options: snap.options || [],
          // Conceal explanation and correct answer during active exam mode!
          ...(concealAnswers
            ? {}
            : {
                correctOption: tq.correctOptionSnapshot,
                explanation: snap.explanation,
              }),
        },
        response: {
          visited: r?.visited ?? false,
          savedOption: r?.savedOption ?? null,
          pendingOption: r?.pendingOption ?? null,
          isMarkedForReview: r?.isMarkedForReview ?? false,
          confidence: (r?.confidence as ConfidenceLevel) ?? 'sure',
          secondGuessOption: r?.secondGuessOption ?? null,
          eliminatedOptions: (r?.eliminatedOptionsJson as string[]) ?? [],
          timeSpentSeconds: r?.timeSpentSeconds ?? 0,
          visitCount: r?.visitCount ?? 0,
        },
      };
    });

    return {
      session: {
        id: session.id,
        sessionCode: session.sessionCode,
        examName: session.examName,
        mode: session.mode,
        status: session.status,
        config,
        activeSectionIndex: session.activeSectionIndex,
        currentQuestionIndex: session.currentQuestionIndex,
        totalQuestions: session.totalQuestions,
        startedAt: session.startedAt.toISOString(),
        overallDeadlineAt: session.overallDeadlineAt.toISOString(),
        submittedAt: session.submittedAt ? session.submittedAt.toISOString() : null,
        serverTimeNow: now.toISOString(),
      },
      sections: sections.map((s) => ({
        id: s.id,
        sectionIndex: s.sectionIndex,
        sectionId: s.sectionId,
        name: s.name,
        questionCount: s.questionCount,
        durationSeconds: s.durationSeconds,
        allowReturnAfterLock: s.allowReturnAfterLock,
        status: s.status,
        startedAt: s.startedAt ? s.startedAt.toISOString() : null,
        deadlineAt: s.deadlineAt ? s.deadlineAt.toISOString() : null,
        lockedAt: s.lockedAt ? s.lockedAt.toISOString() : null,
      })),
      questions: questionsPayload,
    };
  } catch (error) {
    console.error('Database query failed in getExamSessionState:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to load examination session.',
      { cause: error }
    );
  }
}

export async function recordQuestionMutation(params: {
  sessionId: number;
  userUid: string;
  testQuestionId: number;
  action:
    | 'save_and_next'
    | 'save_and_mark_review'
    | 'mark_review_and_next'
    | 'navigate_away'
    | 'clear_response'
    | 'update_guess_or_elimination';
  selectedPendingOption: string | null;
  guessModeActive: boolean;
  secondGuessOption: string | null;
  eliminatedOptions: string[];
  clearOptions?: { clearSecondGuess: boolean; clearEliminations: boolean };
  additionalTimeSeconds?: number;
  nextQuestionIndex?: number;
  eventId?: string;
}) {
  try {
    const [session] = await db
      .select()
      .from(testSessions)
      .where(eq(testSessions.id, params.sessionId));

    if (!session) throw new Error('Session not found.');
    if (session.userUid !== params.userUid) {
      throw new Error('Unauthorized modification of examination session.');
    }
    if (session.status !== 'in_progress') {
      throw new Error('Cannot modify responses in a completed examination.');
    }

    const config = session.configSnapshotJson as ExamConfig;
    const [tq] = await db
      .select()
      .from(testQuestions)
      .where(
        and(
          eq(testQuestions.id, params.testQuestionId),
          eq(testQuestions.sessionId, params.sessionId)
        )
      );

    if (!tq) throw new Error('Question does not belong to this examination session.');

    // Enforce sectional lock server-side!
    if (config.pattern.sectional && tq.sectionIndex !== session.activeSectionIndex) {
      const [sec] = await db
        .select()
        .from(testSections)
        .where(
          and(
            eq(testSections.sessionId, params.sessionId),
            eq(testSections.sectionIndex, tq.sectionIndex)
          )
        );
      if (sec && sec.status === 'locked' && !sec.allowReturnAfterLock) {
        throw new Error(
          `Section "${sec.name}" is locked. Late mutations in locked sections are rejected by the server.`
        );
      }
    }

    const [existingResp] = await db
      .select()
      .from(studentResponses)
      .where(
        and(
          eq(studentResponses.sessionId, params.sessionId),
          eq(studentResponses.testQuestionId, params.testQuestionId)
        )
      );

    if (!existingResp) throw new Error('Student response record not found.');

    if (params.action === 'update_guess_or_elimination') {
      // Update guess classification or option elimination without committing a new savedOption in strict-save mode
      const cleanedSecondGuess =
        existingResp.savedOption && params.secondGuessOption === existingResp.savedOption
          ? null
          : params.secondGuessOption;

      const cleanedElims = [
        ...new Set(
          params.eliminatedOptions.filter(
            (o) => o !== existingResp.savedOption && o !== cleanedSecondGuess
          )
        ),
      ];

      const nextConfidence: ConfidenceLevel = existingResp.savedOption
        ? params.guessModeActive
          ? 'main_guess'
          : 'sure'
        : params.guessModeActive
        ? 'guess_intent_unattempted'
        : 'sure';

      const [updatedRow] = await db
        .update(studentResponses)
        .set({
          visited: true,
          pendingOption: params.selectedPendingOption,
          confidence: nextConfidence,
          secondGuessOption: cleanedSecondGuess,
          eliminatedOptionsJson: cleanedElims,
          timeSpentSeconds:
            existingResp.timeSpentSeconds + (params.additionalTimeSeconds || 0),
          updatedAt: new Date(),
        })
        .where(eq(studentResponses.id, existingResp.id))
        .returning();

      return updatedRow;
    }

    const currentRecord: StudentResponseRecord = {
      testQuestionId: existingResp.testQuestionId,
      questionId: existingResp.questionId,
      questionOrder: tq.questionOrder,
      sectionIndex: tq.sectionIndex,
      visited: existingResp.visited,
      savedOption: existingResp.savedOption,
      pendingOption: existingResp.pendingOption,
      isMarkedForReview: existingResp.isMarkedForReview,
      confidence: existingResp.confidence as ConfidenceLevel,
      secondGuessOption: existingResp.secondGuessOption,
      eliminatedOptions: (existingResp.eliminatedOptionsJson as string[]) || [],
      timeSpentSeconds: existingResp.timeSpentSeconds,
      visitCount: existingResp.visitCount,
      firstAnsweredAt: existingResp.firstAnsweredAt
        ? existingResp.firstAnsweredAt.toISOString()
        : null,
      lastSavedAt: existingResp.lastSavedAt
        ? existingResp.lastSavedAt.toISOString()
        : null,
    };

    const transition = applyResponseTransition({
      current: currentRecord,
      selectedPendingOption: params.selectedPendingOption,
      guessModeActive: params.guessModeActive,
      secondGuessOption: params.secondGuessOption,
      eliminatedOptions: params.eliminatedOptions,
      action: params.action,
      strictSaveMode: config.settings.strictSaveMode,
      clearOptions: params.clearOptions,
      additionalTimeSeconds: params.additionalTimeSeconds || 0,
    });

    const [updatedRow] = await db
      .update(studentResponses)
      .set({
        visited: true,
        savedOption: transition.updated.savedOption,
        pendingOption: transition.updated.pendingOption,
        isMarkedForReview: transition.updated.isMarkedForReview,
        confidence: transition.updated.confidence,
        secondGuessOption: transition.updated.secondGuessOption,
        eliminatedOptionsJson: transition.updated.eliminatedOptions,
        timeSpentSeconds: transition.updated.timeSpentSeconds,
        visitCount: existingResp.visitCount + 1,
        firstAnsweredAt: transition.updated.firstAnsweredAt
          ? new Date(transition.updated.firstAnsweredAt)
          : null,
        lastSavedAt: transition.updated.lastSavedAt
          ? new Date(transition.updated.lastSavedAt)
          : null,
        updatedAt: new Date(),
      })
      .where(eq(studentResponses.id, existingResp.id))
      .returning();

    // Record answer revision if saved answer changed
    if (transition.answerRevisionCreated && transition.updated.savedOption) {
      const existingRevs = await db
        .select()
        .from(answerRevisions)
        .where(
          and(
            eq(answerRevisions.sessionId, params.sessionId),
            eq(answerRevisions.testQuestionId, params.testQuestionId)
          )
        );
      await db.insert(answerRevisions).values({
        sessionId: params.sessionId,
        testQuestionId: params.testQuestionId,
        questionId: existingResp.questionId,
        revisionNumber: existingRevs.length + 1,
        previousOption: transition.previousSavedOption,
        newOption: transition.updated.savedOption,
        previousConfidence: existingResp.confidence,
        newConfidence: transition.updated.confidence,
        wasReviewedBeforeChange: existingResp.isMarkedForReview,
        timeSpentBeforeChangeSeconds: existingResp.timeSpentSeconds,
      });
    }

    // Update currentQuestionIndex on session if provided and mark target question visited
    if (typeof params.nextQuestionIndex === 'number') {
      await db
        .update(testSessions)
        .set({ currentQuestionIndex: params.nextQuestionIndex })
        .where(eq(testSessions.id, params.sessionId));

      const allTqs = await db
        .select()
        .from(testQuestions)
        .where(eq(testQuestions.sessionId, params.sessionId));
      allTqs.sort((a, b) => a.questionOrder - b.questionOrder);
      const targetTq = allTqs[params.nextQuestionIndex];
      if (targetTq) {
        await db
          .update(studentResponses)
          .set({ visited: true })
          .where(
            and(
              eq(studentResponses.sessionId, params.sessionId),
              eq(studentResponses.testQuestionId, targetTq.id)
            )
          );
      }
    }

    // Idempotent event log
    const evtId =
      params.eventId ||
      `evt-${params.sessionId}-${params.testQuestionId}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;
    await db
      .insert(questionEvents)
      .values({
        eventId: evtId,
        sessionId: params.sessionId,
        userUid: params.userUid,
        questionId: existingResp.questionId,
        eventType: params.action,
        metadataJson: {
          savedOption: transition.updated.savedOption,
          confidence: transition.updated.confidence,
          secondGuessOption: transition.updated.secondGuessOption,
          isMarkedForReview: transition.updated.isMarkedForReview,
        },
      })
      .onConflictDoNothing();

    return updatedRow;
  } catch (error) {
    console.error('Database query failed in recordQuestionMutation:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to save examination response.',
      { cause: error }
    );
  }
}

export async function transitionToNextSection(
  sessionId: number,
  userUid: string,
  isAutoTimeout = false
) {
  try {
    const [session] = await db
      .select()
      .from(testSessions)
      .where(eq(testSessions.id, sessionId));
    if (!session || session.status !== 'in_progress') {
      throw new Error('Active session not found.');
    }
    if (session.userUid !== userUid) {
      throw new Error('Unauthorized section transition request.');
    }

    const sections = await db
      .select()
      .from(testSections)
      .where(eq(testSections.sessionId, sessionId));
    sections.sort((a, b) => a.sectionIndex - b.sectionIndex);

    const currentIdx = session.activeSectionIndex;
    const currentSec = sections[currentIdx];
    const now = new Date();

    if (currentSec) {
      // Lock current section and discard any uncommitted pending selections in strictSaveMode
      await db
        .update(testSections)
        .set({
          status: 'locked',
          lockedAt: now,
        })
        .where(eq(testSections.id, currentSec.id));

      const secTqs = await db
        .select()
        .from(testQuestions)
        .where(
          and(
            eq(testQuestions.sessionId, sessionId),
            eq(testQuestions.sectionIndex, currentIdx)
          )
        );
      if (secTqs.length > 0) {
        await db
          .update(studentResponses)
          .set({ pendingOption: null })
          .where(
            inArray(
              studentResponses.testQuestionId,
              secTqs.map((t) => t.id)
            )
          );
      }
    }

    const nextIdx = currentIdx + 1;
    if (nextIdx >= sections.length || now >= session.overallDeadlineAt) {
      // All sections finished or overall exam time expired -> Submit examination
      return await submitExamSession(sessionId, userUid, isAutoTimeout);
    }

    const nextSec = sections[nextIdx];
    const rawNextDeadlineMs = now.getTime() + nextSec.durationSeconds * 1000;
    const cappedDeadlineMs = Math.min(rawNextDeadlineMs, session.overallDeadlineAt.getTime());
    const nextDeadline = new Date(cappedDeadlineMs);

    await db
      .update(testSections)
      .set({
        status: 'active',
        startedAt: now,
        deadlineAt: nextDeadline,
      })
      .where(eq(testSections.id, nextSec.id));

    // Find first question of next section
    const allTqs = await db
      .select()
      .from(testQuestions)
      .where(eq(testQuestions.sessionId, sessionId));
    allTqs.sort((a, b) => a.questionOrder - b.questionOrder);
    const firstNextQIdx = allTqs.findIndex((t) => t.sectionIndex === nextIdx);

    await db
      .update(testSessions)
      .set({
        activeSectionIndex: nextIdx,
        currentQuestionIndex: firstNextQIdx >= 0 ? firstNextQIdx : 0,
      })
      .where(eq(testSessions.id, sessionId));

    if (firstNextQIdx >= 0) {
      await db
        .update(studentResponses)
        .set({ visited: true })
        .where(
          and(
            eq(studentResponses.sessionId, sessionId),
            eq(studentResponses.testQuestionId, allTqs[firstNextQIdx].id)
          )
        );
    }

    await db.insert(questionEvents).values({
      eventId: `evt-sec-lock-${sessionId}-${currentIdx}-${Date.now()}`,
      sessionId,
      userUid,
      questionId: null,
      eventType: 'section_locked',
      metadataJson: {
        lockedSectionIndex: currentIdx,
        openedSectionIndex: nextIdx,
        isAutoTimeout,
      },
    });

    return { transitionedToSection: nextIdx, submitted: false };
  } catch (error) {
    console.error('Database query failed in transitionToNextSection:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to transition examination section.',
      { cause: error }
    );
  }
}

export async function submitExamSession(
  sessionId: number,
  userUid: string,
  isAutoSubmit = false
) {
  try {
    const [session] = await db
      .select()
      .from(testSessions)
      .where(eq(testSessions.id, sessionId));
    if (!session) throw new Error('Session not found.');
    if (session.userUid !== userUid) {
      throw new Error('Unauthorized examination submission request.');
    }

    // Idempotent duplicate submission protection
    if (session.status === 'submitted' || session.status === 'auto_submitted') {
      const analytics = await computeAndPersistSessionResult(sessionId, userUid);
      return { submitted: true, status: session.status, analytics };
    }

    const now = new Date();
    const finalStatus = isAutoSubmit ? 'auto_submitted' : 'submitted';

    // Lock all sections
    await db
      .update(testSections)
      .set({ status: 'locked', lockedAt: now })
      .where(eq(testSections.sessionId, sessionId));

    // Discard uncommitted pendingOption in strictSaveMode
    await db
      .update(studentResponses)
      .set({ pendingOption: null })
      .where(eq(studentResponses.sessionId, sessionId));

    await db
      .update(testSessions)
      .set({
        status: finalStatus,
        submittedAt: now,
      })
      .where(eq(testSessions.id, sessionId));

    await db.insert(questionEvents).values({
      eventId: `evt-submit-${sessionId}-${Date.now()}`,
      sessionId,
      userUid,
      questionId: null,
      eventType: isAutoSubmit ? 'examination_auto_submitted' : 'examination_submitted',
      metadataJson: { submittedAt: now.toISOString() },
    });

    const analytics = await computeAndPersistSessionResult(sessionId, userUid);
    return { submitted: true, status: finalStatus, analytics };
  } catch (error) {
    console.error('Database query failed in submitExamSession:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to submit examination session.',
      { cause: error }
    );
  }
}

export async function getAggregatedUserAnalytics(userUid: string) {
  try {
    await ensureSeeded(userUid);

    // Auto-finalize any expired in_progress sessions before compiling dashboard metrics
    await reconcileUserActiveSessions(userUid, false);

    const results = await db
      .select()
      .from(testResults)
      .where(eq(testResults.userUid, userUid))
      .orderBy(desc(testResults.createdAt));

    const sessions = await db
      .select()
      .from(testSessions)
      .where(eq(testSessions.userUid, userUid))
      .orderBy(desc(testSessions.startedAt));

    const sessionMap = new Map(sessions.map((s) => [s.id, s]));

    const recommendations = await db
      .select()
      .from(studyRecommendations)
      .where(eq(studyRecommendations.userUid, userUid));
    recommendations.sort((a, b) => a.priority - b.priority);

    const revisionsQueue = await db
      .select()
      .from(revisionRecords)
      .where(eq(revisionRecords.userUid, userUid));

    const userBookmarks = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.userUid, userUid));

    let bookmarkedQuestionsDetails: any[] = [];
    if (userBookmarks.length > 0) {
      const bmQs = await db
        .select()
        .from(questions)
        .where(
          inArray(
            questions.id,
            userBookmarks.map((b) => b.questionId)
          )
        );
      const qMap = new Map(bmQs.map((q) => [q.id, q]));
      bookmarkedQuestionsDetails = userBookmarks.map((b) => {
        const q = qMap.get(b.questionId);
        return {
          bookmarkId: b.id,
          questionId: b.questionId,
          questionCode: b.questionCode,
          notes: b.notes,
          createdAt: b.createdAt.toISOString(),
          subjectName: q?.subjectName || 'Medical Subject',
          topicName: q?.topicName || 'Clinical Topic',
          questionText: q?.questionText || '',
          difficulty: q?.difficulty || 'medium',
        };
      });
    }

    const latestResult = results[0] || null;
    const totalTests = results.length;
    const totalSolved = results.reduce((acc, r) => acc + r.attemptedCount, 0);
    const totalCorrect = results.reduce((acc, r) => acc + r.correctCount, 0);
    const overallAccuracy =
      totalSolved > 0 ? Number(((totalCorrect / totalSolved) * 100).toFixed(1)) : 0;
    const avgPercentage =
      totalTests > 0
        ? Number(
            (results.reduce((acc, r) => acc + r.percentageScore, 0) / totalTests).toFixed(1)
          )
        : 0;
    const bestPercentage =
      totalTests > 0 ? Math.max(...results.map((r) => r.percentageScore)) : 0;
    const avgTimePerQuestion =
      totalTests > 0
        ? Number(
            (results.reduce((acc, r) => acc + r.avgTimeSeconds, 0) / totalTests).toFixed(1)
          )
        : 0;

    // Historical trend series (ordered oldest to newest)
    const trendSeries = [...results].reverse().map((r, idx) => {
      const sess = sessionMap.get(r.sessionId);
      const g = r.guessAnalyticsJson as any;
      return {
        sessionId: r.sessionId,
        testNumber: idx + 1,
        examName: sess?.examName || `Mock #${idx + 1}`,
        date: r.createdAt.toISOString().split('T')[0],
        score: r.score,
        maxMarks: r.maxMarks,
        percentageScore: r.percentageScore,
        accuracy: r.accuracy,
        attemptRate: r.attemptRate,
        avgTimeSeconds: r.avgTimeSeconds,
        negativeMarks: r.negativeMarks,
        mainGuessAccuracy: g?.mainGuessAccuracy ?? 0,
        sureAccuracy: g?.sureAccuracy ?? 0,
      };
    });

    // Aggregate cumulative subject-wise mastery across ALL completed sessions for all 19 NEET PG subjects
    const subjAggMap = new Map<
      string,
      {
        subjectSlug: string;
        subjectName: string;
        code: string;
        orderIndex: number;
        totalQuestions: number;
        attempted: number;
        correct: number;
        incorrect: number;
        unattempted: number;
        netScore: number;
        maxMarks: number;
        totalTimeWeighted: number;
        guessCountWeighted: number;
        sureAccWeighted: number;
        sureWeight: number;
        mainGuessAccWeighted: number;
        mainGuessWeight: number;
        sessionsTested: number;
      }
    >();

    for (const sMeta of NEET_PG_SUBJECTS) {
      subjAggMap.set(sMeta.slug, {
        subjectSlug: sMeta.slug,
        subjectName: sMeta.name,
        code: sMeta.code,
        orderIndex: sMeta.orderIndex,
        totalQuestions: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        unattempted: 0,
        netScore: 0,
        maxMarks: 0,
        totalTimeWeighted: 0,
        guessCountWeighted: 0,
        sureAccWeighted: 0,
        sureWeight: 0,
        mainGuessAccWeighted: 0,
        mainGuessWeight: 0,
        sessionsTested: 0,
      });
    }

    for (const r of results) {
      const breakdown = Array.isArray(r.subjectBreakdownJson)
        ? (r.subjectBreakdownJson as any[])
        : [];
      for (const item of breakdown) {
        const key = item.subjectSlug;
        const existing = subjAggMap.get(key) || {
          subjectSlug: key,
          subjectName: item.subjectName || key,
          code: String(item.subjectName || key).slice(0, 4).toUpperCase(),
          orderIndex: 99,
          totalQuestions: 0,
          attempted: 0,
          correct: 0,
          incorrect: 0,
          unattempted: 0,
          netScore: 0,
          maxMarks: 0,
          totalTimeWeighted: 0,
          guessCountWeighted: 0,
          sureAccWeighted: 0,
          sureWeight: 0,
          mainGuessAccWeighted: 0,
          mainGuessWeight: 0,
          sessionsTested: 0,
        };
        const qCount = Number(item.totalQuestions || 0);
        const att = Number(item.attempted || 0);
        const guessPct = Number(item.guessPercentage || 0);
        const estGuesses = (att * guessPct) / 100;
        const estSure = Math.max(0, att - estGuesses);

        existing.totalQuestions += qCount;
        existing.attempted += att;
        existing.correct += Number(item.correct || 0);
        existing.incorrect += Number(item.incorrect || 0);
        existing.unattempted += Number(item.unattempted || 0);
        existing.netScore += Number(item.netScore || 0);
        existing.maxMarks += Number(item.maxMarks || qCount * 4);
        existing.totalTimeWeighted += Number(item.avgTimeSeconds || 0) * Math.max(1, att);
        existing.guessCountWeighted += estGuesses;
        existing.sureAccWeighted += Number(item.sureAccuracy || 0) * estSure;
        existing.sureWeight += estSure;
        existing.mainGuessAccWeighted += Number(item.mainGuessAccuracy || 0) * estGuesses;
        existing.mainGuessWeight += estGuesses;
        existing.sessionsTested += 1;
        subjAggMap.set(key, existing);
      }
    }

    const subjectMasteryAll = Array.from(subjAggMap.values())
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((s) => {
        const accuracy =
          s.attempted > 0 ? Number(((s.correct / s.attempted) * 100).toFixed(1)) : 0;
        const attemptRate =
          s.totalQuestions > 0
            ? Number(((s.attempted / s.totalQuestions) * 100).toFixed(1))
            : 0;
        const avgTimeSeconds =
          s.attempted > 0 ? Number((s.totalTimeWeighted / s.attempted).toFixed(1)) : 0;
        const guessPercentage =
          s.attempted > 0
            ? Number(((s.guessCountWeighted / s.attempted) * 100).toFixed(1))
            : 0;
        const sureAccuracy =
          s.sureWeight > 0 ? Number((s.sureAccWeighted / s.sureWeight).toFixed(1)) : 0;
        const mainGuessAccuracy =
          s.mainGuessWeight > 0
            ? Number((s.mainGuessAccWeighted / s.mainGuessWeight).toFixed(1))
            : 0;
        const masteryTier =
          s.attempted === 0
            ? 'unattempted'
            : accuracy >= 75
            ? 'mastered'
            : accuracy >= 60
            ? 'proficient'
            : accuracy >= 45
            ? 'developing'
            : 'critical';

        return {
          subjectSlug: s.subjectSlug,
          subjectName: s.subjectName,
          code: s.code,
          totalQuestions: s.totalQuestions,
          attempted: s.attempted,
          correct: s.correct,
          incorrect: s.incorrect,
          unattempted: s.unattempted,
          accuracy,
          attemptRate,
          netScore: s.netScore,
          maxMarks: s.maxMarks,
          avgTimeSeconds,
          guessPercentage,
          sureAccuracy,
          mainGuessAccuracy,
          sessionsTested: s.sessionsTested,
          masteryTier,
        };
      });

    return {
      overview: {
        testsAttempted: totalTests,
        totalQuestionsSolved: totalSolved,
        overallAccuracy,
        averagePercentageScore: avgPercentage,
        bestPercentageScore: bestPercentage,
        averageTimePerQuestionSeconds: avgTimePerQuestion,
        activeSessionsCount: sessions.filter((s) => s.status === 'in_progress').length,
      },
      latestAnalysis: latestResult
        ? {
            sessionId: latestResult.sessionId,
            examName: sessionMap.get(latestResult.sessionId)?.examName || 'NEET PG Mock',
            markingScheme:
              (sessionMap.get(latestResult.sessionId)?.configSnapshotJson as any)
                ?.markingScheme || { correct: 4, incorrect: -1, unattempted: 0 },
            score: latestResult.score,
            maxMarks: latestResult.maxMarks,
            percentageScore: latestResult.percentageScore,
            accuracy: latestResult.accuracy,
            attemptRate: latestResult.attemptRate,
            negativeMarks: latestResult.negativeMarks,
            avgTimeSeconds: latestResult.avgTimeSeconds,
            subjectBreakdown: latestResult.subjectBreakdownJson,
            topicBreakdown: latestResult.topicBreakdownJson,
            guessIntelligence: latestResult.guessAnalyticsJson,
            answerChangeIntelligence: latestResult.answerChangeAnalyticsJson,
          }
        : null,
      subjectMasteryAll,
      trendSeries,
      recommendations,
      revisionQueue: revisionsQueue,
      bookmarks: bookmarkedQuestionsDetails,
      recentSessions: sessions.slice(0, 10).map((s) => {
        const res = results.find((r) => r.sessionId === s.id);
        return {
          sessionId: s.id,
          sessionCode: s.sessionCode,
          examName: s.examName,
          mode: s.mode,
          status: s.status,
          totalQuestions: s.totalQuestions,
          startedAt: s.startedAt.toISOString(),
          submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null,
          score: res?.score ?? null,
          maxMarks:
            res?.maxMarks ??
            Number(
              (
                s.totalQuestions *
                (((s.configSnapshotJson as any)?.markingScheme?.correct as number) || 4)
              ).toFixed(2)
            ),
          accuracy: res?.accuracy ?? null,
        };
      }),
    };
  } catch (error) {
    console.error('Database query failed in getAggregatedUserAnalytics:', error);
    throw new Error('Failed to load performance intelligence dashboard.', { cause: error });
  }
}

function deterministicShuffleBySeed<T>(items: T[], seedStr: string): T[] {
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    const j = Math.abs(hash) % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Cleans up expired in_progress sessions and prevents multiple concurrent in_progress sessions.
 * - If finalizeAllLive is true (called right before starting a new exam), all prior in_progress
 *   sessions for the user are cleanly auto-submitted so only the newly launched exam is active.
 * - If finalizeAllLive is false (called when viewing Mock Series or Dashboard), all expired
 *   sessions are auto-submitted AND if multiple unexpired sessions somehow exist, only the
 *   single most recently started unexpired session remains active.
 */
async function reconcileUserActiveSessions(userUid: string, finalizeAllLive: boolean) {
  const activeSessions = await db
    .select()
    .from(testSessions)
    .where(and(eq(testSessions.userUid, userUid), eq(testSessions.status, 'in_progress')))
    .orderBy(desc(testSessions.startedAt));

  if (activeSessions.length === 0) return;

  const now = new Date();
  let keptLiveSession = false;

  for (const sess of activeSessions) {
    const isExpired = now >= sess.overallDeadlineAt;
    if (finalizeAllLive || isExpired || keptLiveSession) {
      try {
        await submitExamSession(sess.id, userUid, true);
      } catch (err) {
        console.warn(`Could not auto-finalize session ${sess.id}:`, err);
      }
    } else {
      keptLiveSession = true;
    }
  }
}

export async function getMockPapersList(userUid: string): Promise<MockPaperSummary[]> {
  try {
    await ensureSeeded(userUid);

    // 0. Auto-finalize expired sessions and guarantee at most 1 live session
    await reconcileUserActiveSessions(userUid, false);

    // 1. Fetch user's sessions to compute personal attempt state for each mock
    const userSessions = await db
      .select()
      .from(testSessions)
      .where(eq(testSessions.userUid, userUid))
      .orderBy(desc(testSessions.startedAt));

    const sessionIds = userSessions.map((s) => s.id);
    const results =
      sessionIds.length > 0
        ? await db.select().from(testResults).where(inArray(testResults.sessionId, sessionIds))
        : [];

    const resultMap = new Map(results.map((r) => [r.sessionId, r]));

    // STRICT exact examId match (never fuzzy prefix match!) so one active session NEVER leaks onto other papers
    const getAttemptForExam = (configKey: string, defaultCorrectMarks: number) => {
      const exactMatches = userSessions.filter(
        (s) => (s.configSnapshotJson as any)?.examId === configKey
      );
      if (exactMatches.length === 0) return { status: 'not_attempted' as const };

      // Prefer a genuinely live unexpired session if one exists for THIS exact paper; otherwise latest completed attempt
      const liveMatch = exactMatches.find((s) => s.status === 'in_progress');
      if (liveMatch) {
        return {
          status: 'in_progress' as const,
          lastAttemptSessionId: liveMatch.id,
          attemptedAt: liveMatch.startedAt.toISOString(),
        };
      }

      const latestCompleted = exactMatches[0];
      const res = resultMap.get(latestCompleted.id);
      const schemeCorrect =
        ((latestCompleted.configSnapshotJson as any)?.markingScheme?.correct as number) ||
        defaultCorrectMarks;

      return {
        status: 'completed' as const,
        latestScore: res?.score ?? 0,
        maxMarks: res?.maxMarks ?? Number((latestCompleted.totalQuestions * schemeCorrect).toFixed(2)),
        accuracy: res?.accuracy ?? 0,
        lastAttemptSessionId: latestCompleted.id,
        attemptedAt: (latestCompleted.submittedAt || latestCompleted.startedAt).toISOString(),
      };
    };

    // 2. Built-in 20 Full Mock Papers (10 NEET-PG 2026 + 10 INI-CET)
    const builtins: MockPaperSummary[] = BUILTIN_MOCK_PAPERS_METADATA.map((b) => {
      const attempt = getAttemptForExam(b.configKey, b.markingScheme?.correct ?? 4);
      return {
        ...b,
        isUserImported: false,
        ...attempt,
      };
    });

    // 3. User imported / custom saved mock papers from examConfigs
    const allConfigs = await db.select().from(examConfigs);
    const standardKeys = new Set([
      'neet-pg-full-mock',
      'inicet-full-mock',
      'neet-pg-mini-sectional',
      'neet-pg-tutor-mode',
      'inicet-super-mock-3',
      ...BUILTIN_MOCK_PAPERS_METADATA.map((b) => b.configKey),
    ]);
    const importedConfigs = allConfigs.filter((c) => !standardKeys.has(c.configKey));

    const importedPapers: MockPaperSummary[] = importedConfigs.map((c) => {
      const cfg = c.configJson as any;
      const targetExam = cfg.targetExam || 'NEET-PG';
      const defaultScheme =
        targetExam === 'INI-CET'
          ? { correct: 1, incorrect: -1 / 3, unattempted: 0 }
          : { correct: 4, incorrect: -1, unattempted: 0 };
      const scheme = cfg.markingScheme || defaultScheme;
      const totalQ = cfg.pattern?.totalQuestions || (targetExam === 'INI-CET' ? 200 : 180);
      const sectionCount = cfg.pattern?.sections?.length || (targetExam === 'INI-CET' ? 4 : 5);
      const firstSec = cfg.pattern?.sections?.[0];
      const attempt = getAttemptForExam(c.configKey, scheme.correct);

      return {
        id: c.configKey,
        configKey: c.configKey,
        title: c.examName,
        date:
          cfg.conductedDate ||
          cfg.date ||
          new Date(c.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        targetExam,
        totalQuestions: totalQ,
        durationMinutes: Math.round((cfg.pattern?.durationSeconds || (targetExam === 'INI-CET' ? 10800 : 12600)) / 60),
        sectionCount,
        questionsPerSection: firstSec?.questionCount || Math.round(totalQ / Math.max(1, sectionCount)),
        sectionDurationMinutes: firstSec?.durationSeconds
          ? Math.round(firstSec.durationSeconds / 60)
          : Math.round(((cfg.pattern?.durationSeconds || 12600) / Math.max(1, sectionCount)) / 60),
        markingScheme: scheme,
        maxMarks: Number((totalQ * scheme.correct).toFixed(2)),
        tag: cfg.tag || 'User Imported Mock',
        description:
          cfg.description || 'Imported custom multi-sectional mock examination paper.',
        isUserImported: true,
        ...attempt,
      };
    });

    return [...builtins, ...importedPapers];
  } catch (error) {
    console.error('Failed to get mock papers list:', error);
    throw new Error('Failed to load mock test papers catalog.', { cause: error });
  }
}

export async function importCustomMockPaper(params: {
  userUid: string;
  packagePayload: ImportTestPackagePayload;
}): Promise<MockPaperSummary> {
  const { userUid, packagePayload } = params;
  await ensureSeeded(userUid);

  const resolvedExamName = packagePayload.examName || (packagePayload as any).title;
  if (!resolvedExamName || !packagePayload.examId) {
    throw new Error('Test package must include examName (or title) and examId.');
  }
  packagePayload.examName = resolvedExamName;

  // 1. If questions array is provided, import questions through bulk import
  const preferredQuestionCodes: string[] = [];
  if (Array.isArray(packagePayload.questions) && packagePayload.questions.length > 0) {
    const { bulkImportQuestionsAdmin } = await import('./adminRepository.ts');
    await bulkImportQuestionsAdmin(userUid, packagePayload.questions, false);
    for (const q of packagePayload.questions) {
      if (q.questionId) preferredQuestionCodes.push(q.questionId);
    }
  }

  const targetExam = packagePayload.targetExam || 'NEET-PG';
  const isInicet = targetExam === 'INI-CET';

  // 2. Build the ExamConfig consistently so section question counts always sum to totalQuestions
  const sectionsSum = packagePayload.sections?.reduce((a, s) => a + s.questionCount, 0) || 0;
  const totalQuestions =
    sectionsSum > 0
      ? sectionsSum
      : packagePayload.questions?.length || (isInicet ? 200 : 180);

  const defaultDurMin = isInicet ? 180 : 210;
  const durationSeconds = Math.max(60, (packagePayload.durationMinutes || defaultDurMin) * 60);

  const sectionsList =
    packagePayload.sectional && packagePayload.sections?.length
      ? (() => {
          const secCount = packagePayload.sections.length;
          const explicitSecDurs = packagePayload.sections.every(
            (s) => typeof s.durationMinutes === 'number' && s.durationMinutes > 0
          );
          const sumExplicitSec = explicitSecDurs
            ? packagePayload.sections.reduce((acc, s) => acc + Math.round((s.durationMinutes || 0) * 60), 0)
            : 0;
          const useExplicitDurs = explicitSecDurs && sumExplicitSec === durationSeconds;

          const baseDurSec = Math.floor(durationSeconds / secCount);
          const durRem = durationSeconds % secCount;
          return packagePayload.sections.map((s, idx) => ({
            sectionId: s.sectionId || `${isInicet ? 'part' : 'section'}-${idx + 1}`,
            name: s.name || `${isInicet ? 'Part' : 'Section'} ${String.fromCharCode(65 + idx)}`,
            questionCount: s.questionCount,
            durationSeconds: useExplicitDurs
              ? Math.round((s.durationMinutes || 0) * 60)
              : baseDurSec + (idx === secCount - 1 ? durRem : 0),
            allowReturnAfterLock: false,
          }));
        })()
      : [
          {
            sectionId: 'section-1',
            name: 'All Questions',
            questionCount: totalQuestions,
            durationSeconds,
            allowReturnAfterLock: !packagePayload.sectional,
          },
        ];

  const markingScheme = packagePayload.markingScheme
    ? {
        correct: Number(packagePayload.markingScheme.correct) || (isInicet ? 1 : 4),
        incorrect:
          typeof packagePayload.markingScheme.incorrect === 'number'
            ? packagePayload.markingScheme.incorrect
            : isInicet
            ? -1 / 3
            : -1,
        unattempted: Number(packagePayload.markingScheme.unattempted) || 0,
      }
    : isInicet
    ? { correct: 1, incorrect: -1 / 3, unattempted: 0 }
    : { correct: 4, incorrect: -1, unattempted: 0 };

  const conductedDate =
    packagePayload.date ||
    new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const configObj: ExamConfig & {
    conductedDate?: string;
    targetExam?: string;
    tag?: string;
    description?: string;
    preferredQuestionCodes?: string[];
  } = {
    configVersion: '2.0',
    examId: packagePayload.examId,
    examName: packagePayload.examName,
    mode: 'exam',
    pattern: {
      totalQuestions,
      questionType: 'single_best_answer',
      optionsPerQuestion: 4,
      durationSeconds,
      sectional: packagePayload.sectional ?? true,
      sections: sectionsList,
    },
    markingScheme,
    settings: {
      strictSaveMode: true,
      allowClearResponse: true,
      allowMarkForReview: true,
      allowGuessTagging: true,
      allowOptionElimination: true,
      showResultAfterSubmit: true,
      showExplanationDuringExam: false,
    },
    conductedDate,
    targetExam,
    tag: packagePayload.tag || 'Custom Test Package',
    description: packagePayload.description || 'Custom imported examination paper.',
    preferredQuestionCodes,
  };

  // 3. Upsert into examConfigs
  const existing = await db
    .select()
    .from(examConfigs)
    .where(eq(examConfigs.configKey, packagePayload.examId));

  if (existing.length > 0) {
    await db
      .update(examConfigs)
      .set({
        examName: packagePayload.examName,
        configVersion: '2.0',
        configJson: configObj,
      })
      .where(eq(examConfigs.configKey, packagePayload.examId));
  } else {
    await db.insert(examConfigs).values({
      configKey: packagePayload.examId,
      configVersion: '2.0',
      examName: packagePayload.examName,
      mode: 'exam',
      configJson: configObj,
    });
  }

  return {
    id: packagePayload.examId,
    configKey: packagePayload.examId,
    title: packagePayload.examName,
    date: conductedDate,
    targetExam: targetExam as any,
    totalQuestions,
    durationMinutes: Math.round(durationSeconds / 60),
    sectionCount: sectionsList.length,
    questionsPerSection: sectionsList[0]?.questionCount || totalQuestions,
    sectionDurationMinutes: Math.round((sectionsList[0]?.durationSeconds || durationSeconds) / 60),
    markingScheme,
    maxMarks: Number((totalQuestions * markingScheme.correct).toFixed(2)),
    tag: configObj.tag!,
    description: configObj.description!,
    isUserImported: true,
    status: 'not_attempted',
  };
}

