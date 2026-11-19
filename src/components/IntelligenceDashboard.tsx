import React, { useState } from 'react';
import {
  Play,
  Sliders,
  Target,
  TrendingUp,
  HelpCircle,
  AlertCircle,
  BookMarked,
  Clock,
  RefreshCw,
  ArrowUpRight,
  Layers,
  Award,
} from 'lucide-react';
import {
  SubjectAnalyticsItem,
  TopicAnalyticsItem,
  GuessIntelligenceSummary,
  AnswerChangeSummary,
} from '../types/domain.ts';

interface IntelligenceDashboardProps {
  analyticsData: any;
  onStartExamPreset: (configKey: string, filters?: any) => void;
  onOpenCustomGenerator: () => void;
  onReviewSession: (sessionId: number) => void;
  onNavigateToMocks?: () => void;
  onOpenImportModal?: () => void;
}

export const IntelligenceDashboard: React.FC<IntelligenceDashboardProps> = ({
  analyticsData,
  onStartExamPreset,
  onOpenCustomGenerator,
  onReviewSession,
  onNavigateToMocks,
  onOpenImportModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'overview' | 'guess_5050' | 'subjects_topics' | 'speed_gaps' | 'revision'
  >('overview');
  const [trendRange, setTrendRange] = useState<'3' | '5' | '10' | 'all'>('all');
  const [subjectSortBy, setSubjectSortBy] = useState<'accuracy' | 'netScore' | 'guessPercentage'>('accuracy');

  if (!analyticsData) return null;

  const {
    overview,
    latestAnalysis,
    trendSeries = [],
    recommendations = [],
    revisionQueue = [],
    bookmarks = [],
    recentSessions = [],
  } = analyticsData;

  const subjectsList: SubjectAnalyticsItem[] = latestAnalysis?.subjectBreakdown || [];
  const topicsList: TopicAnalyticsItem[] = latestAnalysis?.topicBreakdown || [];
  const guessIntel: GuessIntelligenceSummary | null =
    latestAnalysis?.guessIntelligence || null;
  const changeIntel: AnswerChangeSummary | null =
    latestAnalysis?.answerChangeIntelligence || null;

  const sortedSubjects = [...subjectsList].sort((a, b) => {
    if (subjectSortBy === 'netScore') return b.netScore - a.netScore;
    if (subjectSortBy === 'guessPercentage') return b.guessPercentage - a.guessPercentage;
    return a.accuracy - b.accuracy; // Weakest first by default so candidates spot gaps immediately
  });

  const filteredTrends =
    trendRange === 'all'
      ? trendSeries
      : trendSeries.slice(-Number(trendRange));

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8 space-y-8">
      {/* 1. HERO / ACTION COMMAND HEADER */}
      <div className="bg-slate-900 text-white rounded-lg p-6 md:p-8 border border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-sky-400 font-medium">
            <span>NBEMS Computer-Based Testing</span>
            <span>·</span>
            <span>Confidence & 50-50 Elimination Analytics</span>
            <span>·</span>
            <span>19 NEET PG Subjects</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Every mock test is a measurable clinical learning cycle.
          </h1>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            Distinguish true clinical mastery from lucky guesses, measure your 50-50 option
            elimination survival rate, and target high-yield conceptual gaps across all 19 NEET PG
            subjects.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {onNavigateToMocks && (
            <button
              onClick={onNavigateToMocks}
              className="px-4 py-2.5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
            >
              <Award className="w-4 h-4 fill-slate-950" />
              <span>Full Mock Test Series (Dated Papers)</span>
            </button>
          )}

          <button
            onClick={() => onStartExamPreset('neet-pg-full-mock-1')}
            className="px-4 py-2.5 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>Launch Mock 1 (Oct 18)</span>
          </button>

          <button
            onClick={() => onStartExamPreset('neet-pg-mini-sectional')}
            className="px-3.5 py-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>25-Q Sectional Sprint</span>
          </button>

          <button
            onClick={onOpenCustomGenerator}
            className="px-3.5 py-2.5 rounded-md bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Custom Builder</span>
          </button>

          {onOpenImportModal && (
            <button
              onClick={onOpenImportModal}
              className="px-3.5 py-2.5 rounded-md bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              + Import Test
            </button>
          )}
        </div>
      </div>

      {/* 2. TOP KPI SUMMARY METRICS (60-30-10 Clean Tabular Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Tests Attempted</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {overview.testsAttempted}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {overview.totalQuestionsSolved} questions evaluated
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Overall Accuracy</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
            {overview.overallAccuracy}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across all committed answers
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Latest Mock Score</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {latestAnalysis ? `${latestAnalysis.score}/${latestAnalysis.maxMarks}` : '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            Best: {overview.bestPercentageScore}%
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Sure vs Main Guess Acc.</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-purple-700 mt-1">
            {guessIntel ? `${guessIntel.sureAccuracy}% / ${guessIntel.mainGuessAccuracy}%` : '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Confident vs Main Guess
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Elimination Survival</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-sky-700 mt-1">
            {guessIntel
              ? `${guessIntel.eliminationAnalysis.correctAnswerSurvivalRate}%`
              : '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Correct key survived strike-out
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Avg Solving Speed</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {overview.averageTimePerQuestionSeconds}s
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Target benchmark: ≤ 50s/Q
          </div>
        </div>
      </div>

      {/* 3. SEGMENTED NAVIGATION TABS FOR INTELLIGENCE MODULES */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          {[
            { id: 'overview', label: '01. Executive Overview & Trends' },
            { id: 'guess_5050', label: '02. Guess & 50-50 Elimination Intelligence' },
            { id: 'subjects_topics', label: '03. Subject & Topic Performance' },
            { id: 'speed_gaps', label: '04. Speed-Accuracy Matrix & Knowledge Gaps' },
            { id: 'revision', label: '05. Revision Queue & Bookmarks' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW, TRENDS & STUDY RECOMMENDATIONS */}
      {activeSubTab === 'overview' && (
        <div className="space-y-8">
          {/* Longitudinal Trend Section + Recent Sessions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Trend Progression Chart & Table (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Longitudinal Performance Progression (Historical Snapshots)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Tracks score %, overall accuracy, confident accuracy, and negative marking across mocks
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded">
                  {(['3', '5', '10', 'all'] as const).map((rng) => (
                    <button
                      key={rng}
                      onClick={() => setTrendRange(rng)}
                      className={`px-2.5 py-1 rounded text-xs font-medium ${
                        trendRange === rng
                          ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                          : 'text-slate-600'
                      }`}
                    >
                      {rng === 'all' ? 'All Mocks' : `Last ${rng}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Bar & Trend Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {filteredTrends.map((t: any) => (
                  <div
                    key={t.sessionId}
                    onClick={() => onReviewSession(t.sessionId)}
                    className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer transition-colors space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>{t.date}</span>
                      <span className="text-sky-700 font-semibold flex items-center gap-0.5">
                        Review <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {t.examName}
                    </div>
                    <div className="flex items-baseline justify-between font-mono tabular-nums pt-1">
                      <div>
                        <div className="text-[11px] text-slate-500 font-sans">Score</div>
                        <div className="text-base font-bold text-slate-900">
                          {t.score}/{t.maxMarks} ({t.percentageScore}%)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-slate-500 font-sans">Accuracy</div>
                        <div className="text-base font-bold text-emerald-700">
                          {t.accuracy}%
                        </div>
                      </div>
                    </div>
                    {/* Accuracy Progress Bar */}
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${Math.min(100, t.accuracy)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono pt-1">
                      <span>Sure: {t.sureAccuracy}%</span>
                      <span>Guess: {t.mainGuessAccuracy}%</span>
                      <span className="text-red-600">Neg: -{t.negativeMarks}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Sessions & Active Resume Panel (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  Recent Examination & Practice Sessions
                </h2>
                <span className="text-xs text-slate-500 font-mono">
                  Server-persisted
                </span>
              </div>

              <div className="divide-y divide-slate-200 max-h-[310px] overflow-y-auto">
                {recentSessions.map((s: any) => (
                  <div
                    key={s.sessionId}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {s.examName}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                        <span>{s.startedAt.split('T')[0]}</span>
                        <span>·</span>
                        <span>{s.totalQuestions} Qs</span>
                        <span>·</span>
                        <span className="uppercase">{s.status.replace('_', ' ')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {s.status === 'in_progress' ? (
                        <button
                          onClick={() => onReviewSession(s.sessionId)}
                          className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold cursor-pointer"
                        >
                          Resume Exam
                        </button>
                      ) : (
                        <button
                          onClick={() => onReviewSession(s.sessionId)}
                          className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-800 font-mono cursor-pointer"
                        >
                          {s.score !== null ? `${s.score}/${s.maxMarks}` : 'Review'} →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PERSONALIZED STUDY RECOMMENDATIONS (Section 15) */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Prioritized Study & Revision Plan (Evidence-Verified)
                </h2>
                <p className="text-xs text-slate-500">
                  Generated strictly from observed accuracy, time consumption, negative marking, and confidence records
                </p>
              </div>
              <button
                onClick={() =>
                  onStartExamPreset('neet-pg-tutor-mode', {
                    onlyIncorrect: true,
                    questionCount: 15,
                    mode: 'practice',
                  })
                }
                className="px-3.5 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
              >
                Practice Previously Incorrect Questions →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((rec: any) => (
                <div
                  key={rec.id}
                  className="p-4 rounded-lg border border-slate-200 bg-slate-50/40 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">
                        Priority {rec.priority} — {rec.subjectName}
                      </span>
                      <span className="font-mono text-red-700 font-semibold">
                        Gap Score: {rec.knowledgeGapScore}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      {rec.topicName}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong>Reason:</strong> {rec.reason}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500">
                      Evidence (n={rec.sampleSize}): {rec.evidence}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <p className="text-xs text-slate-800 font-medium">
                      <strong>Action:</strong> {rec.suggestedActivity}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">
                        Goal: {rec.improvementMetric}
                      </span>
                      <button
                        onClick={() =>
                          onStartExamPreset('neet-pg-tutor-mode', {
                            subjects: [rec.subjectName.toLowerCase().replace(/\s+/g, '-')],
                            questionCount: 10,
                            mode: 'practice',
                          })
                        }
                        className="text-xs font-semibold text-sky-700 hover:text-sky-900 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Practice Topic →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GUESS ANALYTICS, 50-50 ELIMINATION INTELLIGENCE & ANSWER-CHANGE AUDIT */}
      {activeSubTab === 'guess_5050' && guessIntel && (
        <div className="space-y-8">
          {/* Verified Insights Banner */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              Verified Confidence & Guessing Intelligence Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {guessIntel.insights.map((ins, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium"
                >
                  {ins}
                </div>
              ))}
            </div>
          </div>

          {/* 3-Column Comparison: Sure vs Main Guess vs Second Guess */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* A. Sure Classification */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    A. Sure (Confident Answers)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Default state when Guess mode is OFF
                  </p>
                </div>
                <span className="text-xl font-bold font-mono text-sky-700">
                  {guessIntel.sureAccuracy}%
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono tabular-nums">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-sans">Total Sure Answers:</span>
                  <strong>{guessIntel.sureCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-sans">Correct Sure Answers:</span>
                  <strong className="text-emerald-700">{guessIntel.sureCorrect}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-sans">
                    Incorrect Sure Answers (False Confidence):
                  </span>
                  <strong className="text-red-600">{guessIntel.sureIncorrect}</strong>
                </div>
              </div>
            </div>

            {/* B. Main Guess Classification */}
            <div className="bg-white border-2 border-[#A855F7] rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    B. Main Guess (Graded Response)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Committed answers tagged with Guess ON
                  </p>
                </div>
                <span className="text-xl font-bold font-mono text-purple-800">
                  {guessIntel.mainGuessAccuracy}%
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono tabular-nums">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-sans">Total Main Guesses:</span>
                  <strong>
                    {guessIntel.mainGuessCount} ({guessIntel.guessingPercentage}% of attempts)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-sans">Correct / Incorrect:</span>
                  <span>
                    <strong className="text-emerald-700">{guessIntel.mainGuessCorrect}</strong> /{' '}
                    <strong className="text-red-600">{guessIntel.mainGuessIncorrect}</strong>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-sans">Marks Earned (+4 ea):</span>
                  <strong className="text-emerald-700">
                    +{guessIntel.marksEarnedFromMainGuesses}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-sans">Negative Marks Cost (-1 ea):</span>
                  <strong className="text-red-600">
                    -{guessIntel.negativeMarksFromMainGuesses}
                  </strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-800 font-sans font-semibold">
                    Net Score Impact of Guessing:
                  </span>
                  <strong
                    className={
                      guessIntel.netMarksFromMainGuesses >= 0
                        ? 'text-emerald-700'
                        : 'text-red-600'
                    }
                  >
                    {guessIntel.netMarksFromMainGuesses >= 0 ? '+' : ''}
                    {guessIntel.netMarksFromMainGuesses} marks
                  </strong>
                </div>
              </div>
            </div>

            {/* C. Second Guess Classification */}
            <div className="bg-white border-2 border-[#F97316] rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-orange-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    C. Second Guess (Analytical Only)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Alternative option tagged — never graded
                  </p>
                </div>
                <span className="text-xl font-bold font-mono text-orange-700">
                  {guessIntel.secondGuessAccuracy}%
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono tabular-nums">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-sans">Total Second Guess Tags:</span>
                  <strong>{guessIntel.secondGuessCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-sans">Matched Correct Answer:</span>
                  <strong className="text-emerald-700">
                    {guessIntel.secondGuessMatchingCorrect}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-sans">Did Not Match Correct Answer:</span>
                  <strong>{guessIntel.secondGuessNotMatchingCorrect}</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-800 font-sans font-semibold">
                    Marks Lost (Main Wrong, 2nd Correct):
                  </span>
                  <strong className="text-red-600">
                    {guessIntel.eliminationAnalysis.marksLostWhenSecondGuessWasCorrect} marks
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* ELIMINATION-BASED ("50-50") & ANSWER-CHANGE INTELLIGENCE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Elimination-based Analysis (Section 8.4) */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Option Elimination & 2-Surviving-Option ("50-50") Analysis
                </h3>
                <p className="text-xs text-slate-500">
                  Measures whether your option strike-throughs preserve the correct answer or accidentally eliminate it
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono tabular-nums">
                <div className="p-3.5 rounded bg-slate-50 border border-slate-200">
                  <div className="text-slate-500 font-sans">Questions with Eliminations</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {guessIntel.eliminationAnalysis.questionsWithEliminations}
                  </div>
                </div>
                <div className="p-3.5 rounded bg-slate-50 border border-slate-200">
                  <div className="text-slate-500 font-sans">Correct Answer Survival Rate</div>
                  <div className="text-lg font-bold text-emerald-700 mt-1">
                    {guessIntel.eliminationAnalysis.correctAnswerSurvivalRate}%
                  </div>
                </div>
                <div className="p-3.5 rounded bg-slate-50 border border-slate-200">
                  <div className="text-slate-500 font-sans">
                    2 Options Eliminated (2 Surviving Options)
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {guessIntel.eliminationAnalysis.twoOptionsEliminatedCount} Qs
                  </div>
                </div>
                <div className="p-3.5 rounded bg-slate-50 border border-slate-200">
                  <div className="text-slate-500 font-sans">
                    Conversion Rate After 2 Eliminations
                  </div>
                  <div className="text-lg font-bold text-purple-700 mt-1">
                    {guessIntel.eliminationAnalysis.eliminationEfficiency}%
                  </div>
                </div>
              </div>
            </div>

            {/* Answer-Change Intelligence (Section 9) */}
            {changeIntel && (
              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Answer-Change Intelligence (Committed Revisions)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tracks every saved answer revision from initial commitment to final submission
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs font-mono tabular-nums">
                  <div className="p-3 rounded bg-emerald-50 border border-emerald-200">
                    <div className="text-emerald-800 font-sans">Incorrect → Correct</div>
                    <div className="text-lg font-bold text-emerald-700 mt-1">
                      {changeIntel.incorrectToCorrect}
                    </div>
                  </div>
                  <div className="p-3 rounded bg-red-50 border border-red-200">
                    <div className="text-red-800 font-sans">Correct → Incorrect</div>
                    <div className="text-lg font-bold text-red-700 mt-1">
                      {changeIntel.correctToIncorrect}
                    </div>
                  </div>
                  <div className="p-3 rounded bg-slate-50 border border-slate-200">
                    <div className="text-slate-600 font-sans">Incorrect → Incorrect</div>
                    <div className="text-lg font-bold text-slate-800 mt-1">
                      {changeIntel.incorrectToIncorrect}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  {changeIntel.insights[0]}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SUBJECT-WISE & TOPIC-WISE DRILL-DOWN TABLE (Section 13.2 & 13.3) */}
      {activeSubTab === 'subjects_topics' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                19-Subject NEET PG Performance & Confidence Matrix
              </h2>
              <p className="text-xs text-slate-500">
                Complete breakdown of accuracy, marks earned/lost, solving speed, and confidence tiers per subject
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Sort by:</span>
              <select
                value={subjectSortBy}
                onChange={(e) => setSubjectSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-800 font-medium"
              >
                <option value="accuracy">Lowest Accuracy First (Weakest)</option>
                <option value="netScore">Highest Net Marks</option>
                <option value="guessPercentage">Highest Guess Dependency</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[840px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-3 px-4 font-semibold">Subject</th>
                  <th className="py-3 px-3 font-semibold text-right">Attempted</th>
                  <th className="py-3 px-3 font-semibold text-right">Correct / Wrong</th>
                  <th className="py-3 px-3 font-semibold text-right">Accuracy</th>
                  <th className="py-3 px-3 font-semibold text-right">Net Score</th>
                  <th className="py-3 px-3 font-semibold text-right">Avg Time</th>
                  <th className="py-3 px-3 font-semibold text-right">Guess %</th>
                  <th className="py-3 px-3 font-semibold text-right">Sure Acc.</th>
                  <th className="py-3 px-3 font-semibold text-right">Main Guess Acc.</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                {sortedSubjects.map((s) => (
                  <tr key={s.subjectSlug} className="hover:bg-slate-50/90">
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                      {s.subjectName}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {s.attempted}/{s.totalQuestions} ({s.attemptRate}%)
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-emerald-700 font-bold">{s.correct}</span> /{' '}
                      <span className="text-red-600">{s.incorrect}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      <span
                        className={
                          s.accuracy >= 70
                            ? 'text-emerald-700'
                            : s.accuracy >= 50
                            ? 'text-amber-700'
                            : 'text-red-600'
                        }
                      >
                        {s.accuracy}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {s.netScore}/{s.maxMarks}
                    </td>
                    <td className="py-3 px-3 text-right">{s.avgTimeSeconds}s</td>
                    <td className="py-3 px-3 text-right text-purple-700">
                      {s.guessPercentage}%
                    </td>
                    <td className="py-3 px-3 text-right text-sky-700">{s.sureAccuracy}%</td>
                    <td className="py-3 px-3 text-right text-purple-700">
                      {s.mainGuessAccuracy}%
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() =>
                          onStartExamPreset('neet-pg-tutor-mode', {
                            subjects: [s.subjectSlug],
                            questionCount: 10,
                            mode: 'practice',
                          })
                        }
                        className="text-sky-700 hover:text-sky-900 font-semibold cursor-pointer"
                      >
                        Practice →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SPEED VS ACCURACY MATRIX & TRANSPARENT KNOWLEDGE GAP ENGINE */}
      {activeSubTab === 'speed_gaps' && (
        <div className="space-y-8">
          {/* 4-Quadrant Speed vs Accuracy Matrix (Section 13.4) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                quad: 'Strong Mastery',
                subtitle: 'High Accuracy (≥65%) · Fast Solving Speed (≤50s)',
                border: 'border-emerald-300 bg-emerald-50/30',
              },
              {
                quad: 'Knowledge Exists — Speed Needs Work',
                subtitle: 'High Accuracy (≥65%) · Slow Solving Speed (>50s)',
                border: 'border-sky-300 bg-sky-50/30',
              },
              {
                quad: 'Superficial / Careless Risk',
                subtitle: 'Low Accuracy (<65%) · Fast Solving Speed (≤50s)',
                border: 'border-amber-300 bg-amber-50/30',
              },
              {
                quad: 'Priority Revision',
                subtitle: 'Low Accuracy (<65%) · Slow Solving Speed (>50s)',
                border: 'border-red-300 bg-red-50/30',
              },
            ].map((qBox) => {
              const matching = topicsList.filter((t) => t.quadrant === qBox.quad);
              return (
                <div
                  key={qBox.quad}
                  className={`p-5 rounded-lg border ${qBox.border} space-y-3`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{qBox.quad}</h3>
                      <p className="text-xs text-slate-600">{qBox.subtitle}</p>
                    </div>
                    <span className="font-mono text-sm font-bold text-slate-800">
                      {matching.length} topics
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {matching.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded bg-white border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="truncate pr-2">
                          <span className="font-semibold text-slate-900">
                            {m.subjectName}:
                          </span>{' '}
                          <span className="text-slate-700">{m.topicName}</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-600 shrink-0">
                          {m.accuracy}% · {m.avgTimeSeconds}s (n={m.totalQuestions})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Transparent Knowledge Gap Score Table (Section 13.5) */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Transparent Knowledge-Gap Detection Engine (Formula: v1.0-transparent)
                </h3>
                <span className="text-xs font-mono text-slate-500">
                  Score = ErrorFreq(40) + NegImpact(25) + GuessDep(20) + TimePenalty(15)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                No black-box scores: every weak topic displays its exact multi-factor weight contribution and diagnostic evidence
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[720px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-3 px-4 font-semibold">Subject & Topic</th>
                    <th className="py-3 px-3 font-semibold text-right">Gap Score</th>
                    <th className="py-3 px-3 font-semibold text-right">Factor Weights (E/N/G/T)</th>
                    <th className="py-3 px-4 font-semibold">Why Classified as Weak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {[...topicsList]
                    .sort((a, b) => b.knowledgeGapScore - a.knowledgeGapScore)
                    .slice(0, 12)
                    .map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 break-words">
                            {t.subjectName} — {t.topicName}
                          </div>
                          <div className="text-[11px] text-slate-500 break-words">{t.subtopicName}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-red-600 whitespace-nowrap">
                          {t.knowledgeGapScore} / 100
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {t.factorBreakdown.incorrectFrequencyWeight} +{' '}
                          {t.factorBreakdown.negativeImpactWeight} +{' '}
                          {t.factorBreakdown.guessDependencyWeight} +{' '}
                          {t.factorBreakdown.timePenaltyWeight}
                        </td>
                        <td className="py-3 px-4 text-slate-700 break-words max-w-xs">
                          {t.knowledgeGapReasons.join(' · ')}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SPACED REVISION QUEUE & BOOKMARKED QUESTIONS (Section 14) */}
      {activeSubTab === 'revision' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Spaced Revision Schedule (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Longitudinal Knowledge Retention & Spaced Revision Queue
              </h2>
              <p className="text-xs text-slate-500">
                Configurable revision intervals (1d, 3d, 7d, 15d, 30d) driven by knowledge-gap scores and retention history
              </p>
            </div>

            <div className="divide-y divide-slate-200">
              {revisionQueue.map((item: any) => (
                <div
                  key={item.id}
                  className="py-3.5 flex flex-wrap items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {item.subjectName} · {item.topicName}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Recommended Interval: {item.intervalDays} day(s) · Due:{' '}
                      {new Date(item.nextRevisionDueAt).toISOString().split('T')[0]} · Gap:{' '}
                      {item.knowledgeGapScore}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      onStartExamPreset('neet-pg-tutor-mode', {
                        subjects: [item.subjectName.toLowerCase().replace(/\s+/g, '-')],
                        questionCount: 10,
                        mode: 'practice',
                      })
                    }
                    className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    Start Revision Block
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Bookmarked Questions (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Bookmarked Questions ({bookmarks.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Flagged during exams and post-test reviews
                </p>
              </div>
              {bookmarks.length > 0 && (
                <button
                  onClick={() =>
                    onStartExamPreset('neet-pg-tutor-mode', {
                      onlyBookmarked: true,
                      questionCount: bookmarks.length,
                      mode: 'practice',
                    })
                  }
                  className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Practice Bookmarks
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-200 max-h-[420px] overflow-y-auto">
              {bookmarks.map((bm: any) => (
                <div key={bm.bookmarkId} className="py-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900">
                      {bm.questionCode}
                    </span>
                    <span className="text-slate-500">
                      {bm.subjectName} · {bm.topicName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 line-clamp-2">
                    {bm.questionText}
                  </p>
                  {bm.notes && (
                    <p className="text-[11px] text-amber-800 italic">Note: {bm.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
