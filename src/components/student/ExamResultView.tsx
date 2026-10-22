import React from 'react';
import { Submission } from '../../types';
import { formatDurationArabic, formatDateArabic } from '../../lib/utils';
import { soundFX } from '../../lib/audio';
import {
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Flame,
  Award,
  Check,
  X,
  Target
} from 'lucide-react';

interface ExamResultViewProps {
  submission: Submission;
  onBack: () => void;
}

export const ExamResultView: React.FC<ExamResultViewProps> = ({
  submission,
  onBack
}) => {
  const isPassed = submission.percentage >= 50;
  const arabicLetters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top Victory Card */}
      <div className="duo-card p-6 sm:p-10 bg-white mb-8 text-center relative overflow-hidden">
        {/* Glow accent */}
        <div
          className={`absolute top-0 inset-x-0 h-3 ${
            isPassed ? 'bg-[#58cc02]' : 'bg-[#ff9600]'
          }`}
        />

        {/* Mascot / Trophy Icon */}
        <div className="flex justify-center mb-5">
          <div
            className={`w-24 h-24 rounded-3xl border-4 border-b-8 flex items-center justify-center shadow-md ${
              isPassed
                ? 'bg-emerald-50 border-[#58cc02] text-[#58cc02]'
                : 'bg-amber-50 border-[#ff9600] text-[#ff9600]'
            }`}
          >
            {isPassed ? (
              <Trophy className="w-12 h-12 stroke-[2.5]" />
            ) : (
              <Target className="w-12 h-12 stroke-[2.5]" />
            )}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2">
          {isPassed ? 'تهانينا! لقد أتممت الاختبار بنجاح' : 'أحسنت المحاولة! يمكنك التحسن أكثر'}
        </h1>
        <p className="text-sm font-bold text-slate-500 mb-6">
          {submission.examTitle} • المختبر: {submission.userFullName}
        </p>

        {/* 3D Stat Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
          {/* Score Tile */}
          <div className="p-4 rounded-2xl border-2 border-b-4 border-slate-200 bg-slate-50 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-black text-slate-400 mb-1">
              <Award className="w-4 h-4 text-[#ffc800]" />
              الدرجة النهائية
            </div>
            <div className="text-2xl font-black text-slate-800">
              {submission.score} <span className="text-base text-slate-400 font-bold">/ {submission.maxScore}</span>
            </div>
            <div className="text-xs font-black text-[#58cc02] mt-0.5">
              نسبة {submission.percentage}%
            </div>
          </div>

          {/* Time Taken Tile */}
          <div className="p-4 rounded-2xl border-2 border-b-4 border-slate-200 bg-slate-50 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-black text-slate-400 mb-1">
              <Clock className="w-4 h-4 text-[#1cb0f6]" />
              الوقت المستغرق
            </div>
            <div className="text-xl font-black text-slate-800">
              {formatDurationArabic(submission.timeSpentSeconds)}
            </div>
            <div className="text-[11px] font-bold text-slate-400 mt-0.5">
              سرعة إنجاز ممتازة
            </div>
          </div>

          {/* Accuracy Tile */}
          <div className="p-4 rounded-2xl border-2 border-b-4 border-slate-200 bg-slate-50 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-black text-slate-400 mb-1">
              <Flame className="w-4 h-4 text-[#ff4b4b]" />
              تاريخ التسليم
            </div>
            <div className="text-xs font-black text-slate-800 mt-1">
              {formatDateArabic(submission.submittedAt)}
            </div>
            <div className="text-[11px] font-bold text-slate-400 mt-1">
              مسجلة في قاعدة البيانات
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => {
            soundFX.playPop();
            onBack();
          }}
          className="py-3 px-8 rounded-2xl duo-btn-green font-black text-sm inline-flex items-center gap-2 cursor-pointer"
        >
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          <span>العودة لقائمة الاختبارات</span>
        </button>
      </div>

      {/* Question by Question Detailed Review */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-[#58cc02]" />
          مراجعة الإجابات بالتفصيل
        </h2>

        {submission.questionSnapshots.map((q, idx) => {
          const studentPicks = submission.answers[q.id] || [];
          const correctAnswers = q.correctAnswers || [];

          const isQuestionCorrect =
            studentPicks.length === correctAnswers.length &&
            studentPicks.every((val) => correctAnswers.includes(val));

          return (
            <div
              key={q.id || idx}
              className={`duo-card p-5 sm:p-6 bg-white transition-all ${
                isQuestionCorrect ? 'border-emerald-200' : 'border-red-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center font-black text-xs shrink-0 ${
                      isQuestionCorrect
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                        : 'bg-red-50 border-red-400 text-red-700'
                    }`}
                  >
                    {isQuestionCorrect ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <X className="w-4 h-4 stroke-[3]" />
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-800">
                    السؤال {idx + 1}: {q.text}
                  </h3>
                </div>

                <div className="shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                      isQuestionCorrect
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {isQuestionCorrect ? `+${q.points} نقاط` : '0 نقاط'}
                  </span>
                </div>
              </div>

              {/* Options Breakdown */}
              <div className="space-y-2 mr-0 sm:mr-10 mt-3 sm:mt-0">
                {q.options.map((opt, optIdx) => {
                  const wasPicked = studentPicks.includes(optIdx);
                  const isActuallyCorrect = correctAnswers.includes(optIdx);

                  let optionStyle = 'border-slate-200 bg-white text-slate-700';
                  if (isActuallyCorrect && wasPicked) {
                    optionStyle = 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-bold';
                  } else if (isActuallyCorrect && !wasPicked) {
                    optionStyle = 'border-emerald-400 bg-emerald-50/30 text-emerald-800 border-dashed';
                  } else if (!isActuallyCorrect && wasPicked) {
                    optionStyle = 'border-red-400 bg-red-50/70 text-red-900 line-through';
                  }

                  return (
                    <div
                      key={optIdx}
                      className={`p-2.5 sm:p-3 rounded-xl border-2 flex items-center justify-between text-xs sm:text-sm gap-2 ${optionStyle}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-0.5">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center font-black text-xs text-slate-600 shrink-0">
                          {arabicLetters[optIdx] || optIdx + 1}
                        </span>
                        <span className="break-words">{opt}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-black shrink-0">
                        {wasPicked && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] sm:text-xs">
                            إجابتك
                          </span>
                        )}
                        {isActuallyCorrect && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] sm:text-xs">
                            الصحيحة
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanation Note if exists */}
              {q.explanation && (
                <div className="mt-3 mr-0 sm:mr-10 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600">
                  <span className="font-black text-slate-700">توضيح: </span>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
