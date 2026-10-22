import React, { useState, useEffect, useRef } from 'react';
import { Exam, Question, Submission, User } from '../../types';
import { soundFX } from '../../lib/audio';
import { submitExamAttempt } from '../../lib/firebase';
import { formatDurationArabic, fireDuolingoConfetti } from '../../lib/utils';
import { LivingBackground } from '../LivingBackground';
import {
  Clock,
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Award,
  Check,
  Sparkles
} from 'lucide-react';

interface ExamTakingSessionProps {
  exam: Exam;
  currentUser: User;
  onFinish: (submission: Submission) => void;
  onCancel: () => void;
}

export const ExamTakingSession: React.FC<ExamTakingSessionProps> = ({
  exam,
  currentUser,
  onFinish,
  onCancel
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number[]>>({});
  const [timeSpent, setTimeSpent] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
    exam.isUnlimitedTime ? null : exam.durationMinutes * 60
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showReviewConfirm, setShowReviewConfirm] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      setTimeSpent((prev) => prev + 1);

      if (!exam.isUnlimitedTime && remainingSeconds !== null) {
        setRemainingSeconds((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            // Auto submit when time expires
            handleAutoSubmitOnTimeout();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [exam.isUnlimitedTime]);

  const currentQuestion: Question | undefined = exam.questions[currentIndex];

  const handleSelectOption = (optionIndex: number) => {
    if (!currentQuestion) return;
    soundFX.playPop();

    const currentSelected = selectedAnswers[currentQuestion.id] || [];

    if (currentQuestion.type === 'single') {
      setSelectedAnswers({
        ...selectedAnswers,
        [currentQuestion.id]: [optionIndex]
      });
    } else {
      // Multiple choice toggling
      if (currentSelected.includes(optionIndex)) {
        setSelectedAnswers({
          ...selectedAnswers,
          [currentQuestion.id]: currentSelected.filter((i) => i !== optionIndex)
        });
      } else {
        setSelectedAnswers({
          ...selectedAnswers,
          [currentQuestion.id]: [...currentSelected, optionIndex].sort((a, b) => a - b)
        });
      }
    }
  };

  const handleNext = () => {
    soundFX.playPop();
    if (currentIndex < exam.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowReviewConfirm(true);
    }
  };

  const handlePrev = () => {
    soundFX.playPop();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const calculateResults = () => {
    let earnedPoints = 0;
    const totalPossiblePoints = exam.questions.reduce((sum, q) => sum + (q.points || 0), 0);

    exam.questions.forEach((q) => {
      const studentPicks = selectedAnswers[q.id] || [];
      const correctAnswers = q.correctAnswers || [];

      // Check for exact set match
      const isExactMatch =
        studentPicks.length === correctAnswers.length &&
        studentPicks.every((val) => correctAnswers.includes(val));

      if (isExactMatch) {
        earnedPoints += q.points;
      }
    });

    const percentage = totalPossiblePoints > 0 ? Math.round((earnedPoints / totalPossiblePoints) * 100) : 0;

    return {
      earnedPoints,
      totalPossiblePoints,
      percentage
    };
  };

  const handleAutoSubmitOnTimeout = async () => {
    if (isSubmitting) return;
    performSubmission();
  };

  const performSubmission = async () => {
    setIsSubmitting(true);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const { earnedPoints, totalPossiblePoints, percentage } = calculateResults();
    const totalDurationSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

    try {
      const submission = await submitExamAttempt({
        examId: exam.id,
        examTitle: exam.title,
        userId: currentUser.id,
        userFullName: currentUser.fullName,
        answers: selectedAnswers,
        score: earnedPoints,
        maxScore: totalPossiblePoints,
        percentage,
        timeSpentSeconds: totalDurationSeconds,
        questionSnapshots: exam.questions
      });

      soundFX.playFanfare();
      fireDuolingoConfetti();
      onFinish(submission);
    } catch (err) {
      console.error('Submission failed', err);
      // Fallback submission object
      const fallbackSub: Submission = {
        id: `sub_${Date.now()}`,
        examId: exam.id,
        examTitle: exam.title,
        userId: currentUser.id,
        userFullName: currentUser.fullName,
        answers: selectedAnswers,
        score: earnedPoints,
        maxScore: totalPossiblePoints,
        percentage,
        timeSpentSeconds: totalDurationSeconds,
        submittedAt: new Date().toISOString(),
        questionSnapshots: exam.questions
      };
      soundFX.playFanfare();
      fireDuolingoConfetti();
      onFinish(fallbackSub);
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(selectedAnswers).filter(
    (k) => (selectedAnswers[k] || []).length > 0
  ).length;
  const progressPercent = Math.round(((currentIndex + 1) / exam.questions.length) * 100);

  const arabicLetters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

  return (
    <div className="min-h-screen relative flex flex-col justify-between overflow-hidden">
      <LivingBackground />

      {/* Top Header & Progress Bar */}
      <header className="bg-white/95 backdrop-blur-xs border-b-2 border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Close / Exit Button */}
          <button
            type="button"
            onClick={() => {
              soundFX.playPop();
              setShowExitConfirm(true);
            }}
            className="w-10 h-10 rounded-xl border-2 border-slate-200 border-b-4 hover:border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
            title="مغادرة الاختبار"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Duolingo Chunky Progress Bar */}
          <div className="flex-1 mx-2">
            <div className="flex justify-between items-center text-xs font-black text-slate-400 mb-1">
              <span>السؤال {currentIndex + 1} من {exam.questions.length}</span>
              <span>{Math.round(((answeredCount) / exam.questions.length) * 100)}% تم الحل</span>
            </div>
            <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-[#58cc02] rounded-full transition-all duration-300 relative shadow-inner"
                style={{ width: `${progressPercent}%` }}
              >
                {/* Gloss highlight effect */}
                <div className="absolute top-0.5 inset-x-1 h-1 bg-white/40 rounded-full" />
              </div>
            </div>
          </div>

          {/* Timer Display */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-200 bg-slate-50">
            <Clock className={`w-4 h-4 ${remainingSeconds !== null && remainingSeconds < 120 ? 'text-[#ff4b4b] animate-pulse' : 'text-slate-500'}`} />
            {remainingSeconds !== null ? (
              <span
                className={`text-xs font-black font-mono ${
                  remainingSeconds < 120 ? 'text-[#ff4b4b]' : 'text-slate-700'
                }`}
              >
                {Math.floor(remainingSeconds / 60)}:
                {String(remainingSeconds % 60).padStart(2, '0')}
              </span>
            ) : (
              <span className="text-xs font-black text-[#58cc02]">مفتوح</span>
            )}
          </div>
        </div>
      </header>

      {/* Main Question Area */}
      <main className="max-w-3xl mx-auto w-full px-4 py-6 sm:py-10 flex-1 flex flex-col justify-center">
        {currentQuestion && (
          <div className="space-y-6">
            {/* Question Meta Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-xs font-black bg-[#1cb0f6]/10 text-[#1899d6] border border-[#1cb0f6]/30">
                  {currentQuestion.type === 'single' ? 'اختيار فردي' : 'اختيار متعدد (أكثر من إجابة)'}
                </span>
                <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-amber-50 text-[#d4a000] border border-amber-200">
                  {currentQuestion.points} نقاط
                </span>
              </div>
              <div className="text-xs font-bold text-slate-400">
                الوقت المنقضي: {formatDurationArabic(timeSpent)}
              </div>
            </div>

            {/* Question Text */}
            <div className="duo-card p-6 sm:p-8 bg-white shadow-xs">
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 leading-relaxed">
                {currentQuestion.text}
              </h2>
              {currentQuestion.type === 'multiple' && (
                <p className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#ffc800]" />
                  يمكنك اختيار أكثر من إجابة صحيحة لهذا السؤال
                </p>
              )}
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = (selectedAnswers[currentQuestion.id] || []).includes(idx);
                const letter = arabicLetters[idx] || String(idx + 1);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full p-4 sm:p-5 rounded-2xl border-2 border-b-4 flex items-center justify-between text-right transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#58cc02] bg-[#f2fcf0] text-slate-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Letter Icon Pill */}
                      <div
                        className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center font-black text-sm shrink-0 transition-all ${
                          isSelected
                            ? 'bg-[#58cc02] border-[#46a302] text-white shadow-xs'
                            : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        {letter}
                      </div>
                      <span className="font-bold text-base sm:text-lg">{option}</span>
                    </div>

                    {/* Check or Radio Marker */}
                    <div
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-[#58cc02] bg-[#58cc02] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Sticky Action Bar */}
      <footer className="bg-white border-t-2 border-slate-200 p-4 sticky bottom-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          {/* Previous Button */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="px-5 py-3 rounded-2xl duo-btn-outline font-black text-sm flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            <span>السابق</span>
          </button>

          {/* Center Indicators */}
          <div className="hidden sm:flex items-center gap-1.5">
            {exam.questions.map((q, idx) => {
              const isAnswered = (selectedAnswers[q.id] || []).length > 0;
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    soundFX.playPop();
                    setCurrentIndex(idx);
                  }}
                  className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-slate-800 text-white'
                      : isAnswered
                      ? 'bg-[#58cc02] text-white'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Next / Submit Button */}
          {currentIndex < exam.questions.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-3 rounded-2xl duo-btn-green font-black text-sm flex items-center gap-2 cursor-pointer"
            >
              <span>التالي</span>
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundFX.playPop();
                setShowReviewConfirm(true);
              }}
              className="px-6 py-3 rounded-2xl duo-btn-blue font-black text-sm flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>إنهاء وتسليم</span>
            </button>
          )}
        </div>
      </footer>

      {/* Confirmation Modal before Submit */}
      {showReviewConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="duo-card max-w-md w-full bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="text-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 border-2 border-b-4 border-[#1cb0f6] text-[#1cb0f6] flex items-center justify-center mx-auto mb-3">
                <Award className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h3 className="text-xl font-black text-slate-800">هل أنت مستعد لتسليم الاختبار؟</h3>
              <p className="text-sm font-semibold text-slate-500 mt-1">
                لقد أجبت على {answeredCount} من أصل {exam.questions.length} سؤالاً.
              </p>
            </div>

            {answeredCount < exam.questions.length && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-800 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>تنبيه: يوجد {exam.questions.length - answeredCount} سؤالاً لم تقم بالإجابة عليها بعد!</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowReviewConfirm(false)}
                className="flex-1 py-3 rounded-2xl duo-btn-outline font-black text-sm cursor-pointer"
              >
                مراجعة الإجابات
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={performSubmission}
                className="flex-1 py-3 rounded-2xl duo-btn-green font-black text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'جاري التسليم...' : 'تأكيد التسليم'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="duo-card max-w-sm w-full bg-white p-6 shadow-xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border-2 border-b-4 border-[#ff4b4b] text-[#ff4b4b] flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-black text-slate-800">هل تريد الخروج من الاختبار؟</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">
                إذا خرجت الآن لن يتم حفظ إجاباتك ولن يتم تسجيل نتيجتك.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 rounded-2xl duo-btn-green font-black text-xs cursor-pointer"
              >
                متابعة الاختبار
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 rounded-2xl duo-btn-red font-black text-xs cursor-pointer"
              >
                خروج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
