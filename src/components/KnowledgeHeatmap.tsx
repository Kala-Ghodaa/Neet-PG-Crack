/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import { Grid3X3, LayoutGrid, Play, Flame, Clock, HelpCircle } from 'lucide-react';
import { NEET_PG_SUBJECTS } from '../data/seedQuestions.ts';

export type MasteryTier = 'mastered' | 'proficient' | 'developing' | 'critical' | 'unattempted';
export type HeatmapMetric = 'accuracy' | 'guess' | 'speed';

export interface SubjectMasteryRecord {
  subjectSlug: string;
  subjectName: string;
  code: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  accuracy: number;
  attemptRate: number;
  netScore: number;
  maxMarks: number;
  avgTimeSeconds: number;
  guessPercentage: number;
  sureAccuracy: number;
  mainGuessAccuracy: number;
  sessionsTested: number;
  masteryTier: MasteryTier;
}

export function classifyMasteryTier(attempted: number, accuracy: number): MasteryTier {
  if (attempted <= 0) return 'unattempted';
  if (accuracy >= 75) return 'mastered';
  if (accuracy >= 60) return 'proficient';
  if (accuracy >= 45) return 'developing';
  return 'critical';
}

export function resolveSubjectSlug(subjectNameOrSlug: string): string {
  if (!subjectNameOrSlug) return 'medicine';
  const normalized = subjectNameOrSlug.trim().toLowerCase();
  const bySlug = NEET_PG_SUBJECTS.find((s) => s.slug === normalized);
  if (bySlug) return bySlug.slug;
  const byName = NEET_PG_SUBJECTS.find((s) => s.name.toLowerCase() === normalized);
  if (byName) return byName.slug;
  const byCode = NEET_PG_SUBJECTS.find((s) => s.code.toLowerCase() === normalized);
  if (byCode) return byCode.slug;

  if (normalized.includes('psm') || normalized.includes('community medicine')) {
    return 'community-medicine';
  }
  if (normalized.includes('internal medicine') || normalized === 'general medicine') {
    return 'medicine';
  }
  if (normalized.includes('obstetrics') || normalized.includes('gynecology') || normalized.includes('obg')) {
    return 'obstetrics-gynecology';
  }

  // Fallback fuzzy match stripping punctuation
  const compact = normalized.replace(/[^a-z0-9]+/g, '');
  const fuzzy = NEET_PG_SUBJECTS.find(
    (s) =>
      s.name.toLowerCase().replace(/[^a-z0-9]+/g, '') === compact ||
      s.slug.replace(/[^a-z0-9]+/g, '') === compact
  );
  return fuzzy ? fuzzy.slug : normalized.replace(/\s+/g, '-');
}

export function buildHeatmapSubjects(
  analyticsData: any,
  scope: 'cumulative' | 'latest'
): SubjectMasteryRecord[] {
  if (
    scope === 'cumulative' &&
    Array.isArray(analyticsData?.subjectMasteryAll) &&
    analyticsData.subjectMasteryAll.length > 0
  ) {
    return analyticsData.subjectMasteryAll;
  }

  const sourceList: any[] = analyticsData?.latestAnalysis?.subjectBreakdown || [];
  const bySlug = new Map<string, any>();
  for (const s of sourceList) {
    bySlug.set(resolveSubjectSlug(s.subjectSlug || s.subjectName), s);
  }

  return NEET_PG_SUBJECTS.map((subj) => {
    const found = bySlug.get(subj.slug);
    if (!found) {
      return {
        subjectSlug: subj.slug,
        subjectName: subj.name,
        code: subj.code,
        totalQuestions: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        unattempted: 0,
        accuracy: 0,
        attemptRate: 0,
        netScore: 0,
        maxMarks: 0,
        avgTimeSeconds: 0,
        guessPercentage: 0,
        sureAccuracy: 0,
        mainGuessAccuracy: 0,
        sessionsTested: 0,
        masteryTier: 'unattempted',
      };
    }

    return {
      subjectSlug: subj.slug,
      subjectName: subj.name,
      code: subj.code,
      totalQuestions: found.totalQuestions || 0,
      attempted: found.attempted || 0,
      correct: found.correct || 0,
      incorrect: found.incorrect || 0,
      unattempted: found.unattempted || 0,
      accuracy: found.accuracy || 0,
      attemptRate: found.attemptRate || 0,
      netScore: found.netScore || 0,
      maxMarks: found.maxMarks || 0,
      avgTimeSeconds: found.avgTimeSeconds || 0,
      guessPercentage: found.guessPercentage || 0,
      sureAccuracy: found.sureAccuracy || 0,
      mainGuessAccuracy: found.mainGuessAccuracy || 0,
      sessionsTested: 1,
      masteryTier: classifyMasteryTier(found.attempted || 0, found.accuracy || 0),
    };
  });
}

