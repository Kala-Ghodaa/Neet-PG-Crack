/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Calendar,
  Clock,
  Layers,
  Award,
  ArrowRight,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import { MockPaperSummary } from '../types/domain.ts';

interface FullMockTestSeriesProps {
  onStartExam: (configKey: string) => void;
  onReviewSession: (sessionId: number) => void;
  onOpenImportModal: () => void;
  onBackToDashboard?: () => void;
}

export const FullMockTestSeries: React.FC<FullMockTestSeriesProps> = ({
  onStartExam,
  onReviewSession,
  onOpenImportModal,
  onBackToDashboard,
}) => {
  const [mockPapers, setMockPapers] = useState<MockPaperSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'NEET-PG' | 'INI-CET' | 'imported'>('all');

  const loadPapers = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/v1/mock-papers');
      setMockPapers(res.papers || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPapers();
  }, []);

  const filteredPapers = mockPapers.filter((p) => {
    const matchSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.date.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'imported') return p.isUserImported;
    return p.targetExam === selectedFilter;
  });

  const completedCount = mockPapers.filter((p) => p.status === 'completed').length;
  const bestScore = mockPapers.reduce((max, p) => Math.max(max, p.latestScore || 0), 0);

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8 space-y-8">
      {/* 1. HERO SECTION */}
      <div className="bg-slate-900 text-white rounded-lg p-6 md:p-8 border border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-sky-400 font-medium">
            <Calendar className="w-3.5 h-3.5" />
            <span>Scheduled & Dated All-India Grand Mock Test Series</span>
            <span>·</span>
            <span>200-Q NBEMS Sectional Protocol</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            All-India NEET-PG & INI-CET Grand Mock Papers
          </h1>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            Strict simulation of the official NBEMS computer-based test: 200 clinical MCQs across 5
            time-locked sections (42 mins each), negative marking (-1), 50-50 elimination analytics, and
            permanent longitudinal score tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenImportModal}
            className="px-4 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Import New Test Paper</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY KPI ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Available Mock Papers</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {mockPapers.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {mockPapers.filter((p) => p.isUserImported).length} user-imported
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Mocks Attempted</div>
          <div className="text-2xl font-bold font-mono text-sky-700 mt-1">
            {completedCount} / {mockPapers.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {mockPapers.length > 0
              ? `${Math.round((completedCount / mockPapers.length) * 100)}% coverage`
              : '—'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Best Mock Score</div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {bestScore > 0 ? `${bestScore} / 800` : '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {bestScore > 0 ? `${((bestScore / 800) * 100).toFixed(1)}%` : 'Attempt a mock'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Exam Blueprint</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            200 Qs · 210m
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            5 Time-locked 42m blocks
          </div>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH BAR */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All Mock Tests' },
            { id: 'NEET-PG', label: 'NEET-PG Papers' },
            { id: 'INI-CET', label: 'INI-CET Specials' },
            { id: 'imported', label: 'Imported / Saved Tests' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                selectedFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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

      {/* 4. MOCK TEST CARDS GRID */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">
          Loading mock test papers catalog...
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-700">No mock papers match your filter.</p>
          <button
            onClick={onOpenImportModal}
            className="px-4 py-2 rounded bg-sky-600 text-white text-xs font-semibold"
          >
            Import a Mock Paper Package
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPapers.map((paper, idx) => {
            const isCompleted = paper.status === 'completed';
            const isInProgress = paper.status === 'in_progress';

            return (
              <div
                key={paper.id || idx}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-6 space-y-4 transition-all shadow-2xs"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 font-mono">
                        {paper.targetExam}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {paper.tag}
                      </span>
                      {paper.isUserImported && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 font-mono">
                          User Imported
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Conducted: <strong>{paper.date}</strong>
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      {paper.title}
                    </h2>

                    <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                      {paper.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
                        {paper.totalQuestions} Questions (800 Marks)
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {paper.durationMinutes} Minutes (3h 30m)
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        {paper.sectionCount} Time-Locked Sections (A–E)
                      </span>
                    </div>
                  </div>

                  {/* Right Status & Launch Button */}
                  <div className="flex flex-col items-start md:items-end justify-between gap-3 shrink-0">
                    {isCompleted ? (
                      <div className="text-left md:text-right space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            Score: {paper.latestScore} / {paper.maxMarks} ({paper.accuracy}%)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Completed on {paper.attemptedAt ? new Date(paper.attemptedAt).toLocaleDateString() : 'Record'}
                        </div>
                      </div>
                    ) : isInProgress ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Examination in Progress</span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 font-medium">
                        Status: Not Attempted
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      {isCompleted && paper.lastAttemptSessionId && (
                        <button
                          type="button"
                          onClick={() => onReviewSession(paper.lastAttemptSessionId!)}
                          className="px-3.5 py-2 rounded border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-1 cursor-pointer"
                        >
                          <span>Review Solutions</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onStartExam(paper.configKey)}
                        className={`px-4 py-2 rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isInProgress
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : isCompleted
                            ? 'bg-slate-800 hover:bg-slate-700 text-white'
                            : 'bg-sky-600 hover:bg-sky-700 text-white'
                        }`}
                      >
                        {isInProgress ? (
                          <>
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Resume Examination</span>
                          </>
                        ) : isCompleted ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retake Mock Exam</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Start 200-Q Examination</span>
                          </>
                        )}
                      </button>
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
