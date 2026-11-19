import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Lock,
  Bookmark,
  AlertTriangle,
  Check,
  HelpCircle,
  Slash,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldCheck,
  Layers,
  Eye,
} from 'lucide-react';
import {
  apiFetch,
  enqueueOfflineMutation,
  flushOfflineMutations,
  getOfflineQueue,
} from '../lib/api.ts';
import { derivePaletteState } from '../services/examEngine.ts';
import { ConfidenceLevel, PaletteQuestionState } from '../types/domain.ts';

interface ExamWorkspaceProps {
  sessionId: number;
  candidateName: string;
  onExamSubmitted: (sessionId: number) => void;
  onExitToDashboard: () => void;
}

export const ExamWorkspace: React.FC<ExamWorkspaceProps> = ({
  sessionId,
  candidateName,
  onExamSubmitted,
  onExitToDashboard,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Local interactive states for the active question (Strict Save Mode separation)
  const [pendingOption, setPendingOption] = useState<string | null>(null);
  const [guessModeActive, setGuessModeActive] = useState<boolean>(false);
  const [secondGuessOption, setSecondGuessOption] = useState<string | null>(null);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);

  // Clear Response confirmation modal when Second Guess or Eliminated options exist
  const [showClearModal, setShowClearModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);

  // Timers & Sync state
  const [sectionRemainingSec, setSectionRemainingSec] = useState<number>(2520);
  const [overallRemainingSec, setOverallRemainingSec] = useState<number>(12600);
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState<boolean>(false);
  const [syncState, setSyncState] = useState<'synced' | 'syncing' | 'offline_queued'>('synced');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const questionEntryTimestampRef = useRef<number>(Date.now());
  const isTransitioningRef = useRef<boolean>(false);

  const syncLocalQuestionControls = useCallback((qItem: any) => {
    if (!qItem) return;
    const resp = qItem.response;
    // In strict save mode, opening a question restores its persisted savedOption into the selection radio
    setPendingOption(resp.savedOption ?? resp.pendingOption ?? null);
    setGuessModeActive(
      resp.confidence === 'main_guess' || resp.confidence === 'guess_intent_unattempted'
    );
    setSecondGuessOption(resp.secondGuessOption ?? null);
    setEliminatedOptions(Array.isArray(resp.eliminatedOptions) ? resp.eliminatedOptions : []);
    questionEntryTimestampRef.current = Date.now();
  }, []);

  const loadSessionState = useCallback(async () => {
    try {
      setLoading(true);
      await flushOfflineMutations();
      const data = await apiFetch(`/api/v1/exams/${sessionId}`);
      if (
        data.session.status === 'submitted' ||
        data.session.status === 'auto_submitted'
      ) {
        onExamSubmitted(sessionId);
        return;
      }

      setSessionData(data.session);
      setSections(data.sections);
      setQuestions(data.questions);

      const initialIdx = Math.min(
        Math.max(0, data.session.currentQuestionIndex || 0),
        data.questions.length - 1
      );
      setCurrentIdx(initialIdx);
      syncLocalQuestionControls(data.questions[initialIdx]);

      // Calculate remaining server-authoritative timers
      const serverNow = new Date(data.session.serverTimeNow).getTime();
      const overallDeadline = new Date(data.session.overallDeadlineAt).getTime();
      setOverallRemainingSec(Math.max(0, Math.floor((overallDeadline - serverNow) / 1000)));

      const activeSec = data.sections[data.session.activeSectionIndex];
      if (activeSec && activeSec.deadlineAt) {
        const secDeadline = new Date(activeSec.deadlineAt).getTime();
        setSectionRemainingSec(Math.max(0, Math.floor((secDeadline - serverNow) / 1000)));
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load examination session');
    } finally {
      setLoading(false);
    }
  }, [sessionId, onExamSubmitted, syncLocalQuestionControls]);

  useEffect(() => {
    loadSessionState();
  }, [loadSessionState]);

  // Audible beep helper using Web Audio API (no external audio file dependency)
  const triggerAudibleWarning = useCallback(() => {
    if (!soundAlertsEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {
      // ignore audio context block
    }
  }, [soundAlertsEnabled]);

  // 1-second countdown interval
  useEffect(() => {
    if (!sessionData || sessionData.status !== 'in_progress') return;

    const timer = setInterval(() => {
      setSectionRemainingSec((prev) => {
        if (prev === 300 || prev === 60) {
          triggerAudibleWarning();
        }
        if (prev <= 1 && !isTransitioningRef.current) {
          isTransitioningRef.current = true;
          handleSectionExpiryAutoLock();
          return 0;
        }
        return Math.max(0, prev - 1);
      });

      setOverallRemainingSec((prev) => {
        if (prev <= 1 && !isTransitioningRef.current) {
          isTransitioningRef.current = true;
          handleFinalExamSubmit(true);
          return 0;
        }
        return Math.max(0, prev - 1);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionData, triggerAudibleWarning]);

  const currentQuestion = questions[currentIdx];
  const strictSaveMode = Boolean(sessionData?.config?.settings?.strictSaveMode);
  const isSectional = Boolean(sessionData?.config?.pattern?.sectional);
  const activeSectionIndex = sessionData?.activeSectionIndex ?? 0;

  const getElapsedActiveSeconds = () => {
    const now = Date.now();
    // Cap single contiguous interval to 120s so idle tab time does not inflate analytics
    const rawSec = Math.round((now - questionEntryTimestampRef.current) / 1000);
    questionEntryTimestampRef.current = now;
    return Math.min(120, Math.max(1, rawSec));
  };

  const persistAction = async (
    action:
      | 'save_and_next'
      | 'save_and_mark_review'
      | 'mark_review_and_next'
      | 'navigate_away'
      | 'clear_response'
      | 'update_guess_or_elimination',
    targetIdx?: number,
    customOverrides?: {
      pendingOpt?: string | null;
      guessOn?: boolean;
      secGuess?: string | null;
      elims?: string[];
      clearOpts?: { clearSecondGuess: boolean; clearEliminations: boolean };
    }
  ) => {
    if (!currentQuestion) return;

    const effPending =
      customOverrides?.pendingOpt !== undefined
        ? customOverrides.pendingOpt
        : pendingOption;
    const effGuessOn =
      customOverrides?.guessOn !== undefined
        ? customOverrides.guessOn
        : guessModeActive;
    const effSecGuess =
      customOverrides?.secGuess !== undefined
        ? customOverrides.secGuess
        : secondGuessOption;
    const effElims =
      customOverrides?.elims !== undefined
        ? customOverrides.elims
        : eliminatedOptions;

    const deltaSec = getElapsedActiveSeconds();
    const eventId = `evt-${sessionId}-${currentQuestion.testQuestionId}-${Date.now()}`;

    // Optimistic local state update following exact strict-save rules
    const prevResp = currentQuestion.response;
    let nextSaved = prevResp.savedOption;
    let nextReview = prevResp.isMarkedForReview;
    let nextConf: ConfidenceLevel = prevResp.confidence;
    let nextSecGuess = effSecGuess;
    let nextElims = effElims;

    if (action === 'clear_response') {
      nextSaved = null;
      nextConf = 'sure';
      if (customOverrides?.clearOpts?.clearSecondGuess) nextSecGuess = null;
      if (customOverrides?.clearOpts?.clearEliminations) nextElims = [];
    } else if (action === 'navigate_away') {
      if (strictSaveMode) {
        // Unsaved pending selection is discarded!
        nextSaved = prevResp.savedOption;
        if (!nextSaved && effGuessOn) nextConf = 'guess_intent_unattempted';
      } else {
        nextSaved = effPending ?? prevResp.savedOption;
        nextConf = nextSaved
          ? effGuessOn
            ? 'main_guess'
            : 'sure'
          : effGuessOn
          ? 'guess_intent_unattempted'
          : 'sure';
      }
    } else if (action === 'update_guess_or_elimination') {
      nextSaved = prevResp.savedOption;
      nextConf = nextSaved
        ? effGuessOn
          ? 'main_guess'
          : 'sure'
        : effGuessOn
        ? 'guess_intent_unattempted'
        : 'sure';
    } else {
      // save_and_next, save_and_mark_review, mark_review_and_next
      nextSaved = effPending;
      if (action === 'save_and_mark_review' || action === 'mark_review_and_next') {
        nextReview = true;
      }
      nextConf = nextSaved
        ? effGuessOn
          ? 'main_guess'
          : 'sure'
        : effGuessOn
        ? 'guess_intent_unattempted'
        : 'sure';
    }

    if (nextSaved) {
      nextElims = nextElims.filter((o) => o !== nextSaved);
      if (nextSecGuess === nextSaved) nextSecGuess = null;
    }

    const updatedQuestions = questions.map((q, idx) => {
      if (idx === currentIdx) {
        return {
          ...q,
          response: {
            ...q.response,
            visited: true,
            savedOption: nextSaved,
            pendingOption: action === 'navigate_away' && strictSaveMode ? null : effPending,
            isMarkedForReview: nextReview,
            confidence: nextConf,
            secondGuessOption: nextSecGuess,
            eliminatedOptions: nextElims,
            timeSpentSeconds: q.response.timeSpentSeconds + deltaSec,
          },
        };
      }
      if (typeof targetIdx === 'number' && idx === targetIdx) {
        return {
          ...q,
          response: {
            ...q.response,
            visited: true,
          },
        };
      }
      return q;
    });

    setQuestions(updatedQuestions);

    if (typeof targetIdx === 'number' && targetIdx !== currentIdx) {
      setCurrentIdx(targetIdx);
      syncLocalQuestionControls(updatedQuestions[targetIdx]);
    }

    const payload = {
      testQuestionId: currentQuestion.testQuestionId,
      action,
      selectedPendingOption: effPending,
      guessModeActive: effGuessOn,
      secondGuessOption: nextSecGuess,
      eliminatedOptions: nextElims,
      clearOptions: customOverrides?.clearOpts,
      additionalTimeSeconds: deltaSec,
      nextQuestionIndex: targetIdx,
      eventId,
    };

    try {
      setSyncState('syncing');
      await apiFetch(`/api/v1/exams/${sessionId}/responses`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (getOfflineQueue().length > 0) {
        await flushOfflineMutations();
      }
      setSyncState('synced');
    } catch (err: any) {
      if (err.message?.includes('locked')) {
        setStatusBanner(err.message);
        await loadSessionState();
      } else {
        enqueueOfflineMutation(`/api/v1/exams/${sessionId}/responses`, payload);
        setSyncState('offline_queued');
      }
    }
  };

  // Find indices belonging to active section (if sectional mode is on)
  const getNextValidQuestionIndex = (fromIdx: number, direction: 1 | -1): number => {
    const candidate = fromIdx + direction;
    if (candidate < 0 || candidate >= questions.length) return fromIdx;
    const targetQ = questions[candidate];
    if (isSectional && targetQ.sectionIndex !== activeSectionIndex) {
      const targetSec = sections[targetQ.sectionIndex];
      if (!targetSec || !targetSec.allowReturnAfterLock) {
        setStatusBanner(
          `Navigation restricted to active ${sections[activeSectionIndex]?.name || 'Section'}. Complete or lock current section to advance.`
        );
        setTimeout(() => setStatusBanner(null), 3500);
        return fromIdx;
      }
    }
    return candidate;
  };

  const handleSaveAndNext = () => {
    const nextIdx = getNextValidQuestionIndex(currentIdx, 1);
    persistAction('save_and_next', nextIdx);
  };

  const handleSaveAndMarkForReview = () => {
    persistAction('save_and_mark_review', currentIdx);
  };

  const handleMarkForReviewAndNext = () => {
    const nextIdx = getNextValidQuestionIndex(currentIdx, 1);
    persistAction('mark_review_and_next', nextIdx);
  };

  const handleNavigateBack = () => {
    const prevIdx = getNextValidQuestionIndex(currentIdx, -1);
    if (prevIdx !== currentIdx) {
      persistAction('navigate_away', prevIdx);
    }
  };

  const handleNavigateNext = () => {
    const nextIdx = getNextValidQuestionIndex(currentIdx, 1);
    if (nextIdx !== currentIdx) {
      persistAction('navigate_away', nextIdx);
    }
  };

  const handlePaletteJump = (targetIdx: number) => {
    const targetQ = questions[targetIdx];
    if (!targetQ) return;
    if (isSectional && targetQ.sectionIndex !== activeSectionIndex) {
      const targetSec = sections[targetQ.sectionIndex];
      if (!targetSec?.allowReturnAfterLock) {
        setStatusBanner(
          `${sections[targetQ.sectionIndex]?.name} is locked/inactive. In NBEMS Sectional Mode, navigation is restricted to the active section.`
        );
        setTimeout(() => setStatusBanner(null), 3500);
        return;
      }
    }
    setShowMobilePalette(false);
    persistAction('navigate_away', targetIdx);
  };

  const handleClearResponseClick = () => {
    if (secondGuessOption || eliminatedOptions.length > 0) {
      setShowClearModal(true);
    } else {
      executeClearResponse(true, false);
    }
  };

  const executeClearResponse = (clearSecondGuess: boolean, clearEliminations: boolean) => {
    setPendingOption(null);
    setGuessModeActive(false);
    if (clearSecondGuess) setSecondGuessOption(null);
    if (clearEliminations) setEliminatedOptions([]);
    setShowClearModal(false);

    persistAction('clear_response', currentIdx, {
      pendingOpt: null,
      guessOn: false,
      secGuess: clearSecondGuess ? null : secondGuessOption,
      elims: clearEliminations ? [] : eliminatedOptions,
      clearOpts: { clearSecondGuess, clearEliminations },
    });
  };

  const handleOptionSelect = (optKey: string) => {
    // Selecting an eliminated option automatically restores it
    const nextElims = eliminatedOptions.filter((e) => e !== optKey);
    const nextSecGuess = secondGuessOption === optKey ? null : secondGuessOption;
    setPendingOption(optKey);
    setEliminatedOptions(nextElims);
    setSecondGuessOption(nextSecGuess);
  };

  const handleToggleGuessMode = () => {
    const nextGuess = !guessModeActive;
    setGuessModeActive(nextGuess);
    const nextSec = nextGuess ? secondGuessOption : null;
    if (!nextGuess) setSecondGuessOption(null);
    persistAction('update_guess_or_elimination', undefined, {
      pendingOpt: pendingOption,
      guessOn: nextGuess,
      secGuess: nextSec,
      elims: eliminatedOptions,
    });
  };

  const handleToggleSecondGuess = (optKey: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const effectiveMain = pendingOption || currentQuestion?.response?.savedOption;
    if (effectiveMain === optKey) {
      setStatusBanner('Second Guess must be different from your primary selected option.');
      setTimeout(() => setStatusBanner(null), 2500);
      return;
    }
    const nextSec = secondGuessOption === optKey ? null : optKey;
    const nextGuessOn = nextSec ? true : guessModeActive;
    setGuessModeActive(nextGuessOn);
    setSecondGuessOption(nextSec);
    persistAction('update_guess_or_elimination', undefined, {
      pendingOpt: pendingOption,
      guessOn: nextGuessOn,
      secGuess: nextSec,
      elims: eliminatedOptions,
    });
  };

  const handleToggleEliminateOption = (optKey: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const effectiveMain = pendingOption || currentQuestion?.response?.savedOption;
    if (effectiveMain === optKey) {
      setStatusBanner('Your selected answer option cannot be marked as eliminated.');
      setTimeout(() => setStatusBanner(null), 2500);
      return;
    }
    const isAlreadyElim = eliminatedOptions.includes(optKey);
    const nextElims = isAlreadyElim
      ? eliminatedOptions.filter((o) => o !== optKey)
      : [...eliminatedOptions, optKey];
    setEliminatedOptions(nextElims);
    persistAction('update_guess_or_elimination', undefined, {
      pendingOpt: pendingOption,
      guessOn: guessModeActive,
      secGuess: secondGuessOption,
      elims: nextElims,
    });
  };

  const handleToggleBookmark = async () => {
    if (!currentQuestion) return;
    try {
      const res = await apiFetch('/api/v1/bookmarks/toggle', {
        method: 'POST',
        body: JSON.stringify({
          questionId: currentQuestion.questionId,
          questionCode: currentQuestion.questionCode,
        }),
      });
      setQuestions((prev) =>
        prev.map((q, idx) =>
          idx === currentIdx ? { ...q, isBookmarked: res.bookmarked } : q
        )
      );
    } catch {
      // ignore bookmark error
    }
  };

  const handleSectionExpiryAutoLock = async () => {
    try {
      setStatusBanner('Section time expired. Locking current section and advancing...');
      const res = await apiFetch(`/api/v1/exams/${sessionId}/sections/transition`, {
        method: 'POST',
        body: JSON.stringify({ isAutoTimeout: true }),
      });
      isTransitioningRef.current = false;
      if (res.submitted) {
        onExamSubmitted(sessionId);
      } else {
        await loadSessionState();
        setStatusBanner(null);
      }
    } catch (err: any) {
      isTransitioningRef.current = false;
      setStatusBanner(err.message || 'Failed to transition section');
    }
  };

  const handleFinalExamSubmit = async (isAuto = false) => {
    try {
      setShowSubmitModal(false);
      await apiFetch(`/api/v1/exams/${sessionId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ isAutoSubmit: isAuto }),
      });
      onExamSubmitted(sessionId);
    } catch (err: any) {
      setStatusBanner(err.message || 'Submission failed');
    }
  };

  // Keyboard shortcuts (Section 19: G, 1-4, Alt+1-4, Shift+1-4, Arrows, Enter, X)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const keyMap: Record<string, 'A' | 'B' | 'C' | 'D'> = {
        '1': 'A',
        '2': 'B',
        '3': 'C',
        '4': 'D',
        '!': 'A',
        '@': 'B',
        '#': 'C',
        '$': 'D',
      };

      if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleToggleGuessMode();
      } else if (e.altKey && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        handleToggleEliminateOption(keyMap[e.key]);
      } else if (e.shiftKey && ['1', '2', '3', '4', '!', '@', '#', '$'].includes(e.key)) {
        e.preventDefault();
        handleToggleSecondGuess(keyMap[e.key]);
      } else if (['1', '2', '3', '4'].includes(e.key) && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        handleOptionSelect(keyMap[e.key]);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNavigateBack();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNavigateNext();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSaveAndNext();
      } else if (e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleClearResponseClick();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(
        secs
      ).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-6 text-center">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-900">
            Initializing NBEMS Computer-Based Test Environment...
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Synchronizing server-authoritative timers and question snapshots
          </p>
        </div>
      </div>
    );
  }

  if (error || !currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-lg p-6">
          <h2 className="text-base font-bold text-red-700 mb-2">
            Examination Session Error
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            {error || 'Unable to load question data.'}
          </p>
          <button
            onClick={onExitToDashboard}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Palette summary counts
  const paletteCounts = questions.reduce(
    (acc, q) => {
      const st = derivePaletteState(q.response);
      acc[st] = (acc[st] || 0) + 1;
      if (
        q.response.confidence === 'main_guess' ||
        q.response.confidence === 'guess_intent_unattempted'
      ) {
        acc.guessed += 1;
      }
      return acc;
    },
    {
      not_visited: 0,
      not_answered: 0,
      answered: 0,
      marked_for_review: 0,
      answered_and_marked_for_review: 0,
      guessed: 0,
    } as Record<string, number>
  );

  // Timer color state (Normal neutral -> Below 5 min amber -> Below 1 min red)
  const getTimerStyle = (sec: number) => {
    if (sec < 60) {
      return 'bg-red-600 text-white border-red-700';
    }
    if (sec < 300) {
      return 'bg-amber-500 text-slate-950 border-amber-600';
    }
    return 'bg-slate-800 text-slate-100 border-slate-700';
  };

  const hasUnsavedPendingSelection =
    strictSaveMode &&
    pendingOption !== null &&
    pendingOption !== currentQuestion.response.savedOption;

  const isPracticeMode =
    sessionData.mode === 'practice' ||
    Boolean(sessionData.config?.settings?.showExplanationDuringExam);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 select-none">
      {/* 1. NBEMS EXAMINATION TOP HEADER */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2.5 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Left: Exam Name & Mode */}
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={onExitToDashboard}
              title="Exit to Dashboard (Progress is persisted)"
              className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white border border-slate-700 rounded transition-colors whitespace-nowrap shrink-0"
            >
              ← Exit
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm tracking-tight text-white truncate">
                  {sessionData.examName}
                </span>
                <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                  · {strictSaveMode ? 'Strict NBEMS Save Mode: ON' : 'Tutor / Instant Save'}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Section Tabs with Lock Status */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {sections.map((sec) => {
              const isActive = sec.sectionIndex === activeSectionIndex;
              const isLocked = sec.status === 'locked' && !isActive;
              return (
                <button
                  key={sec.id}
                  onClick={() => {
                    if (isActive) return;
                    if (isSectional && !sec.allowReturnAfterLock) {
                      setStatusBanner(
                        `${sec.name} is ${
                          sec.status === 'locked' ? 'locked' : 'locked until prior sections finish'
                        }.`
                      );
                      setTimeout(() => setStatusBanner(null), 3000);
                      return;
                    }
                    const firstQ = questions.findIndex(
                      (q) => q.sectionIndex === sec.sectionIndex
                    );
                    if (firstQ >= 0) handlePaletteJump(firstQ);
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-sky-600 text-white font-semibold'
                      : isLocked
                      ? 'bg-slate-800/70 text-slate-500 cursor-not-allowed border border-slate-800'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {isLocked && <Lock className="w-3 h-3 text-slate-400" />}
                  <span>{sec.name}</span>
                  <span className="text-[11px] opacity-80 font-mono">
                    ({sec.questionCount})
                  </span>
                </button>
              );
            })}

            {isSectional && sections.length > 1 && (
              <button
                onClick={() => {
                  if (activeSectionIndex < sections.length - 1) {
                    handleSectionExpiryAutoLock();
                  } else {
                    setShowSubmitModal(true);
                  }
                }}
                title="Lock current section immediately and open next section"
                className="ml-1 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 whitespace-nowrap shrink-0"
              >
                Lock & Next Section →
              </button>
            )}
          </div>

          {/* Right: Timers, Audio Warning, Sync State & Candidate Info */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Sync indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300">
              {syncState === 'offline_queued' ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300">Queued Offline</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved</span>
                </>
              )}
            </div>

            {/* Section Timer */}
            {isSectional && (
              <div
                className={`px-2.5 py-1 rounded border text-xs font-mono tabular-nums flex items-center gap-1.5 ${getTimerStyle(
                  sectionRemainingSec
                )}`}
                role="timer"
                aria-label="Section remaining time"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Sec: {formatTimer(sectionRemainingSec)}</span>
                {sectionRemainingSec < 300 && (
                  <span className="font-sans font-bold uppercase text-[10px] ml-1">
                    {sectionRemainingSec < 60 ? 'CRITICAL' : 'LOW TIME'}
                  </span>
                )}
              </div>
            )}

            {/* Overall Timer */}
            <div
              className={`px-2.5 py-1 rounded border text-xs font-mono tabular-nums flex items-center gap-1.5 ${getTimerStyle(
                overallRemainingSec
              )}`}
              role="timer"
              aria-label="Total examination remaining time"
            >
              <span>Total: {formatTimer(overallRemainingSec)}</span>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundAlertsEnabled(!soundAlertsEnabled)}
              title={
                soundAlertsEnabled
                  ? 'Audible timer alerts ON'
                  : 'Enable audible timer alerts (<5m and <1m)'
              }
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              {soundAlertsEnabled ? (
                <Volume2 className="w-4 h-4 text-sky-400" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            {/* Candidate Name */}
            <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-7 h-7 rounded bg-sky-700 text-white font-bold text-xs flex items-center justify-center">
                {candidateName.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-200 max-w-[140px] truncate">
                {candidateName}
              </span>
            </div>

            {/* Mobile Palette Toggle */}
            <button
              onClick={() => setShowMobilePalette(!showMobilePalette)}
              className="lg:hidden px-2.5 py-1.5 rounded bg-sky-600 text-white text-xs font-semibold flex items-center gap-1"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Palette</span>
            </button>
          </div>
        </div>
      </header>

      {/* Optional Status / Section Warning Banner */}
      {statusBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            onClick={() => setStatusBanner(null)}
            className="text-amber-700 hover:text-amber-950 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. MAIN WORKSPACE: LEFT QUESTION STAGE + RIGHT NBEMS PALETTE */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 bg-white border-x border-slate-200">
        {/* Main Question Area (9 cols on desktop) */}
        <main className="lg:col-span-9 flex flex-col justify-between border-r border-slate-200 min-h-[calc(100vh-120px)]">
          {/* Top Question Metadata Bar */}
          <div>
            <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                  Question {currentQuestion.questionOrder} of {questions.length}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-xs font-medium text-slate-600">
                  {currentQuestion.subjectName}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-500">
                  {currentQuestion.topicName} ({currentQuestion.subtopicName})
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-xs font-mono text-slate-500">
                  ID: {currentQuestion.questionCode}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs font-mono tabular-nums text-slate-600">
                  Marks: <strong className="text-emerald-700">+4</strong> /{' '}
                  <strong className="text-red-600">-1</strong>
                </span>

                {/* Saved vs Pending State Indicator */}
                {currentQuestion.response.savedOption ? (
                  <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Saved: Option {currentQuestion.response.savedOption}
                    {hasUnsavedPendingSelection && (
                      <span className="text-amber-700 ml-1">
                        (Pending change to {pendingOption} — click Save & Next)
                      </span>
                    )}
                  </span>
                ) : hasUnsavedPendingSelection ? (
                  <span className="text-xs font-medium text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Pending Selection: {pendingOption} (Not yet saved)
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Unanswered</span>
                )}

                <button
                  onClick={handleToggleBookmark}
                  className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded border transition-colors ${
                    currentQuestion.isBookmarked
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${
                      currentQuestion.isBookmarked ? 'fill-amber-500 text-amber-600' : ''
                    }`}
                  />
                  <span>{currentQuestion.isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                </button>
              </div>
            </div>

            {/* Question Content Body */}
            <div className="p-4 md:p-8 max-w-4xl space-y-6">
              {/* Clinical Vignette */}
              {currentQuestion.question.clinicalVignette && (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-[14px] md:text-[15px] leading-relaxed break-words">
                  {currentQuestion.question.clinicalVignette}
                </div>
              )}

              {/* Question Stem */}
              <h1 className="text-base md:text-[17px] font-semibold text-slate-900 leading-relaxed break-words">
                {currentQuestion.question.text}
              </h1>

              {/* Tables if present */}
              {Array.isArray(currentQuestion.question.tables) &&
                currentQuestion.question.tables.map((tbl: any, tIdx: number) => (
                  <div
                    key={tIdx}
                    className="border border-slate-200 rounded-lg overflow-hidden my-4"
                  >
                    {tbl.title && (
                      <div className="bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-800 border-b border-slate-200 break-words">
                        {tbl.title}
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs min-w-[420px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            {tbl.headers.map((h: string, hIdx: number) => (
                              <th
                                key={hIdx}
                                className="px-4 py-2.5 font-semibold text-slate-700 break-words"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                          {tbl.rows.map((row: string[], rIdx: number) => (
                            <tr key={rIdx} className="hover:bg-slate-50/80">
                              {row.map((cell: string, cIdx: number) => (
                                <td key={cIdx} className="px-4 py-2 text-slate-800 break-words">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

              {/* Clinical Images / Schematics if present */}
              {Array.isArray(currentQuestion.question.images) &&
                currentQuestion.question.images.map((img: any, imgIdx: number) => (
                  <figure
                    key={imgIdx}
                    className="border border-slate-200 rounded-lg p-3 bg-slate-900 text-slate-200 max-w-xl"
                  >
                    <img
                      src={img.url}
                      alt={img.altText || 'Clinical investigation schematic'}
                      referrerPolicy="no-referrer"
                      className="w-full h-auto rounded max-h-96 object-contain"
                    />
                    {img.caption && (
                      <figcaption className="text-xs text-slate-400 mt-2 font-mono break-words">
                        {img.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}

              {/* GUESS & CONFIDENCE INTELLIGENCE CONTROL BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-1 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleToggleGuessMode}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-semibold border transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                      guessModeActive
                        ? 'bg-[#E9D5FF] border-[#A855F7] text-purple-950'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>
                      Confidence: {guessModeActive ? 'Guess Mode ON (Shortcut: G)' : 'Sure (Default — Press G for Guess)'}
                    </span>
                  </button>

                  {guessModeActive && !pendingOption && !currentQuestion.response.savedOption && (
                    <span className="text-xs text-purple-800 font-medium hidden sm:inline">
                      Guess intent active (Select & Save an option for Main Guess)
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-3">
                  <span>Right-click or Shift+1–4: Tag 2nd Guess</span>
                  <span>·</span>
                  <span>Alt+1–4: Strike out option</span>
                </div>
              </div>

              {/* ANSWER OPTIONS (A, B, C, D) WITH EXACT CONFIDENCE VISUAL ENCODINGS */}
              <div className="space-y-3">
                {currentQuestion.question.options.map((opt: any) => {
                  const isSelectedPending = pendingOption === opt.id;
                  const isSavedCommitted = currentQuestion.response.savedOption === opt.id;
                  const isEliminated = eliminatedOptions.includes(opt.id);
                  const isSecondGuess = secondGuessOption === opt.id;
                  const isMainGuessVisual =
                    (isSelectedPending || isSavedCommitted) && guessModeActive;

                  let containerStyle =
                    'bg-white border-slate-200 hover:border-slate-300 text-slate-900';

                  if (isMainGuessVisual) {
                    containerStyle = 'bg-[#E9D5FF] border-[#A855F7] text-slate-950 border-2';
                  } else if (isSecondGuess) {
                    containerStyle = 'bg-[#FED7AA] border-[#F97316] text-slate-950 border-2';
                  } else if (isSelectedPending || isSavedCommitted) {
                    containerStyle = 'bg-sky-50 border-sky-600 text-slate-950 border-2';
                  } else if (isEliminated) {
                    containerStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-75';
                  }

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleOptionSelect(opt.id)}
                      onContextMenu={(e) => handleToggleSecondGuess(opt.id, e)}
                      className={`group relative rounded-lg border p-3.5 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${containerStyle}`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        {/* Option Radio Key */}
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 border ${
                            isMainGuessVisual
                              ? 'bg-purple-700 text-white border-purple-800'
                              : isSecondGuess
                              ? 'bg-orange-600 text-white border-orange-700'
                              : isSelectedPending || isSavedCommitted
                              ? 'bg-sky-600 text-white border-sky-700'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {opt.id}
                        </div>

                        <div className="space-y-1 flex-1 min-w-0">
                          <div
                            className={`text-sm md:text-[15px] leading-snug break-words ${
                              isEliminated ? 'line-through text-slate-400' : 'font-medium'
                            }`}
                          >
                            {opt.text}
                          </div>

                          {/* Status Sub-labels */}
                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            {isSavedCommitted && (
                              <span className="font-semibold text-emerald-800">
                                ● Committed Answer
                              </span>
                            )}
                            {isSelectedPending && !isSavedCommitted && strictSaveMode && (
                              <span className="font-semibold text-amber-800">
                                ○ Pending (Click Save & Next to commit)
                              </span>
                            )}
                            {isMainGuessVisual && (
                              <span className="font-semibold text-purple-900">
                                · Main Guess (Graded)
                              </span>
                            )}
                            {isSecondGuess && (
                              <span className="font-semibold text-orange-900">
                                · Second Guess (Analytical Only — Not Graded)
                              </span>
                            )}
                            {isEliminated && (
                              <span className="font-semibold text-slate-500">
                                · Eliminated Option
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right-side Quick Controls for 2nd Guess & Option Elimination */}
                      <div
                        className="flex items-center gap-1.5 shrink-0 self-end sm:self-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleToggleSecondGuess(opt.id, e)}
                          title="Tag as Second Guess (Alternative ungraded option — Shortcut: Shift + 1-4 or Right-click)"
                          className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            isSecondGuess
                              ? 'bg-orange-600 text-white border-orange-700'
                              : 'bg-white/90 text-slate-600 border-slate-200 hover:bg-orange-50 hover:text-orange-800 hover:border-orange-300'
                          }`}
                        >
                          2nd Guess
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleToggleEliminateOption(opt.id, e)}
                          title="Strike through / Eliminate option (Shortcut: Alt + 1-4)"
                          className={`p-1.5 rounded border transition-colors cursor-pointer ${
                            isEliminated
                              ? 'bg-slate-800 text-white border-slate-900'
                              : 'bg-white/90 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <Slash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* TUTOR / PRACTICE MODE INSTANT EXPLANATION PANEL */}
              {isPracticeMode &&
                (currentQuestion.response.savedOption || pendingOption) &&
                currentQuestion.question.explanation && (
                  <div className="mt-6 p-5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-sky-600" />
                        Tutor Mode Instant Feedback
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-700">
                        Correct Answer: Option {currentQuestion.question.correctOption}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {currentQuestion.question.explanation.summary}
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {currentQuestion.question.explanation.details}
                    </p>
                  </div>
                )}
            </div>
          </div>

          {/* 3. BOTTOM EXAMINATION CONTROLS IN EXACT ORDER (Section 5.2) */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 sticky bottom-0 z-20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Save & Next */}
                <button
                  type="button"
                  onClick={handleSaveAndNext}
                  className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Save & Next
                </button>

                {/* 2. Clear Response */}
                <button
                  type="button"
                  onClick={handleClearResponseClick}
                  className="px-3.5 py-2 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Clear Response
                </button>

                {/* 3. Save & Mark for Review */}
                <button
                  type="button"
                  onClick={handleSaveAndMarkForReview}
                  className="px-3.5 py-2 rounded-md bg-purple-700 hover:bg-purple-800 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Save & Mark for Review
                </button>

                {/* 4. Mark for Review & Next */}
                <button
                  type="button"
                  onClick={handleMarkForReviewAndNext}
                  className="px-3.5 py-2 rounded-md bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Mark for Review & Next
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* 5. Back */}
                <button
                  type="button"
                  onClick={handleNavigateBack}
                  disabled={currentIdx === 0}
                  className="px-3.5 py-2 rounded-md bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 border border-slate-300 text-xs font-medium flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                {/* 6. Next */}
                <button
                  type="button"
                  onClick={handleNavigateNext}
                  disabled={currentIdx === questions.length - 1}
                  className="px-3.5 py-2 rounded-md bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 border border-slate-300 text-xs font-medium flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* 7. Submit */}
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* 4. RIGHT SIDEBAR: QUESTION PALETTE & LEGEND (3 cols on desktop) */}
        <aside
          className={`${
            showMobilePalette
              ? 'fixed inset-0 z-40 bg-white flex flex-col p-4 overflow-y-auto lg:static lg:p-0'
              : 'hidden lg:flex lg:flex-col'
          } lg:col-span-3 bg-slate-50/60`}
        >
          {showMobilePalette && (
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 lg:hidden">
              <span className="font-bold text-sm">Question Palette</span>
              <button
                onClick={() => setShowMobilePalette(false)}
                className="px-3 py-1 bg-slate-900 text-white text-xs rounded"
              >
                Close
              </button>
            </div>
          )}

          {/* Legend & State Counters (Derived strictly from persisted state) */}
          <div className="p-4 border-b border-slate-200 bg-white space-y-2.5">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>NBEMS Question Palette Legend</span>
              <span className="font-mono text-[11px] text-slate-500">
                {sections[activeSectionIndex]?.name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-emerald-600 text-white font-mono font-bold flex items-center justify-center shrink-0">
                  {paletteCounts.answered}
                </span>
                <span>Answered</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-orange-600 text-white font-mono font-bold flex items-center justify-center shrink-0">
                  {paletteCounts.not_answered}
                </span>
                <span>Not Answered</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-slate-200 text-slate-700 border border-slate-300 font-mono font-bold flex items-center justify-center shrink-0">
                  {paletteCounts.not_visited}
                </span>
                <span>Not Visited</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-700 text-white font-mono font-bold flex items-center justify-center shrink-0">
                  {paletteCounts.marked_for_review}
                </span>
                <span>Marked for Review</span>
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <span className="relative w-6 h-6 rounded-full bg-purple-700 text-white font-mono font-bold flex items-center justify-center shrink-0">
                  {paletteCounts.answered_and_marked_for_review}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border border-white flex items-center justify-center">
                    <Check className="w-2 h-2 text-white" />
                  </span>
                </span>
                <span>Answered & Marked for Review (Will be evaluated)</span>
              </div>

              <div className="col-span-2 flex items-center gap-2 pt-1 border-t border-slate-100">
                <span className="w-5 h-5 rounded bg-amber-100 border border-amber-400 text-amber-900 font-mono font-bold flex items-center justify-center text-[10px] shrink-0">
                  ?
                </span>
                <span>
                  Small <strong>?</strong> badge = Main Guess / Guess Intent ({paletteCounts.guessed})
                </span>
              </div>
            </div>
          </div>

          {/* Question Grid */}
          <div className="p-4 flex-1 overflow-y-auto max-h-[calc(100vh-340px)]">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const pState: PaletteQuestionState = derivePaletteState(q.response);
                const isCurrent = idx === currentIdx;
                const isDifferentLockedSection =
                  isSectional &&
                  q.sectionIndex !== activeSectionIndex &&
                  !sections[q.sectionIndex]?.allowReturnAfterLock;

                const hasGuessBadge =
                  q.response.confidence === 'main_guess' ||
                  q.response.confidence === 'guess_intent_unattempted';
                const hasElims =
                  Array.isArray(q.response.eliminatedOptions) &&
                  q.response.eliminatedOptions.length > 0;

                let shapeClass =
                  'rounded bg-slate-200 text-slate-800 border border-slate-300';
                if (pState === 'answered') {
                  shapeClass = 'rounded-t-lg bg-emerald-600 text-white border border-emerald-700';
                } else if (pState === 'not_answered') {
                  shapeClass = 'rounded-b-lg bg-orange-600 text-white border border-orange-700';
                } else if (pState === 'marked_for_review') {
                  shapeClass = 'rounded-full bg-purple-700 text-white border border-purple-800';
                } else if (pState === 'answered_and_marked_for_review') {
                  shapeClass = 'rounded-full bg-purple-700 text-white border border-purple-800';
                }

                return (
                  <button
                    key={q.testQuestionId}
                    type="button"
                    onClick={() => handlePaletteJump(idx)}
                    disabled={isDifferentLockedSection}
                    className={`relative h-9 w-full font-mono text-xs font-bold tabular-nums flex items-center justify-center transition-transform ${shapeClass} ${
                      isCurrent ? 'ring-2 ring-sky-500 ring-offset-2 scale-105 z-10' : ''
                    } ${isDifferentLockedSection ? 'opacity-35 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'}`}
                  >
                    <span>{q.questionOrder}</span>

                    {/* Answered & Marked for Review Green Tick */}
                    {pState === 'answered_and_marked_for_review' && (
                      <span
                        title="Answered & Marked for Review (Evaluated)"
                        className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border border-white flex items-center justify-center"
                      >
                        <Check className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}

                    {/* Guess ? Badge (Never uses full purple palette fill) */}
                    {hasGuessBadge && (
                      <span
                        title="Guessed Question"
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-300 text-slate-950 border border-slate-900 text-[9px] font-bold flex items-center justify-center"
                      >
                        ?
                      </span>
                    )}

                    {/* Option Elimination Dot */}
                    {hasElims && (
                      <span
                        title={`${q.response.eliminatedOptions.length} option(s) eliminated`}
                        className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-slate-800 text-white text-[8px] flex items-center justify-center"
                      >
                        /
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Keyboard Shortcuts Cheat Sheet */}
          <div className="p-3.5 border-t border-slate-200 bg-white text-[11px] text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">Keyboard Shortcuts</div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono">
              <span>1–4: Select Option</span>
              <span>Enter: Save & Next</span>
              <span>G: Toggle Guess</span>
              <span>Shift+1–4: 2nd Guess</span>
              <span>Alt+1–4: Eliminate</span>
              <span>X: Clear Response</span>
            </div>
          </div>
        </aside>
      </div>

      {/* CLEAR RESPONSE EDGE-CASE MODAL (Section 7.5) */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Clear Response & Confidence Options
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Clearing this response removes your selected answer and Main Guess status. How would
              you like to handle your tagged{' '}
              <strong>Second Guess ({secondGuessOption || 'None'})</strong> and{' '}
              <strong>Eliminated Options ({eliminatedOptions.length})</strong>?
            </p>
            <div className="space-y-2 pt-2">
              <button
                onClick={() => executeClearResponse(false, false)}
                className="w-full py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold text-left"
              >
                1. Clear Answer & Main Guess, but PRESERVE Second Guess & Eliminated Options
              </button>
              <button
                onClick={() => executeClearResponse(true, false)}
                className="w-full py-2 px-3 rounded bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-semibold text-left"
              >
                2. Clear Answer, Main Guess & Second Guess (Keep Eliminations)
              </button>
              <button
                onClick={() => executeClearResponse(true, true)}
                className="w-full py-2 px-3 rounded bg-red-50 hover:bg-red-100 text-red-800 text-xs font-semibold text-left"
              >
                3. Reset Everything (Clear Answer, All Guesses & All Eliminations)
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINAL SUBMISSION CONFIRMATION MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <ShieldCheck className="w-5 h-5 text-sky-600" />
              <h3 className="text-base font-bold">
                Confirm Examination Submission
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              Please review your persisted response summary before final server-side scoring.
              Remember: in Strict Save Mode, only committed saved responses (Answered and Answered &
              Marked for Review) are graded.
            </p>

            <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded bg-slate-50 border border-slate-200 text-xs font-mono tabular-nums">
              <div>
                <div className="text-slate-500 font-sans">Answered</div>
                <div className="text-base font-bold text-emerald-700">
                  {paletteCounts.answered}
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-sans">Answered + Review</div>
                <div className="text-base font-bold text-purple-700">
                  {paletteCounts.answered_and_marked_for_review}
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-sans">Not Answered</div>
                <div className="text-base font-bold text-orange-600">
                  {paletteCounts.not_answered}
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-sans">Marked (No Answer)</div>
                <div className="text-base font-bold text-purple-600">
                  {paletteCounts.marked_for_review}
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-sans">Not Visited</div>
                <div className="text-base font-bold text-slate-700">
                  {paletteCounts.not_visited}
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-sans">Guess Tagged</div>
                <div className="text-base font-bold text-amber-700">
                  {paletteCounts.guessed}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Return to Exam
              </button>
              <button
                onClick={() => handleFinalExamSubmit(false)}
                className="px-5 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold"
              >
                Submit & Generate Intelligence Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
