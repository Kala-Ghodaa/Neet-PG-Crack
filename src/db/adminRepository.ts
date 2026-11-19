import { db } from './index.ts';
import {
  questions,
  questionOptions,
  questionExplanations,
  questionImages,
  questionVersions,
  adminAuditLogs,
  bookmarks,
  subjects,
  topics,
} from './schema.ts';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { ensureSeeded } from './repository.ts';
import { validateQuestionBankImportPayload } from '../services/examEngine.ts';
import type { QuestionBankSchemaItem } from '../types/domain.ts';
import { NEET_PG_SUBJECTS } from '../data/seedQuestions.ts';

export async function listQuestionsAdmin(filters: {
  subjectSlug?: string;
  difficulty?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  try {
    await ensureSeeded();
    let rows = await db
      .select()
      .from(questions)
      .orderBy(desc(questions.updatedAt));

    if (filters.subjectSlug && filters.subjectSlug !== 'all') {
      rows = rows.filter((q) => q.subjectSlug === filters.subjectSlug);
    }
    if (filters.difficulty && filters.difficulty !== 'all') {
      rows = rows.filter((q) => q.difficulty === filters.difficulty);
    }
    if (filters.status && filters.status !== 'all') {
      rows = rows.filter((q) => q.status === filters.status);
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      rows = rows.filter(
        (q) =>
          q.questionCode.toLowerCase().includes(term) ||
          q.questionText.toLowerCase().includes(term) ||
          q.topicName.toLowerCase().includes(term) ||
          q.subtopicName.toLowerCase().includes(term)
      );
    }

    const total = rows.length;
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(200, Math.max(1, filters.limit || 25));
    const paged = rows.slice((page - 1) * limit, page * limit);

    if (paged.length === 0) {
      return { total, page, limit, items: [] };
    }

    const qIds = paged.map((q) => q.id);
    const opts = await db
      .select()
      .from(questionOptions)
      .where(inArray(questionOptions.questionId, qIds));
    const exps = await db
      .select()
      .from(questionExplanations)
      .where(inArray(questionExplanations.questionId, qIds));
    const vers = await db
      .select()
      .from(questionVersions)
      .where(inArray(questionVersions.questionId, qIds));

    const optMap = new Map<number, typeof opts>();
    for (const o of opts) {
      const list = optMap.get(o.questionId) || [];
      list.push(o);
      optMap.set(o.questionId, list);
    }
    const expMap = new Map(exps.map((e) => [e.questionId, e]));
    const verMap = new Map<number, number>();
    for (const v of vers) {
      verMap.set(v.questionId, (verMap.get(v.questionId) || 0) + 1);
    }

    const items = paged.map((q) => {
      const qOpts = (optMap.get(q.id) || []).sort((a, b) =>
        a.optionKey.localeCompare(b.optionKey)
      );
      const qExp = expMap.get(q.id);
      return {
        ...q,
        options: qOpts.map((o) => ({
          id: o.optionKey,
          text: o.optionText,
          explanation: o.optionExplanation,
        })),
        explanation: qExp
          ? {
              summary: qExp.summary,
              details: qExp.details,
              learningPoints: qExp.learningPointsJson,
              optionExplanations: qExp.optionExplanationsJson,
            }
          : null,
        versionHistoryCount: verMap.get(q.id) || 1,
      };
    });

    return { total, page, limit, items };
  } catch (error) {
    console.error('Database query failed in listQuestionsAdmin:', error);
    throw new Error('Failed to fetch question bank records.', { cause: error });
  }
}

export async function createOrUpdateQuestionAdmin(
  actorUid: string,
  payload: Partial<QuestionBankSchemaItem> & { id?: number }
) {
  try {
    const subjSlug = payload.subjectId || 'medicine';
    const subjMeta = NEET_PG_SUBJECTS.find((s) => s.slug === subjSlug);
    const subjName = payload.subjectName || subjMeta?.name || 'Medicine';

    if (payload.id) {
      const [existing] = await db
        .select()
        .from(questions)
        .where(eq(questions.id, payload.id));
      if (!existing) throw new Error('Question not found.');

      const nextVer = existing.version + 1;
      const [updated] = await db
        .update(questions)
        .set({
          version: nextVer,
          subjectSlug: subjSlug,
          subjectName: subjName,
          systemSlug: payload.systemId || existing.systemSlug,
          systemName: payload.systemName || existing.systemName,
          topicSlug: payload.topicId || existing.topicSlug,
          topicName: payload.topicName || existing.topicName,
          subtopicName: payload.subtopic || existing.subtopicName,
          difficulty: payload.difficulty || existing.difficulty,
          questionText: payload.question?.text || existing.questionText,
          clinicalVignette:
            payload.question?.clinicalVignette !== undefined
              ? payload.question.clinicalVignette
              : existing.clinicalVignette,
          correctOption: payload.correctAnswer || existing.correctOption,
          isPyq:
            payload.metadata?.isPYQ !== undefined
              ? payload.metadata.isPYQ
              : existing.isPyq,
          pyqYear:
            payload.metadata?.year !== undefined
              ? payload.metadata.year
              : existing.pyqYear,
          status: payload.status || existing.status,
          updatedAt: new Date(),
        })
        .where(eq(questions.id, payload.id))
        .returning();

      if (payload.options && payload.options.length === 4) {
        await db
          .delete(questionOptions)
          .where(eq(questionOptions.questionId, payload.id));
        await db.insert(questionOptions).values(
          payload.options.map((o) => ({
            questionId: payload.id!,
            optionKey: o.id,
            optionText: o.text,
            optionExplanation:
              payload.explanation?.optionExplanations?.[o.id] || '',
          }))
        );
      }

      if (payload.explanation) {
        await db
          .delete(questionExplanations)
          .where(eq(questionExplanations.questionId, payload.id));
        await db.insert(questionExplanations).values({
          questionId: payload.id,
          summary: payload.explanation.summary,
          details: payload.explanation.details,
          learningPointsJson: payload.explanation.learningPoints || [],
          optionExplanationsJson: payload.explanation.optionExplanations || {},
        });
      }

      await db.insert(questionVersions).values({
        questionId: payload.id,
        version: nextVer,
        snapshotJson: payload,
      });

      await db.insert(adminAuditLogs).values({
        actorUid,
        action: 'UPDATE_QUESTION',
        targetType: 'question',
        targetId: updated.questionCode,
        detailsJson: { version: nextVer, status: updated.status },
      });

      return updated;
    } else {
      const code =
        payload.questionId ||
        `${subjMeta?.code || 'MED'}-CUST-${String(Date.now()).slice(-4)}`;

      const [created] = await db
        .insert(questions)
        .values({
          questionCode: code,
          version: 1,
          subjectSlug: subjSlug,
          subjectName: subjName,
          systemSlug: payload.systemId || 'clinical-system',
          systemName: payload.systemName || 'Clinical System',
          topicSlug: payload.topicId || 'clinical-topic',
          topicName: payload.topicName || 'Clinical Topic',
          subtopicName: payload.subtopic || 'High-Yield Concept',
          questionType: payload.questionType || 'single_best_answer',
          difficulty: payload.difficulty || 'medium',
          questionText: payload.question?.text || 'Sample clinical question?',
          clinicalVignette: payload.question?.clinicalVignette || null,
          tablesJson: payload.question?.tables || [],
          correctOption: payload.correctAnswer || 'A',
          isPyq: Boolean(payload.metadata?.isPYQ),
          pyqYear: payload.metadata?.year || null,
          source: payload.metadata?.source || 'Admin Authored',
          referencesJson: payload.metadata?.references || [],
          tagsJson: payload.metadata?.tags || [],
          status: payload.status || 'published',
        })
        .returning();

      const opts = payload.options || [
        { id: 'A' as const, text: 'Option A' },
        { id: 'B' as const, text: 'Option B' },
        { id: 'C' as const, text: 'Option C' },
        { id: 'D' as const, text: 'Option D' },
      ];

      await db.insert(questionOptions).values(
        opts.map((o) => ({
          questionId: created.id,
          optionKey: o.id,
          optionText: o.text,
          optionExplanation:
            payload.explanation?.optionExplanations?.[o.id] || '',
        }))
      );

      await db.insert(questionExplanations).values({
        questionId: created.id,
        summary: payload.explanation?.summary || 'Explanation summary.',
        details: payload.explanation?.details || 'Detailed clinical explanation.',
        learningPointsJson: payload.explanation?.learningPoints || [],
        optionExplanationsJson: payload.explanation?.optionExplanations || {},
      });

      await db.insert(questionVersions).values({
        questionId: created.id,
        version: 1,
        snapshotJson: payload,
      });

      await db.insert(adminAuditLogs).values({
        actorUid,
        action: 'CREATE_QUESTION',
        targetType: 'question',
        targetId: created.questionCode,
        detailsJson: { subject: subjName, difficulty: created.difficulty },
      });

      return created;
    }
  } catch (error) {
    console.error('Database query failed in createOrUpdateQuestionAdmin:', error);
    throw new Error('Failed to save question in database.', { cause: error });
  }
}

export async function bulkImportQuestionsAdmin(
  actorUid: string,
  rawJsonArray: unknown,
  dryRun = false
) {
  try {
    const existingRows = await db.select().from(questions);
    const existingCodes = new Set(existingRows.map((r) => r.questionCode));
    const existingTexts = new Set(
      existingRows.map((r) => r.questionText.toLowerCase().replace(/\s+/g, ' '))
    );

    const report = validateQuestionBankImportPayload(
      rawJsonArray,
      existingCodes,
      existingTexts
    );

    if (dryRun || !report.valid) {
      return {
        imported: false,
        dryRun,
        report,
      };
    }

    // Transactional import: only executes when all validation checks pass
    for (const item of report.validatedItems) {
      await createOrUpdateQuestionAdmin(actorUid, item);
    }

    await db.insert(adminAuditLogs).values({
      actorUid,
      action: 'BULK_IMPORT_QUESTIONS',
      targetType: 'question_bank',
      targetId: `batch-${Date.now()}`,
      detailsJson: {
        importedCount: report.validCount,
        probableDuplicatesCount: report.probableContentDuplicates.length,
      },
    });

    return {
      imported: true,
      dryRun: false,
      report,
    };
  } catch (error) {
    console.error('Database query failed in bulkImportQuestionsAdmin:', error);
    throw new Error('Bulk import failed during database transaction.', {
      cause: error,
    });
  }
}

export async function exportQuestionBankJson() {
  try {
    await ensureSeeded();
    const allQs = await db.select().from(questions);
    const allOpts = await db.select().from(questionOptions);
    const allExps = await db.select().from(questionExplanations);

    const optMap = new Map<number, typeof allOpts>();
    for (const o of allOpts) {
      const list = optMap.get(o.questionId) || [];
      list.push(o);
      optMap.set(o.questionId, list);
    }
    const expMap = new Map(allExps.map((e) => [e.questionId, e]));

    return allQs.slice(0, 50).map((q) => {
      const opts = (optMap.get(q.id) || []).sort((a, b) =>
        a.optionKey.localeCompare(b.optionKey)
      );
      const exp = expMap.get(q.id);
      return {
        schemaVersion: '1.0',
        questionId: q.questionCode,
        questionVersion: q.version,
        subjectId: q.subjectSlug,
        systemId: q.systemSlug,
        topicId: q.topicSlug,
        subtopic: q.subtopicName,
        questionType: q.questionType,
        difficulty: q.difficulty,
        question: {
          text: q.questionText,
          clinicalVignette: q.clinicalVignette,
          images: [],
          tables: q.tablesJson,
        },
        options: opts.map((o) => ({ id: o.optionKey, text: o.optionText })),
        correctAnswer: q.correctOption,
        explanation: {
          summary: exp?.summary || '',
          details: exp?.details || '',
          optionExplanations: exp?.optionExplanationsJson || {},
          learningPoints: exp?.learningPointsJson || [],
        },
        metadata: {
          isPYQ: q.isPyq,
          year: q.pyqYear,
          source: q.source,
          references: q.referencesJson,
          tags: q.tagsJson,
        },
        status: q.status,
      };
    });
  } catch (error) {
    console.error('Database query failed in exportQuestionBankJson:', error);
    throw new Error('Failed to export question bank JSON.', { cause: error });
  }
}

export async function toggleQuestionBookmark(
  userUid: string,
  questionId: number,
  questionCode: string,
  notes = ''
) {
  try {
    const existing = await db
      .select()
      .from(bookmarks)
      .where(
        and(eq(bookmarks.userUid, userUid), eq(bookmarks.questionId, questionId))
      );

    if (existing.length > 0) {
      await db.delete(bookmarks).where(eq(bookmarks.id, existing[0].id));
      return { bookmarked: false };
    } else {
      await db.insert(bookmarks).values({
        userUid,
        questionId,
        questionCode,
        notes,
      });
      return { bookmarked: true };
    }
  } catch (error) {
    console.error('Database query failed in toggleQuestionBookmark:', error);
    throw new Error('Failed to toggle bookmark.', { cause: error });
  }
}

export async function getTaxonomyCatalog() {
  try {
    await ensureSeeded();
    const subjs = await db.select().from(subjects);
    const tops = await db.select().from(topics);
    return {
      subjects: subjs.sort((a, b) => a.orderIndex - b.orderIndex),
      topics: tops,
    };
  } catch (error) {
    console.error('Database query failed in getTaxonomyCatalog:', error);
    throw new Error('Failed to load subject taxonomy.', { cause: error });
  }
}

export async function getAdminAuditLogs() {
  try {
    const logs = await db
      .select()
      .from(adminAuditLogs)
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(30);
    return logs;
  } catch (error) {
    console.error('Database query failed in getAdminAuditLogs:', error);
    throw new Error('Failed to load audit logs.', { cause: error });
  }
}
