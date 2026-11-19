/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Upload,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Copy,
  Check,
  Download,
  FileJson,
  BookOpen,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import {
  SAMPLE_IMPORTABLE_MOCK_PAPER,
  SAMPLE_IMPORTABLE_INICET_PAPER,
} from '../data/seedQuestions.ts';
import {
  MOCK_PAPER_GENERATION_PROMPTS,
  EXAM_FORMAT_VALIDATION_MATRIX,
} from '../data/questionBankGuide.ts';

export type ImportModalTab = 'import' | 'prompts' | 'samples';

interface ImportMockPaperModalProps {
  onClose: () => void;
  onImportSuccess: (importedPaper: any) => void;
  initialTab?: ImportModalTab;
}

export const ImportMockPaperModal: React.FC<ImportMockPaperModalProps> = ({
  onClose,
  onImportSuccess,
  initialTab = 'import',
}) => {
  const [activeTab, setActiveTab] = useState<ImportModalTab>(initialTab);
  const [promptExamType, setPromptExamType] = useState<'NEET-PG' | 'INI-CET'>('NEET-PG');
  const [sampleExamType, setSampleExamType] = useState<'NEET-PG' | 'INI-CET'>('NEET-PG');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [examName, setExamName] = useState(
    'NEET-PG 2026 Custom Grand Mock 11 (NBEMS 180-Q Format)'
  );
  const [examId, setExamId] = useState(`neet-pg-2026-custom-${String(Date.now()).slice(-4)}`);
  const [examDate, setExamDate] = useState('Dec 27, 2026');
  const [targetExam, setTargetExam] = useState<'NEET-PG' | 'INI-CET' | 'FMGE' | 'NEXT'>('NEET-PG');
  const [durationMinutes, setDurationMinutes] = useState(210);
  const [tag, setTag] = useState('NBEMS 2026 · 180 Qs · +4/-1');
  const [description, setDescription] = useState(
    'Validated NEET-PG 2026 Grand Test: 180 MCQs across 5 time-locked 42-minute sections (+4 / -1, 720 max marks).'
  );
  const [sectional, setSectional] = useState(true);
  const [rawJsonInput, setRawJsonInput] = useState<string>(
    JSON.stringify(SAMPLE_IMPORTABLE_MOCK_PAPER.questions, null, 2)
  );

  const [validating, setValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<any>(null);

  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setErrorMessage('Clipboard access was blocked. Please select and copy the text manually.');
    }
  };

  const handleDownloadSample = (examType: 'NEET-PG' | 'INI-CET') => {
    const sample =
      examType === 'INI-CET' ? SAMPLE_IMPORTABLE_INICET_PAPER : SAMPLE_IMPORTABLE_MOCK_PAPER;
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      examType === 'INI-CET'
        ? 'inicet-2026-mock-sample.json'
        : 'neet-pg-2026-mock-sample.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const applyExamPreset = (nextExam: 'NEET-PG' | 'INI-CET' | 'FMGE' | 'NEXT') => {
    setTargetExam(nextExam);
    if (nextExam === 'INI-CET') {
      setDurationMinutes(180);
      setTag('AIIMS INI-CET · 200 Qs · +1/-⅓');
      setDescription(
        'Validated AIIMS INI-CET Grand Test: 200 MCQs across 4 time-locked 45-minute parts (+1 / -⅓ negative marking, 200 max marks).'
      );
    } else if (nextExam === 'NEET-PG') {
      setDurationMinutes(210);
      setTag('NBEMS 2026 · 180 Qs · +4/-1');
      setDescription(
        'Validated NEET-PG 2026 Grand Test: 180 MCQs across 5 time-locked 42-minute sections (+4 / -1, 720 max marks).'
      );
    }
  };

  const handleLoadSamplePackage = (examType: 'NEET-PG' | 'INI-CET') => {
    const sample =
      examType === 'INI-CET' ? SAMPLE_IMPORTABLE_INICET_PAPER : SAMPLE_IMPORTABLE_MOCK_PAPER;
    const suffix = String(Date.now()).slice(-4);
    setExamName(sample.examName);
    setExamId(`${examType === 'INI-CET' ? 'inicet-2026-custom' : 'neet-pg-2026-custom'}-${suffix}`);
    setExamDate(sample.date);
    setTargetExam(sample.targetExam);
    setDurationMinutes(sample.durationMinutes);
    setTag(sample.tag);
    setDescription(sample.description);
    setSectional(sample.sectional);
    setRawJsonInput(JSON.stringify(sample, null, 2));
    setErrorMessage(null);
    setActiveTab('import');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const parsed = JSON.parse(text);
        setRawJsonInput(text);
        if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
          if (parsed.examName || parsed.title) setExamName(parsed.examName || parsed.title);
          if (parsed.examId) setExamId(parsed.examId);
          if (parsed.date) setExamDate(parsed.date);
          if (parsed.targetExam) setTargetExam(parsed.targetExam);
          if (parsed.durationMinutes) setDurationMinutes(Number(parsed.durationMinutes));
          if (parsed.tag) setTag(parsed.tag);
          if (parsed.description) setDescription(parsed.description);
          if (typeof parsed.sectional === 'boolean') setSectional(parsed.sectional);
        }
        setErrorMessage(null);
      } catch {
        setErrorMessage('Uploaded file is not valid JSON. Please check syntax and retry.');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmitImport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setValidating(true);
      setErrorMessage(null);

      let parsedQuestions: any[] = [];
      let importedSections: any[] | undefined = undefined;
      let importedMarkingScheme: any | undefined = undefined;

      if (rawJsonInput.trim()) {
        const parsed = JSON.parse(rawJsonInput);
        if (Array.isArray(parsed)) {
          parsedQuestions = parsed;
        } else if (parsed && typeof parsed === 'object') {
          parsedQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
          if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
            importedSections = parsed.sections;
          }
          if (parsed.markingScheme && typeof parsed.markingScheme === 'object') {
            importedMarkingScheme = parsed.markingScheme;
          }
        } else {
          throw new Error(
            'JSON must be either a complete Mock Paper Package object or an array of QuestionBankSchema items.'
          );
        }
      }

      const isInicet = targetExam === 'INI-CET';
      const defaultSections = isInicet
        ? [
            { sectionId: 'part-a', name: 'Part A', questionCount: 50, durationMinutes: 45 },
            { sectionId: 'part-b', name: 'Part B', questionCount: 50, durationMinutes: 45 },
            { sectionId: 'part-c', name: 'Part C', questionCount: 50, durationMinutes: 45 },
            { sectionId: 'part-d', name: 'Part D', questionCount: 50, durationMinutes: 45 },
          ]
        : [
            { sectionId: 'section-a', name: 'Section A', questionCount: 36, durationMinutes: 42 },
            { sectionId: 'section-b', name: 'Section B', questionCount: 36, durationMinutes: 42 },
            { sectionId: 'section-c', name: 'Section C', questionCount: 36, durationMinutes: 42 },
            { sectionId: 'section-d', name: 'Section D', questionCount: 36, durationMinutes: 42 },
            { sectionId: 'section-e', name: 'Section E', questionCount: 36, durationMinutes: 42 },
          ];

      const defaultMarking = isInicet
        ? { correct: 1, incorrect: -1 / 3, unattempted: 0 }
        : { correct: 4, incorrect: -1, unattempted: 0 };

      const payload = {
        examId: examId.trim().toLowerCase().replace(/\s+/g, '-'),
        examName: examName.trim(),
        date: examDate.trim(),
        targetExam,
        durationMinutes: Number(durationMinutes),
        tag: tag.trim(),
        description: description.trim(),
        sectional,
        markingScheme: importedMarkingScheme || defaultMarking,
        sections: sectional ? importedSections || defaultSections : undefined,
        questions: parsedQuestions,
      };

      const res = await apiFetch('/api/v1/mock-papers/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccessReport(res.paper);
      setTimeout(() => {
        onImportSuccess(res.paper);
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import test package');
    } finally {
      setValidating(false);
    }
  };

  const activePromptText =
    promptExamType === 'INI-CET'
      ? MOCK_PAPER_GENERATION_PROMPTS.inicet
      : MOCK_PAPER_GENERATION_PROMPTS.neetPg2026;

  const activeSampleObj =
    sampleExamType === 'INI-CET'
      ? SAMPLE_IMPORTABLE_INICET_PAPER
      : SAMPLE_IMPORTABLE_MOCK_PAPER;

  const activeSampleJson = JSON.stringify(activeSampleObj, null, 2);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-lg max-w-4xl w-full p-6 my-auto max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <Upload className="w-5 h-5 text-sky-600 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Mock Paper Importer, AI Prompt & Sample Schema
              </h2>
              <p className="text-xs text-slate-500">
                Validated against NBEMS NEET-PG 2026 (180 Q · 5×36 · +4/-1) and AIIMS INI-CET (200 Q · 4×50 · +1/-⅓)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Modal Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mt-4 shrink-0 self-start">
          {[
            { id: 'import' as const, label: 'Import Test Paper', icon: Upload },
            { id: 'prompts' as const, label: 'AI Generation Prompts', icon: BookOpen },
            { id: 'samples' as const, label: 'Sample JSON Packages', icon: FileJson },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: IMPORT FORM */}
        {activeTab === 'import' && (
          <form onSubmit={handleSubmitImport} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {/* Quick Pre-fill Bar */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-slate-700">
                <span className="font-semibold text-slate-900">Quick-Fill Verified Blueprints:</span>{' '}
                Pre-load a validated NEET-PG 2026 or INI-CET package, or upload a `.json` file.
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleLoadSamplePackage('NEET-PG')}
                  className="px-3 py-1.5 rounded bg-sky-700 hover:bg-sky-800 text-white font-semibold cursor-pointer whitespace-nowrap"
                >
                  Load NEET-PG Sample
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSamplePackage('INI-CET')}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer whitespace-nowrap"
                >
                  Load INI-CET Sample
                </button>
                <label className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold cursor-pointer whitespace-nowrap">
                  <span>Upload .json</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successReport && (
              <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>
                  "{successReport.title}" saved to the Mock Test Series ({successReport.totalQuestions} Qs, {successReport.sectionCount} sections).
                </span>
              </div>
            )}

            {/* Test Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mock Paper Name *
                </label>
                <input
                  type="text"
                  required
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="e.g. NEET-PG 2026 Custom Grand Mock 11"
                  className="w-full px-3 py-2 rounded border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Test ID / Code *
                </label>
                <input
                  type="text"
                  required
                  value={examId}
                  onChange={(e) => setExamId(e.target.value)}
                  placeholder="e.g. neet-pg-2026-custom-gt-11"
                  className="w-full px-3 py-2 rounded border border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Conducted / Release Date *
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    placeholder="e.g. Dec 27, 2026"
                    className="w-full pl-9 pr-3 py-2 rounded border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Examination (Auto-applies official pattern)
                </label>
                <select
                  value={targetExam}
                  onChange={(e) => applyExamPreset(e.target.value as any)}
                  className="w-full px-3 py-2 rounded border border-slate-300 text-xs bg-white"
                >
                  <option value="NEET-PG">NEET-PG 2026 (180 Qs · 5×36 · 210m · +4/-1)</option>
                  <option value="INI-CET">INI-CET AIIMS (200 Qs · 4×50 · 180m · +1/-⅓)</option>
                  <option value="FMGE">FMGE</option>
                  <option value="NEXT">NEXT 1</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={15}
                  max={300}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-slate-300 text-xs font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Key Focus Tag
                </label>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="e.g. NBEMS 2026 · 180 Qs · +4/-1"
                  className="w-full px-3 py-2 rounded border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Test Description & Candidate Instructions
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 text-xs"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sectional}
                  onChange={(e) => setSectional(e.target.checked)}
                />
                <span>
                  {targetExam === 'INI-CET'
                    ? 'Enable AIIMS INI-CET 4-Part Time-Locking (Parts A–D, 50 Qs each, 45 mins/part, +1 / -⅓)'
                    : 'Enable NBEMS 2026 5-Section Time-Locking (Sections A–E, 36 Qs each, 42 mins/section, +4 / -1)'}
                </span>
              </label>
            </div>

            {/* Full Mock Package OR Questions Array JSON */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Paste Full Mock Paper JSON Package OR Questions Array (Schema v1.0)
                </label>
                <span className="text-[11px] text-slate-500">
                  Imported questions are placed first; any remaining slots draw from the verified bank.
                </span>
              </div>
              <textarea
                rows={8}
                value={rawJsonInput}
                onChange={(e) => setRawJsonInput(e.target.value)}
                className="w-full p-2.5 rounded border border-slate-300 font-mono text-[11px] bg-slate-50"
                placeholder='{ "examId": "...", "sections": [...], "questions": [...] } or [ { "schemaVersion": "1.0", ... } ]'
              />
            </div>

            {/* Footer Controls */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('prompts')}
                className="text-xs font-semibold text-sky-700 hover:text-sky-900 underline cursor-pointer"
              >
                Need an AI prompt to generate this JSON?
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={validating}
                  className="px-5 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>{validating ? 'Validating & Saving...' : 'Save & Add to Mock Series'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: AI GENERATION PROMPTS & FORMAT VALIDATION */}
        {activeTab === 'prompts' && (
          <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
            {/* Official Format Validation Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {EXAM_FORMAT_VALIDATION_MATRIX.map((spec) => (
                <div
                  key={spec.exam}
                  className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900">{spec.exam}</span>
                    <span className="text-[11px] font-mono tabular-nums font-semibold text-sky-700">
                      {spec.totalQuestions} Qs · {spec.totalDurationMinutes}m · {spec.maxMarks} Marks
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">{spec.authority}</div>
                  <div className="text-xs text-slate-700 space-y-1 pt-1 border-t border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-900">Structure:</span>{' '}
                      {spec.sectionsLabel} ({spec.questionsPerSection} Qs × {spec.sectionDurationMinutes}m each)
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">Marking:</span>{' '}
                      <span className="font-mono tabular-nums">{spec.markingLabel}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">Locking:</span>{' '}
                      {spec.navigationRule}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Prompt Selector + Copy Action */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPromptExamType('NEET-PG')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                      promptExamType === 'NEET-PG'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    NEET-PG 2026 Prompt (180 Qs)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromptExamType('INI-CET')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                      promptExamType === 'INI-CET'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    INI-CET AIIMS Prompt (200 Qs)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyText(activePromptText, `prompt-${promptExamType}`)}
                  className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === `prompt-${promptExamType}` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied Prompt</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Full Prompt</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[380px] overflow-y-auto border border-slate-800">
                {activePromptText}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: SAMPLE JSON PACKAGES */}
        {activeTab === 'samples' && (
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSampleExamType('NEET-PG')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                    sampleExamType === 'NEET-PG'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  NEET-PG 2026 Sample JSON
                </button>
                <button
                  type="button"
                  onClick={() => setSampleExamType('INI-CET')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                    sampleExamType === 'INI-CET'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  INI-CET AIIMS Sample JSON
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(activeSampleJson, `sample-${sampleExamType}`)}
                  className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === `sample-${sampleExamType}` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied JSON</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadSample(sampleExamType)}
                  className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .json</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSamplePackage(sampleExamType)}
                  className="px-3.5 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Load into Importer
                </button>
              </div>
            </div>

            <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre max-h-[420px] overflow-y-auto border border-slate-800">
              {activeSampleJson}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
