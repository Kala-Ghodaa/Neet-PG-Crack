import React, { useState } from 'react';
import { X, Play, Sliders } from 'lucide-react';
import { NEET_PG_SUBJECTS } from '../data/seedQuestions.ts';

interface CustomTestGeneratorModalProps {
  onClose: () => void;
  onStartCustomTest: (filters: {
    subjects: string[];
    difficulty: string;
    onlyPyq: boolean;
    onlyBookmarked: boolean;
    onlyIncorrect: boolean;
    questionCount: number;
    durationMinutes: number;
    mode: 'exam' | 'practice';
    sectional: boolean;
    strictSaveMode: boolean;
  }) => void;
}

export const CustomTestGeneratorModal: React.FC<CustomTestGeneratorModalProps> = ({
  onClose,
  onStartCustomTest,
}) => {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<string>('all');
  const [onlyPyq, setOnlyPyq] = useState<boolean>(false);
  const [onlyBookmarked, setOnlyBookmarked] = useState<boolean>(false);
  const [onlyIncorrect, setOnlyIncorrect] = useState<boolean>(false);
  const [questionCount, setQuestionCount] = useState<number>(25);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [mode, setMode] = useState<'exam' | 'practice'>('exam');
  const [sectional, setSectional] = useState<boolean>(true);
  const [strictSaveMode, setStrictSaveMode] = useState<boolean>(true);

  const toggleSubject = (slug: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartCustomTest({
      subjects: selectedSubjects,
      difficulty,
      onlyPyq,
      onlyBookmarked,
      onlyIncorrect,
      questionCount,
      durationMinutes,
      mode,
      sectional,
      strictSaveMode,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-lg max-w-3xl w-full p-6 my-auto max-h-[90vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-600 shrink-0" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Custom NEET PG Test & Practice Generator
              </h2>
              <p className="text-xs text-slate-500">
                Configure subjects, question count, sectional locking, and strict NBEMS save rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* 1. Mode & Examination Rules */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assessment Mode
              </label>
              <select
                value={mode}
                onChange={(e) => {
                  const nextMode = e.target.value as 'exam' | 'practice';
                  setMode(nextMode);
                  if (nextMode === 'practice') {
                    setSectional(false);
                    setStrictSaveMode(false);
                  } else {
                    setStrictSaveMode(true);
                  }
                }}
                className="w-full px-3 py-2 rounded border border-slate-300 text-xs font-medium bg-white"
              >
                <option value="exam">NBEMS Exam Mode (Concealed Answers)</option>
                <option value="practice">Tutor / Practice Mode (Instant Feedback)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Number of Questions
              </label>
              <select
                value={questionCount}
                onChange={(e) => {
                  const cnt = Number(e.target.value);
                  setQuestionCount(cnt);
                  setDurationMinutes(Math.max(10, Math.round(cnt * 1.05)));
                }}
                className="w-full px-3 py-2 rounded border border-slate-300 text-xs font-mono bg-white"
              >
                <option value={10}>10 Questions (Rapid Drill)</option>
                <option value={20}>20 Questions (Topic Block)</option>
                <option value={25}>25 Questions (5×5 Sectional Sprint)</option>
                <option value={50}>50 Questions (Quarter Mock)</option>
                <option value={100}>100 Questions (Half Mock)</option>
                <option value={200}>200 Questions (Full NEET PG Mock)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Duration (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={300}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-slate-300 text-xs font-mono"
              />
            </div>
          </div>

          {/* 2. Subject Selection (All 19 Subjects) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Select Subjects ({selectedSubjects.length === 0 ? 'All 19 Subjects Included' : `${selectedSubjects.length} Selected`})
              </label>
              {selectedSubjects.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSubjects([])}
                  className="text-xs text-sky-700 hover:underline"
                >
                  Reset to All 19 Subjects
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-44 overflow-y-auto p-3 rounded border border-slate-200 bg-slate-50">
              {NEET_PG_SUBJECTS.map((subj) => {
                const checked = selectedSubjects.includes(subj.slug);
                return (
                  <button
                    key={subj.slug}
                    type="button"
                    onClick={() => toggleSubject(subj.slug)}
                    className={`px-2.5 py-1.5 rounded text-left text-xs font-medium border transition-colors truncate ${
                      checked
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {subj.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Question Pool & Engine Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-3.5 rounded border border-slate-200 space-y-2.5">
              <div className="text-xs font-bold text-slate-800">
                Question Pool Filters
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Difficulty Level:</span>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-300 bg-white font-medium"
                >
                  <option value="all">All Difficulties (Mixed)</option>
                  <option value="easy">Easy Only</option>
                  <option value="medium">Medium Only</option>
                  <option value="hard">Hard Only</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyIncorrect}
                  onChange={(e) => setOnlyIncorrect(e.target.checked)}
                />
                <span>Prioritize previously incorrect questions</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyBookmarked}
                  onChange={(e) => setOnlyBookmarked(e.target.checked)}
                />
                <span>Bookmarked questions only</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyPyq}
                  onChange={(e) => setOnlyPyq(e.target.checked)}
                />
                <span>Previous Year Pattern Questions (PYQ) only</span>
              </label>
            </div>

            <div className="p-3.5 rounded border border-slate-200 space-y-2.5">
              <div className="text-xs font-bold text-slate-800">
                NBEMS Engine Rules
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sectional}
                  onChange={(e) => setSectional(e.target.checked)}
                />
                <span>Time-locked 5-Sectional Mode (Cannot revisit locked sections)</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={strictSaveMode}
                  onChange={(e) => setStrictSaveMode(e.target.checked)}
                />
                <span>Strict NBEMS Save Mode (Requires Save & Next to commit)</span>
              </label>
              <div className="text-[11px] text-slate-500 pt-1">
                Marking scheme: +4 for Correct, -1 for Incorrect, 0 for Unattempted.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Generate & Launch Examination</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
