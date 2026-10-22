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
  BookOpen,
  TrendingUp,
  BarChart3,
  Target,
  Activity,
  History
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

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
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  // Filter submissions by currentUser and sort chronologically
  const userSubmissions = submissions
    .filter((s) => s.userId === currentUser.id)
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

  // Map submissions by examId for quick status lookup
  const userSubmissionsByExam: Record<string, Submission> = {};
  userSubmissions.forEach((s) => {
    // Keep most recent
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

  const highestScore =
    userScores.length > 0
      ? Math.max(...userScores.map((s) => s.percentage))
      : 0;

  const passedCount = userScores.filter((s) => s.percentage >= 50).length;
  const passRate = userScores.length > 0 ? Math.round((passedCount / userScores.length) * 100) : 0;

  // Chart data formatting
  const chartData = userSubmissions.map((s, index) => {
    const dateObj = new Date(s.submittedAt);
    const dateLabel = isNaN(dateObj.getTime())
      ? `محاولة ${index + 1}`
      : dateObj.toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' });
    const timeLabel = isNaN(dateObj.getTime())
      ? ''
      : dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const shortTitle = s.examTitle.length > 14 ? `${s.examTitle.substring(0, 14)}...` : s.examTitle;

    return {
      index: index + 1,
      attemptNumber: `اختبار #${index + 1}`,
      name: shortTitle,
      fullTitle: s.examTitle,
      percentage: Math.round(s.percentage),
      score: s.score,
      maxScore: s.maxScore,
      date: dateLabel,
      time: timeLabel,
      timeSpentMin: Math.max(1, Math.round((s.timeSpentSeconds || 0) / 60))
    };
  });

  // Custom RTL Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3.5 rounded-2xl border-2 border-b-4 border-slate-200 shadow-xl text-right min-w-[200px] z-50">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
            <span className="text-xs font-black text-slate-800">{data.fullTitle}</span>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
              {data.attemptNumber}
            </span>
          </div>

          <div className="space-y-1.5 text-xs font-bold text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold">النسبة المئوية:</span>
              <span className="font-black text-[#58cc02] text-sm">{data.percentage}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold">الدرجة المحصلة:</span>
              <span className="font-black text-slate-800">
                {data.score} / {data.maxScore}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold">تاريخ الإجراء:</span>
              <span className="text-slate-500 font-medium">
                {data.date} {data.time && `(${data.time})`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold">الوقت المستغرق:</span>
              <span className="text-slate-500 font-medium">{data.timeSpentMin} دقيقة تقريباً</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

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
          <div className="grid grid-cols-2 sm:flex items-center gap-2.5 w-full sm:w-auto">
            <div className="p-3 sm:px-4 rounded-2xl border-2 border-b-4 border-slate-200 bg-slate-50 text-center">
              <span className="text-[11px] font-bold text-slate-400 block">المكتمل</span>
              <span className="text-lg sm:text-xl font-black text-slate-800">{completedCount}</span>
            </div>
            <div className="p-3 sm:px-4 rounded-2xl border-2 border-b-4 border-slate-200 bg-slate-50 text-center">
              <span className="text-[11px] font-bold text-slate-400 block">المتوسط</span>
              <span className="text-lg sm:text-xl font-black text-[#58cc02]">{averagePercentage}%</span>
            </div>
            <div className="p-3 sm:px-4 rounded-2xl border-2 border-b-4 border-slate-200 bg-slate-50 text-center">
              <span className="text-[11px] font-bold text-slate-400 block">أعلى نسبة</span>
              <span className="text-lg sm:text-xl font-black text-[#1cb0f6]">{highestScore}%</span>
            </div>
            <div className="p-3 sm:px-4 rounded-2xl border-2 border-b-4 border-slate-200 bg-slate-50 text-center">
              <span className="text-[11px] font-bold text-slate-400 block">نسبة الاجتياز</span>
              <span className="text-lg sm:text-xl font-black text-emerald-600">{passRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recharts Analytics Section: Past Test Performance */}
      <div className="duo-card p-6 bg-white relative overflow-hidden space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#58cc02]/10 border-2 border-[#58cc02]/30 flex items-center justify-center text-[#58cc02]">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                مؤشرات التحصيل وإحصائيات الأداء التفاعلية
              </h2>
              <p className="text-xs font-bold text-slate-400">
                رسم بياني يوضح تطور مستواك ومقارنة نتائجك عبر الاختبارات السابقة
              </p>
            </div>
          </div>

          {/* Toggle Area vs Bar Chart */}
          {userSubmissions.length > 0 && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 self-stretch sm:self-auto justify-center">
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  setChartType('area');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  chartType === 'area'
                    ? 'bg-white text-[#58cc02] shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>منحنى التطور (%)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  setChartType('bar');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-white text-[#1cb0f6] shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>مقارنة الدرجات</span>
              </button>
            </div>
          )}
        </div>

        {/* Chart Content Area */}
        {userSubmissions.length === 0 ? (
          <div className="py-12 px-4 text-center bg-slate-50/70 rounded-2xl border-2 border-dashed border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-slate-200/60 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Target className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-black text-slate-700">لم تقم بإجراء أي اختبار حتى الآن</h3>
            <p className="text-xs font-bold text-slate-400 max-w-md mx-auto mt-1">
              بمجرد إنهائك لأول اختبار مقرر عليك، سيتم تسجيل نتائجك هنا وعرض رسوم بيانية تفاعلية لقياس مستوى تطورك ودرجاتك.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#58cc02" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#58cc02" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                      unit="%"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="percentage"
                      name="النسبة"
                      stroke="#58cc02"
                      strokeWidth={3.5}
                      fillOpacity={1}
                      fill="url(#scoreGradient)"
                      activeDot={{ r: 6, fill: '#58cc02', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="maxScore"
                      name="الدرجة القصوى"
                      fill="#e2e8f0"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={32}
                    />
                    <Bar
                      dataKey="score"
                      name="درجتك"
                      fill="#1cb0f6"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Quick Chart Legend & Insights footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs font-bold text-slate-500">
              <div className="flex items-center gap-4">
                {chartType === 'area' ? (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#58cc02] inline-block"></span>
                    <span>النسبة المئوية المحرزة في المحاولة</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-[#1cb0f6] inline-block"></span>
                      <span>الدرجة الفعلية المحققة</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-slate-200 inline-block"></span>
                      <span>الدرجة الكلية للاختبار</span>
                    </div>
                  </>
                )}
              </div>

              <div className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                <History className="w-3.5 h-3.5" />
                <span>إجمالي المحاولات المسجلة: {userSubmissions.length}</span>
              </div>
            </div>
          </div>
        )}
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
