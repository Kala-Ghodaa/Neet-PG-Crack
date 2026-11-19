/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck2,
  Calendar,
  Clock,
  Layers,
  ArrowLeft,
  ArrowRight,
  Plus,
  Search,
  CheckCircle2,
  Play,
  RotateCcw,
  BookOpen,
  BarChart3,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import { MockPaperSummary } from '../types/domain.ts';
import { EXAM_FORMAT_VALIDATION_MATRIX } from '../data/questionBankGuide.ts';

interface FullMockTestSeriesProps {
  onStartExam: (configKey: string) => void;
  onResumeSession: (sessionId: number) => void;
  onReviewSession: (sessionId: number) => void;
  onOpenImportModal: () => void;
  onOpenPromptGuide?: () => void;
  onBackToDashboard?: () => void;
  startingExamKey?: string | null;
  refreshKey?: number;
}

function formatMinutesLabel(totalMinutes: number): string {
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function formatMarkingLabel(scheme?: { correct: number; incorrect: number }): string {
  const pos = scheme?.correct ?? 4;
  const neg = scheme?.incorrect ?? -1;
  const negStr =
    Math.abs(neg + 1 / 3) < 0.02
      ? '-⅓'
      : Number.isInteger(neg)
      ? String(neg)
      : neg.toFixed(2);
  return `+${pos} / ${negStr}`;
}

export const FullMockTestSeries: React.FC<FullMockTestSeriesProps> = ({
  onStartExam,
  onResumeSession,
  onReviewSession,
  onOpenImportModal,
  onOpenPromptGuide,
  onBackToDashboard,
  startingExamKey = null,
  refreshKey = 0,
}) => {
  const [mockPapers, setMockPapers] = useState<MockPaperSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'NEET-PG' | 'INI-CET' | 'imported'>('all');
  const [finalizingSessionId, setFinalizingSessionId] = useState<number | null>(null);

  const loadPapers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/v1/mock-papers');
      setMockPapers(res.papers || []);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load mock test catalog');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPapers();
  }, [loadPapers, refreshKey]);

  const handleFinishAndAnalyse = async (sessionId: number) => {
    try {
      setFinalizingSessionId(sessionId);
      await apiFetch(`/api/v1/exams/${sessionId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ isAutoSubmit: false }),
      });
      await loadPapers();
      onReviewSession(sessionId);
    } catch (err: any) {
      setLoadError(err.message || 'Failed to submit examination for analysis');
    } finally {
      setFinalizingSessionId(null);
    }
  };

  const neetPgCount = mockPapers.filter((p) => p.targetExam === 'NEET-PG' && !p.isUserImported).length;
  const inicetCount = mockPapers.filter((p) => p.targetExam === 'INI-CET' && !p.isUserImported).length;
  const importedCount = mockPapers.filter((p) => p.isUserImported).length;

  const filteredPapers = mockPapers.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.tag.toLowerCase().includes(q) ||
      p.date.toLowerCase().includes(q);

    if (!matchSearch) return false;
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'imported') return p.isUserImported;
    return p.targetExam === selectedFilter;
  });

  const completedCount = mockPapers.filter((p) => p.status === 'completed').length;
  const bestPaper = mockPapers.reduce<MockPaperSummary | null>((best, p) => {
    if (typeof p.latestScore !== 'number') return best;
    const pMax = p.maxMarks || p.totalQuestions * (p.markingScheme?.correct ?? 4);
    const pPct = pMax > 0 ? p.latestScore / pMax : -Infinity;
    if (!best || typeof best.latestScore !== 'number') return p;
    const bMax = best.maxMarks || best.totalQuestions * (best.markingScheme?.correct ?? 4);
    const bPct = bMax > 0 ? best.latestScore / bMax : -Infinity;
    return pPct > bPct ? p : best;
  }, null);

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8 space-y-6">
      {onBackToDashboard && (
        <div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      )}

      {/* 1. HERO SECTION */}
      <div className="bg-slate-900 text-white rounded-lg p-6 md:p-8 border border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-sky-400 font-medium">
            <Calendar className="w-3.5 h-3.5" />
            <span>20 Scheduled All-India Grand Mocks</span>
            <span>·</span>
            <span>10 NEET-PG 2026 + 10 INI-CET AIIMS</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            All-India NEET-PG & INI-CET Grand Mock Series
          </h1>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            Verified against NBEMS 2026, AIIMS INI-CET, Marrow, PrepLadder, and BTR (Cerebellum)
            Grand Test protocols: time-locked sections with no backward navigation, exact marking
            schemes (+4/-1 for NEET-PG and +1/-⅓ for INI-CET), and full post-exam analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {onOpenPromptGuide && (
            <button
              type="button"
              onClick={onOpenPromptGuide}
              className="px-4 py-2.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4 text-sky-400" />
              <span>Prompt & Sample JSON</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenImportModal}
            className="px-4 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Import New Test Paper</span>
          </button>
        </div>
      </div>

      {/* 2. VALIDATED EXAM FORMAT COMPARISON STRIP (NBEMS / AIIMS · Marrow · PrepLadder · BTR) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {EXAM_FORMAT_VALIDATION_MATRIX.map((spec) => (
          <div
            key={spec.exam}
            className="bg-white border border-slate-200 rounded-lg p-5 space-y-2.5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">{spec.exam} Official Protocol</h2>
              <span className="text-xs font-mono tabular-nums font-semibold text-sky-700">
                {spec.totalQuestions} MCQs · {spec.totalDurationMinutes}m · {spec.maxMarks} Marks
              </span>
            </div>
            <div className="text-xs text-slate-500">{spec.authority}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <div className="text-[11px] text-slate-500">Time-Locked Blocks</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {spec.totalQuestions / spec.questionsPerSection} × {spec.questionsPerSection} Qs ({spec.sectionDurationMinutes}m)
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Marking Scheme</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {spec.exam === 'INI-CET' ? '+1 / -⅓ / 0' : '+4 / -1 / 0'}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Avg Pace Target</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {Math.round((spec.totalDurationMinutes * 60) / spec.totalQuestions)}s / MCQ
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. SUMMARY KPI ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Available Full Mocks</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {mockPapers.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
            {neetPgCount} NEET-PG · {inicetCount} INI-CET{importedCount > 0 ? ` · ${importedCount} Imported` : ''}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Mocks Completed</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-sky-700 mt-1">
            {completedCount} / {mockPapers.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
            {mockPapers.length > 0
              ? `${Math.round((completedCount / mockPapers.length) * 100)}% syllabus series`
              : '—'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Best Mock Score</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
            {bestPaper && typeof bestPaper.latestScore === 'number'
              ? `${bestPaper.latestScore} / ${
                  bestPaper.maxMarks ||
                  bestPaper.totalQuestions * (bestPaper.markingScheme?.correct ?? 4)
                }`
              : '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
            {bestPaper && typeof bestPaper.latestScore === 'number'
              ? `${(
                  (bestPaper.latestScore /
                    Math.max(
                      1,
                      bestPaper.maxMarks ||
                        bestPaper.totalQuestions * (bestPaper.markingScheme?.correct ?? 4)
                    )) *
                  100
                ).toFixed(1)}% · ${bestPaper.targetExam}`
              : 'Attempt any Grand Mock'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Custom Paper Import</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            Schema v1.0
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            AI prompt & sample JSON included
          </div>
        </div>
      </div>

      {/* 4. FILTERS & SEARCH BAR */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {[
            { id: 'all', label: `All Mock Tests (${mockPapers.length})` },
            { id: 'NEET-PG', label: `NEET-PG (${mockPapers.filter((p) => p.targetExam === 'NEET-PG').length})` },
            { id: 'INI-CET', label: `INI-CET (${mockPapers.filter((p) => p.targetExam === 'INI-CET').length})` },
            { id: 'imported', label: `Imported (${importedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search test name, date, tag..."
            className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-300 text-xs bg-white"
          />
        </div>
      </div>

      {loadError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between">
          <span>{loadError}</span>
          <button type="button" onClick={loadPapers} className="font-semibold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* 5. MOCK TEST CARDS */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">
          Loading 20-paper NEET-PG & INI-CET mock catalog...
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-700">No mock papers match your filter.</p>
          <div className="flex items-center justify-center gap-3">
            {onOpenPromptGuide && (
              <button
                type="button"
                onClick={onOpenPromptGuide}
                className="px-4 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer"
              >
                View AI Prompt & Sample
              </button>
            )}
            <button
              type="button"
              onClick={onOpenImportModal}
              className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer"
            >
              Import a Mock Paper Package
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredPapers.map((paper, idx) => {
            const isCompleted = paper.status === 'completed';
            const isInProgress = paper.status === 'in_progress';
            const computedMaxMarks =
              paper.maxMarks ||
              Number((paper.totalQuestions * (paper.markingScheme?.correct ?? 4)).toFixed(2));
            const durationLabel = formatMinutesLabel(paper.durationMinutes);
            const markingLabel = formatMarkingLabel(paper.markingScheme);
            const qPerSec =
              paper.questionsPerSection ||
              Math.round(paper.totalQuestions / Math.max(1, paper.sectionCount));
            const minPerSec =
              paper.sectionDurationMinutes ||
              Math.round(paper.durationMinutes / Math.max(1, paper.sectionCount));

            return (
              <div
                key={paper.id || idx}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-5 md:p-6 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {/* Unboxed inline metadata row (Zero-Pill Discipline) */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono">
                      <span
                        className={`font-bold uppercase tracking-wider ${
                          paper.targetExam === 'INI-CET' ? 'text-indigo-700' : 'text-sky-700'
                        }`}
                      >
                        {paper.targetExam}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="font-sans font-semibold text-slate-700">{paper.tag}</span>
                      {paper.isUserImported && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="font-semibold text-emerald-700">User Imported</span>
                        </>
                      )}
                      <span className="text-slate-300">·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Scheduled: <strong className="text-slate-700">{paper.date}</strong>
                      </span>
                    </div>

                    <h3 className="text-base md:text-lg font-bold text-slate-900 tracking-tight break-words">
                      {paper.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed max-w-3xl break-words">
                      {paper.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono tabular-nums text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
                        {paper.totalQuestions} Qs ({computedMaxMarks} Marks · {markingLabel})
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {paper.durationMinutes}m ({durationLabel})
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        {paper.sectionCount > 1
                          ? `${paper.sectionCount} Locked Blocks (${qPerSec} Qs × ${minPerSec}m)`
                          : '1 Continuous Section'}
                      </span>
                    </div>
                  </div>

                  {/* Right Status & Clean Action States (Start / Retake / Analyse) */}
                  <div className="flex flex-col items-start md:items-end justify-between gap-3 shrink-0">
                    {isCompleted ? (
                      <div className="text-left md:text-right space-y-0.5">
                        <div className="flex items-center md:justify-end gap-1.5 text-xs font-bold text-emerald-800 font-mono tabular-nums">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            Score: {paper.latestScore} / {computedMaxMarks} ({paper.accuracy}%)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Completed{' '}
                          {paper.attemptedAt
                            ? new Date(paper.attemptedAt).toLocaleDateString()
                            : 'Record'}
                        </div>
                      </div>
                    ) : isInProgress ? (
                      <div className="text-left md:text-right space-y-0.5">
                        <div className="text-xs font-bold text-amber-800">
                          Active Session Running
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Started{' '}
                          {paper.attemptedAt
                            ? new Date(paper.attemptedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Live'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 font-medium">
                        Status: Ready to Start
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      {isCompleted && paper.lastAttemptSessionId && (
                        <>
                          <button
                            type="button"
                            disabled={Boolean(startingExamKey)}
                            onClick={() => onReviewSession(paper.lastAttemptSessionId!)}
                            className="px-3.5 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>Analyse</span>
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(startingExamKey)}
                            onClick={() => onStartExam(paper.configKey)}
                            className="px-3.5 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>
                              {startingExamKey === paper.configKey ? 'Starting...' : 'Retake'}
                            </span>
                          </button>
                        </>
                      )}

                      {isInProgress && paper.lastAttemptSessionId && (
                        <>
                          <button
                            type="button"
                            disabled={
                              finalizingSessionId === paper.lastAttemptSessionId ||
                              Boolean(startingExamKey)
                            }
                            onClick={() => handleFinishAndAnalyse(paper.lastAttemptSessionId!)}
                            className="px-3.5 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>
                              {finalizingSessionId === paper.lastAttemptSessionId
                                ? 'Submitting...'
                                : 'Submit & Analyse'}
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(startingExamKey)}
                            onClick={() => onResumeSession(paper.lastAttemptSessionId!)}
                            className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Resume</span>
                          </button>
                        </>
                      )}

                      {!isCompleted && !isInProgress && (
                        <button
                          type="button"
                          disabled={Boolean(startingExamKey)}
                          onClick={() => onStartExam(paper.configKey)}
                          className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>
                            {startingExamKey === paper.configKey ? 'Starting...' : 'Start Exam'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
