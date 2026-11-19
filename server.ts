import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import { getUserByUid, updateUserRole } from './src/db/users.ts';
import {
  ensureSeeded,
  startNewExamSession,
  getExamSessionState,
  recordQuestionMutation,
  transitionToNextSection,
  submitExamSession,
  getAggregatedUserAnalytics,
  computeAndPersistSessionResult,
  getMockPapersList,
  importCustomMockPaper,
} from './src/db/repository.ts';
import {
  listQuestionsAdmin,
  createOrUpdateQuestionAdmin,
  bulkImportQuestionsAdmin,
  exportQuestionBankJson,
  toggleQuestionBookmark,
  getTaxonomyCatalog,
  getAdminAuditLogs,
} from './src/db/adminRepository.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.NODE_ENV === 'production' ? Number(process.env.PORT || 3000) : 3000;

  app.use(express.json({ limit: '15mb' }));

  // --- AUTHENTICATION APIs ---
  app.get('/api/v1/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      await ensureSeeded(uid);
      const profile = await getUserByUid(uid);
      res.json({ user: profile });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch user profile' });
    }
  });

  app.post('/api/v1/auth/role', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const role = req.body.role === 'admin' ? 'admin' : 'student';
      const updated = await updateUserRole(uid, role);
      res.json({ user: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update user role' });
    }
  });

  // --- QUESTION BANK & TAXONOMY APIs ---
  app.get('/api/v1/subjects', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const catalog = await getTaxonomyCatalog();
      res.json({ subjects: catalog.subjects, topics: catalog.topics });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch subjects' });
    }
  });

  app.get('/api/v1/topics', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const catalog = await getTaxonomyCatalog();
      res.json({ topics: catalog.topics });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch topics' });
    }
  });

  app.get('/api/v1/questions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = await listQuestionsAdmin({
        subjectSlug: req.query.subject as string,
        difficulty: req.query.difficulty as string,
        status: 'published',
        search: req.query.search as string,
        page: Number(req.query.page || 1),
        limit: Number(req.query.limit || 25),
      });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch questions' });
    }
  });

  // --- MOCK PAPERS & TEST PACKAGE IMPORT APIs ---
  app.get('/api/v1/mock-papers', requireAuth, async (req: AuthRequest, res) => {
    try {
      const papers = await getMockPapersList(req.user!.uid);
      res.json({ papers });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch mock papers' });
    }
  });

  app.post('/api/v1/mock-papers/import', requireAuth, async (req: AuthRequest, res) => {
    try {
      const packagePayload = req.body.packagePayload || req.body;
      const paper = await importCustomMockPaper({
        userUid: req.user!.uid,
        packagePayload,
      });
      res.json({ paper, success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to import mock test package' });
    }
  });

  // --- EXAMINATION ENGINE APIs ---
  app.post('/api/v1/exams/start', requireAuth, async (req: AuthRequest, res) => {
    try {
      const session = await startNewExamSession({
        userUid: req.user!.uid,
        configKey: req.body.configKey,
        customConfig: req.body.customConfig,
        filters: req.body.filters,
      });
      res.json({ session });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to start examination' });
    }
  });

  app.get('/api/v1/exams/:sessionId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const sessionId = Number(req.params.sessionId);
      const state = await getExamSessionState(sessionId, req.user!.uid);
      res.json(state);
    } catch (error: any) {
      res.status(404).json({ error: error.message || 'Failed to load examination state' });
    }
  });

  app.get('/api/v1/exams/:sessionId/questions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const sessionId = Number(req.params.sessionId);
      const state = await getExamSessionState(sessionId, req.user!.uid);
      res.json({ questions: state.questions, sections: state.sections });
    } catch (error: any) {
      res.status(404).json({ error: error.message || 'Failed to load exam questions' });
    }
  });

  app.post('/api/v1/exams/:sessionId/responses', requireAuth, async (req: AuthRequest, res) => {
    try {
      const sessionId = Number(req.params.sessionId);
      const updated = await recordQuestionMutation({
        sessionId,
        userUid: req.user!.uid,
        testQuestionId: Number(req.body.testQuestionId),
        action: req.body.action || 'save_and_next',
        selectedPendingOption: req.body.selectedPendingOption ?? null,
        guessModeActive: Boolean(req.body.guessModeActive),
        secondGuessOption: req.body.secondGuessOption ?? null,
        eliminatedOptions: Array.isArray(req.body.eliminatedOptions)
          ? req.body.eliminatedOptions
          : [],
        clearOptions: req.body.clearOptions,
        additionalTimeSeconds: Number(req.body.additionalTimeSeconds || 0),
        nextQuestionIndex:
          typeof req.body.nextQuestionIndex === 'number'
            ? req.body.nextQuestionIndex
            : undefined,
        eventId: req.body.eventId,
      });
      res.json({ response: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to persist response' });
    }
  });

  app.post('/api/v1/exams/:sessionId/review', requireAuth, async (req: AuthRequest, res) => {
    try {
      const sessionId = Number(req.params.sessionId);
      const updated = await recordQuestionMutation({
        sessionId,
        userUid: req.user!.uid,
        testQuestionId: Number(req.body.testQuestionId),
        action: req.body.navigateNext ? 'mark_review_and_next' : 'save_and_mark_review',
        selectedPendingOption: req.body.selectedPendingOption ?? null,
        guessModeActive: Boolean(req.body.guessModeActive),
        secondGuessOption: req.body.secondGuessOption ?? null,
        eliminatedOptions: Array.isArray(req.body.eliminatedOptions)
          ? req.body.eliminatedOptions
          : [],
        additionalTimeSeconds: Number(req.body.additionalTimeSeconds || 0),
        nextQuestionIndex: req.body.nextQuestionIndex,
      });
      res.json({ response: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update review flag' });
    }
  });

  app.post('/api/v1/exams/:sessionId/guess', requireAuth, async (req: AuthRequest, res) => {
    try {
      const sessionId = Number(req.params.sessionId);
      const updated = await recordQuestionMutation({
        sessionId,
        userUid: req.user!.uid,
        testQuestionId: Number(req.body.testQuestionId),
        action: 'update_guess_or_elimination',
        selectedPendingOption: req.body.selectedPendingOption ?? null,
        guessModeActive: Boolean(req.body.guessModeActive),
        secondGuessOption: req.body.secondGuessOption ?? null,
        eliminatedOptions: Array.isArray(req.body.eliminatedOptions)
          ? req.body.eliminatedOptions
          : [],
        additionalTimeSeconds: Number(req.body.additionalTimeSeconds || 0),
      });
      res.json({ response: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update guess classification' });
    }
  });

  app.post(
    '/api/v1/exams/:sessionId/eliminations',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const sessionId = Number(req.params.sessionId);
        const updated = await recordQuestionMutation({
          sessionId,
          userUid: req.user!.uid,
          testQuestionId: Number(req.body.testQuestionId),
          action: 'update_guess_or_elimination',
          selectedPendingOption: req.body.selectedPendingOption ?? null,
          guessModeActive: Boolean(req.body.guessModeActive),
          secondGuessOption: req.body.secondGuessOption ?? null,
          eliminatedOptions: Array.isArray(req.body.eliminatedOptions)
            ? req.body.eliminatedOptions
            : [],
          additionalTimeSeconds: Number(req.body.additionalTimeSeconds || 0),
        });
        res.json({ response: updated });
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to update option eliminations' });
      }
    }
  );

  app.post(
    '/api/v1/exams/:sessionId/sections/transition',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const sessionId = Number(req.params.sessionId);
        const result = await transitionToNextSection(
          sessionId,
          req.user!.uid,
          Boolean(req.body.isAutoTimeout)
        );
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to transition section' });
      }
    }
  );

  app.post('/api/v1/exams/:sessionId/submit', requireAuth, async (req: AuthRequest, res) => {
    try {
      const sessionId = Number(req.params.sessionId);
      const result = await submitExamSession(
        sessionId,
        req.user!.uid,
        Boolean(req.body.isAutoSubmit)
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to submit examination' });
    }
  });

  // --- RESULTS & POST-EXAM REVIEW APIs ---
  app.get('/api/v1/results/:sessionId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const sessionId = Number(req.params.sessionId);
      const state = await getExamSessionState(sessionId, req.user!.uid);
      const analytics = await computeAndPersistSessionResult(sessionId, req.user!.uid);
      res.json({ state, analytics });
    } catch (error: any) {
      res.status(404).json({ error: error.message || 'Failed to fetch session results' });
    }
  });

  app.get('/api/v1/results/:sessionId/analysis', requireAuth, async (req: AuthRequest, res) => {
    try {
      const sessionId = Number(req.params.sessionId);
      const analytics = await computeAndPersistSessionResult(sessionId, req.user!.uid);
      res.json({ analytics });
    } catch (error: any) {
      res.status(404).json({ error: error.message || 'Failed to compute session analysis' });
    }
  });

  // --- ANALYTICS & INTELLIGENCE APIs ---
  app.get('/api/v1/analytics/overview', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = await getAggregatedUserAnalytics(req.user!.uid);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load analytics overview' });
    }
  });

  app.get('/api/v1/analytics/subjects', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = await getAggregatedUserAnalytics(req.user!.uid);
      res.json({ subjects: data.latestAnalysis?.subjectBreakdown || [] });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load subject analytics' });
    }
  });

  app.get('/api/v1/analytics/topics', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = await getAggregatedUserAnalytics(req.user!.uid);
      res.json({ topics: data.latestAnalysis?.topicBreakdown || [] });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load topic analytics' });
    }
  });

  app.get('/api/v1/analytics/guess-performance', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = await getAggregatedUserAnalytics(req.user!.uid);
      res.json({ guessIntelligence: data.latestAnalysis?.guessIntelligence || null });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load guess analytics' });
    }
  });

  app.get('/api/v1/analytics/speed-accuracy', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = await getAggregatedUserAnalytics(req.user!.uid);
      res.json({ topics: data.latestAnalysis?.topicBreakdown || [] });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load speed-accuracy matrix' });
    }
  });

  app.get('/api/v1/analytics/trends', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = await getAggregatedUserAnalytics(req.user!.uid);
      res.json({ trends: data.trendSeries });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load trend series' });
    }
  });

  app.get('/api/v1/analytics/knowledge-gaps', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = await getAggregatedUserAnalytics(req.user!.uid);
      res.json({
        knowledgeGaps: data.latestAnalysis?.topicBreakdown || [],
        recommendations: data.recommendations,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load knowledge gaps' });
    }
  });

  // --- BOOKMARKS APIs ---
  app.post('/api/v1/bookmarks/toggle', requireAuth, async (req: AuthRequest, res) => {
    try {
      const result = await toggleQuestionBookmark(
        req.user!.uid,
        Number(req.body.questionId),
        String(req.body.questionCode || 'Q-BOOKMARK'),
        String(req.body.notes || '')
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to toggle bookmark' });
    }
  });

  // --- ADMINISTRATION & QUESTION BANK MANAGEMENT APIs ---
  app.get('/api/v1/admin/questions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = await listQuestionsAdmin({
        subjectSlug: req.query.subject as string,
        difficulty: req.query.difficulty as string,
        status: req.query.status as string,
        search: req.query.search as string,
        page: Number(req.query.page || 1),
        limit: Number(req.query.limit || 25),
      });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch admin question bank' });
    }
  });

  app.post('/api/v1/admin/questions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const created = await createOrUpdateQuestionAdmin(req.user!.uid, req.body);
      res.json({ question: created });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create question' });
    }
  });

  app.patch('/api/v1/admin/questions/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const updated = await createOrUpdateQuestionAdmin(req.user!.uid, {
        ...req.body,
        id: Number(req.params.id),
      });
      res.json({ question: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update question' });
    }
  });

  app.post('/api/v1/admin/questions/import', requireAuth, async (req: AuthRequest, res) => {
    try {
      const result = await bulkImportQuestionsAdmin(
        req.user!.uid,
        req.body.questions,
        Boolean(req.body.dryRun)
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Bulk import failed' });
    }
  });

  app.get('/api/v1/admin/questions/export', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const exported = await exportQuestionBankJson();
      res.json({
        schemaVersion: '1.0',
        exportedAt: new Date().toISOString(),
        count: exported.length,
        questions: exported,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to export question bank' });
    }
  });

  app.get('/api/v1/admin/audit-logs', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const logs = await getAdminAuditLogs();
      res.json({ logs });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch audit logs' });
    }
  });

  // Vite middleware for development vs static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PG-PREP ARENA server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
