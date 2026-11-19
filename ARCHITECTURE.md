# PG-PREP ARENA — System Architecture & Technical Specification

## 1. Architectural Overview

**PG-PREP ARENA** is a full-stack NEET PG Computer-Based Testing (CBT) and Performance Intelligence platform engineered with strict separation between the **Examination Engine**, the **Question Bank Engine**, and the **Performance & Confidence Intelligence Engine**.

### Core Architectural Principles
1. **Server-Authoritative Timing & Scoring**: All exam session deadlines, sectional lock timestamps, and score evaluations are computed and enforced server-side in PostgreSQL.
2. **Strict NBEMS Save Mode**: Pending option selections (`pendingOption`) are decoupled from committed responses (`savedOption`). Navigating away without clicking **Save & Next**, **Save & Mark for Review**, or **Mark for Review & Next** discards uncommitted pending selections in strict mode.
3. **Palette State Derivation**: The 5 NBEMS palette states (`not_visited`, `not_answered`, `answered`, `marked_for_review`, `answered_and_marked_for_review`) are never stored as mutable UI flags; they are derived deterministically from persisted `visited`, `savedOption`, and `isMarkedForReview` columns.
4. **Historical Snapshot Immutability**: When an examination starts, the active `exam_config`, marking scheme, section structure, and question versions are snapshotted into `test_sessions` and `test_questions`. Subsequent edits to a question in the Admin Panel increment `questions.version` and create a `question_versions` record without altering completed examination results.

---

## 2. Database Schema (29 Normalized Entities in PostgreSQL)

Defined in `src/db/schema.ts` and managed via Drizzle ORM (`src/db/drizzle.config.ts`):

1. `users`: Candidate and administrator accounts linked to Firebase Auth `uid`.
2. `roles`: Role definitions (`student`, `admin`).
3. `permissions`: Granular RBAC permission mappings.
4. `subjects`: All 19 standard NEET PG subjects (`anatomy` through `pediatrics`).
5. `systems`: Organ systems linked to subjects.
6. `topics`: Clinical topics linked to subjects and systems.
7. `subtopics`: Granular subtopics.
8. `questions`: Primary question entity with version tracking, clinical vignettes, tables JSONB, and metadata.
9. `question_options`: Options A, B, C, D with individual option explanations.
10. `question_explanations`: Summary, detailed medical synthesis, and high-yield learning points.
11. `question_images`: Diagnostic schematics and clinical image references.
12. `question_versions`: Immutable historical snapshots of every question revision.
13. `exam_configs`: Versioned examination rule configurations (`exam_config` JSON schema).
14. `test_templates`: Reusable mock and custom test templates.
15. `test_sessions`: Active and completed candidate exam sessions with server-side deadlines.
16. `test_sections`: Sectional boundaries, durations, lock states, and timestamps.
17. `test_questions`: Session-specific immutable question and answer-key snapshots.
18. `student_responses`: Committed answers, pending selections, review flags, confidence classifications, second guesses, eliminated options, active time spent, and visit counts.
19. `answer_revisions`: Audit trail of every committed answer change (`previousOption` → `newOption`).
20. `guess_classifications`: Dedicated confidence and alternative guess records.
21. `eliminated_options`: Option strike-through tracking.
22. `review_flags`: Review status history.
23. `bookmarks`: Candidate question bookmarks and study notes.
24. `question_events`: Idempotent interaction telemetry log (`event_id` unique constraint).
25. `test_results`: Server-computed scores, accuracies, speed metrics, and breakdowns.
26. `analytics_snapshots`: Historical snapshots storing `v1.0-transparent` knowledge-gap calculations.
27. `study_recommendations`: Prioritized, evidence-backed study plans with explicit sample sizes.
28. `revision_records`: Spaced repetition queue (`1d`, `3d`, `7d`, `15d`, `30d`).
29. `admin_audit_logs`: Administrative mutation audit logs.

---

## 3. Versioned API Contracts (`/api/v1/*`)

- **Authentication**: `GET /api/v1/auth/me`, `POST /api/v1/auth/role`
- **Question Bank**: `GET /api/v1/questions`, `GET /api/v1/subjects`, `GET /api/v1/topics`
- **Examination Engine**:
  - `POST /api/v1/exams/start`
  - `GET /api/v1/exams/:sessionId`
  - `GET /api/v1/exams/:sessionId/questions`
  - `POST /api/v1/exams/:sessionId/responses`
  - `POST /api/v1/exams/:sessionId/review`
  - `POST /api/v1/exams/:sessionId/guess`
  - `POST /api/v1/exams/:sessionId/eliminations`
  - `POST /api/v1/exams/:sessionId/sections/transition`
  - `POST /api/v1/exams/:sessionId/submit`
- **Results & Post-Exam Review**:
  - `GET /api/v1/results/:sessionId`
  - `GET /api/v1/results/:sessionId/analysis`
- **Analytics & Intelligence**:
  - `GET /api/v1/analytics/overview`
  - `GET /api/v1/analytics/subjects`
  - `GET /api/v1/analytics/topics`
  - `GET /api/v1/analytics/guess-performance`
  - `GET /api/v1/analytics/speed-accuracy`
  - `GET /api/v1/analytics/trends`
  - `GET /api/v1/analytics/knowledge-gaps`
- **Administration**:
  - `GET /api/v1/admin/questions`
  - `POST /api/v1/admin/questions`
  - `PATCH /api/v1/admin/questions/:id`
  - `POST /api/v1/admin/questions/import`
  - `GET /api/v1/admin/questions/export`
  - `GET /api/v1/admin/audit-logs`

---

## 4. Security & Reliability Architecture

- **Answer Key Concealment**: During active `exam` mode sessions, `correctOption` and `explanation` fields are stripped server-side before returning the question payload.
- **Section Lock Enforcement**: Any mutation targeting a question in a locked section is rejected server-side with HTTP 400.
- **Offline Queue & Idempotent Reconciliation**: Network interruptions queue mutations in `localStorage` with unique `eventId` keys and automatically synchronize upon reconnection.