interface PaletteTokens {
  fillHex: string;
  strokeHex: string;
  textHex: string;
  subTextHex: string;
  tileBgClass: string;
  tileBorderClass: string;
  tileTextClass: string;
  tierLabel: string;
}

function getCellColors(item: SubjectMasteryRecord, metric: HeatmapMetric): PaletteTokens {
  if (item.attempted === 0) {
    return {
      fillHex: '#F1F5F9',
      strokeHex: '#CBD5E1',
      textHex: '#475569',
      subTextHex: '#64748B',
      tileBgClass: 'bg-slate-100 hover:bg-slate-200/70',
      tileBorderClass: 'border-slate-200',
      tileTextClass: 'text-slate-600',
      tierLabel: 'Unattempted',
    };
  }

  if (metric === 'accuracy') {
    if (item.accuracy >= 75) {
      return {
        fillHex: '#047857',
        strokeHex: '#065F46',
        textHex: '#FFFFFF',
        subTextHex: '#D1FAE5',
        tileBgClass: 'bg-emerald-700 hover:bg-emerald-800',
        tileBorderClass: 'border-emerald-800',
        tileTextClass: 'text-white',
        tierLabel: 'Mastered (≥75%)',
      };
    }
    if (item.accuracy >= 60) {
      return {
        fillHex: '#0284C7',
        strokeHex: '#0369A1',
        textHex: '#FFFFFF',
        subTextHex: '#E0F2FE',
        tileBgClass: 'bg-sky-600 hover:bg-sky-700',
        tileBorderClass: 'border-sky-700',
        tileTextClass: 'text-white',
        tierLabel: 'Proficient (60–74%)',
      };
    }
    if (item.accuracy >= 45) {
      return {
        fillHex: '#D97706',
        strokeHex: '#B45309',
        textHex: '#FFFFFF',
        subTextHex: '#FEF3C7',
        tileBgClass: 'bg-amber-600 hover:bg-amber-700',
        tileBorderClass: 'border-amber-700',
        tileTextClass: 'text-white',
        tierLabel: 'Developing (45–59%)',
      };
    }
    return {
      fillHex: '#DC2626',
      strokeHex: '#B91C1C',
      textHex: '#FFFFFF',
      subTextHex: '#FEE2E2',
      tileBgClass: 'bg-red-600 hover:bg-red-700',
      tileBorderClass: 'border-red-700',
      tileTextClass: 'text-white',
      tierLabel: 'Critical Gap (<45%)',
    };
  }

  if (metric === 'guess') {
    if (item.guessPercentage <= 15) {
      return {
        fillHex: '#047857',
        strokeHex: '#065F46',
        textHex: '#FFFFFF',
        subTextHex: '#D1FAE5',
        tileBgClass: 'bg-emerald-700 hover:bg-emerald-800',
        tileBorderClass: 'border-emerald-800',
        tileTextClass: 'text-white',
        tierLabel: 'High Certainty (≤15%)',
      };
    }
    if (item.guessPercentage <= 35) {
      return {
        fillHex: '#0284C7',
        strokeHex: '#0369A1',
        textHex: '#FFFFFF',
        subTextHex: '#E0F2FE',
        tileBgClass: 'bg-sky-600 hover:bg-sky-700',
        tileBorderClass: 'border-sky-700',
        tileTextClass: 'text-white',
        tierLabel: 'Moderate Guess (16–35%)',
      };
    }
    if (item.guessPercentage <= 55) {
      return {
        fillHex: '#7E22CE',
        strokeHex: '#6B21A8',
        textHex: '#FFFFFF',
        subTextHex: '#F3E8FF',
        tileBgClass: 'bg-purple-700 hover:bg-purple-800',
        tileBorderClass: 'border-purple-800',
        tileTextClass: 'text-white',
        tierLabel: 'Heavy Guess (36–55%)',
      };
    }
    return {
      fillHex: '#DC2626',
      strokeHex: '#B91C1C',
      textHex: '#FFFFFF',
      subTextHex: '#FEE2E2',
      tileBgClass: 'bg-red-600 hover:bg-red-700',
      tileBorderClass: 'border-red-700',
      tileTextClass: 'text-white',
      tierLabel: 'Guess Dependent (>55%)',
    };
  }

  // metric === 'speed'
  if (item.avgTimeSeconds <= 45) {
    return {
      fillHex: '#047857',
      strokeHex: '#065F46',
      textHex: '#FFFFFF',
      subTextHex: '#D1FAE5',
      tileBgClass: 'bg-emerald-700 hover:bg-emerald-800',
      tileBorderClass: 'border-emerald-800',
      tileTextClass: 'text-white',
      tierLabel: 'Rapid (≤45s/Q)',
    };
  }
  if (item.avgTimeSeconds <= 60) {
    return {
      fillHex: '#0284C7',
      strokeHex: '#0369A1',
      textHex: '#FFFFFF',
      subTextHex: '#E0F2FE',
      tileBgClass: 'bg-sky-600 hover:bg-sky-700',
      tileBorderClass: 'border-sky-700',
      tileTextClass: 'text-white',
      tierLabel: 'On-Pace (46–60s/Q)',
    };
  }
  if (item.avgTimeSeconds <= 80) {
    return {
      fillHex: '#D97706',
      strokeHex: '#B45309',
      textHex: '#FFFFFF',
      subTextHex: '#FEF3C7',
      tileBgClass: 'bg-amber-600 hover:bg-amber-700',
      tileBorderClass: 'border-amber-700',
      tileTextClass: 'text-white',
      tierLabel: 'Slow (61–80s/Q)',
    };
  }
  return {
    fillHex: '#DC2626',
    strokeHex: '#B91C1C',
    textHex: '#FFFFFF',
    subTextHex: '#FEE2E2',
    tileBgClass: 'bg-red-600 hover:bg-red-700',
    tileBorderClass: 'border-red-700',
    tileTextClass: 'text-white',
    tierLabel: 'Time Sink (>80s/Q)',
  };
}

