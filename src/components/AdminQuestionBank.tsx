import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Upload,
  Download,
  Search,
  Edit3,
  Archive,
  CheckCircle2,
  AlertTriangle,
  Eye,
  History,
  Copy,
  Check,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import { NEET_PG_SUBJECTS } from '../data/seedQuestions.ts';
import {
  SYSTEM_PROMPT_TEMPLATE,
  USER_PROMPT_TEMPLATE,
  SAMPLE_QUESTIONS_PAYLOAD,
} from '../data/questionBankGuide.ts';

export const AdminQuestionBank: React.FC = () => {
  const [questionsList, setQuestionsList] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'catalog' | 'editor' | 'bulk_import' | 'audit' | 'schema_prompts'
  >('catalog');

  // Editor state
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [formSubject, setFormSubject] = useState('pathology');
  const [formSystem, setFormSystem] = useState('Hematopathology');
  const [formTopic, setFormTopic] = useState('Microcytic Anemias');
  const [formSubtopic, setFormSubtopic] = useState('Iron Deficiency vs Thalassemia');
  const [formDifficulty, setFormDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [formVignette, setFormVignette] = useState('');
  const [formQuestionText, setFormQuestionText] = useState('');
  const [formOptA, setFormOptA] = useState('');
  const [formOptB, setFormOptB] = useState('');
  const [formOptC, setFormOptC] = useState('');
  const [formOptD, setFormOptD] = useState('');
  const [formCorrect, setFormCorrect] = useState<'A' | 'B' | 'C' | 'D'>('B');
  const [formSummary, setFormSummary] = useState('');
  const [formDetails, setFormDetails] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Bulk JSON Import state
  const [bulkJsonInput, setBulkJsonInput] = useState<string>(
    JSON.stringify(
      [
        {
          schemaVersion: '1.0',
          questionId: `PATH-IMPORT-${String(Date.now()).slice(-4)}`,
          questionVersion: 1,
          subjectId: 'pathology',
          systemId: 'hematology',
          topicId: 'leukemia',
          subtopic: 'Acute Promyelocytic Leukemia (APML)',
          questionType: 'clinical_vignette',
          difficulty: 'medium',
          question: {
            text: 'Which chromosomal translocation and targeted differentiating agent correspond to Acute Promyelocytic Leukemia (FAB M3)?',
            clinicalVignette:
              'A 31-year-old woman presents with gum bleeding, epistaxis, and disseminated intravascular coagulation (DIC). Peripheral blood smear reveals atypical promyelocytes packed with bundles of Auer rods (faggot cells).',
            images: [],
            tables: [],
          },
          options: [
            { id: 'A', text: 't(8;21) RUNX1-RUNX1T1; High-dose Cytarabine' },
            { id: 'B', text: 't(15;17) PML-RARA; All-trans Retinoic Acid (ATRA) + Arsenic Trioxide' },
            { id: 'C', text: 't(9;22) BCR-ABL1; Imatinib mesylate' },
            { id: 'D', text: 'inv(16) CBFB-MYH11; Gemtuzumab ozogamicin' },
          ],
          correctAnswer: 'B',
          explanation: {
            summary: 'APML is defined by t(15;17)(q24;q21) creating the PML-RARA fusion gene and responds to ATRA + Arsenic Trioxide.',
            details:
              'ATRA binds the altered retinoic acid receptor-alpha and induces terminal differentiation of leukemic promyelocytes into mature neutrophils, resolving coagulopathy.',
            optionExplanations: {
              A: 't(8;21) is seen in AML with maturation (M2).',
              B: 'Correct. t(15;17) PML-RARA defines APML; treated with ATRA + Arsenic Trioxide.',
              C: 't(9;22) Philadelphia chromosome is hallmark of CML.',
              D: 'inv(16) is characteristic of Acute Myelomonocytic Leukemia with abnormal eosinophils (M4Eo).',
            },
            learningPoints: [
              'Faggot cells (bundles of Auer rods) + DIC = APML.',
              'Watch for Differentiation Syndrome (fever, pulmonary infiltrates, weight gain) after starting ATRA; treat with IV Dexamethasone.',
            ],
          },
          metadata: {
            isPYQ: false,
            year: null,
            source: 'Original Admin Bulk Import Demonstration',
            references: ['Robbins & Cotran Pathologic Basis of Disease, 10th Ed'],
            tags: ['hematology', 'apml', 'atra'],
          },
          status: 'published',
        },
      ],
      null,
      2
    )
  );
  const [importReport, setImportReport] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [previewQuestion, setPreviewQuestion] = useState<any>(null);

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch(
        `/api/v1/admin/questions?subject=${subjectFilter}&difficulty=${difficultyFilter}&status=${statusFilter}&search=${encodeURIComponent(
          searchQuery
        )}&page=${page}&limit=20`
      );
      setQuestionsList(res.items || []);
      setTotalCount(res.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [subjectFilter, difficultyFilter, statusFilter, searchQuery, page]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const loadAuditLogs = async () => {
    try {
      const res = await apiFetch('/api/v1/admin/audit-logs');
      setAuditLogs(res.logs || []);
    } catch {
      // ignore
    }
  };

  const openEditorForQuestion = (q?: any) => {
    if (q) {
      setEditingQuestion(q);
      setFormSubject(q.subjectSlug);
      setFormSystem(q.systemName);
      setFormTopic(q.topicName);
      setFormSubtopic(q.subtopicName);
      setFormDifficulty(q.difficulty);
      setFormVignette(q.clinicalVignette || '');
      setFormQuestionText(q.questionText);
      setFormOptA(q.options?.[0]?.text || 'Option A');
      setFormOptB(q.options?.[1]?.text || 'Option B');
      setFormOptC(q.options?.[2]?.text || 'Option C');
      setFormOptD(q.options?.[3]?.text || 'Option D');
      setFormCorrect(q.correctOption);
      setFormSummary(q.explanation?.summary || '');
      setFormDetails(q.explanation?.details || '');
    } else {
      setEditingQuestion(null);
      setFormSubject('medicine');
      setFormSystem('Cardiology');
      setFormTopic('Valvular Heart Disease');
      setFormSubtopic('Aortic Stenosis');
      setFormDifficulty('medium');
      setFormVignette(
        'A 68-year-old man presents with exertional syncope, angina, and dyspnea. Auscultation reveals a harsh crescendo-decrescendo ejection systolic murmur at the right 2nd intercostal space radiating to the carotids with a slow-rising, low-volume pulse (pulsus parvus et tardus).'
      );
      setFormQuestionText(
        'Which physical maneuver decreases the intensity of this patient’s murmur?'
      );
      setFormOptA('Passive leg raising in supine position');
      setFormOptB('Sustained handgrip or sudden standing (Valsalva strain phase)');
      setFormOptC('Administration of amyl nitrite inhalation');
      setFormOptD('Post-premature ventricular contraction beat');
      setFormCorrect('B');
      setFormSummary(
        'Valvular aortic stenosis murmur decreases during the strain phase of Valsalva (decreases preload) and during sustained handgrip (increases afterload).'
      );
      setFormDetails(
        'Unlike Hypertrophic Obstructive Cardiomyopathy (HOCM), where decreased preload increases dynamic outflow obstruction and makes the murmur louder, valvular aortic stenosis murmur softens when stroke volume decreases.'
      );
    }
    setSaveMessage(null);
    setActiveTab('editor');
  };

  const handleSaveQuestionForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const existingImages = Array.isArray(editingQuestion?.images)
        ? editingQuestion.images
        : [];
      const existingTables = Array.isArray(editingQuestion?.tables)
        ? editingQuestion.tables
        : Array.isArray(editingQuestion?.tablesJson)
        ? editingQuestion.tablesJson
        : [];
      const existingOptExps = editingQuestion?.explanation?.optionExplanations || {};
      const existingLearningPoints = Array.isArray(
        editingQuestion?.explanation?.learningPoints
      )
        ? editingQuestion.explanation.learningPoints
        : [];

      const payload = {
        id: editingQuestion?.id,
        subjectId: formSubject,
        systemId: formSystem.toLowerCase().replace(/\s+/g, '-'),
        systemName: formSystem,
        topicId: formTopic.toLowerCase().replace(/\s+/g, '-'),
        topicName: formTopic,
        subtopic: formSubtopic,
        questionType: editingQuestion?.questionType || 'single_best_answer',
        difficulty: formDifficulty,
        question: {
          text: formQuestionText,
          clinicalVignette: formVignette || null,
          images: existingImages,
          tables: existingTables,
        },
        options: [
          { id: 'A', text: formOptA },
          { id: 'B', text: formOptB },
          { id: 'C', text: formOptC },
          { id: 'D', text: formOptD },
        ],
        correctAnswer: formCorrect,
        explanation: {
          summary: formSummary,
          details: formDetails,
          optionExplanations: {
            A: existingOptExps.A || '',
            B: existingOptExps.B || '',
            C: existingOptExps.C || '',
            D: existingOptExps.D || '',
          },
          learningPoints: existingLearningPoints,
        },
        ...(editingQuestion
          ? {
              metadata: {
                isPYQ: Boolean(editingQuestion.isPyq),
                year: editingQuestion.pyqYear ?? null,
                source: editingQuestion.source || 'Admin Authored',
                references: Array.isArray(editingQuestion.referencesJson)
                  ? editingQuestion.referencesJson
                  : [],
                tags: Array.isArray(editingQuestion.tagsJson)
                  ? editingQuestion.tagsJson
                  : [],
              },
            }
          : {}),
        status: editingQuestion?.status || 'published',
      };

      if (editingQuestion?.id) {
        await apiFetch(`/api/v1/admin/questions/${editingQuestion.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/v1/admin/questions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setSaveMessage('Question saved and version snapshot recorded in PostgreSQL.');
      await loadQuestions();
    } catch (err: any) {
      setSaveMessage(`Error: ${err.message}`);
    }
  };

  const handleToggleArchiveStatus = async (q: any) => {
    const nextStatus = q.status === 'archived' ? 'published' : 'archived';
    await apiFetch(`/api/v1/admin/questions/${q.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        subjectId: q.subjectSlug,
        status: nextStatus,
      }),
    });
    await loadQuestions();
  };

  const handleRunBulkImport = async (dryRun: boolean) => {
    try {
      const parsed = JSON.parse(bulkJsonInput);
      const res = await apiFetch('/api/v1/admin/questions/import', {
        method: 'POST',
        body: JSON.stringify({ questions: parsed, dryRun }),
      });
      setImportReport(res);
      if (res.imported) {
        await loadQuestions();
      }
    } catch (err: any) {
      setImportReport({
        imported: false,
        dryRun,
        report: {
          valid: false,
          totalSubmitted: 0,
          validCount: 0,
          duplicateIdsInPayload: [],
          probableContentDuplicates: [],
          errors: [{ index: -1, message: `JSON Syntax Error: ${err.message}` }],
        },
      });
    }
  };

  const handleExportJson = async () => {
    try {
      const data = await apiFetch('/api/v1/admin/questions/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pg-prep-arena-question-bank-v1.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="text-xs text-slate-500">
            Question Bank Governance · Schema v1.0 · Immutable Versioning
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Administration & Question Bank Management ({totalCount} Questions)
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => openEditorForQuestion()}
            className="px-3.5 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Author New Question</span>
          </button>

          <button
            onClick={() => setActiveTab('bulk_import')}
            className="px-3.5 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Bulk JSON Import</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-3.5 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('audit');
              loadAuditLogs();
            }}
            className="px-3.5 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Logs</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center gap-1 bg-slate-200/70 p-1 rounded-lg w-fit">
        {[
          { id: 'catalog', label: 'Question Catalog & Search' },
          { id: 'editor', label: editingQuestion ? `Edit ${editingQuestion.questionCode}` : 'Author Question' },
          { id: 'bulk_import', label: '14-Step Transactional JSON Import' },
          { id: 'schema_prompts', label: 'JSON Schema & AI Prompts' },
          { id: 'audit', label: 'Version & Admin Audit Trail' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id as any);
              if (t.id === 'audit') loadAuditLogs();
            }}
            className={`px-3.5 py-1.5 rounded text-xs font-semibold cursor-pointer ${
              activeTab === t.id
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: QUESTION CATALOG */}
      {activeTab === 'catalog' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search ID, vignette, topic..."
                  className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-300 bg-white text-xs"
                />
              </div>

              <select
                value={subjectFilter}
                onChange={(e) => {
                  setSubjectFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs font-medium"
              >
                <option value="all">All 19 Subjects</option>
                {NEET_PG_SUBJECTS.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={difficultyFilter}
                onChange={(e) => {
                  setDifficultyFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs font-medium"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-300 bg-white disabled:opacity-40"
              >
                Prev
              </button>
              <span>Page {page}</span>
              <button
                disabled={page * 20 >= totalCount}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 rounded border border-slate-300 bg-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-3 px-4 font-semibold">Code / Ver</th>
                  <th className="py-3 px-3 font-semibold">Subject · Topic</th>
                  <th className="py-3 px-3 font-semibold">Question Stem</th>
                  <th className="py-3 px-3 font-semibold">Difficulty</th>
                  <th className="py-3 px-3 font-semibold">Key</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Loading question bank...
                    </td>
                  </tr>
                ) : (
                  questionsList.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-slate-900">{q.questionCode}</div>
                        <div className="text-[11px] text-slate-500">v{q.version}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{q.subjectName}</div>
                        <div className="text-[11px] text-slate-500">
                          {q.topicName} · {q.subtopicName}
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-md">
                        <p className="truncate text-slate-800">{q.questionText}</p>
                      </td>
                      <td className="py-3 px-3 capitalize font-medium text-slate-700">
                        {q.difficulty}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                        {q.correctOption}
                      </td>
                      <td className="py-3 px-3 capitalize text-slate-600">{q.status}</td>
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => setPreviewQuestion(q)}
                          className="text-slate-600 hover:text-slate-900 font-medium"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => openEditorForQuestion(q)}
                          className="text-sky-700 hover:text-sky-900 font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleArchiveStatus(q)}
                          className="text-amber-700 hover:text-amber-900 font-medium"
                        >
                          {q.status === 'archived' ? 'Restore' : 'Archive'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: QUESTION AUTHORING & VERSIONING EDITOR */}
      {activeTab === 'editor' && (
        <form
          onSubmit={handleSaveQuestionForm}
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              {editingQuestion
                ? `Edit Question ${editingQuestion.questionCode} (Creates Version v${
                    editingQuestion.version + 1
                  })`
                : 'Author New Clinical Question'}
            </h2>
            {saveMessage && (
              <span className="text-xs font-semibold text-emerald-700">
                {saveMessage}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject
              </label>
              <select
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 text-xs bg-white"
              >
                {NEET_PG_SUBJECTS.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Organ System
              </label>
              <input
                type="text"
                value={formSystem}
                onChange={(e) => setFormSystem(e.target.value)}
                required
                className="w-full px-3 py-2 rounded border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Topic
              </label>
              <input
                type="text"
                value={formTopic}
                onChange={(e) => setFormTopic(e.target.value)}
                required
                className="w-full px-3 py-2 rounded border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subtopic
              </label>
              <input
                type="text"
                value={formSubtopic}
                onChange={(e) => setFormSubtopic(e.target.value)}
                required
                className="w-full px-3 py-2 rounded border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Clinical Vignette (Optional)
            </label>
            <textarea
              rows={2}
              value={formVignette}
              onChange={(e) => setFormVignette(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Question Lead-In / Stem *
            </label>
            <textarea
              rows={2}
              value={formQuestionText}
              onChange={(e) => setFormQuestionText(e.target.value)}
              required
              className="w-full px-3 py-2 rounded border border-slate-300 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Option A *
              </label>
              <input
                type="text"
                value={formOptA}
                onChange={(e) => setFormOptA(e.target.value)}
                required
                className="w-full px-3 py-2 rounded border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Option B *
              </label>
              <input
                type="text"
                value={formOptB}
                onChange={(e) => setFormOptB(e.target.value)}
                required
                className="w-full px-3 py-2 rounded border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Option C *
              </label>
              <input
                type="text"
                value={formOptC}
                onChange={(e) => setFormOptC(e.target.value)}
                required
                className="w-full px-3 py-2 rounded border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Option D *
              </label>
              <input
                type="text"
                value={formOptD}
                onChange={(e) => setFormOptD(e.target.value)}
                required
                className="w-full px-3 py-2 rounded border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correct Answer Key
              </label>
              <select
                value={formCorrect}
                onChange={(e) => setFormCorrect(e.target.value as any)}
                className="w-full px-3 py-2 rounded border border-slate-300 text-xs font-mono bg-white"
              >
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Difficulty
              </label>
              <select
                value={formDifficulty}
                onChange={(e) => setFormDifficulty(e.target.value as any)}
                className="w-full px-3 py-2 rounded border border-slate-300 text-xs bg-white"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Explanation Summary *
            </label>
            <input
              type="text"
              value={formSummary}
              onChange={(e) => setFormSummary(e.target.value)}
              required
              className="w-full px-3 py-2 rounded border border-slate-300 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Detailed Medical Explanation *
            </label>
            <textarea
              rows={3}
              value={formDetails}
              onChange={(e) => setFormDetails(e.target.value)}
              required
              className="w-full px-3 py-2 rounded border border-slate-300 text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className="px-4 py-2 rounded border border-slate-300 text-xs font-medium text-slate-700"
            >
              Back to Catalog
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
            >
              Save & Commit Question Version
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: BULK JSON IMPORT WITH 14-STEP VALIDATION PREVIEW */}
      {activeTab === 'bulk_import' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Bulk Question Bank JSON Import (Schema v1.0)
              </h2>
              <p className="text-xs text-slate-500">
                Validates JSON syntax, schema fields, 4 unique options, valid correct answer key,
                19-subject taxonomy references, duplicate IDs, and probable content duplicates
              </p>
            </div>

            <textarea
              rows={16}
              value={bulkJsonInput}
              onChange={(e) => setBulkJsonInput(e.target.value)}
              className="w-full p-3 rounded border border-slate-300 font-mono text-xs bg-slate-50"
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleRunBulkImport(true)}
                className="px-4 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
              >
                1. Validate & Generate Import Preview (Dry Run)
              </button>

              <button
                type="button"
                onClick={() => handleRunBulkImport(false)}
                className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
              >
                2. Confirm & Import Transactionally
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Validation & Transactional Import Report
            </h3>

            {!importReport ? (
              <p className="text-xs text-slate-500">
                Click "Validate & Generate Import Preview" or "Confirm & Import Transactionally" to
                run the 14-step validation pipeline.
              </p>
            ) : (
              <div className="space-y-4 text-xs">
                <div
                  className={`p-3.5 rounded border ${
                    importReport.report.valid
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  <div className="font-bold">
                    {importReport.imported
                      ? `✓ Transactional Import Complete (${importReport.report.validCount} questions committed)`
                      : importReport.report.valid
                      ? `✓ Dry-Run Validation Passed (${importReport.report.validCount} valid questions ready)`
                      : `✕ Validation Failed (${importReport.report.errors.length} errors detected)`}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    Submitted: <strong>{importReport.report.totalSubmitted}</strong>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    Valid Schema: <strong>{importReport.report.validCount}</strong>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    Duplicate IDs:{' '}
                    <strong>{importReport.report.duplicateIdsInPayload.length}</strong>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    Content Warnings:{' '}
                    <strong>{importReport.report.probableContentDuplicates.length}</strong>
                  </div>
                </div>

                {importReport.report.errors.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="font-semibold text-red-700">Validation Errors:</div>
                    {importReport.report.errors.map((err: any, i: number) => (
                      <div
                        key={i}
                        className="p-2 rounded bg-red-50 border border-red-200 text-red-800 font-mono text-[11px]"
                      >
                        [Item {err.index}] {err.questionId ? `(${err.questionId}) ` : ''}
                        {err.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ADMIN AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-900">
              Administrator & Question Bank Audit Trail
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No administrative mutations recorded yet in this session. Create, edit, or import a
                question to populate the audit trail.
              </div>
            ) : (
              auditLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="px-4 py-3 flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <span className="font-bold text-slate-900">{log.action}</span> · Target:{' '}
                    <span className="text-sky-700">{log.targetId}</span> · Actor: {log.actorUid}
                  </div>
                  <div className="text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SCHEMA & AI AUTHORING PROMPTS */}
      {activeTab === 'schema_prompts' && (
        <div className="space-y-6">
          {/* Top banner */}
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sky-800 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-sky-600" />
                <span>AI Clinical Question Bank Authoring Specification & Prompt Kit</span>
              </div>
              <p className="text-xs text-sky-900 leading-relaxed max-w-3xl">
                Use these verified prompts and JSON Schema v1.0 with any LLM (Gemini 2.5, Claude 3.7, GPT-4o)
                to generate clinical vignette MCQs with multi-option explanations, 50-50 distractor rationale, and table-based investigations that pass all 14 PG-Prep Arena validation checks.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href="/question-bank.schema.json"
                download="question-bank.schema.json"
                className="px-3 py-1.5 rounded border border-sky-300 bg-white hover:bg-sky-100 text-sky-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Schema (.json)</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setBulkJsonInput(JSON.stringify(SAMPLE_QUESTIONS_PAYLOAD, null, 2));
                  setActiveTab('bulk_import');
                }}
                className="px-3.5 py-1.5 rounded bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Load Sample Set into Importer</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Prompt Box */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm font-bold text-slate-900">1. LLM System Prompt</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(SYSTEM_PROMPT_TEMPLATE);
                    setCopiedPrompt('system');
                    setTimeout(() => setCopiedPrompt(null), 2500);
                  }}
                  className="px-2.5 py-1 rounded border border-slate-300 bg-slate-50 hover:bg-white text-xs font-medium text-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  {copiedPrompt === 'system' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Sets the role as Senior NBEMS / INI-CET Question Setter with strict formatting rules for 4 options, multi-option explanations, and valid JSON array output.
              </p>

              <pre className="p-3 bg-slate-900 text-slate-100 rounded text-[11px] font-mono leading-relaxed overflow-x-auto max-h-72 whitespace-pre-wrap">
                {SYSTEM_PROMPT_TEMPLATE}
              </pre>
            </div>

            {/* User Prompt Box */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm font-bold text-slate-900">2. LLM User Generation Prompt</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(USER_PROMPT_TEMPLATE);
                    setCopiedPrompt('user');
                    setTimeout(() => setCopiedPrompt(null), 2500);
                  }}
                  className="px-2.5 py-1 rounded border border-slate-300 bg-slate-50 hover:bg-white text-xs font-medium text-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  {copiedPrompt === 'user' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Topic-level generation query requesting clinical vignettes, lab investigation tables, and 50-50 elimination feedback.
              </p>

              <pre className="p-3 bg-slate-900 text-slate-100 rounded text-[11px] font-mono leading-relaxed overflow-x-auto max-h-72 whitespace-pre-wrap">
                {USER_PROMPT_TEMPLATE}
              </pre>
            </div>
          </div>

          {/* Schema Field Reference Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Question Bank Schema Field Specification (v1.0)
                </h3>
                <p className="text-xs text-slate-500">
                  Required fields and types verified during the 14-step transactional import pipeline
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600 bg-white border border-slate-300 px-2 py-1 rounded">
                Draft 2020-12
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-4 font-semibold">Field Path</th>
                    <th className="py-2.5 px-3 font-semibold">Type</th>
                    <th className="py-2.5 px-3 font-semibold">Required</th>
                    <th className="py-2.5 px-4 font-semibold">Description & Validation Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-mono font-bold text-slate-900">schemaVersion</td>
                    <td className="py-2 px-3 font-mono text-slate-600">string</td>
                    <td className="py-2 px-3 font-semibold text-emerald-700">Yes</td>
                    <td className="py-2 px-4 text-slate-700">Must be exactly "1.0"</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-mono font-bold text-slate-900">questionId</td>
                    <td className="py-2 px-3 font-mono text-slate-600">string</td>
                    <td className="py-2 px-3 font-semibold text-emerald-700">Yes</td>
                    <td className="py-2 px-4 text-slate-700">Alphanumeric unique identifier (e.g. MED-CARD-001)</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-mono font-bold text-slate-900">subjectId</td>
                    <td className="py-2 px-3 font-mono text-slate-600">enum string</td>
                    <td className="py-2 px-3 font-semibold text-emerald-700">Yes</td>
                    <td className="py-2 px-4 text-slate-700">One of 19 standard NEET-PG slugs (e.g. medicine, pathology)</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-mono font-bold text-slate-900">question.text</td>
                    <td className="py-2 px-3 font-mono text-slate-600">string</td>
                    <td className="py-2 px-3 font-semibold text-emerald-700">Yes</td>
                    <td className="py-2 px-4 text-slate-700">Lead-in sentence or question stem (min 5 chars)</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-mono font-bold text-slate-900">question.clinicalVignette</td>
                    <td className="py-2 px-3 font-mono text-slate-600">string | null</td>
                    <td className="py-2 px-3 text-slate-500">Optional</td>
                    <td className="py-2 px-4 text-slate-700">Clinical patient history, vitals, and findings</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-mono font-bold text-slate-900">question.tables</td>
                    <td className="py-2 px-3 font-mono text-slate-600">array</td>
                    <td className="py-2 px-3 text-slate-500">Optional</td>
                    <td className="py-2 px-4 text-slate-700">Array of objects with title, headers[], and rows[][]</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-mono font-bold text-slate-900">options</td>
                    <td className="py-2 px-3 font-mono text-slate-600">array</td>
                    <td className="py-2 px-3 font-semibold text-emerald-700">Yes</td>
                    <td className="py-2 px-4 text-slate-700">Exactly 4 options with id (A, B, C, D) and non-empty text</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-mono font-bold text-slate-900">correctAnswer</td>
                    <td className="py-2 px-3 font-mono text-slate-600">enum "A"|"B"|"C"|"D"</td>
                    <td className="py-2 px-3 font-semibold text-emerald-700">Yes</td>
                    <td className="py-2 px-4 text-slate-700">Must match one of the 4 option IDs exactly</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-mono font-bold text-slate-900">explanation.optionExplanations</td>
                    <td className="py-2 px-3 font-mono text-slate-600">object</td>
                    <td className="py-2 px-3 font-semibold text-emerald-700">Yes</td>
                    <td className="py-2 px-4 text-slate-700">Keys A, B, C, D explaining why each option is correct or false</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-mono font-bold text-slate-900">explanation.learningPoints</td>
                    <td className="py-2 px-3 font-mono text-slate-600">string[]</td>
                    <td className="py-2 px-3 font-semibold text-emerald-700">Yes</td>
                    <td className="py-2 px-4 text-slate-700">Array of 1 to 5 concise high-yield bullet takeaways</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* QUESTION PREVIEW MODAL */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 sticky top-0 bg-white z-10">
              <div className="text-xs font-mono font-bold text-slate-900 truncate">
                Preview: {previewQuestion.questionCode} (v{previewQuestion.version}) ·{' '}
                {previewQuestion.subjectName}
              </div>
              <button
                type="button"
                onClick={() => setPreviewQuestion(null)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
            {previewQuestion.clinicalVignette && (
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed break-words">
                {previewQuestion.clinicalVignette}
              </div>
            )}
            <p className="text-sm font-semibold text-slate-900 leading-relaxed break-words">
              {previewQuestion.questionText}
            </p>

            {/* Tables if present */}
            {Array.isArray(previewQuestion.question?.tables) &&
              previewQuestion.question.tables.map((tbl: any, tIdx: number) => (
                <div key={tIdx} className="border border-slate-200 rounded overflow-hidden my-2">
                  {tbl.title && (
                    <div className="bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 border-b border-slate-200">
                      {tbl.title}
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          {tbl.headers.map((h: string, hIdx: number) => (
                            <th key={hIdx} className="px-3 py-1.5 font-semibold text-slate-700">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                        {tbl.rows.map((row: string[], rIdx: number) => (
                          <tr key={rIdx}>
                            {row.map((cell: string, cIdx: number) => (
                              <td key={cIdx} className="px-3 py-1 text-slate-800">
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

            <div className="space-y-2">
              {previewQuestion.options?.map((o: any) => (
                <div
                  key={o.id}
                  className={`p-2.5 rounded border text-xs break-words ${
                    o.id === previewQuestion.correctOption
                      ? 'bg-emerald-50 border-emerald-500 font-semibold text-emerald-950'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <strong>{o.id}.</strong> {o.text}
                </div>
              ))}
            </div>
            {previewQuestion.explanation && (
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-900 break-words">
                  {previewQuestion.explanation.summary}
                </div>
                <div className="text-slate-600 leading-relaxed break-words">
                  {previewQuestion.explanation.details}
                </div>
                {previewQuestion.explanation.optionExplanations && (
                  <div className="space-y-1 pt-2 border-t border-slate-200">
                    <div className="font-semibold text-slate-800">Option Rationale:</div>
                    {(['A', 'B', 'C', 'D'] as const).map((key) => {
                      const exp = previewQuestion.explanation.optionExplanations[key];
                      if (!exp) return null;
                      return (
                        <div key={key} className="text-[11px] text-slate-600 break-words">
                          <strong>{key}:</strong> {exp}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
