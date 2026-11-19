import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Bookmark,
  Clock,
  HelpCircle,
  ArrowLeft,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';

interface PostExamReviewProps {
  sessionId: number;
  onBackToDashboard: () => void;
  onOpenFullAnalytics: () => void;
}

type ReviewFilterType =
  | 'all'
  | 'correct'
  | 'incorrect'
  | 'unattempted'
  | 'main_guess'
  | 'second_guess'
  | 'sure'
  | 'correct_guess'
  | 'incorrect_guess'
  | 'eliminated'
  | 'marked_review';

export const PostExamReview: React.FC<PostExamReviewProps> = ({
  sessionId,
  onBackToDashboard,
  onOpenFullAnalytics,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<ReviewFilterType>('all');
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState<number>(0);

  useEffect(() => {
    async function fetchResult() {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/v1/results/${sessionId}`);
        setSessionState(res.state);
        setAnalytics(res.analytics);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load examination review');
      } finally {
        setLoading(false);
      }
    }
    fetchResult();
  }, [sessionId]);

  const handleToggleBookmark = async (q: any) => {
    try {
      const res = await apiFetch('/api/v1/bookmarks/toggle', {
        method: 'POST',
        body: JSON.stringify({
          questionId: q.questionId,
          questionCode: q.questionCode,
        }),
      });
      setSessionState((prev: any) => ({
        ...prev,
        questions: prev.questions.map((item: any) =>
          item.testQuestionId === q.testQuestionId
            ? { ...item, isBookmarked: res.bookmarked }
            : item
        ),
      }));
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-900">
            Computing Server-Authoritative Score & Post-Exam Review...
          </p>
        </div>
      </div>
    );
  }

  if (error || !sessionState || !analytics) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="bg-white border border-red-200 rounded-lg p-6">
          <p className="text-sm text-red-700 font-semibold mb-3">
            {error || 'Result not available'}
          </p>
          <button
            onClick={onBackToDashboard}
            className="px-4 py-2 bg-slate-900 text-white text-xs rounded"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const allQuestions: any[] = sessionState.questions || [];
  const filteredQuestions = allQuestions.filter((q) => {
    const saved = q.response.savedOption;
    const correct = q.question.correctOption;
    const isCorrect = saved && saved === correct;
    const isIncorrect = saved && saved !== correct;
    const isUnattempted = !saved;
    const isMainGuess = q.response.confidence === 'main_guess';
    const hasSecondGuess = Boolean(q.response.secondGuessOption);
    const isSure = saved && q.response.confidence === 'sure';
    const hasElims =
      Array.isArray(q.response.eliminatedOptions) &&
      q.response.eliminatedOptions.length > 0;

    switch (activeFilter) {
      case 'correct':
        return isCorrect;
      case 'incorrect':
        return isIncorrect;
      case 'unattempted':
        return isUnattempted;
      case 'main_guess':
        return isMainGuess;
      case 'second_guess':
        return hasSecondGuess;
      case 'sure':
        return isSure;
      case 'correct_guess':
        return isMainGuess && isCorrect;
      case 'incorrect_guess':
        return isMainGuess && isIncorrect;
      case 'eliminated':
        return hasElims;
      case 'marked_review':
        return Boolean(q.response.isMarkedForReview);
      default:
        return true;
    }
  });

  const activeQ =
    filteredQuestions[Math.min(selectedQuestionIdx, Math.max(0, filteredQuestions.length - 1))] ||
    null;

  const filterButtons: Array<{ id: ReviewFilterType; label: string }> = [
    { id: 'all', label: `All (${allQuestions.length})` },
    { id: 'correct', label: `Correct (${analytics.correctCount})` },
    { id: 'incorrect', label: `Incorrect (${analytics.incorrectCount})` },
    { id: 'unattempted', label: `Unattempted (${analytics.unattemptedCount})` },
    { id: 'sure', label: `Sure (${analytics.guessIntelligence.sureCount})` },
    { id: 'main_guess', label: `Main Guess (${analytics.guessIntelligence.mainGuessCount})` },
    { id: 'second_guess', label: `Second Guess (${analytics.guessIntelligence.secondGuessCount})` },
    { id: 'correct_guess', label: `Correct Guess (${analytics.guessIntelligence.mainGuessCorrect})` },
    { id: 'incorrect_guess', label: `Incorrect Guess (${analytics.guessIntelligence.mainGuessIncorrect})` },
    {
      id: 'eliminated',
      label: `Eliminated Options (${analytics.guessIntelligence.eliminationAnalysis.questionsWithEliminations})`,
    },
    {
      id: 'marked_review',
      label: `Marked for Review (${allQuestions.filter((q) => q.response.isMarkedForReview).length})`,
    },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8 space-y-8">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Post-Examination Audit & Review</span>
            <span>·</span>
            <span className="font-mono">{sessionState.session.sessionCode}</span>
            <span>·</span>
            <span>Immutable Snapshot</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {sessionState.session.examName}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="px-3.5 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={onOpenFullAnalytics}
            className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Deep Performance & Guess Analytics</span>
          </button>
        </div>
      </div>

      {/* 1. RESULT SUMMARY STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Total Score</div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {analytics.score} <span className="text-xs text-slate-400">/ {analytics.maxMarks}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
            {analytics.percentageScore}%
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Accuracy</div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
            {analytics.accuracy}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
            {analytics.correctCount}/{analytics.attemptedCount} correct
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Attempt Rate</div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {analytics.attemptRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
            {analytics.unattemptedCount} unattempted
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Negative Marks</div>
          <div className="text-xl font-bold font-mono tabular-nums text-red-600 mt-1">
            -{analytics.negativeMarks}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
            {analytics.incorrectCount} incorrect (-1 ea)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Sure Accuracy</div>
          <div className="text-xl font-bold font-mono tabular-nums text-sky-700 mt-1">
            {analytics.guessIntelligence.sureAccuracy}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
            n={analytics.guessIntelligence.sureCount} confident
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Main Guess Acc.</div>
          <div className="text-xl font-bold font-mono tabular-nums text-purple-700 mt-1">
            {analytics.guessIntelligence.mainGuessAccuracy}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
            Net {analytics.guessIntelligence.netMarksFromMainGuesses >= 0 ? '+' : ''}
            {analytics.guessIntelligence.netMarksFromMainGuesses} marks
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">2nd Guess Match</div>
          <div className="text-xl font-bold font-mono tabular-nums text-orange-700 mt-1">
            {analytics.guessIntelligence.secondGuessMatchingCorrect}/
            {analytics.guessIntelligence.secondGuessCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
            {analytics.guessIntelligence.secondGuessAccuracy}% matched key
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Avg / Median Time</div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {analytics.avgTimeSeconds}s
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
            Median: {analytics.medianTimeSeconds}s
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE FILTER BAR (11 Filters from Section 16) */}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {filterButtons.map((fb) => (
            <button
              key={fb.id}
              onClick={() => {
                setActiveFilter(fb.id);
                setSelectedQuestionIdx(0);
              }}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeFilter === fb.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {fb.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. SPLIT QUESTION REVIEW WORKSPACE */}
      {filteredQuestions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <p className="text-sm font-medium text-slate-600">
            No questions match the selected filter ({activeFilter}).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Question Navigator List (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Filtered Questions ({filteredQuestions.length})
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Click row to inspect
              </span>
            </div>
            <div className="max-h-[680px] overflow-y-auto divide-y divide-slate-200">
              {filteredQuestions.map((q, idx) => {
                const saved = q.response.savedOption;
                const correct = q.question.correctOption;
                const isCorrect = saved && saved === correct;
                const isIncorrect = saved && saved !== correct;
                const isSelected = idx === selectedQuestionIdx;

                return (
                  <button
                    key={q.testQuestionId}
                    onClick={() => setSelectedQuestionIdx(idx)}
                    className={`w-full text-left px-4 py-3 transition-colors flex items-start justify-between gap-3 cursor-pointer ${
                      isSelected ? 'bg-sky-50/90' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-slate-900">
                          Q{q.questionOrder}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-600 font-medium truncate">
                          {q.subjectName}
                        </span>
                        {q.response.confidence === 'main_guess' && (
                          <span className="text-[11px] text-purple-800 font-semibold">
                            · Main Guess
                          </span>
                        )}
                        {q.response.secondGuessOption && (
                          <span className="text-[11px] text-orange-800 font-semibold">
                            · 2nd: {q.response.secondGuessOption}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 truncate mt-1">
                        {q.question.text}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                      <span className="text-slate-400">{q.response.timeSpentSeconds}s</span>
                      {isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isIncorrect ? (
                        <XCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <MinusCircle className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Detailed Question & Option-by-Option Medical Explanation (8 cols) */}
          {activeQ && (
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-6 space-y-6">
              {/* Metadata Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-bold text-slate-900">
                      Question #{activeQ.questionOrder}
                    </span>
                    <span>·</span>
                    <span>{activeQ.subjectName}</span>
                    <span>·</span>
                    <span>{activeQ.systemName}</span>
                    <span>·</span>
                    <span>
                      {activeQ.topicName} ({activeQ.subtopicName})
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-mono tabular-nums text-slate-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Time Spent: <strong>{activeQ.response.timeSpentSeconds}s</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Visits: <strong>{activeQ.response.visitCount}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Confidence:{' '}
                      <strong className="uppercase text-slate-900">
                        {activeQ.response.confidence.replace(/_/g, ' ')}
                      </strong>
                    </span>
                    {activeQ.response.secondGuessOption && (
                      <>
                        <span>·</span>
                        <span className="text-orange-800">
                          2nd Guess: <strong>Option {activeQ.response.secondGuessOption}</strong>
                        </span>
                      </>
                    )}
                    {activeQ.response.isMarkedForReview && (
                      <>
                        <span>·</span>
                        <span className="text-purple-800 font-semibold">
                          Marked for Review
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleToggleBookmark(activeQ)}
                  className={`px-3 py-1.5 rounded border text-xs font-medium flex items-center gap-1.5 ${
                    activeQ.isBookmarked
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${
                      activeQ.isBookmarked ? 'fill-amber-500 text-amber-600' : ''
                    }`}
                  />
                  <span>{activeQ.isBookmarked ? 'Bookmarked' : 'Bookmark for Revision'}</span>
                </button>
              </div>

              {/* Clinical Vignette & Question Text */}
              {activeQ.question.clinicalVignette && (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800 leading-relaxed break-words">
                  {activeQ.question.clinicalVignette}
                </div>
              )}

              <h2 className="text-base font-semibold text-slate-900 leading-relaxed break-words">
                {activeQ.question.text}
              </h2>

              {/* Options with Correct / Selected / Second Guess / Eliminated Audit */}
              <div className="space-y-2.5">
                {activeQ.question.options.map((opt: any) => {
                  const isCorrect = opt.id === activeQ.question.correctOption;
                  const isSelected = opt.id === activeQ.response.savedOption;
                  const isSecGuess = opt.id === activeQ.response.secondGuessOption;
                  const wasEliminated =
                    Array.isArray(activeQ.response.eliminatedOptions) &&
                    activeQ.response.eliminatedOptions.includes(opt.id);

                  let boxStyle = 'bg-white border-slate-200 text-slate-800';
                  if (isCorrect) {
                    boxStyle = 'bg-emerald-50 border-emerald-500 text-slate-950 border-2';
                  } else if (isSelected && !isCorrect) {
                    boxStyle = 'bg-red-50 border-red-400 text-slate-950 border-2';
                  } else if (isSecGuess) {
                    boxStyle = 'bg-[#FED7AA]/50 border-[#F97316] text-slate-900';
                  }

                  const optExp =
                    activeQ.question.explanation?.optionExplanations?.[opt.id] || '';

                  return (
                    <div
                      key={opt.id}
                      className={`p-3.5 rounded-lg border space-y-1.5 ${boxStyle}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-900 text-white shrink-0">
                            {opt.id}
                          </span>
                          <span
                            className={`text-sm font-medium break-words ${
                              wasEliminated ? 'line-through opacity-75' : ''
                            }`}
                          >
                            {opt.text}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-semibold">
                          {isCorrect && (
                            <span className="text-emerald-800">✓ Correct Answer</span>
                          )}
                          {isSelected && (
                            <span
                              className={
                                isCorrect ? 'text-emerald-800' : 'text-red-700'
                              }
                            >
                              · Your Saved Answer (
                              {activeQ.response.confidence === 'main_guess'
                                ? 'Main Guess'
                                : 'Sure'}
                              )
                            </span>
                          )}
                          {isSecGuess && (
                            <span className="text-orange-800">
                              · Tagged as Second Guess
                            </span>
                          )}
                          {wasEliminated && (
                            <span className="text-slate-500">· Eliminated by You</span>
                          )}
                        </div>
                      </div>

                      {optExp && (
                        <p className="text-xs text-slate-600 pl-8 leading-relaxed break-words">
                          {optExp}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Comprehensive Medical Explanation & High-Yield Learning Points */}
              {activeQ.question.explanation && (
                <div className="p-5 rounded-lg bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                    <BookOpen className="w-4 h-4 text-sky-600" />
                    <span>Detailed Medical Explanation & Concept Synthesis</span>
                  </div>

                  <p className="text-sm font-semibold text-slate-900 leading-relaxed break-words">
                    {activeQ.question.explanation.summary}
                  </p>

                  <p className="text-xs text-slate-700 leading-relaxed break-words">
                    {activeQ.question.explanation.details}
                  </p>

                  {Array.isArray(activeQ.question.explanation.learningPoints) &&
                    activeQ.question.explanation.learningPoints.length > 0 && (
                      <div className="pt-3 border-t border-slate-200 space-y-1.5">
                        <div className="text-xs font-bold text-slate-800">
                          High-Yield NEET PG Learning Points:
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
                          {activeQ.question.explanation.learningPoints.map(
                            (lp: string, idx: number) => (
                              <li key={idx} className="break-words">
                                {lp}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
