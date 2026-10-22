import React, { useState } from 'react';
import { findOrCreateUser } from '../lib/firebase';
import { User } from '../types';
import { soundFX } from '../lib/audio';
import { isValidQuadName, fireDuolingoConfetti } from '../lib/utils';
import { LivingBackground } from './LivingBackground';
import {
  GraduationCap,
  UserPlus,
  LogIn,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (user: User, isNew: boolean) => void;
  terminationNotice?: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, terminationNotice }) => {
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoBanner, setInfoBanner] = useState<{ type: 'created' | 'found'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoBanner(null);

    const validation = isValidQuadName(fullName);
    if (!validation.valid) {
      soundFX.playError();
      setErrorMessage(validation.message || 'يرجى كتابة الاسم الرباعي كاملاً');
      return;
    }

    setLoading(true);
    soundFX.playPop();

    try {
      const result = await findOrCreateUser(fullName);
      if (result.isNew) {
        soundFX.playSuccess();
        fireDuolingoConfetti();
        setInfoBanner({
          type: 'created',
          message: `تم إنشاء الحساب بنجاح! مرحباً بك يا ${result.user.fullName}`
        });
      } else {
        soundFX.playSuccess();
        setInfoBanner({
          type: 'found',
          message: `أهلاً بعودتك يا ${result.user.fullName}!`
        });
      }

      // Small delay for user to register the banner feedback
      setTimeout(() => {
        onSuccess(result.user, result.isNew);
      }, 900);
    } catch (err) {
      console.error(err);
      soundFX.playError();
      setErrorMessage('حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between items-center p-4 sm:p-6 overflow-hidden">
      {/* Living Animated Dynamic Background */}
      <LivingBackground />

      {/* Top Brand Bar */}
      <div className="w-full max-w-md flex items-center justify-between py-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-[#58cc02] border-b-4 border-[#46a302] flex items-center justify-center text-white shadow-xs">
            <GraduationCap className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-xl font-black text-slate-800">منصة أهل القرءان</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/80 border border-slate-200 text-xs font-bold text-slate-600 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#ffc800]" />
          منظومة مباركة
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md my-auto relative z-10">
        {/* Real-time Session Termination Alert */}
        {terminationNotice && (
          <div className="mb-4 p-4 rounded-2xl bg-red-50 border-2 border-b-4 border-[#ff4b4b] text-[#ba2323] flex items-center gap-3 animate-bounce shadow-md">
            <div className="p-2 rounded-xl bg-white text-red-600 shadow-xs shrink-0">
              <AlertCircle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-xs font-black text-red-800 mb-0.5">تنبيه النظام الفوري</p>
              <p className="text-xs font-bold text-red-700 leading-snug">{terminationNotice}</p>
            </div>
          </div>
        )}

        <div className="duo-card p-6 sm:p-8 bg-white/95 backdrop-blur-xs shadow-md">
          {/* Hero Visual Icon Badge */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-[#58cc02]/10 border-4 border-[#58cc02] border-b-8 flex items-center justify-center text-[#58cc02]">
                <GraduationCap className="w-12 h-12 stroke-[2.5]" />
              </div>
              <div className="absolute -bottom-2 -left-2 w-9 h-9 rounded-xl bg-[#ffc800] border-2 border-b-4 border-[#d4a000] flex items-center justify-center text-slate-900">
                <Sparkles className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mb-2">
              تسجيل الدخول للاختبار
            </h1>
            <p className="text-sm font-semibold text-slate-500 leading-relaxed">
              اكتب اسمك الرباعي للمتابعة. إذا كان حسابك موجوداً سيفتح فوراً، وإذا لم يكن موجوداً سيتم إنشاء حسابك وتفعيله في الحال.
            </p>
          </div>

          {/* Feedback Banner */}
          {infoBanner && (
            <div
              className={`mb-5 p-4 rounded-2xl border-2 border-b-4 flex items-center gap-3 transition-all ${
                infoBanner.type === 'created'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                  : 'bg-sky-50 border-[#1cb0f6] text-sky-800'
              }`}
            >
              <div className="p-2 rounded-xl bg-white shadow-xs">
                {infoBanner.type === 'created' ? (
                  <UserPlus className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-[#1cb0f6] stroke-[2.5]" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">
                  {infoBanner.type === 'created' ? 'حساب جديد' : 'تم العثور على الحساب'}
                </p>
                <p className="text-sm font-black">{infoBanner.message}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border-2 border-b-4 border-[#ff4b4b] text-[#ba2323] flex items-start gap-2.5 text-xs sm:text-sm font-bold">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-xs font-black text-slate-700 mb-1.5 mr-1">
                الاسم الرباعي كاملاً
              </label>
              <div className="relative">
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: أحمد محمود علي إبراهيم"
                  disabled={loading}
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-300 border-b-4 focus:border-[#58cc02] focus:bg-emerald-50/20 outline-none text-slate-800 font-bold text-base transition-all placeholder:text-slate-400 placeholder:font-normal disabled:opacity-60"
                  autoFocus
                />
              </div>
              <p className="text-[11px] font-semibold text-slate-400 mt-1.5 mr-1">
                تأكد من كتابة الاسم بدقة لربط إجاباتك ودرجاتك بسجلك
              </p>
            </div>

            {/* Submit 3D Button */}
            <button
              type="submit"
              disabled={loading || !fullName.trim()}
              className="w-full py-4 px-6 rounded-2xl duo-btn-green font-black text-base tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري التحقق...
                </span>
              ) : (
                <>
                  <LogIn className="w-5 h-5 stroke-[2.5]" />
                  <span>دخول / إنشاء الحساب</span>
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-md text-center py-2 relative z-10">
        <p className="text-xs font-black text-slate-500">
          جميع الحقوق محفوظة لمنصة أهل القرءان
        </p>
      </div>
    </div>
  );
};