function getPrimaryMetricText(item: SubjectMasteryRecord, metric: HeatmapMetric): string {
  if (item.attempted === 0) return '—';
  if (metric === 'accuracy') return `${item.accuracy}%`;
  if (metric === 'guess') return `${item.guessPercentage}%`;
  return `${item.avgTimeSeconds}s`;
}

interface CustomTreemapCellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  payload?: any;
  metric: HeatmapMetric;
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  [key: string]: any;
}

const HeatmapTreemapCell: React.FC<CustomTreemapCellProps> = (props) => {
  const { x = 0, y = 0, width = 0, height = 0, metric, selectedSlug, onSelect } = props;
  const record: SubjectMasteryRecord | undefined = props.record;
  if (!record || width <= 4 || height <= 4) return null;

  const palette = getCellColors(record, metric);
  const isSelected = selectedSlug === record.subjectSlug;
  const primaryText = getPrimaryMetricText(record, metric);

  const showFullName = width >= 110 && height >= 56;
  const showCode = width >= 46 && height >= 34;
  const showSubStats = width >= 115 && height >= 76;

  return (
    <g
      onClick={() => onSelect(record.subjectSlug)}
      style={{ cursor: 'pointer' }}
    >
      <rect
        x={x + 2}
        y={y + 2}
        width={Math.max(0, width - 4)}
        height={Math.max(0, height - 4)}
        rx={6}
        ry={6}
        fill={palette.fillHex}
        stroke={isSelected ? '#0F172A' : palette.strokeHex}
        strokeWidth={isSelected ? 2.5 : 1}
      />
      {showCode && (
        <text
          x={x + 10}
          y={y + 20}
          fill={palette.textHex}
          fontSize={showFullName ? 12 : 11}
          fontWeight={700}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {showFullName
            ? record.subjectName.length > Math.floor((width - 20) / 7)
              ? `${record.subjectName.slice(0, Math.max(4, Math.floor((width - 26) / 7)))}…`
              : record.subjectName
            : record.code}
        </text>
      )}
      {showCode && height >= 42 && (
        <text
          x={x + 10}
          y={y + (showFullName ? 40 : 35)}
          fill={palette.textHex}
          fontSize={showFullName ? 15 : 12}
          fontWeight={700}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          {primaryText}
        </text>
      )}
      {showSubStats && (
        <text
          x={x + 10}
          y={y + 58}
          fill={palette.subTextHex}
          fontSize={10}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          {record.attempted}/{record.totalQuestions} Qs · {record.correct}✓ {record.incorrect}✗
        </text>
      )}
    </g>
  );
};

