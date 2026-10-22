import React, { useState } from 'react';
import { Exam, Submission, User } from '../../types';
import { soundFX } from '../../lib/audio';
import { JsonExamCreator } from './JsonExamCreator';
import { SubmissionsViewer } from './SubmissionsViewer';
import { UserManagement } from './UserManagement';
import { toggleExamActive, deleteExam } from '../../lib/firebase';
import {
  FileText,
  Users,
  UserCheck,
  Plus,
  BookOpen,
  Clock,
  Award,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  AlertTriangle,
  X
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
  exams: Exam[];
  submissions: Submission[];
  users: User[];
  onReloadData: () => void;
  onPreviewExam: (exam: Exam) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  exams,
  submissions,
  users,
  onReloadData,
  onPreviewExam
}) => {
  const [activeTab, setActiveTab] = useState<'exams' | 'examinees' | 'users'>('exams');
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggleExamStatus = async (exam: Exam) => {
    soundFX.playPop();
    try {
      await toggleExamActive(exam.id, !exam.isActive);
      onReloadData();
    } catch {
      // error handled
    }
  };

  const handleConfirmDeleteExam = async () => {
    if (!examToDelete) return;
    setIsDeleting(true);
    soundFX.playPop();
    try {
      await deleteExam(examToDelete.id);
      soundFX.playSuccess();
      setExamToDelete(null);
      onReloadData();
    } catch (err) {
      console.error('Delete exam failed', err);
      soundFX.playError();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Supervisor Header Banner */}
      <div className="duo-card p-4 sm:p-8 bg-white/95 backdrop-blur-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[#ff9600] border-b-4 border-[#cf7800] flex items-center justify-center text-white shadow-xs shrink-0">
            <Layers className="w-6 h-6 sm:w-9 sm:h-9 stroke-[2.5]" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-amber-50 text-[11px] sm:text-xs font-black text-[#cf7800] border border-amber-200 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              لوحة تحكم المشرف
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-800 leading-snug">
              أهلاً بك يا مشرف المنصة ({currentUser.fullName})
            </h1>
            <p className="text-[11px] sm:text-xs md:text-sm font-semibold text-slate-500">
              إدارة الاختبارات والأسئلة عبر ملفات JSON، متابعة المختبرين وأوقاتهم، وتخصيص الحسابات
            </p>
          </div>
        </div>

        {/* Action Button: Create Exam */}
        {!showCreateExam && !editingExam && (
          <button
            type="button"
            onClick={() => {
              soundFX.playPop();
              setShowCreateExam(true);
              setActiveTab('exams');
            }}
            className="w-full md:w-auto px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl duo-btn-green font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs touch-manipulation"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            <span>إنشاء اختبار جديد (JSON)</span>
          </button>
        )}
      </div>

      {/* Tabs Navigation */}
      {!showCreateExam && !editingExam && (
        <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-slate-200/80 backdrop-blur-xs rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar touch-manipulation">
          <button
            type="button"
            onClick={() => {
              soundFX.playPop();
              setActiveTab('exams');
            }}
            className={`flex-1 min-w-[115px] sm:min-w-[140px] py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 ${
              activeTab === 'exams'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-300/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-[#58cc02] stroke-[2.5]" />
            <span>الاختبارات ({exams.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFX.playPop();
              setActiveTab('examinees');
            }}
            className={`flex-1 min-w-[145px] sm:min-w-[170px] py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 ${
              activeTab === 'examinees'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-300/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-[#ff9600] stroke-[2.5]" />
            <span>المختبرون والنتائج ({submissions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFX.playPop();
              setActiveTab('users');
            }}
            className={`flex-1 min-w-[125px] sm:min-w-[150px] py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-300/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4 text-[#1cb0f6] stroke-[2.5]" />
            <span>الحسابات ({users.length})</span>
          </button>
        </div>
      )}

      {/* View Content */}
      {showCreateExam || editingExam ? (
        <JsonExamCreator
          initialExam={editingExam}
          supervisorName={currentUser.fullName}
          onSaved={() => {
            setShowCreateExam(false);
            setEditingExam(null);
            onReloadData();
          }}
          onCancel={() => {
            setShowCreateExam(false);
            setEditingExam(null);
          }}
        />
      ) : activeTab === 'exams' ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#58cc02]" />
              قائمة الاختبارات الحالية ({exams.length})
            </h3>
            <span className="text-xs font-bold text-slate-400">
              يمكنك تعديل أي اختبار أو تغيير وقت إتاحته أو معاينته
            </span>
          </div>

          {exams.length === 0 ? (
            <div className="duo-card p-12 bg-white text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-black text-slate-700">لا توجد اختبارات منشأة بعد</h4>
              <p className="text-xs font-bold text-slate-400 mt-1 mb-4">
                ابدأ بإنشاء اختبارك الأول عبر لصق كود ملف JSON أو تحريره
              </p>
              <button
                type="button"
                onClick={() => setShowCreateExam(true)}
                className="py-2.5 px-5 rounded-xl duo-btn-green font-black text-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء اختبار الآن</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {exams.map((exam) => {
                const examSubmissions = submissions.filter((s) => s.examId === exam.id);

                return (
                  <div
                    key={exam.id}
                    className={`duo-card p-6 bg-white flex flex-col justify-between transition-all ${
                      exam.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50'
                    }`}
                  >
                    <div>
                      {/* Status Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => handleToggleExamStatus(exam)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-black cursor-pointer transition-all border ${
                            exam.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                          }`}
                        >
                          {exam.isActive ? 'نشط ومتاح للطلاب' : 'معطل ومخفي'}
                        </button>

                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-slate-100 text-slate-600 border border-slate-200">
                          {examSubmissions.length} مختبر
                        </span>
                      </div>

                      <h4 className="text-lg font-black text-slate-800 mb-2">
                        {exam.title}
                      </h4>
                      <p className="text-xs font-semibold text-slate-500 mb-4 line-clamp-2">
                        {exam.description || 'بدون وصف'}
                      </p>

                      {/* Details */}
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 mb-5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                          {exam.questions.length} أسئلة
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {exam.isUnlimitedTime ? 'وقت مفتوح' : `${exam.durationMinutes} دقيقة`}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
                          <Award className="w-3.5 h-3.5 text-slate-400" />
                          {exam.totalPoints} نقطة
                        </span>
                        {exam.isOpenWindow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            مفتوح دائماً
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                            <Calendar className="w-3.5 h-3.5 text-amber-600" />
                            محدد بموعد
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playPop();
                          onPreviewExam(exam);
                        }}
                        className="px-3.5 py-2 rounded-xl duo-btn-outline text-xs font-black flex items-center gap-1.5 cursor-pointer"
                        title="تجربة حل الاختبار كطالب"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#1cb0f6]" />
                        <span>معاينة</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playPop();
                            setEditingExam(exam);
                          }}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-black text-slate-700 flex items-center gap-1 cursor-pointer"
                          title="تعديل الاختبار"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playPop();
                            setExamToDelete(exam);
                          }}
                          className="w-9 h-9 rounded-xl border-2 border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 flex items-center justify-center cursor-pointer transition-all active:translate-y-0.5"
                          title="حذف الاختبار"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'examinees' ? (
        <SubmissionsViewer exams={exams} submissions={submissions} onReloadData={onReloadData} />
      ) : (
        <UserManagement users={users} onReloadUsers={onReloadData} />
      )}

      {/* Delete Exam Confirmation Modal */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="duo-card max-w-sm w-full bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                <h3 className="text-base font-black text-slate-800">تأكيد حذف الاختبار</h3>
              </div>
              <button
                type="button"
                onClick={() => setExamToDelete(null)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm font-bold text-slate-700 mb-2">
              هل أنت متأكد من رغبتك في حذف هذا الاختبار بشكل نهائي؟
            </p>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4">
              <span className="text-xs font-black text-slate-800">{examToDelete.title}</span>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                {examToDelete.questions.length} أسئلة • {examToDelete.totalPoints} نقطة
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setExamToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl duo-btn-outline font-black text-xs cursor-pointer disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteExam}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl duo-btn-red font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <span>جاري الحذف...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 stroke-[2.5]" />
                    <span>نعم، حذف الاختبار</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
