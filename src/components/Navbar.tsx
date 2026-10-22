import React from 'react';
import { User } from '../types';
import { soundFX } from '../lib/audio';
import {
  Volume2,
  VolumeX,
  LogOut,
  Shield,
  GraduationCap,
  Sparkles,
  Layers
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  onLogout: () => void;
  activeView: 'student' | 'admin';
  onChangeView: (view: 'student' | 'admin') => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  activeView,
  onChangeView,
  soundEnabled,
  onToggleSound
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b-2 border-slate-200 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 h-18 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#58cc02] border-b-4 border-[#46a302] flex items-center justify-center text-white shadow-sm">
            <GraduationCap className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-slate-800 tracking-tight">منصة الاختبارات الذكية</span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#58cc02]/15 text-[#46a302]">
                <Sparkles className="w-3.5 h-3.5 ml-1" />
                منظومة متطورة
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">منظومة الاختبارات التفاعلية والتقييم السريع</p>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Admin toggle view if supervisor */}
          {currentUser.role === 'admin' && (
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  onChangeView('admin');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'admin'
                    ? 'bg-white text-[#ff9600] shadow-xs border border-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-4 h-4 stroke-[2.5]" />
                لوحة المشرف
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  onChangeView('student');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'student'
                    ? 'bg-white text-[#58cc02] shadow-xs border border-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4 stroke-[2.5]" />
                واجهة الاختبارات
              </button>
            </div>
          )}

          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={onToggleSound}
            title={soundEnabled ? 'كتم المؤثرات الصوتية' : 'تفعيل المؤثرات الصوتية'}
            className="w-10 h-10 rounded-xl border-2 border-slate-200 border-b-4 hover:border-slate-300 active:border-b-2 active:translate-y-0.5 flex items-center justify-center text-slate-600 hover:text-slate-800 transition-all cursor-pointer bg-white"
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-[#58cc02] stroke-[2.5]" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-400 stroke-[2.5]" />
            )}
          </button>

          {/* User info badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-slate-200 bg-slate-50">
            <div className={`w-2.5 h-2.5 rounded-full ${currentUser.role === 'admin' ? 'bg-[#ff9600]' : 'bg-[#58cc02]'}`} />
            <div className="text-right">
              <p className="text-xs font-black text-slate-800 leading-tight truncate max-w-[140px]">{currentUser.fullName}</p>
              <p className="text-[10px] font-bold text-slate-500">
                {currentUser.role === 'admin' ? 'مشرف المنصة' : 'مختبر'}
              </p>
            </div>
          </div>

          {/* Logout button */}
          <button
            type="button"
            onClick={() => {
              soundFX.playPop();
              onLogout();
            }}
            title="تسجيل الخروج"
            className="px-3 py-2 rounded-xl border-2 border-slate-200 border-b-4 hover:border-red-200 hover:bg-red-50 text-slate-600 hover:text-red-600 active:border-b-2 active:translate-y-0.5 transition-all text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer bg-white"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </div>
    </header>
  );
};
