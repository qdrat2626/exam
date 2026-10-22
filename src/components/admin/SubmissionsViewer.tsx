import React, { useState } from 'react';
import { Exam, Submission } from '../../types';
import { soundFX } from '../../lib/audio';
import { formatDurationArabic, formatDateArabic } from '../../lib/utils';
import {
  deleteSubmission,
  deleteMultipleSubmissions,
  deleteAllSubmissionsForExam
} from '../../lib/firebase';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  Award,
  Copy,
  Check,
  Eye,
  X,
  Share2,
  FileText,
  Filter,
  CheckSquare,
  Square,
  Trash2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface SubmissionsViewerProps {
  exams: Exam[];
  submissions: Submission[];
  onReloadData?: () => void;
}

export const SubmissionsViewer: React.FC<SubmissionsViewerProps> = ({
  exams,
  submissions,
  onReloadData
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(
    exams.length > 0 ? exams[0].id : 'all'
  );
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);
  const [inspectSubmission, setInspectSubmission] = useState<Submission | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [showMessageExportModal, setShowMessageExportModal] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<Submission | null>(null);
  const [isDeletingSub, setIsDeletingSub] = useState(false);

  // Batch delete modals
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);
  const [showDeleteAllExamSubsModal, setShowDeleteAllExamSubsModal] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  const handleConfirmDeleteSubmission = async () => {
    if (!submissionToDelete) return;
    setIsDeletingSub(true);
    soundFX.playPop();
    try {
      await deleteSubmission(submissionToDelete.id);
      soundFX.playSuccess();
      setSelectedSubmissionIds((prev) => prev.filter((id) => id !== submissionToDelete.id));
      setSubmissionToDelete(null);
      if (onReloadData) onReloadData();
    } catch (err) {
      console.error(err);
      soundFX.playError();
    } finally {
      setIsDeletingSub(false);
    }
  };

  const handleConfirmDeleteSelected = async () => {
    if (selectedSubmissionIds.length === 0) return;
    setIsDeletingBatch(true);
    soundFX.playPop();
    try {
      await deleteMultipleSubmissions(selectedSubmissionIds);
      soundFX.playSuccess();
      setSelectedSubmissionIds([]);
      setShowDeleteSelectedModal(false);
      if (onReloadData) onReloadData();
    } catch (err) {
      console.error('Batch delete failed:', err);
      soundFX.playError();
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const handleConfirmDeleteAllExamSubs = async () => {
    setIsDeletingBatch(true);
    soundFX.playPop();
    try {
      await deleteAllSubmissionsForExam(selectedExamId);
      soundFX.playSuccess();
      setSelectedSubmissionIds([]);
      setShowDeleteAllExamSubsModal(false);
      if (onReloadData) onReloadData();
    } catch (err) {
      console.error('Delete all submissions failed:', err);
      soundFX.playError();
    } finally {
      setIsDeletingBatch(false);
    }
  };

  // Filter submissions by exam
  const filteredByExam = submissions.filter((s) => {
    if (selectedExamId === 'all') return true;
    return s.examId === selectedExamId;
  });

  // Filter by search query
  const displayedSubmissions = filteredByExam.filter((s) => {
    if (!searchStudent.trim()) return true;
    return s.userFullName.toLowerCase().includes(searchStudent.toLowerCase());
  });

  const currentExam = exams.find((e) => e.id === selectedExamId);

  // Selection toggle
  const toggleSelectAll = () => {
    soundFX.playPop();
    if (selectedSubmissionIds.length === displayedSubmissions.length) {
      setSelectedSubmissionIds([]);
    } else {
      setSelectedSubmissionIds(displayedSubmissions.map((s) => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    soundFX.playPop();
    if (selectedSubmissionIds.includes(id)) {
      setSelectedSubmissionIds(selectedSubmissionIds.filter((item) => item !== id));
    } else {
      setSelectedSubmissionIds([...selectedSubmissionIds, id]);
    }
  };

  // Generate formatted text message for sharing (WhatsApp, Telegram, etc.)
  const generateExportMessage = () => {
    const targetSubmissions =
      selectedSubmissionIds.length > 0
        ? displayedSubmissions.filter((s) => selectedSubmissionIds.includes(s.id))
        : displayedSubmissions;

    const examTitle = currentExam ? currentExam.title : 'كافة الاختبارات';
    const dateStr = new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let msg = `نتائج ${examTitle}\n`;
    msg += `التاريخ: ${dateStr}\n`;
    msg += `إجمالي المختبرين: ${targetSubmissions.length} طالب\n`;
    msg += `--------------------------------------\n`;

    targetSubmissions.forEach((sub, idx) => {
      msg += `${idx + 1}. الطالب: ${sub.userFullName}\n`;
      msg += `   - الدرجة: ${sub.score} من ${sub.maxScore} (${sub.percentage}%)\n`;
      msg += `   - الوقت المستغرق: ${formatDurationArabic(sub.timeSpentSeconds)}\n`;
      msg += `   - الحالة: ${sub.percentage >= 50 ? 'ناجح' : 'يحتاج للتحسين'}\n`;
    });

    msg += `--------------------------------------\n`;
    msg += `تم الاستخراج عبر منصة الاختبارات الذكية`;

    return msg;
  };

  const handleCopyMessage = async () => {
    soundFX.playSuccess();
    const text = generateExportMessage();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Stats calculation
  const totalExaminees = filteredByExam.length;
  const avgScore =
    totalExaminees > 0
      ? Math.round(filteredByExam.reduce((sum, s) => sum + s.percentage, 0) / totalExaminees)
      : 0;
  const highestScore =
    totalExaminees > 0
      ? Math.max(...filteredByExam.map((s) => s.percentage))
      : 0;
  const avgTime =
    totalExaminees > 0
      ? Math.round(filteredByExam.reduce((sum, s) => sum + s.timeSpentSeconds, 0) / totalExaminees)
      : 0;

  const arabicLetters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

  return (
    <div className="space-y-6">
      {/* Top Filter and Exam Selector */}
      <div className="duo-card p-6 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#ff9600] border-b-4 border-[#cf7800] flex items-center justify-center text-white shadow-xs">
              <Users className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">قسم المختبرين وسجل النتائج</h2>
              <p className="text-xs font-semibold text-slate-500">
                متابعة أداء الطلاب، أوقات حل الاختبار، وتفاصيل الإجابات واستخراج التقارير
              </p>
            </div>
          </div>

          {/* Export Message Trigger Button */}
          <button
            type="button"
            onClick={() => {
              soundFX.playPop();
              setShowMessageExportModal(true);
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl duo-btn-green font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Share2 className="w-4 h-4 stroke-[2.5]" />
            <span>استخراج رسالة بالنتائج ({selectedSubmissionIds.length > 0 ? selectedSubmissionIds.length : 'الكل'})</span>
          </button>
        </div>

        {/* Controls row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">
              تحديد الاختبار المعروض:
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => {
                soundFX.playPop();
                setSelectedExamId(e.target.value);
                setSelectedSubmissionIds([]);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 border-b-4 focus:border-[#ff9600] outline-none text-xs sm:text-sm font-bold text-slate-800 bg-white cursor-pointer"
            >
              <option value="all">كافة الاختبارات ({submissions.length} نتيجة)</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title} ({submissions.filter((s) => s.examId === exam.id).length} مختبر)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">
              بحث باسم الطالب:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="اكتب اسم الطالب للفلترة..."
                className="w-full pl-3 pr-10 py-2.5 rounded-xl border-2 border-slate-200 border-b-4 focus:border-[#ff9600] outline-none text-xs sm:text-sm font-bold text-slate-800 bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border-2 border-b-4 border-slate-200 bg-white text-center">
          <span className="text-xs font-bold text-slate-400 block mb-1">إجمالي المختبرين</span>
          <span className="text-2xl font-black text-slate-800">{totalExaminees}</span>
          <span className="text-[10px] font-bold text-slate-400 block mt-0.5">طالب ممتحن</span>
        </div>

        <div className="p-4 rounded-2xl border-2 border-b-4 border-slate-200 bg-white text-center">
          <span className="text-xs font-bold text-slate-400 block mb-1">متوسط الدرجات</span>
          <span className="text-2xl font-black text-[#58cc02]">{avgScore}%</span>
          <span className="text-[10px] font-bold text-slate-400 block mt-0.5">مستوى عام</span>
        </div>

        <div className="p-4 rounded-2xl border-2 border-b-4 border-slate-200 bg-white text-center">
          <span className="text-xs font-bold text-slate-400 block mb-1">أعلى درجة مسجلة</span>
          <span className="text-2xl font-black text-[#ff9600]">{highestScore}%</span>
          <span className="text-[10px] font-bold text-slate-400 block mt-0.5">أفضل أداء</span>
        </div>

        <div className="p-4 rounded-2xl border-2 border-b-4 border-slate-200 bg-white text-center">
          <span className="text-xs font-bold text-slate-400 block mb-1">متوسط زمن الحل</span>
          <span className="text-lg font-black text-slate-800">{formatDurationArabic(avgTime)}</span>
          <span className="text-[10px] font-bold text-slate-400 block mt-0.5">سرعة الإنجاز</span>
        </div>
      </div>

      {/* Table / List of Examinees */}
      <div className="duo-card bg-white overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b-2 border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs font-black text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              {selectedSubmissionIds.length === displayedSubmissions.length && displayedSubmissions.length > 0 ? (
                <CheckSquare className="w-5 h-5 text-[#58cc02]" />
              ) : (
                <Square className="w-5 h-5 text-slate-400" />
              )}
              <span>
                {selectedSubmissionIds.length > 0
                  ? `محدد (${selectedSubmissionIds.length} من ${displayedSubmissions.length})`
                  : 'تحديد كافة الطلاب'}
              </span>
            </button>

            {/* Bulk Delete Selected Button */}
            {selectedSubmissionIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  setShowDeleteSelectedModal(true);
                }}
                className="px-3 py-1.5 rounded-xl duo-btn-red text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs animate-in fade-in"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف المحدد ({selectedSubmissionIds.length})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {displayedSubmissions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  setShowDeleteAllExamSubsModal(true);
                }}
                className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all"
                title="مسح كافة نتائج هذا الاختبار دفعة واحدة"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح كافة النتائج المعروضة ({displayedSubmissions.length})</span>
              </button>
            )}

            <div className="text-xs font-bold text-slate-500">
              عدد النتائج المعروضة: {displayedSubmissions.length}
            </div>
          </div>
        </div>

        {displayedSubmissions.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-black text-slate-600">لا توجد نتائج مسجلة لهذا الاختبار حتى الآن</p>
            <p className="text-xs font-bold text-slate-400 mt-1">
              عند قيام أي طالب بأداء الاختبار ستظهر نتيجته ووقته وإجاباته هنا مباشرة
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayedSubmissions.map((sub) => {
              const isSelected = selectedSubmissionIds.includes(sub.id);
              const isPassed = sub.percentage >= 50;

              return (
                <div
                  key={sub.id}
                  className={`p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                    isSelected ? 'bg-emerald-50/30' : 'hover:bg-slate-50/70'
                  }`}
                >
                  {/* Select + Student info */}
                  <div className="flex items-center gap-3.5">
                    <button
                      type="button"
                      onClick={() => toggleSelectOne(sub.id)}
                      className="cursor-pointer text-slate-400 hover:text-slate-600"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-[#58cc02]" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    <div>
                      <h4 className="text-sm sm:text-base font-black text-slate-800">
                        {sub.userFullName}
                      </h4>
                      <p className="text-xs font-semibold text-slate-400">
                        {sub.examTitle} • {formatDateArabic(sub.submittedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Badges: Time + Score */}
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                    {/* Time taken */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>الوقت: {formatDurationArabic(sub.timeSpentSeconds)}</span>
                    </div>

                    {/* Score */}
                    <div
                      className={`px-3 py-1.5 rounded-xl border-2 text-xs font-black flex items-center gap-1.5 ${
                        isPassed
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-red-300 bg-red-50 text-red-800'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{sub.score} / {sub.maxScore} ({sub.percentage}%)</span>
                    </div>

                    {/* View Answers Button */}
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playPop();
                        setInspectSubmission(sub);
                      }}
                      className="px-3.5 py-1.5 rounded-xl duo-btn-outline text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#1899d6]" />
                      <span>عرض الإجابات</span>
                    </button>

                    {/* Delete Submission Button */}
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playPop();
                        setSubmissionToDelete(sub);
                      }}
                      className="w-8 h-8 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center cursor-pointer transition-all"
                      title="حذف نتيجة الطالب"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Student Answers Inspection Modal */}
      {inspectSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto touch-manipulation">
          <div className="duo-card max-w-3xl w-full bg-white p-4 sm:p-8 shadow-2xl my-auto max-h-[88dvh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-100 pb-3 sm:pb-4 mb-3 sm:mb-4 gap-2">
              <div className="min-w-0">
                <h3 className="text-base sm:text-xl font-black text-slate-800 truncate">
                  تفاصيل إجابات الطالب: {inspectSubmission.userFullName}
                </h3>
                <p className="text-[11px] sm:text-xs font-bold text-slate-500 mt-0.5 line-clamp-1">
                  {inspectSubmission.examTitle} • حل في{' '}
                  {formatDurationArabic(inspectSubmission.timeSpentSeconds)} • الدرجة:{' '}
                  {inspectSubmission.score} من {inspectSubmission.maxScore} (
                  {inspectSubmission.percentage}%)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInspectSubmission(null)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Modal Body: Question list */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {inspectSubmission.questionSnapshots.map((q, idx) => {
                const studentPicks = inspectSubmission.answers[q.id] || [];
                const correctAnswers = q.correctAnswers || [];
                const isCorrect =
                  studentPicks.length === correctAnswers.length &&
                  studentPicks.every((v) => correctAnswers.includes(v));

                return (
                  <div
                    key={q.id || idx}
                    className={`p-4 rounded-2xl border-2 ${
                      isCorrect ? 'border-emerald-200 bg-emerald-50/20' : 'border-red-200 bg-red-50/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <h4 className="text-sm font-black text-slate-800">
                        {idx + 1}. {q.text}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                          isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {isCorrect ? `صحيح (+${q.points})` : 'إجابة خاطئة (0)'}
                      </span>
                    </div>

                    <div className="space-y-1.5 mr-4 text-xs font-bold">
                      {q.options.map((opt, optIdx) => {
                        const wasPicked = studentPicks.includes(optIdx);
                        const isRightAnswer = correctAnswers.includes(optIdx);

                        let style = 'bg-white border-slate-200 text-slate-600';
                        if (isRightAnswer && wasPicked) {
                          style = 'bg-emerald-100 border-emerald-400 text-emerald-900 font-black';
                        } else if (isRightAnswer && !wasPicked) {
                          style = 'bg-emerald-50 border-emerald-300 text-emerald-800 border-dashed';
                        } else if (!isRightAnswer && wasPicked) {
                          style = 'bg-red-100 border-red-400 text-red-900 line-through';
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-2 rounded-xl border flex items-center justify-between ${style}`}
                          >
                            <span>
                              {arabicLetters[optIdx]}. {opt}
                            </span>
                            <span className="text-[10px]">
                              {wasPicked && 'اختيار الطالب '}
                              {isRightAnswer && '(الصحيح)'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectSubmission(null)}
                className="px-6 py-2.5 rounded-xl duo-btn-outline font-black text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Message Modal */}
      {showMessageExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="duo-card max-w-lg w-full bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#58cc02]" />
                <h3 className="text-base font-black text-slate-800">
                  استخراج رسالة نصية بالدرجات
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMessageExportModal(false)}
                className="w-8 h-8 rounded-lg border flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-semibold text-slate-500 mb-3">
              تم تجهيز نص الرسالة التالي لمشاركته بسهولة عبر رسائل الواتساب أو التليجرام أو لوحة الإعلانات:
            </p>

            {/* Message Preview Textarea */}
            <div className="relative mb-4">
              <textarea
                readOnly
                rows={9}
                value={generateExportMessage()}
                className="w-full p-3.5 rounded-xl border-2 border-slate-200 bg-slate-50 font-mono text-xs text-slate-800 outline-none select-all"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowMessageExportModal(false)}
                className="flex-1 py-3 rounded-xl duo-btn-outline font-black text-xs cursor-pointer"
              >
                إغلاق
              </button>

              <button
                type="button"
                onClick={handleCopyMessage}
                className="flex-1 py-3 rounded-xl duo-btn-green font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedMessage ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>تم النسخ بنجاح!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 stroke-[2.5]" />
                    <span>نسخ نص الرسالة</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Submission Confirmation Modal */}
      {submissionToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="duo-card max-w-sm w-full bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                <h3 className="text-base font-black text-slate-800">حذف نتيجة المختبر</h3>
              </div>
              <button
                type="button"
                onClick={() => setSubmissionToDelete(null)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm font-bold text-slate-700 mb-2">
              هل أنت متأكد من حذف نتيجة الطالب:
            </p>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4">
              <span className="text-xs font-black text-slate-800">{submissionToDelete.userFullName}</span>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                الدرجة: {submissionToDelete.score} من {submissionToDelete.maxScore} ({submissionToDelete.percentage}%)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSubmissionToDelete(null)}
                disabled={isDeletingSub}
                className="flex-1 py-3 rounded-xl duo-btn-outline font-black text-xs cursor-pointer disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSubmission}
                disabled={isDeletingSub}
                className="flex-1 py-3 rounded-xl duo-btn-red font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeletingSub ? 'جاري الحذف...' : 'حذف النتيجة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Multiple Selected Submissions Modal */}
      {showDeleteSelectedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="duo-card max-w-sm w-full bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5 stroke-[2.5]" />
                <h3 className="text-base font-black text-slate-800">حذف النتائج المحددة</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteSelectedModal(false)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm font-bold text-slate-700 mb-2">
              هل أنت متأكد من حذف <span className="text-red-600 font-black">{selectedSubmissionIds.length}</span> نتيجة محددة من قاعدة البيانات؟
            </p>
            <p className="text-xs font-semibold text-slate-500 mb-4">
              لا يمكن التراجع عن هذه العملية بعد إتمام الحذف.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteSelectedModal(false)}
                disabled={isDeletingBatch}
                className="flex-1 py-3 rounded-xl duo-btn-outline font-black text-xs cursor-pointer disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSelected}
                disabled={isDeletingBatch}
                className="flex-1 py-3 rounded-xl duo-btn-red font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeletingBatch ? 'جاري الحذف السحابي...' : `نعم، حذف ${selectedSubmissionIds.length} نتيجة`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Submissions for Exam Modal */}
      {showDeleteAllExamSubsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="duo-card max-w-sm w-full bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                <h3 className="text-base font-black text-slate-800">مسح كافة نتائج الاختبار</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteAllExamSubsModal(false)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm font-bold text-slate-700 mb-2">
              هل أنت متأكد من مسح جميع نتائج {currentExam ? `اختبار "${currentExam.title}"` : 'كافة الاختبارات'}؟
            </p>
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold mb-4">
              سيتم حذف جميع النتائج المعروضة البالغ عددها ({displayedSubmissions.length}) بالكامل من Firestore.
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteAllExamSubsModal(false)}
                disabled={isDeletingBatch}
                className="flex-1 py-3 rounded-xl duo-btn-outline font-black text-xs cursor-pointer disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAllExamSubs}
                disabled={isDeletingBatch}
                className="flex-1 py-3 rounded-xl duo-btn-red font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeletingBatch ? 'جاري المسح...' : 'تأكيد مسح كافة النتائج'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
