import React, { useState } from 'react';
import { Exam, Submission, User } from '../../types';
import { soundFX } from '../../lib/audio';
import {
  GraduationCap,
  Clock,
  Award,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowLeft,
  Search,
  BookOpen
} from 'lucide-react';

interface StudentDashboardProps {
  currentUser: User;
  exams: Exam[];
  submissions: Submission[];
  onStartExam: (exam: Exam) => void;
  onViewResult: (submission: Submission) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentUser,
  exams,
  submissions,
  onStartExam,
  onViewResult
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Map submissions by examId for this user
  const userSubmissionsByExam: Record<string, Submission> = {};
  submissions
    .filter((s) => s.userId === currentUser.id)
    .forEach((s) => {
      // Keep most recent or highest
      if (!userSubmissionsByExam[s.examId] || new Date(s.submittedAt) > new Date(userSubmissionsByExam[s.examId].submittedAt)) {
        userSubmissionsByExam[s.examId] = s;
      }
    });

  // Active exams only for students
  const filteredExams = exams.filter((e) => {
    if (!e.isActive) return false;
    if (!searchTerm.trim()) return true;
    return (
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const completedCount = Object.keys(userSubmissionsByExam).length;
  const userScores = Object.values(userSubmissionsByExam);
  const averagePercentage =
    userScores.length > 0
      ? Math.round(userScores.reduce((acc, curr) => acc + curr.percentage, 0) / userScores.length)
      : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Welcome Banner Card */}
      <div className="duo-card p-6 sm:p-8 bg-white relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-right">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#58cc02] border-b-4 border-[#46a302] flex items-center justify-center text-white shrink-0 shadow-md">
              <GraduationCap className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.5]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-xs font-black text-[#46a302] border border-emerald-200 mb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                حساب طالب مختبر
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800">
                مرحباً بك يا {currentUser.fullName}
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                اختر الاختبار المقرر عليك وابدأ في إثبات مهاراتك خطوة بخطوة
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
            <div className="p-3.5 px-5 rounded-2xl border-2 border-b-4 border-slate-200 bg-slate-50 text-center">
              <span className="text-xs font-bold text-slate-400 block">المكتمل</span>
              <span className="text-xl font-black text-slate-800">{completedCount}</span>
            </div>
            <div className="p-3.5 px-5 rounded-2xl border-2 border-b-4 border-slate-200 bg-slate-50 text-center">
              <span className="text-xs font-bold text-slate-400 block">متوسط الدرجات</span>
              <span className="text-xl font-black text-[#58cc02]">{averagePercentage}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#1cb0f6]" />
            الاختبارات المقررة المتاحة ({filteredExams.length})
          </h2>
          <p className="text-xs font-bold text-slate-500">
            تصفح الاختبارات المسندة إليك واضغط على الزر الأخضر لبدء التقييم
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث في الاختبارات..."
            className="w-full pl-3 pr-10 py-2.5 rounded-xl border-2 border-slate-200 border-b-4 focus:border-[#1cb0f6] outline-none text-xs font-bold text-slate-700 bg-white"
          />
        </div>
      </div>

      {/* Exams Grid */}
      {filteredExams.length === 0 ? (
        <div className="duo-card p-12 bg-white text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-black text-slate-700">لا توجد اختبارات متوفرة حالياً</h3>
          <p className="text-xs font-bold text-slate-400 mt-1">
            سوف تظهر الاختبارات هنا فور قيام المشرف بنشرها وتفعيلها
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredExams.map((exam) => {
            const userSub = userSubmissionsByExam[exam.id];
            const isCompleted = !!userSub;

            return (
              <div
                key={exam.id}
                className={`duo-card p-5 sm:p-6 bg-white flex flex-col justify-between transition-all hover:translate-y-[-2px] ${
                  isCompleted ? 'border-emerald-200' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Card Header & Badges */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                      {exam.questions.length} أسئلة
                    </span>

                    {isCompleted ? (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        تم الحل بنجاح ({userSub.score}/{userSub.maxScore})
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        متاح الآن
                      </span>
                    )}
                  </div>

                  {/* Title and Description */}
                  <h3 className="text-lg font-black text-slate-800 mb-2 leading-snug">
                    {exam.title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {exam.description || 'اختبار تقييمي لقياس التحصيل والمعرفة العامة'}
                  </p>

                  {/* Test Details Pill Group */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 mb-6">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {exam.isUnlimitedTime ? 'وقت غير مقيد (مفتوح)' : `${exam.durationMinutes} دقيقة`}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
                      <Award className="w-3.5 h-3.5 text-slate-400" />
                      إجمالي {exam.totalPoints} نقطة
                    </span>
                    {exam.isOpenWindow ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        متاح في أي وقت
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        محدد بنافذة زمنية
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 border-t border-slate-100">
                  {isCompleted ? (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playPop();
                          onViewResult(userSub);
                        }}
                        className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl duo-btn-outline font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#58cc02] shrink-0" />
                        <span className="truncate">عرض نتيجتي السابقة ({userSub.percentage}%)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playPop();
                          onStartExam(exam);
                        }}
                        className="py-2.5 sm:py-3 px-4 rounded-xl duo-btn-green font-black text-xs sm:text-sm cursor-pointer touch-manipulation shrink-0"
                        title="إعادة المحاولة"
                      >
                        إعادة الاختبار
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playPop();
                        onStartExam(exam);
                      }}
                      className="w-full py-3 sm:py-3.5 px-4 sm:px-6 rounded-2xl duo-btn-green font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                    >
                      <span>ابدأ الاختبار الآن</span>
                      <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