interface KnowledgeHeatmapProps {
  analyticsData: any;
  onPracticeSubject: (subjectSlug: string) => void;
}

export const KnowledgeHeatmap: React.FC<KnowledgeHeatmapProps> = ({
  analyticsData,
  onPracticeSubject,
}) => {
  const [scope, setScope] = useState<'cumulative' | 'latest'>('cumulative');
  const [metric, setMetric] = useState<HeatmapMetric>('accuracy');
  const [viewMode, setViewMode] = useState<'treemap' | 'matrix'>('treemap');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const subjects = useMemo(
    () => buildHeatmapSubjects(analyticsData, scope),
    [analyticsData, scope]
  );

  const hasAnyAttempt = useMemo(
    () => subjects.some((s) => s.attempted > 0),
    [subjects]
  );

  // Pick initial inspected subject: weakest attempted subject by default
  const activeRecord = useMemo(() => {
    if (selectedSlug) {
      const found = subjects.find((s) => s.subjectSlug === selectedSlug);
      if (found) return found;
    }
    const attempted = subjects.filter((s) => s.attempted > 0);
    if (attempted.length === 0) return subjects[0] || null;
    return [...attempted].sort((a, b) => a.accuracy - b.accuracy)[0];
  }, [subjects, selectedSlug]);

  const tierCounts = useMemo(() => {
    return subjects.reduce(
      (acc, s) => {
        acc[s.masteryTier] += 1;
        return acc;
      },
      { mastered: 0, proficient: 0, developing: 0, critical: 0, unattempted: 0 } as Record<
        MasteryTier,
        number
      >
    );
  }, [subjects]);

  // Recharts Treemap data: ensure minimum tile size so all 19 subjects remain visible & clickable
  const treemapData = useMemo(() => {
    return subjects.map((s) => ({
      name: s.subjectName,
      size: Math.max(4, s.totalQuestions > 0 ? s.totalQuestions : 4),
      record: s,
    }));
  }, [subjects]);

  const legendItems = useMemo(() => {
    if (metric === 'accuracy') {
      return [
        { label: 'Mastered (≥75%)', color: 'bg-emerald-700', count: tierCounts.mastered },
        { label: 'Proficient (60–74%)', color: 'bg-sky-600', count: tierCounts.proficient },
        { label: 'Developing (45–59%)', color: 'bg-amber-600', count: tierCounts.developing },
        { label: 'Critical Gap (<45%)', color: 'bg-red-600', count: tierCounts.critical },
        { label: 'Unattempted', color: 'bg-slate-200 border border-slate-300', count: tierCounts.unattempted },
      ];
    }
    if (metric === 'guess') {
      return [
        { label: 'High Certainty (≤15%)', color: 'bg-emerald-700' },
        { label: 'Moderate Guess (16–35%)', color: 'bg-sky-600' },
        { label: 'Heavy Guess (36–55%)', color: 'bg-purple-700' },
        { label: 'Guess Dependent (>55%)', color: 'bg-red-600' },
        { label: 'Unattempted', color: 'bg-slate-200 border border-slate-300' },
      ];
    }
    return [
      { label: 'Rapid (≤45s/Q)', color: 'bg-emerald-700' },
      { label: 'On-Pace (46–60s/Q)', color: 'bg-sky-600' },
      { label: 'Slow (61–80s/Q)', color: 'bg-amber-600' },
      { label: 'Time Sink (>80s/Q)', color: 'bg-red-600' },
      { label: 'Unattempted', color: 'bg-slate-200 border border-slate-300' },
    ];
  }, [metric, tierCounts]);

  const activePalette = activeRecord ? getCellColors(activeRecord, metric) : null;

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-slate-900" />
            <h2 className="text-base font-bold text-slate-900">
              19-Subject Clinical Knowledge Heatmap
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Interactive subject-wise mastery visualization sized by question volume · Click any
            subject to inspect diagnostics and launch targeted revision
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Scope Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md text-xs">
            <button
              type="button"
              onClick={() => setScope('cumulative')}
              className={`px-2.5 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                scope === 'cumulative'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cumulative (All Tests)
            </button>
            <button
              type="button"
              onClick={() => setScope('latest')}
              className={`px-2.5 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                scope === 'latest'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Latest Exam
            </button>
          </div>

          {/* Metric Dimension Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md text-xs">
            <button
              type="button"
              onClick={() => setMetric('accuracy')}
              className={`px-2.5 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                metric === 'accuracy'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mastery %
            </button>
            <button
              type="button"
              onClick={() => setMetric('guess')}
              className={`px-2.5 py-1.5 rounded font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                metric === 'guess'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-3 h-3" />
              <span>Guess %</span>
            </button>
            <button
              type="button"
              onClick={() => setMetric('speed')}
              className={`px-2.5 py-1.5 rounded font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                metric === 'speed'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Speed</span>
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md text-xs">
            <button
              type="button"
              onClick={() => setViewMode('treemap')}
              title="Recharts proportional volume treemap"
              className={`px-2.5 py-1.5 rounded font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'treemap'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Treemap</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              title="Uniform 19-subject clinical matrix"
              className={`px-2.5 py-1.5 rounded font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* Explicit Accessible Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          {legendItems.map((leg) => (
            <div key={leg.label} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-xs shrink-0 ${leg.color}`} />
              <span>{leg.label}</span>
              {'count' in leg && typeof leg.count === 'number' && (
                <span className="font-mono tabular-nums text-slate-400">({leg.count})</span>
              )}
            </div>
          ))}
        </div>
        <span className="text-[11px] font-mono tabular-nums text-slate-500">
          {subjects.filter((s) => s.attempted > 0).length} / 19 subjects evaluated
        </span>
      </div>

      {!hasAnyAttempt ? (
        <div className="p-10 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-800">
            No subject mastery data recorded yet.
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Complete a 200-Q Full Mock or a 25-Q Sectional Sprint to populate your 19-subject
            clinical knowledge heatmap.
          </p>
        </div>
      ) : viewMode === 'treemap' ? (
        /* RECHARTS INTERACTIVE TREEMAP HEATMAP */
        <div className="w-full h-[340px] bg-slate-50/60 border border-slate-200 rounded-lg p-2">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#FFFFFF"
              isAnimationActive={false}
              content={
                <HeatmapTreemapCell
                  metric={metric}
                  selectedSlug={activeRecord?.subjectSlug || null}
                  onSelect={(slug) => setSelectedSlug(slug)}
                />
              }
            >
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const rec: SubjectMasteryRecord | undefined = payload[0]?.payload?.record;
                  if (!rec) return null;
                  const p = getCellColors(rec, metric);
                  return (
                    <div className="bg-slate-900 text-white border border-slate-700 rounded-md px-3.5 py-2.5 text-xs shadow-lg space-y-1 max-w-[240px]">
                      <div className="font-bold text-white flex items-center justify-between gap-3">
                        <span>{rec.subjectName}</span>
                        <span className="font-mono text-slate-300">{rec.code}</span>
                      </div>
                      <div className="text-[11px] text-sky-300 font-medium">{p.tierLabel}</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1 border-t border-slate-700 font-mono tabular-nums text-[11px]">
                        <span className="text-slate-400 font-sans">Accuracy</span>
                        <span className="text-right font-bold">{rec.accuracy}%</span>
                        <span className="text-slate-400 font-sans">Attempted</span>
                        <span className="text-right">
                          {rec.attempted}/{rec.totalQuestions}
                        </span>
                        <span className="text-slate-400 font-sans">Correct / Wrong</span>
                        <span className="text-right">
                          {rec.correct} / {rec.incorrect}
                        </span>
                        <span className="text-slate-400 font-sans">Net Score</span>
                        <span className="text-right">
                          {rec.netScore}/{rec.maxMarks}
                        </span>
                        <span className="text-slate-400 font-sans">Guess Rate</span>
                        <span className="text-right">{rec.guessPercentage}%</span>
                        <span className="text-slate-400 font-sans">Avg Speed</span>
                        <span className="text-right">{rec.avgTimeSeconds}s/Q</span>
                      </div>
                    </div>
                  );
                }}
              />
            </Treemap>
          </ResponsiveContainer>
        </div>
      ) : (
        /* UNIFORM 19-SUBJECT CLINICAL MATRIX HEATMAP */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
          {subjects.map((subj) => {
            const palette = getCellColors(subj, metric);
            const isSelected = activeRecord?.subjectSlug === subj.subjectSlug;
            return (
              <button
                key={subj.subjectSlug}
                type="button"
                onClick={() => setSelectedSlug(subj.subjectSlug)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[92px] ${
                  palette.tileBgClass
                } ${palette.tileBorderClass} ${palette.tileTextClass} ${
                  isSelected ? 'ring-2 ring-slate-900 ring-offset-2' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xs font-bold leading-tight line-clamp-2">
                    {subj.subjectName}
                  </span>
                  <span className="text-[10px] font-mono opacity-80 shrink-0">{subj.code}</span>
                </div>
                <div className="pt-2 flex items-baseline justify-between font-mono tabular-nums">
                  <span className="text-lg font-bold">
                    {getPrimaryMetricText(subj, metric)}
                  </span>
                  <span className="text-[10px] opacity-85">
                    {subj.attempted > 0 ? `${subj.correct}/${subj.attempted}` : '0 Qs'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected Subject Diagnostic Drill-Down Strip */}
      {activeRecord && activePalette && (
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-900 text-sm">
                {activeRecord.subjectName}
              </span>
              <span className="text-slate-300">·</span>
              <span className="font-mono text-slate-500">{activeRecord.code}</span>
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-slate-700">{activePalette.tierLabel}</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-mono tabular-nums text-slate-600 pt-0.5">
              <span>
                Accuracy: <strong className="text-slate-900">{activeRecord.accuracy}%</strong>
              </span>
              <span>
                Correct/Wrong:{' '}
                <strong className="text-emerald-700">{activeRecord.correct}</strong> /{' '}
                <strong className="text-red-600">{activeRecord.incorrect}</strong>
              </span>
              <span>
                Net Marks:{' '}
                <strong className="text-slate-900">
                  {activeRecord.netScore}/{activeRecord.maxMarks}
                </strong>
              </span>
              <span>
                Sure vs Guess:{' '}
                <strong className="text-sky-700">{activeRecord.sureAccuracy}%</strong> /{' '}
                <strong className="text-purple-700">{activeRecord.mainGuessAccuracy}%</strong>
              </span>
              <span>
                Speed: <strong className="text-slate-900">{activeRecord.avgTimeSeconds}s/Q</strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onPracticeSubject(activeRecord.subjectSlug)}
            className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer self-start lg:self-center"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Launch 10-Q {activeRecord.code} Practice</span>
          </button>
        </div>
      )}
    </section>
  );
};
