import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
} from 'drizzle-orm/pg-core';

// 1. users
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').default('Medical Candidate').notNull(),
  role: text('role').default('student').notNull(), // 'student' | 'admin'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. roles
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description').notNull(),
});

// 3. permissions
export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  roleName: text('role_name').notNull(),
  permission: text('permission').notNull(),
});

// 4. subjects
export const subjects = pgTable('subjects', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  orderIndex: integer('order_index').default(0).notNull(),
});

// 5. systems
export const systems = pgTable('systems', {
  id: serial('id').primaryKey(),
  subjectSlug: text('subject_slug').notNull(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
});

// 6. topics
export const topics = pgTable('topics', {
  id: serial('id').primaryKey(),
  subjectSlug: text('subject_slug').notNull(),
  systemSlug: text('system_slug').notNull(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
});

// 7. subtopics
export const subtopics = pgTable('subtopics', {
  id: serial('id').primaryKey(),
  topicSlug: text('topic_slug').notNull(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
});

// 8. questions
export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  questionCode: text('question_code').notNull().unique(),
  version: integer('version').default(1).notNull(),
  subjectSlug: text('subject_slug').notNull(),
  subjectName: text('subject_name').notNull(),
  systemSlug: text('system_slug').notNull(),
  systemName: text('system_name').notNull(),
  topicSlug: text('topic_slug').notNull(),
  topicName: text('topic_name').notNull(),
  subtopicName: text('subtopic_name').notNull(),
  questionType: text('question_type').default('single_best_answer').notNull(),
  difficulty: text('difficulty').default('medium').notNull(), // 'easy' | 'medium' | 'hard'
  questionText: text('question_text').notNull(),
  clinicalVignette: text('clinical_vignette'),
  tablesJson: jsonb('tables_json').default([]).notNull(),
  correctOption: text('correct_option').notNull(),
  isPyq: boolean('is_pyq').default(false).notNull(),
  pyqYear: integer('pyq_year'),
  source: text('source').default('Original question').notNull(),
  referencesJson: jsonb('references_json').default([]).notNull(),
  tagsJson: jsonb('tags_json').default([]).notNull(),
  status: text('status').default('published').notNull(), // 'published' | 'draft' | 'archived'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 9. question_options
export const questionOptions = pgTable('question_options', {
  id: serial('id').primaryKey(),
  questionId: integer('question_id')
    .references(() => questions.id, { onDelete: 'cascade' })
    .notNull(),
  optionKey: text('option_key').notNull(), // 'A' | 'B' | 'C' | 'D'
  optionText: text('option_text').notNull(),
  optionExplanation: text('option_explanation').default('').notNull(),
});

// 10. question_explanations
export const questionExplanations = pgTable('question_explanations', {
  id: serial('id').primaryKey(),
  questionId: integer('question_id')
    .references(() => questions.id, { onDelete: 'cascade' })
    .notNull(),
  summary: text('summary').notNull(),
  details: text('details').notNull(),
  learningPointsJson: jsonb('learning_points_json').default([]).notNull(),
  optionExplanationsJson: jsonb('option_explanations_json').default({}).notNull(),
});

// 11. question_images
export const questionImages = pgTable('question_images', {
  id: serial('id').primaryKey(),
  questionId: integer('question_id')
    .references(() => questions.id, { onDelete: 'cascade' })
    .notNull(),
  imageUrl: text('image_url').notNull(),
  caption: text('caption').default('').notNull(),
  altText: text('alt_text').default('').notNull(),
});

// 12. question_versions
export const questionVersions = pgTable('question_versions', {
  id: serial('id').primaryKey(),
  questionId: integer('question_id')
    .references(() => questions.id, { onDelete: 'cascade' })
    .notNull(),
  version: integer('version').notNull(),
  snapshotJson: jsonb('snapshot_json').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. exam_configs
export const examConfigs = pgTable('exam_configs', {
  id: serial('id').primaryKey(),
  configKey: text('config_key').notNull().unique(),
  configVersion: text('config_version').default('1.0').notNull(),
  examName: text('exam_name').notNull(),
  mode: text('mode').default('exam').notNull(),
  configJson: jsonb('config_json').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 14. test_templates
export const testTemplates = pgTable('test_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  examConfigKey: text('exam_config_key').notNull(),
  filterCriteriaJson: jsonb('filter_criteria_json').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 15. test_sessions
export const testSessions = pgTable('test_sessions', {
  id: serial('id').primaryKey(),
  sessionCode: text('session_code').notNull().unique(),
  userUid: text('user_uid').notNull(),
  examName: text('exam_name').notNull(),
  mode: text('mode').default('exam').notNull(), // 'exam' | 'practice' | 'custom'
  status: text('status').default('in_progress').notNull(), // 'in_progress' | 'submitted' | 'auto_submitted'
  configSnapshotJson: jsonb('config_snapshot_json').notNull(),
  activeSectionIndex: integer('active_section_index').default(0).notNull(),
  currentQuestionIndex: integer('current_question_index').default(0).notNull(),
  totalQuestions: integer('total_questions').notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  overallDeadlineAt: timestamp('overall_deadline_at').notNull(),
  submittedAt: timestamp('submitted_at'),
});

// 16. test_sections
export const testSections = pgTable('test_sections', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .references(() => testSessions.id, { onDelete: 'cascade' })
    .notNull(),
  sectionIndex: integer('section_index').notNull(),
  sectionId: text('section_id').notNull(),
  name: text('name').notNull(),
  questionCount: integer('question_count').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  allowReturnAfterLock: boolean('allow_return_after_lock').default(false).notNull(),
  status: text('status').default('pending').notNull(), // 'pending' | 'active' | 'locked'
  startedAt: timestamp('started_at'),
  deadlineAt: timestamp('deadline_at'),
  lockedAt: timestamp('locked_at'),
});

// 17. test_questions
export const testQuestions = pgTable('test_questions', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .references(() => testSessions.id, { onDelete: 'cascade' })
    .notNull(),
  sectionIndex: integer('section_index').default(0).notNull(),
  questionOrder: integer('question_order').notNull(),
  questionId: integer('question_id').notNull(),
  questionCode: text('question_code').notNull(),
  questionVersion: integer('question_version').default(1).notNull(),
  subjectSlug: text('subject_slug').notNull(),
  subjectName: text('subject_name').notNull(),
  systemName: text('system_name').notNull(),
  topicName: text('topic_name').notNull(),
  subtopicName: text('subtopic_name').notNull(),
  difficulty: text('difficulty').notNull(),
  questionSnapshotJson: jsonb('question_snapshot_json').notNull(),
  correctOptionSnapshot: text('correct_option_snapshot').notNull(),
});

// 18. student_responses
export const studentResponses = pgTable('student_responses', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .references(() => testSessions.id, { onDelete: 'cascade' })
    .notNull(),
  testQuestionId: integer('test_question_id')
    .references(() => testQuestions.id, { onDelete: 'cascade' })
    .notNull(),
  questionId: integer('question_id').notNull(),
  visited: boolean('visited').default(false).notNull(),
  savedOption: text('saved_option'),
  pendingOption: text('pending_option'),
  isMarkedForReview: boolean('is_marked_for_review').default(false).notNull(),
  confidence: text('confidence').default('sure').notNull(), // 'sure' | 'main_guess' | 'guess_intent_unattempted'
  secondGuessOption: text('second_guess_option'),
  eliminatedOptionsJson: jsonb('eliminated_options_json').default([]).notNull(),
  timeSpentSeconds: integer('time_spent_seconds').default(0).notNull(),
  visitCount: integer('visit_count').default(0).notNull(),
  firstAnsweredAt: timestamp('first_answered_at'),
  lastSavedAt: timestamp('last_saved_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 19. answer_revisions
export const answerRevisions = pgTable('answer_revisions', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .references(() => testSessions.id, { onDelete: 'cascade' })
    .notNull(),
  testQuestionId: integer('test_question_id').notNull(),
  questionId: integer('question_id').notNull(),
  revisionNumber: integer('revision_number').notNull(),
  previousOption: text('previous_option'),
  newOption: text('new_option').notNull(),
  previousConfidence: text('previous_confidence').default('sure').notNull(),
  newConfidence: text('new_confidence').default('sure').notNull(),
  wasReviewedBeforeChange: boolean('was_reviewed_before_change').default(false).notNull(),
  timeSpentBeforeChangeSeconds: integer('time_spent_before_change_seconds').default(0).notNull(),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
});

// 20. guess_classifications
export const guessClassifications = pgTable('guess_classifications', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .references(() => testSessions.id, { onDelete: 'cascade' })
    .notNull(),
  testQuestionId: integer('test_question_id').notNull(),
  questionId: integer('question_id').notNull(),
  confidence: text('confidence').notNull(),
  mainGuessOption: text('main_guess_option'),
  secondGuessOption: text('second_guess_option'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 21. eliminated_options
export const eliminatedOptions = pgTable('eliminated_options', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .references(() => testSessions.id, { onDelete: 'cascade' })
    .notNull(),
  testQuestionId: integer('test_question_id').notNull(),
  questionId: integer('question_id').notNull(),
  optionKey: text('option_key').notNull(),
  isEliminated: boolean('is_eliminated').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 22. review_flags
export const reviewFlags = pgTable('review_flags', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .references(() => testSessions.id, { onDelete: 'cascade' })
    .notNull(),
  testQuestionId: integer('test_question_id').notNull(),
  questionId: integer('question_id').notNull(),
  isMarked: boolean('is_marked').default(false).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 23. bookmarks
export const bookmarks = pgTable('bookmarks', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  questionId: integer('question_id').notNull(),
  questionCode: text('question_code').notNull(),
  notes: text('notes').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 24. question_events
export const questionEvents = pgTable('question_events', {
  id: serial('id').primaryKey(),
  eventId: text('event_id').notNull().unique(),
  sessionId: integer('session_id')
    .references(() => testSessions.id, { onDelete: 'cascade' })
    .notNull(),
  userUid: text('user_uid').notNull(),
  questionId: integer('question_id'),
  eventType: text('event_type').notNull(),
  metadataJson: jsonb('metadata_json').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 25. test_results
export const testResults = pgTable('test_results', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .references(() => testSessions.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  userUid: text('user_uid').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  attemptedCount: integer('attempted_count').notNull(),
  correctCount: integer('correct_count').notNull(),
  incorrectCount: integer('incorrect_count').notNull(),
  unattemptedCount: integer('unattempted_count').notNull(),
  score: doublePrecision('score').notNull(),
  maxMarks: doublePrecision('max_marks').notNull(),
  percentageScore: doublePrecision('percentage_score').notNull(),
  accuracy: doublePrecision('accuracy').notNull(),
  attemptRate: doublePrecision('attempt_rate').notNull(),
  positiveMarks: doublePrecision('positive_marks').notNull(),
  negativeMarks: doublePrecision('negative_marks').notNull(),
  totalTimeSeconds: integer('total_time_seconds').notNull(),
  avgTimeSeconds: doublePrecision('avg_time_seconds').notNull(),
  medianTimeSeconds: doublePrecision('median_time_seconds').notNull(),
  fastestCorrectSeconds: integer('fastest_correct_seconds'),
  slowestIncorrectSeconds: integer('slowest_incorrect_seconds'),
  markingSchemeSnapshotJson: jsonb('marking_scheme_snapshot_json').notNull(),
  subjectBreakdownJson: jsonb('subject_breakdown_json').notNull(),
  topicBreakdownJson: jsonb('topic_breakdown_json').notNull(),
  guessAnalyticsJson: jsonb('guess_analytics_json').notNull(),
  answerChangeAnalyticsJson: jsonb('answer_change_analytics_json').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 26. analytics_snapshots
export const analyticsSnapshots = pgTable('analytics_snapshots', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  sessionId: integer('session_id')
    .references(() => testSessions.id, { onDelete: 'cascade' })
    .notNull(),
  formulaVersion: text('formula_version').default('v1.0-transparent').notNull(),
  overallMetricsJson: jsonb('overall_metrics_json').notNull(),
  knowledgeGapsJson: jsonb('knowledge_gaps_json').notNull(),
  speedAccuracyMatrixJson: jsonb('speed_accuracy_matrix_json').notNull(),
  retentionMetricsJson: jsonb('retention_metrics_json').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 27. study_recommendations
export const studyRecommendations = pgTable('study_recommendations', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  priority: integer('priority').notNull(),
  subjectName: text('subject_name').notNull(),
  topicName: text('topic_name').notNull(),
  reason: text('reason').notNull(),
  evidence: text('evidence').notNull(),
  sampleSize: integer('sample_size').notNull(),
  suggestedActivity: text('suggested_activity').notNull(),
  improvementMetric: text('improvement_metric').notNull(),
  knowledgeGapScore: doublePrecision('knowledge_gap_score').notNull(),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 28. revision_records
export const revisionRecords = pgTable('revision_records', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  topicName: text('topic_name').notNull(),
  subjectName: text('subject_name').notNull(),
  lastAttemptedAt: timestamp('last_attempted_at').defaultNow().notNull(),
  nextRevisionDueAt: timestamp('next_revision_due_at').notNull(),
  intervalDays: integer('interval_days').default(3).notNull(),
  retentionState: text('retention_state').default('needs_revision').notNull(),
  accuracyHistoryJson: jsonb('accuracy_history_json').default([]).notNull(),
  knowledgeGapScore: doublePrecision('knowledge_gap_score').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 29. admin_audit_logs
export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: serial('id').primaryKey(),
  actorUid: text('actor_uid').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  detailsJson: jsonb('details_json').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
