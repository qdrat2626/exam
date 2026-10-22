import React, { useState } from 'react';
import { Exam, Question, QuestionType } from '../../types';
import { soundFX } from '../../lib/audio';
import { saveExam, deleteExam } from '../../lib/firebase';
import { SAMPLE_EXAM_JSON, validateExamQuestions, fireDuolingoConfetti } from '../../lib/utils';
import {
  FileCode,
  Copy,
  Check,
  Plus,
  Trash2,
  Clock,
  Calendar,
  Save,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowUpDown,
  BookOpen,
  X,
  AlertTriangle
} from 'lucide-react';

interface JsonExamCreatorProps {
  initialExam?: Exam | null;
  supervisorName: string;
  onSaved: (exam: Exam) => void;
  onCancel?: () => void;
}

export const JsonExamCreator: React.FC<JsonExamCreatorProps> = ({
  initialExam,
  supervisorName,
  onSaved,
  onCancel
}) => {
  const [jsonInput, setJsonInput] = useState('');
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Exam state in visual editor
  const [title, setTitle] = useState(initialExam?.title || '');
  const [description, setDescription] = useState(initialExam?.description || '');
  const [durationMinutes, setDurationMinutes] = useState(initialExam?.durationMinutes || 20);
  const [isUnlimitedTime, setIsUnlimitedTime] = useState(initialExam?.isUnlimitedTime ?? false);
  const [isOpenWindow, setIsOpenWindow] = useState(initialExam?.isOpenWindow ?? true);
  const [startsAt, setStartsAt] = useState(initialExam?.startsAt || '');
  const [endsAt, setEndsAt] = useState(initialExam?.endsAt || '');
  const [questions, setQuestions] = useState<Question[]>(
    initialExam?.questions || []
  );

  const [saving, setSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  // Deletion modals
  const [showClearQuestionsModal, setShowClearQuestionsModal] = useState(false);
  const [showDeleteExamModal, setShowDeleteExamModal] = useState(false);
  const [isDeletingExam, setIsDeletingExam] = useState(false);

  const handleConfirmClearQuestions = () => {
    soundFX.playPop();
    setQuestions([]);
    setShowClearQuestionsModal(false);
  };

  const handleConfirmDeleteExam = async () => {
    if (!initialExam) return;
    setIsDeletingExam(true);
    soundFX.playPop();
    try {
      await deleteExam(initialExam.id);
      soundFX.playSuccess();
      setShowDeleteExamModal(false);
      if (onCancel) onCancel();
    } catch (err) {
      console.error(err);
      soundFX.playError();
    } finally {
      setIsDeletingExam(false);
    }
  };

  // Copy template script
  const handleCopyTemplate = async () => {
    soundFX.playPop();
    const templateText = JSON.stringify(SAMPLE_EXAM_JSON, null, 2);
    try {
      await navigator.clipboard.writeText(templateText);
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Parse JSON input
  const handleParseJson = () => {
    setParseError(null);
    setValidationWarning(null);
    soundFX.playPop();

    if (!jsonInput.trim()) {
      setParseError('يرجى لصق كود ملف JSON أولاً في المربع أدناه');
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('صيغة JSON غير صحيحة');
      }

      if (parsed.title) setTitle(String(parsed.title));
      if (parsed.description) setDescription(String(parsed.description));
      if (typeof parsed.durationMinutes === 'number') setDurationMinutes(parsed.durationMinutes);
      if (typeof parsed.isUnlimitedTime === 'boolean') setIsUnlimitedTime(parsed.isUnlimitedTime);
      if (typeof parsed.isOpenWindow === 'boolean') setIsOpenWindow(parsed.isOpenWindow);
      if (parsed.startsAt) setStartsAt(String(parsed.startsAt));
      if (parsed.endsAt) setEndsAt(String(parsed.endsAt));

      const rawQuestions = Array.isArray(parsed.questions)
        ? parsed.questions
        : Array.isArray(parsed)
        ? parsed
        : [];

      const valResult = validateExamQuestions(rawQuestions);
      if (!valResult.valid) {
        setParseError(valResult.error || 'فشل في استخراج الأسئلة من ملف JSON');
        return;
      }

      setQuestions(valResult.questions);
      soundFX.playSuccess();
      setSuccessBanner(`تم استخراج ${valResult.questions.length} سؤالاً بنجاح! يمكنك مراجعتها وتعديلها الآن.`);
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: unknown) {
      soundFX.playError();
      const msg = err instanceof Error ? err.message : 'خطأ غير معروف في قراءة JSON';
      setParseError(`خطأ في قراءة ملف JSON: ${msg}`);
    }
  };

  // Add a new empty question
  const handleAddQuestion = () => {
    soundFX.playPop();
    setValidationWarning(null);
    const newQ: Question = {
      id: `q_${Date.now()}_${questions.length + 1}`,
      text: 'نص السؤال الجديد...',
      type: 'single',
      options: ['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع'],
      correctAnswers: [0],
      points: 5,
      explanation: ''
    };
    setQuestions([...questions, newQ]);
  };

  // Modify question field
  const updateQuestion = (index: number, patch: Partial<Question>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...patch };
    setQuestions(updated);
  };

  // Toggle correct answer
  const toggleCorrectAnswer = (qIndex: number, optIndex: number) => {
    soundFX.playPop();
    const q = questions[qIndex];
    if (q.type === 'single') {
      updateQuestion(qIndex, { correctAnswers: [optIndex] });
    } else {
      const current = q.correctAnswers || [];
      if (current.includes(optIndex)) {
        if (current.length > 1) {
          updateQuestion(qIndex, { correctAnswers: current.filter((i) => i !== optIndex) });
        }
      } else {
        updateQuestion(qIndex, { correctAnswers: [...current, optIndex].sort((a, b) => a - b) });
      }
    }
  };

  // Add option to question
  const handleAddOption = (qIndex: number) => {
    soundFX.playPop();
    setValidationWarning(null);
    const q = questions[qIndex];
    const newOptions = [...q.options, `خيار إضافي ${q.options.length + 1}`];
    updateQuestion(qIndex, { options: newOptions });
  };

  // Remove option
  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    soundFX.playPop();
    const q = questions[qIndex];
    if (q.options.length <= 2) {
      soundFX.playError();
      setValidationWarning('يجب أن يحتوي السؤال على خيارين على الأقل');
      setTimeout(() => setValidationWarning(null), 3000);
      return;
    }
    const newOptions = q.options.filter((_, i) => i !== optIndex);
    const newCorrect = (q.correctAnswers || [])
      .filter((i) => i !== optIndex)
      .map((i) => (i > optIndex ? i - 1 : i));

    updateQuestion(qIndex, {
      options: newOptions,
      correctAnswers: newCorrect.length > 0 ? newCorrect : [0]
    });
  };

  // Delete entire question
  const handleDeleteQuestion = (qIndex: number) => {
    soundFX.playPop();
    if (questions.length <= 1) {
      soundFX.playError();
      setValidationWarning('يجب أن يحتوي الاختبار على سؤال واحد على الأقل');
      setTimeout(() => setValidationWarning(null), 3000);
      return;
    }
    setQuestions(questions.filter((_, i) => i !== qIndex));
  };

  // Save exam to Firestore
  const handleSaveExam = async () => {
    let targetQuestions = [...questions];
    let targetTitle = title.trim();
    let targetDescription = description.trim();

    // If questions list is empty but user pasted JSON in the textarea, auto-parse it now!
    if (targetQuestions.length === 0 && jsonInput.trim()) {
      try {
        const parsed = JSON.parse(jsonInput);
        if (parsed.title && !targetTitle) {
          targetTitle = String(parsed.title).trim();
          setTitle(targetTitle);
        }
        if (parsed.description && !targetDescription) {
          targetDescription = String(parsed.description).trim();
          setDescription(targetDescription);
        }
        const raw = Array.isArray(parsed.questions)
          ? parsed.questions
          : Array.isArray(parsed)
          ? parsed
          : [];
        const valResult = validateExamQuestions(raw);
        if (valResult.valid && valResult.questions.length > 0) {
          targetQuestions = valResult.questions;
          setQuestions(targetQuestions);
        }
      } catch {
        // Will be caught by validation below
      }
    }

    if (!targetTitle) {
      soundFX.playError();
      setValidationWarning('يرجى كتابة عنوان للاختبار');
      setTimeout(() => setValidationWarning(null), 3500);
      return;
    }
    if (targetQuestions.length === 0) {
      soundFX.playError();
      setValidationWarning('يرجى إضافة سؤال واحد على الأقل أو لصق كود JSON صحيح');
      setTimeout(() => setValidationWarning(null), 3500);
      return;
    }

    setSaving(true);
    soundFX.playPop();

    try {
      const totalPoints = targetQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
      const saved = await saveExam({
        ...(initialExam?.id ? { id: initialExam.id } : {}),
        title: targetTitle,
        description: targetDescription,
        durationMinutes: Number(durationMinutes) || 20,
        isUnlimitedTime,
        isOpenWindow,
        startsAt: isOpenWindow ? '' : startsAt,
        endsAt: isOpenWindow ? '' : endsAt,
        questions: targetQuestions,
        totalPoints,
        passingPoints: Math.round(totalPoints * 0.5),
        createdBy: supervisorName,
        isActive: initialExam?.isActive !== undefined ? initialExam.isActive : true
      });

      soundFX.playSuccess();
      fireDuolingoConfetti();
      onSaved(saved);
    } catch (err) {
      console.error('Error saving exam:', err);
      soundFX.playError();
      setValidationWarning('حدث خطأ أثناء حفظ الاختبار في قاعدة البيانات');
    } finally {
      setSaving(false);
    }
  };

  const arabicLetters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

  return (
    <div className="space-y-8">
      {/* Top Banner & Script Copy Section */}
      <div className="duo-card p-6 sm:p-8 bg-white">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1cb0f6] border-b-4 border-[#1899d6] flex items-center justify-center text-white shrink-0 shadow-xs">
              <FileCode className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                إنشاء اختبار جديد بواسطة كود JSON
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                انسخ قالب الكود الجاهز، صمم أسئلتك بسهولة، ثم الصقه لإنشاء الاختبار ومراجعته وتعديله فوراً
              </p>
            </div>
          </div>

          {/* Copy Script Button */}
          <button
            type="button"
            onClick={handleCopyTemplate}
            className="w-full lg:w-auto px-5 py-3 rounded-2xl duo-btn-yellow font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {copiedTemplate ? (
              <>
                <Check className="w-5 h-5 text-emerald-800 stroke-[3]" />
                <span className="text-emerald-900">تم نسخ كود القالب للحافظة!</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5 stroke-[2.5]" />
                <span>نسخ نموذج سكريبت JSON</span>
              </>
            )}
          </button>
        </div>

        {/* JSON Paste Box */}
        <div className="space-y-3">
          <label className="block text-xs font-black text-slate-700 mr-1">
            الصق كود ملف JSON هنا:
          </label>
          <div className="relative">
            <textarea
              rows={5}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="الصق كود JSON هنا ثم اضغط 'تحليل وبناء الأسئلة'..."
              className="w-full p-4 rounded-2xl border-2 border-slate-300 border-b-4 focus:border-[#1cb0f6] outline-none font-mono text-xs text-slate-800 transition-all bg-slate-50 focus:bg-white"
            />
          </div>

          {parseError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border-2 border-red-300 text-red-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {successBanner && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-800 text-xs font-black flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
              <span>{successBanner}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handleParseJson}
              className="px-6 py-3 rounded-2xl duo-btn-blue font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
            >
              <FileCode className="w-4 h-4 stroke-[2.5]" />
              <span>تحليل وبناء الأسئلة</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setJsonInput(JSON.stringify(SAMPLE_EXAM_JSON, null, 2));
                soundFX.playPop();
              }}
              className="text-xs font-bold text-[#1899d6] hover:underline cursor-pointer"
            >
              تحميل مثال تجريبي في الصندوق
            </button>
          </div>
        </div>
      </div>

      {/* Visual Editor Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#58cc02]" />
            <h3 className="text-xl font-black text-slate-800">
              إعدادات ومراجعة الاختبار ({questions.length} أسئلة)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {questions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  setShowClearQuestionsModal(true);
                }}
                className="px-3.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                title="مسح كافة الأسئلة والبدء من جديد"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح كافة الأسئلة</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAddQuestion}
              className="px-4 py-2 rounded-xl duo-btn-outline font-black text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>إضافة سؤال يدوياً</span>
            </button>
          </div>
        </div>

        {validationWarning && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-b-4 border-amber-400 text-amber-900 text-xs font-black flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{validationWarning}</span>
          </div>
        )}

        {/* Exam General Parameters */}
        <div className="duo-card p-6 bg-white space-y-5">
          <h4 className="text-sm font-black text-slate-800 border-b pb-2">بيانات الاختبار الأساسية</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">عنوان الاختبار *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: الاختبار الشهري لمادة العلوم"
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 border-b-4 focus:border-[#58cc02] outline-none text-xs sm:text-sm font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">وصف موجز</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="تعليمات أو محتوى الاختبار"
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 border-b-4 focus:border-[#58cc02] outline-none text-xs sm:text-sm font-bold text-slate-800"
              />
            </div>
          </div>

          {/* Time & Duration Settings */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              تحديد وقت الاختبار
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 bg-slate-50">
                <input
                  type="checkbox"
                  id="unlimitedTime"
                  checked={isUnlimitedTime}
                  onChange={(e) => setIsUnlimitedTime(e.target.checked)}
                  className="w-4 h-4 rounded text-[#58cc02] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="unlimitedTime" className="text-xs font-black text-slate-800 cursor-pointer">
                  وقت مفتوح (بدون عد تنازلي)
                </label>
              </div>

              {!isUnlimitedTime && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">مدة الاختبار بالدقائق:</span>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-24 px-3 py-2 rounded-xl border-2 border-slate-200 border-b-4 focus:border-[#58cc02] outline-none text-xs font-black text-center"
                  />
                  <span className="text-xs font-bold text-slate-500">دقيقة</span>
                </div>
              )}
            </div>
          </div>

          {/* Schedule Window */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              موعد بدء وانتهاء الاختبار
            </h4>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 bg-slate-50">
                <input
                  type="checkbox"
                  id="openWindow"
                  checked={isOpenWindow}
                  onChange={(e) => setIsOpenWindow(e.target.checked)}
                  className="w-4 h-4 rounded text-[#58cc02] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="openWindow" className="text-xs font-black text-slate-800 cursor-pointer">
                  متاح دائماً (بدون موعد إغلاق محدد)
                </label>
              </div>

              {!isOpenWindow && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">تاريخ ووقت البداية:</label>
                    <input
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">تاريخ ووقت النهاية:</label>
                    <input
                      type="datetime-local"
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 text-xs font-bold"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Questions List Editor */}
        <div className="space-y-4">
          {questions.map((q, qIndex) => {
            return (
              <div key={q.id || qIndex} className="duo-card p-5 sm:p-6 bg-white space-y-4">
                {/* Question Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-[#58cc02] text-white flex items-center justify-center font-black text-xs">
                      {qIndex + 1}
                    </span>
                    <span className="text-xs font-black text-slate-700">السؤال رقم {qIndex + 1}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Question Type Switch */}
                    <select
                      value={q.type}
                      onChange={(e) => {
                        const newType = e.target.value as QuestionType;
                        updateQuestion(qIndex, {
                          type: newType,
                          correctAnswers: [q.correctAnswers[0] ?? 0]
                        });
                      }}
                      className="px-2.5 py-1.5 rounded-lg border-2 border-slate-200 text-xs font-black bg-white cursor-pointer"
                    >
                      <option value="single">اختيار فردي</option>
                      <option value="multiple">اختيار متعدد</option>
                    </select>

                    {/* Points */}
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={q.points}
                        onChange={(e) => updateQuestion(qIndex, { points: Number(e.target.value) || 1 })}
                        className="w-14 px-2 py-1 rounded-lg border-2 border-slate-200 text-xs font-black text-center"
                      />
                      <span className="text-[11px] font-bold text-slate-500">نقاط</span>
                    </div>

                    {/* Delete Question Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(qIndex)}
                      className="w-8 h-8 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center cursor-pointer transition-all"
                      title="حذف السؤال"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Text Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">نص السؤال:</label>
                  <input
                    type="text"
                    value={q.text}
                    onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 border-b-4 focus:border-[#58cc02] outline-none text-sm font-bold text-slate-800"
                  />
                </div>

                {/* Options List */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>الخيارات (انقر على الدائرة أو المربع لتحديد الإجابة الصحيحة):</span>
                    <button
                      type="button"
                      onClick={() => handleAddOption(qIndex)}
                      className="text-[#1899d6] hover:underline font-black flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة خيار لهذا السؤال
                    </button>
                  </div>

                  {q.options.map((opt, optIndex) => {
                    const isCorrect = (q.correctAnswers || []).includes(optIndex);
                    const letter = arabicLetters[optIndex] || optIndex + 1;

                    return (
                      <div
                        key={optIndex}
                        className={`p-2.5 px-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                          isCorrect ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 bg-white'
                        }`}
                      >
                        {/* Correct Selector button */}
                        <button
                          type="button"
                          onClick={() => toggleCorrectAnswer(qIndex, optIndex)}
                          className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center font-black text-xs shrink-0 cursor-pointer transition-all ${
                            isCorrect
                              ? 'bg-[#58cc02] border-[#46a302] text-white shadow-xs'
                              : 'bg-white border-slate-300 text-slate-500 hover:border-slate-400'
                          }`}
                          title={isCorrect ? 'إجابة صحيحة' : 'اجعلها إجابة صحيحة'}
                        >
                          {isCorrect ? <Check className="w-4 h-4 stroke-[3]" /> : letter}
                        </button>

                        {/* Option Text Input */}
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOptions = [...q.options];
                            newOptions[optIndex] = e.target.value;
                            updateQuestion(qIndex, { options: newOptions });
                          }}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 outline-none text-xs font-bold text-slate-800 bg-white"
                        />

                        {/* Remove Option */}
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(qIndex, optIndex)}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                          title="حذف الخيار"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    توضيح أو تعليل الإجابة (اختياري يظهر للطالب عند المراجعة):
                  </label>
                  <input
                    type="text"
                    value={q.explanation || ''}
                    onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
                    placeholder="سبب صحة هذا الجواب أو تفصيل مفيد..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-white/95 backdrop-blur-xs border-2 border-slate-200 sticky bottom-2 sm:bottom-4 z-20 shadow-md pb-safe touch-manipulation">
          <div className="text-xs font-black text-slate-600 text-center sm:text-right">
            إجمالي الأسئلة: {questions.length} • إجمالي النقاط:{' '}
            {questions.reduce((sum, q) => sum + (q.points || 0), 0)} نقطة
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            {initialExam && (
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  setShowDeleteExamModal(true);
                }}
                className="px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border-2 border-red-200 text-red-600 hover:bg-red-50 font-black text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition-all"
                title="حذف هذا الاختبار نهائياً"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف الاختبار</span>
              </button>
            )}

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl duo-btn-outline font-black text-xs sm:text-sm cursor-pointer"
              >
                إلغاء
              </button>
            )}

            <button
              type="button"
              disabled={saving || (questions.length === 0 && !jsonInput.trim())}
              onClick={handleSaveExam}
              className="flex-1 sm:flex-none px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl duo-btn-green font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <span>جاري الحفظ السحابي...</span>
              ) : (
                <>
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  <span>{initialExam ? 'حفظ التعديلات' : 'حفظ ونشر الاختبار'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Clear All Questions Modal */}
      {showClearQuestionsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="duo-card max-w-sm w-full bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5 stroke-[2.5]" />
                <h3 className="text-base font-black text-slate-800">مسح كافة الأسئلة</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClearQuestionsModal(false)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm font-bold text-slate-700 mb-2">
              هل أنت متأكد من رغبتك في إفراغ كافة الأسئلة ({questions.length} سؤال)؟
            </p>
            <p className="text-xs font-semibold text-slate-500 mb-4">
              سيتم تفريغ قائمة الأسئلة لتتمكن من إدخال أسئلة جديدة أو لصق كود JSON آخر.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearQuestionsModal(false)}
                className="flex-1 py-3 rounded-xl duo-btn-outline font-black text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmClearQuestions}
                className="flex-1 py-3 rounded-xl duo-btn-red font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                مسح الأسئلة الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Exam Confirmation Modal */}
      {showDeleteExamModal && initialExam && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="duo-card max-w-sm w-full bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                <h3 className="text-base font-black text-slate-800">حذف هذا الاختبار</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteExamModal(false)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm font-bold text-slate-700 mb-2">
              هل أنت متأكد من حذف اختبار &quot;{initialExam.title}&quot; نهائياً؟
            </p>
            <p className="text-xs font-semibold text-red-600 mb-4">
              سيتم حذف الاختبار ونتائج الطلاب المرتبطة به من قاعدة البيانات.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteExamModal(false)}
                disabled={isDeletingExam}
                className="flex-1 py-3 rounded-xl duo-btn-outline font-black text-xs cursor-pointer disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteExam}
                disabled={isDeletingExam}
                className="flex-1 py-3 rounded-xl duo-btn-red font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeletingExam ? 'جاري الحذف...' : 'نعم، حذف الاختبار'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
