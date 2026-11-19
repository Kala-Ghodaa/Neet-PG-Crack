/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Menu } from 'lucide-react';
import {
  apiFetch,
  signInWithGooglePopup,
  signOutUser,
  setActiveCandidateProfile,
} from './lib/api.ts';
import { ExamWorkspace } from './components/ExamWorkspace.tsx';
import { PostExamReview } from './components/PostExamReview.tsx';
import { IntelligenceDashboard, type DashboardSubTab } from './components/IntelligenceDashboard.tsx';
import { CustomTestGeneratorModal } from './components/CustomTestGeneratorModal.tsx';
import { AdminQuestionBank } from './components/AdminQuestionBank.tsx';
import { NavigationDrawer } from './components/NavigationDrawer.tsx';
import { FullMockTestSeries } from './components/FullMockTestSeries.tsx';
import { ImportMockPaperModal, type ImportModalTab } from './components/ImportMockPaperModal.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

type ActiveRoute =
  | { view: 'dashboard' }
  | { view: 'mocks' }
  | { view: 'exam'; sessionId: number }
  | { view: 'review'; sessionId: number }
  | { view: 'admin' };

export default function App() {
  const [route, setRoute] = useState<ActiveRoute>({ view: 'dashboard' });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importModalTab, setImportModalTab] = useState<ImportModalTab>('import');
  const [mocksRefreshKey, setMocksRefreshKey] = useState<number>(0);
  const [startingExamKey, setStartingExamKey] = useState<string | null>(null);
  const [dashboardSubTab, setDashboardSubTab] = useState<DashboardSubTab>('overview');
  const isStartingExamRef = useRef<boolean>(false);

  const openImportModal = (tab: ImportModalTab = 'import') => {
    setImportModalTab(tab);
    setShowImportModal(true);
  };

  const loadDashboardAndUser = useCallback(async () => {
    try {
      setLoading(true);
      const [meRes, analyticsRes] = await Promise.all([
        apiFetch('/api/v1/auth/me'),
        apiFetch('/api/v1/analytics/overview'),
      ]);
      setUserProfile(meRes.user);
      setAnalyticsData(analyticsRes);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize platform state');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardAndUser();
  }, [loadDashboardAndUser]);

  const handleStartExamPreset = async (configKey: string, filters?: any) => {
    if (isStartingExamRef.current) return;
    isStartingExamRef.current = true;
    setStartingExamKey(configKey);
    setError(null);
    try {
      const res = await apiFetch('/api/v1/exams/start', {
        method: 'POST',
        body: JSON.stringify({ configKey, filters }),
      });
      setRoute({ view: 'exam', sessionId: res.session.id });
    } catch (err: any) {
      setError(err.message || 'Could not start examination');
    } finally {
      isStartingExamRef.current = false;
      setStartingExamKey(null);
    }
  };

  const handleStartCustomTest = async (filters: any) => {
    setShowCustomModal(false);
    await handleStartExamPreset('neet-pg-custom', filters);
  };

  const handleOpenOrReviewSession = async (sessionId: number) => {
    const sess = analyticsData?.recentSessions?.find(
      (s: any) => s.sessionId === sessionId
    );
    if (sess && sess.status === 'in_progress') {
      setRoute({ view: 'exam', sessionId });
    } else {
      setRoute({ view: 'review', sessionId });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGooglePopup();
      await loadDashboardAndUser();
    } catch {
      // If popup is blocked in sandboxed preview, toggle between Candidate and Admin profiles
      const nextUid =
        userProfile?.uid === 'admin-candidate-01'
          ? 'demo-candidate-01'
          : 'admin-candidate-01';
      setActiveCandidateProfile(nextUid);
      await loadDashboardAndUser();
    }
  };

  const navigateToLatestReview = () => {
    const latestId =
      analyticsData?.latestAnalysis?.sessionId ||
      analyticsData?.recentSessions?.find(
        (s: any) => s.status === 'submitted' || s.status === 'auto_submitted'
      )?.sessionId;
    if (latestId) {
      setError(null);
      setRoute({ view: 'review', sessionId: latestId });
    } else {
      setError('Complete at least one examination session before opening Post-Exam Review.');
      setRoute({ view: 'mocks' });
    }
  };

  const handleExamSubmitted = useCallback(
    async (submittedSessionId: number) => {
      await loadDashboardAndUser();
      setMocksRefreshKey((k) => k + 1);
      setRoute({ view: 'review', sessionId: submittedSessionId });
    },
    [loadDashboardAndUser]
  );

  const handleExitToDashboard = useCallback(async () => {
    await loadDashboardAndUser();
    setMocksRefreshKey((k) => k + 1);
    setRoute({ view: 'dashboard' });
  }, [loadDashboardAndUser]);

  // Full-screen NBEMS Examination Mode hides top marketing/dashboard chrome for zero distraction
  if (route.view === 'exam') {
    return (
      <ErrorBoundary>
        <ExamWorkspace
          sessionId={route.sessionId}
          candidateName={userProfile?.displayName || 'Dr. Ananya Sharma'}
          onExamSubmitted={handleExamSubmitted}
          onExitToDashboard={handleExitToDashboard}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* STRICT 3-ZONE TOP BAR CONTRACT (Frontend Design Constitution Section 2) */}
      <header className="flex items-center justify-between gap-6 px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-30">
        {/* Zone 1: Burger Menu + Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open navigation drawer"
            className="p-1.5 -ml-1.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              setRoute({ view: 'dashboard' });
            }}
            className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            PG-PREP ARENA
          </a>
        </div>

        {/* Zone 2: Concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-600">
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              setRoute({ view: 'dashboard' });
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              route.view === 'dashboard' ? 'text-slate-900 font-semibold underline underline-offset-4' : ''
            }`}
          >
            Dashboard
          </a>
          <a
            href="#full-mocks"
            onClick={(e) => {
              e.preventDefault();
              setRoute({ view: 'mocks' });
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              route.view === 'mocks' ? 'text-slate-900 font-semibold underline underline-offset-4' : ''
            }`}
          >
            Full Mock Series
          </a>
          <a
            href="#custom-test"
            onClick={(e) => {
              e.preventDefault();
              setShowCustomModal(true);
            }}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Custom Test
          </a>
          <a
            href="#latest-review"
            onClick={(e) => {
              e.preventDefault();
              navigateToLatestReview();
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              route.view === 'review' ? 'text-slate-900 font-semibold underline underline-offset-4' : ''
            }`}
          >
            Post-Exam Review
          </a>
          <a
            href="#admin"
            onClick={(e) => {
              e.preventDefault();
              setRoute({ view: 'admin' });
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              route.view === 'admin' ? 'text-slate-900 font-semibold underline underline-offset-4' : ''
            }`}
          >
            Question Bank
          </a>
        </nav>

        {/* Zone 3: Actions (Import Test + Google Profile Switcher) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => openImportModal('import')}
            className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            + Import Test
          </button>
          <button
            onClick={handleGoogleLogin}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {userProfile?.displayName
              ? `${userProfile.displayName.split(' (')[0]} · Switch`
              : 'Sign In'}
          </button>
        </div>
      </header>

      {/* Error Banner if any */}
      {error && (
        <div className="max-w-[1440px] w-full mx-auto px-6 pt-4">
          <div className="p-3.5 rounded bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => loadDashboardAndUser()}
              className="font-semibold underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1">
        {loading && !analyticsData ? (
          <div className="max-w-[1440px] mx-auto px-6 py-16 text-center">
            <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900">
              Loading PG-PREP ARENA Examination & Performance Intelligence...
            </p>
          </div>
        ) : route.view === 'review' ? (
          <PostExamReview
            sessionId={route.sessionId}
            onBackToDashboard={() => {
              setDashboardSubTab('overview');
              setRoute({ view: 'dashboard' });
            }}
            onOpenFullAnalytics={() => {
              setDashboardSubTab('guess_5050');
              setRoute({ view: 'dashboard' });
            }}
          />
        ) : route.view === 'admin' ? (
          <AdminQuestionBank />
        ) : route.view === 'mocks' ? (
          <FullMockTestSeries
            onStartExam={(examId: string) => handleStartExamPreset(examId)}
            onResumeSession={(sessionId: number) => setRoute({ view: 'exam', sessionId })}
            onReviewSession={(sessionId: number) => setRoute({ view: 'review', sessionId })}
            onOpenImportModal={() => openImportModal('import')}
            onOpenPromptGuide={() => openImportModal('prompts')}
            onBackToDashboard={() => {
              setDashboardSubTab('overview');
              setRoute({ view: 'dashboard' });
            }}
            startingExamKey={startingExamKey}
            refreshKey={mocksRefreshKey}
          />
        ) : (
          <IntelligenceDashboard
            analyticsData={analyticsData}
            onStartExamPreset={handleStartExamPreset}
            onOpenCustomGenerator={() => setShowCustomModal(true)}
            onReviewSession={handleOpenOrReviewSession}
            onNavigateToMocks={() => setRoute({ view: 'mocks' })}
            onOpenImportModal={() => openImportModal('import')}
            startingExamKey={startingExamKey}
            initialSubTab={dashboardSubTab}
          />
        )}
      </div>

      {/* Launching Examination Overlay — instant feedback prevents accidental double-taps */}
      {startingExamKey && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-sm w-full p-6 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-sm font-bold text-slate-900">
              Launching Computer-Based Test...
            </div>
            <p className="text-xs text-slate-500">
              Locking server-authoritative timers and snapshotting your question paper.
            </p>
          </div>
        </div>
      )}

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 mt-12 pb-20 md:pb-4">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>
            PG-PREP ARENA · NEET PG & INI-CET Examination & Performance Intelligence Platform
          </span>
          <span>
            Independent Demonstration Question Bank · NBEMS 2026 & AIIMS INI-CET CBT Protocols
          </span>
        </div>
      </footer>

      {/* Mobile Bottom Quick-Navigation Bar (BUG-024 / BUG-025) */}
      <nav
        aria-label="Mobile quick navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-around text-[11px] font-semibold text-slate-600 shadow-lg"
      >
        <button
          type="button"
          onClick={() => {
            setDashboardSubTab('overview');
            setRoute({ view: 'dashboard' });
          }}
          className={`px-2 py-1 rounded ${
            route.view === 'dashboard' ? 'text-sky-700 bg-sky-50' : ''
          }`}
        >
          Dashboard
        </button>
        <button
          type="button"
          onClick={() => setRoute({ view: 'mocks' })}
          className={`px-2 py-1 rounded ${
            route.view === 'mocks' ? 'text-sky-700 bg-sky-50' : ''
          }`}
        >
          Mocks
        </button>
        <button
          type="button"
          onClick={() => setShowCustomModal(true)}
          className="px-2 py-1 rounded"
        >
          Custom
        </button>
        <button
          type="button"
          onClick={navigateToLatestReview}
          className={`px-2 py-1 rounded ${
            route.view === 'review' ? 'text-sky-700 bg-sky-50' : ''
          }`}
        >
          Review
        </button>
        <button
          type="button"
          onClick={() => openImportModal('import')}
          className="px-2 py-1 rounded text-slate-900 bg-slate-100"
        >
          + Import
        </button>
      </nav>

      {/* Navigation Hamburger Drawer */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeView={route.view}
        onNavigate={(view) => {
          if (view === 'review') {
            navigateToLatestReview();
            return;
          }
          setError(null);
          if (view === 'dashboard') {
            setDashboardSubTab('overview');
            setRoute({ view: 'dashboard' });
          } else if (view === 'mocks') {
            setRoute({ view: 'mocks' });
          } else if (view === 'admin') {
            setRoute({ view: 'admin' });
          }
        }}
        onStartFullMock={() => handleStartExamPreset('neet-pg-full-mock-1')}
        onOpenCustomTest={() => setShowCustomModal(true)}
        onOpenImportTest={() => openImportModal('import')}
        userProfile={userProfile}
        analyticsOverview={analyticsData?.overview}
        onSignOutOrSwitch={handleGoogleLogin}
      />

      {/* Import Mock Paper Modal */}
      {showImportModal && (
        <ImportMockPaperModal
          initialTab={importModalTab}
          onClose={() => setShowImportModal(false)}
          onImportSuccess={() => {
            setShowImportModal(false);
            setMocksRefreshKey((k) => k + 1);
            setRoute({ view: 'mocks' });
          }}
        />
      )}

      {showCustomModal && (
        <CustomTestGeneratorModal
          onClose={() => setShowCustomModal(false)}
          onStartCustomTest={handleStartCustomTest}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}
