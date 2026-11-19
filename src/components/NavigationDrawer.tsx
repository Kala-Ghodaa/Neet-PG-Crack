/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  LayoutDashboard,
  FileCheck2,
  Sliders,
  History,
  ShieldCheck,
  PlusCircle,
  Play,
  Award,
  ChevronRight,
  User,
  LogOut,
  Calendar,
} from 'lucide-react';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: string;
  onNavigate: (view: 'dashboard' | 'mocks' | 'admin' | 'review') => void;
  onOpenCustomTest: () => void;
  onOpenImportTest: () => void;
  onStartFullMock: () => void;
  userProfile: any;
  onSignOutOrSwitch: () => void;
  analyticsOverview?: any;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  activeView,
  onNavigate,
  onOpenCustomTest,
  onOpenImportTest,
  onStartFullMock,
  userProfile,
  onSignOutOrSwitch,
  analyticsOverview,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white border-r border-slate-200 shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="text-[11px] font-mono text-sky-700 font-bold uppercase tracking-wider">
              NBEMS CBT Platform
            </div>
            <div className="text-base font-bold text-slate-900 tracking-tight">
              PG-PREP ARENA
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Candidate Profile Strip */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {userProfile?.displayName ? userProfile.displayName.slice(0, 2).toUpperCase() : 'DR'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">
                {userProfile?.displayName || 'Dr. Ananya Sharma'}
              </div>
              <div className="text-[11px] text-slate-500 truncate font-mono">
                {userProfile?.role === 'admin' ? 'Faculty / Admin Mode' : 'Candidate (NEET-PG 2027)'}
              </div>
            </div>
          </div>

          {analyticsOverview && (
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/80 text-[11px] font-mono">
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 block font-sans">Accuracy</span>
                <span className="text-sm font-bold text-emerald-700">
                  {analyticsOverview.overallAccuracy ?? 0}%
                </span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 block font-sans">Mocks Taken</span>
                <span className="text-sm font-bold text-slate-900">
                  {analyticsOverview.testsAttempted ?? 0}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Main Navigation
          </div>

          <button
            type="button"
            onClick={() => {
              onNavigate('dashboard');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-semibold text-left transition-colors cursor-pointer ${
              activeView === 'dashboard'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className="flex-1">Intelligence Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onNavigate('mocks');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-semibold text-left transition-colors cursor-pointer ${
              activeView === 'mocks'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileCheck2 className="w-4 h-4 shrink-0 text-sky-600" />
            <span className="flex-1">Full Mock Test Series</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onNavigate('review');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-semibold text-left transition-colors cursor-pointer ${
              activeView === 'review'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4 shrink-0 text-amber-600" />
            <span className="flex-1">Post-Exam Review</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onNavigate('admin');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-semibold text-left transition-colors cursor-pointer ${
              activeView === 'admin'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0 text-purple-600" />
            <span className="flex-1">Question Bank & Admin</span>
          </button>

          <div className="pt-3 pb-1">
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Exam Launchers & Tools
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onStartFullMock();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-semibold text-sky-900 hover:bg-sky-50 text-left transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4 shrink-0 text-sky-600 fill-sky-600" />
              <span className="flex-1">Launch NEET-PG 180-Q Mock 1</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenImportTest();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-semibold text-emerald-900 hover:bg-emerald-50 text-left transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="flex-1">Import New Test Paper</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCustomTest();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100 text-left transition-colors cursor-pointer"
            >
              <Sliders className="w-4 h-4 shrink-0 text-slate-600" />
              <span className="flex-1">Custom Test Generator</span>
            </button>
          </div>
        </nav>

        {/* Drawer Bottom Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onSignOutOrSwitch();
            }}
            className="w-full px-3 py-2 rounded border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center justify-center gap-2 cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            <span>Switch Profile / Sign In</span>
          </button>
          <div className="text-[10px] text-center text-slate-400 font-mono">
            PG-PREP ARENA · Strict NBEMS CBT Engine
          </div>
        </div>
      </div>
    </div>
  );
};
