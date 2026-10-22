import confetti from 'canvas-confetti';
import { Question } from '../types';

/**
 * Normalizes Arabic text for flexible name matching:
 * - Removes Arabic diacritics (harakat/tashkeel)
 * - Normalizes Alef forms (أ, إ, آ, ٱ -> ا)
 * - Normalizes Taa Marbuta (ة -> ه)
 * - Normalizes Alef Maksura (ى -> ي)
 * - Strips tatweel (ـ)
 * - Removes repeated whitespaces
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel
    .replace(/\u0640/g, '') // remove tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

export const SUPERVISOR_EXACT_NAME = 'محمد منتصر محمد يونس';
export const SUPERVISOR_NORMALIZED = normalizeArabic(SUPERVISOR_EXACT_NAME);

/**
 * Checks if a name matches the supervisor
 */
export function isDefaultSupervisor(fullName: string): boolean {
  return normalizeArabic(fullName) === SUPERVISOR_NORMALIZED;
}

/**
 * Validates that the input is a 4-part name (الاسم الرباعي)
 */
export function isValidQuadName(name: string): { valid: boolean; wordsCount: number; message?: string } {
  const trimmed = name.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 3) {
    return {
      valid: false,
      wordsCount: words.length,
      message: 'يرجى إدخال الاسم الرباعي كاملاً (على الأقل 3 إلى 4 أسماء)'
    };
  }
  return { valid: true, wordsCount: words.length };
}

/**
 * Formats seconds into Arabic readable duration
 */
export function formatDurationArabic(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);

  if (m === 0) {
    return `${s} ثانية`;
  }
  if (s === 0) {
    if (m === 1) return 'دقيقة واحدة';
    if (m === 2) return 'دقيقتان';
    if (m >= 3 && m <= 10) return `${m} دقائق`;
    return `${m} دقيقة`;
  }

  let minStr = '';
  if (m === 1) minStr = 'دقيقة';
  else if (m === 2) minStr = 'دقيقتان';
  else if (m >= 3 && m <= 10) minStr = `${m} دقائق`;
  else minStr = `${m} دقيقة`;

  return `${minStr} و ${s} ثانية`;
}

/**
 * Formats ISO date to Arabic date & time
 */
export function formatDateArabic(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Trigger Duolingo-styled celebratory confetti
 */
export function fireDuolingoConfetti() {
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#58cc02', '#1cb0f6', '#ffc800', '#ff4b4b', '#ff9600']
    });
  } catch {
    // Confetti fallback
  }
}

/**
 * Starter JSON script template for exam creation
 */
export const SAMPLE_EXAM_JSON = {
  title: "اختبار مهارات اللغة والقدرات العامة",
  description: "اختبار تجريبي شامل لقياس المفاهيم الأساسية وسرعة البديهة والتحليل المنطقي",
  durationMinutes: 20,
  isUnlimitedTime: false,
  isOpenWindow: true,
  questions: [
    {
      text: "ما هي عاصمة جمهورية مصر العربية؟",
      type: "single",
      points: 5,
      options: [
        "الإسكندرية",
        "القاهرة",
        "الجيزة",
        "أسوان"
      ],
      correctAnswers: [1],
      explanation: "القاهرة هي العاصمة الإدارية والسياسية لجمهورية مصر العربية."
    },
    {
      text: "أي من الكلمات التالية تعتبر من أسماء الإشارة؟ (اختر كل ما ينطبق)",
      type: "multiple",
      points: 5,
      options: [
        "هذا",
        "الذي",
        "هؤلاء",
        "الذين"
      ],
      correctAnswers: [0, 2],
      explanation: "'هذا' و 'هؤلاء' من أسماء الإشارة، بينما 'الذي' و 'الذين' من الأسماء الموصولة."
    },
    {
      text: "إذا كانت سرعة السيارة 80 كم/س، فكم تقطع في ساعتين ونصف؟",
      type: "single",
      points: 5,
      options: [
        "160 كم",
        "180 كم",
        "200 كم",
        "240 كم"
      ],
      correctAnswers: [2],
      explanation: "المسافة = السرعة × الزمن = 80 × 2.5 = 200 كم."
    },
    {
      text: "أي من العناصر التالية تعتبر من الغازات النبيلة (الخاملة)؟ (اختر كل ما ينطبق)",
      type: "multiple",
      points: 5,
      options: [
        "الهيليوم (He)",
        "الهيدروجين (H)",
        "النيون (Ne)",
        "الأكسجين (O)"
      ],
      correctAnswers: [0, 2],
      explanation: "الهيليوم والنيون من الغازات النبيلة في المجموعة 18 من الجدول الدوري."
    }
  ]
};

/**
 * Validates parsed questions structure
 */
export function validateExamQuestions(rawQuestions: unknown[]): { valid: boolean; questions: Question[]; error?: string } {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    return { valid: false, questions: [], error: 'يجب أن يحتوي ملف JSON على مصفوفة questions بها سؤال واحد على الأقل.' };
  }

  const validQuestions: Question[] = [];

  for (let i = 0; i < rawQuestions.length; i++) {
    const q = rawQuestions[i] as Record<string, unknown>;
    if (!q || typeof q !== 'object') {
      return { valid: false, questions: [], error: `السؤال رقم ${i + 1} غير صالح بصيغة الكائن.` };
    }

    const text = String(q.text || q.question || '').trim();
    if (!text) {
      return { valid: false, questions: [], error: `السؤال رقم ${i + 1} لا يحتوي على نص السؤال (text).` };
    }

    const rawOptions = Array.isArray(q.options) || Array.isArray(q.choices) ? ((q.options || q.choices) as unknown[]) : [];
    const options = rawOptions.map(opt => String(opt).trim()).filter(Boolean);
    if (options.length < 2) {
      return { valid: false, questions: [], error: `السؤال رقم ${i + 1} ("${text.slice(0, 25)}...") يجب أن يحتوي على خيارين على الأقل.` };
    }

    const rawType = String(q.type || '').toLowerCase();
    const type: 'single' | 'multiple' = rawType === 'multiple' || rawType === 'multiple_choice' || rawType === 'multi' ? 'multiple' : 'single';

    let correctAnswers: number[] = [];
    if (Array.isArray(q.correctAnswers)) {
      correctAnswers = (q.correctAnswers as unknown[]).map(Number).filter(n => !isNaN(n) && n >= 0 && n < options.length);
    } else if (Array.isArray(q.correctAnswer)) {
      correctAnswers = (q.correctAnswer as unknown[]).map(Number).filter(n => !isNaN(n) && n >= 0 && n < options.length);
    } else if (q.correctAnswer !== undefined && q.correctAnswer !== null) {
      const idx = Number(q.correctAnswer);
      if (!isNaN(idx) && idx >= 0 && idx < options.length) {
        correctAnswers = [idx];
      }
    } else if (q.answer !== undefined && q.answer !== null) {
      const idx = Number(q.answer);
      if (!isNaN(idx) && idx >= 0 && idx < options.length) {
        correctAnswers = [idx];
      }
    }

    if (correctAnswers.length === 0) {
      // Default to first option if not explicitly defined
      correctAnswers = [0];
    }

    const points = typeof q.points === 'number' && q.points > 0 ? q.points : 5;

    validQuestions.push({
      id: String(q.id || `q_${Date.now()}_${i}`),
      text,
      type,
      options,
      correctAnswers,
      points,
      explanation: q.explanation ? String(q.explanation).trim() : undefined
    });
  }

  return { valid: true, questions: validQuestions };
}
