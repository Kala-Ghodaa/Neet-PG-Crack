# PG-PREP ARENA — NEET PG Examination & Performance Intelligence Platform

PG-PREP ARENA is an end-to-end computer-based examination and academic intelligence platform built for NEET PG preparation. It combines the functional conventions of the public NBEMS CBT interface with confidence/guess intelligence (`Sure`, `Main Guess`, `Second Guess`), option elimination analytics, answer-change tracking, and transparent knowledge-gap detection across all 19 NEET PG subjects.

## Quick Start Commands

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Push database schema to PostgreSQL**:
   ```bash
   npx drizzle-kit push --config=./src/db/drizzle.config.ts
   ```

3. **Run automated test suite**:
   ```bash
   npm test
   ```

4. **Start full-stack development server (Port 3000)**:
   ```bash
   npm run dev
   ```

5. **Production build and start**:
   ```bash
   npm run build
   npm start
   ```

## Key Platform Capabilities

- **NBEMS CBT Examination Engine**: Supports the default 200-question, 210-minute, 5-sectional time-locked NEET PG mock (`+4` correct, `-1` incorrect, `0` unattempted), as well as a 25-question Sectional Sprint, Tutor/Practice Mode, and a Custom Test Builder.
- **Strict NBEMS Save Mode**: Separates pending selections from committed saved answers. Includes exact bottom controls (`Save & Next`, `Clear Response`, `Save & Mark for Review`, `Mark for Review & Next`, `Back`, `Next`, `Submit`) and derived palette states.
- **Guess & Confidence Intelligence**: Supports `Sure`, `Main Guess` (`#E9D5FF` fill / `#A855F7` border), and ungraded analytical `Second Guess` (`#FED7AA` fill / `#F97316` border), plus option elimination (`Alt + 1–4`) and `guess_intent_unattempted` tracking.
- **Performance Intelligence Engine**: Computes subject/topic breakdowns, 2-surviving-option ("50-50") elimination efficiency, correct-answer survival rate, answer-change impact, a 4-quadrant Speed vs Accuracy matrix, and the `v1.0-transparent` Knowledge-Gap score.
- **Question Bank Admin Console**: Full authoring, immutable versioning, export, and 14-step transactional bulk JSON import with dry-run validation reports.
