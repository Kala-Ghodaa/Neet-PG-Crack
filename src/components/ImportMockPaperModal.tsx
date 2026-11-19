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
  Sparkles,
  Download,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import { SAMPLE_IMPORTABLE_MOCK_PAPER } from '../data/seedQuestions.ts';

interface ImportMockPaperModalProps {
  onClose: () => void;
  onImportSuccess: (importedPaper: any) => void;
}

export const ImportMockPaperModal: React.FC<ImportMockPaperModalProps> = ({
  onClose,
  onImportSuccess,
}) => {
  const [examName, setExamName] = useState(
    'NEET-PG All-India Grand Mock Test 4 (National Benchmark)'
  );
  const [examId, setExamId] = useState(`neet-pg-grand-mock-${String(Date.now()).slice(-4)}`);
  const [examDate, setExamDate] = useState('Nov 15, 2026');
  const [targetExam, setTargetExam] = useState<'NEET-PG' | 'INI-CET' | 'FMGE' | 'NEXT'>('NEET-PG');
  const [durationMinutes, setDurationMinutes] = useState(210);
  const [tag, setTag] = useState('Clinical Vignettes & Rapid Recall');
  const [description, setDescription] = useState(
    'Comprehensive multi-sectional mock examination paper with full clinical vignettes and diagnostic pearls.'
  );
  const [sectional, setSectional] = useState(true);

  const [rawQuestionsJson, setRawQuestionsJson] = useState<string>(
    JSON.stringify(SAMPLE_IMPORTABLE_MOCK_PAPER.questions, null, 2)
  );

  const [validating, setValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<any>(null);

  const handleLoadSamplePackage = () => {
    setExamName(SAMPLE_IMPORTABLE_MOCK_PAPER.examName);
    setExamId(`neet-pg-grand-mock-${String(Date.now()).slice(-4)}`);
    setExamDate(SAMPLE_IMPORTABLE_MOCK_PAPER.date);
    setTargetExam(SAMPLE_IMPORTABLE_MOCK_PAPER.targetExam);
    setDurationMinutes(SAMPLE_IMPORTABLE_MOCK_PAPER.durationMinutes);
    setTag(SAMPLE_IMPORTABLE_MOCK_PAPER.tag);
    setDescription(SAMPLE_IMPORTABLE_MOCK_PAPER.description);
    setSectional(SAMPLE_IMPORTABLE_MOCK_PAPER.sectional);
    setRawQuestionsJson(JSON.stringify(SAMPLE_IMPORTABLE_MOCK_PAPER.questions, null, 2));
    setErrorMessage(null);
  };

  const handleSubmitImport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setValidating(true);
      setErrorMessage(null);

      let parsedQuestions = [];
      if (rawQuestionsJson.trim()) {
        parsedQuestions = JSON.parse(rawQuestionsJson);
        if (!Array.isArray(parsedQuestions)) {
          throw new Error('Questions JSON must be an array of QuestionBankSchema items.');
        }
      }

      const payload = {
        examId: examId.trim().toLowerCase().replace(/\s+/g, '-'),
        examName: examName.trim(),
        date: examDate.trim(),
        targetExam,
        durationMinutes: Number(durationMinutes),
        tag: tag.trim(),
        description: description.trim(),
        sectional,
        sections: sectional
          ? [
              { sectionId: 'section-a', name: 'Section A', questionCount: 40, durationMinutes: 42 },
              { sectionId: 'section-b', name: 'Section B', questionCount: 40, durationMinutes: 42 },
              { sectionId: 'section-c', name: 'Section C', questionCount: 40, durationMinutes: 42 },
              { sectionId: 'section-d', name: 'Section D', questionCount: 40, durationMinutes: 42 },
              { sectionId: 'section-e', name: 'Section E', questionCount: 40, durationMinutes: 42 },
            ]
          : undefined,
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-lg max-w-3xl w-full p-6 my-auto max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3.5 shrink-0">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-sky-600 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Import & Save New Mock Test Paper
              </h2>
              <p className="text-xs text-slate-500">
                Register a new dated mock examination package into the permanent test series
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmitImport} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Quick Pre-fill Banner */}
          <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-sky-900">
              <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
              <span>
                Want to test immediately? Click to pre-fill with a verified 200-Q test template.
              </span>
            </div>
            <button
              type="button"
              onClick={handleLoadSamplePackage}
              className="px-3 py-1 rounded bg-sky-700 hover:bg-sky-800 text-white font-semibold cursor-pointer shrink-0"
            >
              Load Sample Mock Paper
            </button>
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
                ✓ "{successReport.title}" successfully saved to the Mock Test Series! Redirecting...
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
                placeholder="e.g. NEET-PG All-India Grand Mock Test 4"
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
                placeholder="e.g. neet-pg-grand-mock-4"
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
                  placeholder="e.g. Nov 15, 2026"
                  className="w-full pl-9 pr-3 py-2 rounded border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Examination
              </label>
              <select
                value={targetExam}
                onChange={(e) => setTargetExam(e.target.value as any)}
                className="w-full px-3 py-2 rounded border border-slate-300 text-xs bg-white"
              >
                <option value="NEET-PG">NEET-PG</option>
                <option value="INI-CET">INI-CET</option>
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
                className="w-full px-3 py-2 rounded border border-slate-300 text-xs font-mono"
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
                placeholder="e.g. Table & Investigation Intensive"
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
                Enable NBEMS 5-Sectional Time-Locking (Sections A–E, 40 Qs each, 42 mins per section)
              </span>
            </label>
          </div>

          {/* Questions Array JSON */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Optional: Include Custom Questions JSON Array (Schema v1.0)
              </label>
              <span className="text-[11px] text-slate-500">
                If omitted, dynamically pulls from the 200-Q question bank
              </span>
            </div>
            <textarea
              rows={8}
              value={rawQuestionsJson}
              onChange={(e) => setRawQuestionsJson(e.target.value)}
              className="w-full p-2.5 rounded border border-slate-300 font-mono text-[11px] bg-slate-50"
              placeholder="[ { schemaVersion: '1.0', questionId: '...', ... } ]"
            />
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 shrink-0">
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
        </form>
      </div>
    </div>
  );
};
