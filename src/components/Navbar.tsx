import { User } from '../types';
import { soundFX } from '../lib/audio';
import {
  Volume2,
  VolumeX,
  LogOut,
  Shield,
  GraduationCap,
  Sparkles,
  Layers,
  Cloud,
  RefreshCw
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  onLogout: () => void;
  activeView: 'student' | 'admin';
  onChangeView: (view: 'student' | 'admin') => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isSyncing?: boolean;
  onRefreshData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  activeView,
  onChangeView,
  soundEnabled,
  onToggleSound,
  isSyncing,
  onRefreshData
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-slate-200 shadow-xs touch-manipulation">
      <div className="max-w-6xl mx-auto px-3 sm:px-4">
        {/* Main Nav Row */}
        <div className="h-16 sm:h-18 flex items-center justify-between gap-2">
          {/* Brand / Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#58cc02] border-b-4 border-[#46a302] flex items-center justify-center text-white shadow-xs shrink-0">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-sm sm:text-lg md:text-xl font-black text-slate-800 tracking-tight truncate">
                  منصة أهل القرءان
                </span>
                <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#58cc02]/15 text-[#46a302]">
                  <Sparkles className="w-3 h-3 ml-1" />
                  منظومة مباركة
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium hidden sm:block truncate">
                منظومة الاختبارات القرآنية التفاعلية والتقييم السريع
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Desktop Admin View Switcher */}
            {currentUser.role === 'admin' && (
              <div className="hidden md:flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
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

            {/* Cloud Database Status & Sync button */}
            {onRefreshData && (
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  onRefreshData();
                }}
                title="قاعدة بيانات Firebase السحابية متصلة (exam-65429) - انقر للمزامنة الفورية"
                className="h-9 sm:h-10 px-2 sm:px-3 rounded-xl border-2 border-slate-200 border-b-4 hover:border-emerald-300 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 active:border-b-2 active:translate-y-0.5 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-white"
              >
                <span className="w-2 h-2 rounded-full bg-[#58cc02] animate-pulse shrink-0" />
                <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#58cc02] shrink-0" />
                <span className="hidden xl:inline text-slate-700 font-black text-[11px]">مربوط بالسحابة</span>
                <RefreshCw className={`w-3 h-3 text-slate-400 ${isSyncing ? 'animate-spin text-[#58cc02]' : ''}`} />
              </button>
            )}

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={onToggleSound}
              title={soundEnabled ? 'كتم المؤثرات الصوتية' : 'تفعيل المؤثرات الصوتية'}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 border-slate-200 border-b-4 hover:border-slate-300 active:border-b-2 active:translate-y-0.5 flex items-center justify-center text-slate-600 hover:text-slate-800 transition-all cursor-pointer bg-white"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#58cc02] stroke-[2.5]" />
              ) : (
                <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 stroke-[2.5]" />
              )}
            </button>

            {/* User badge */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl border-2 border-slate-200 bg-slate-50">
              <div className={`w-2.5 h-2.5 rounded-full ${currentUser.role === 'admin' ? 'bg-[#ff9600]' : 'bg-[#58cc02]'}`} />
              <div className="text-right">
                <p className="text-xs font-black text-slate-800 leading-tight truncate max-w-[110px] md:max-w-[150px]">
                  {currentUser.fullName}
                </p>
                <p className="text-[10px] font-bold text-slate-400">
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
              className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl border-2 border-slate-200 border-b-4 hover:border-red-200 hover:bg-red-50 text-slate-600 hover:text-red-600 active:border-b-2 active:translate-y-0.5 transition-all text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer bg-white"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>

        {/* Mobile View Switcher Tab Bar (only for admins on small screens) */}
        {currentUser.role === 'admin' && (
          <div className="flex md:hidden pb-2.5 pt-0.5">
            <div className="flex items-center w-full p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  onChangeView('admin');
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeView === 'admin'
                    ? 'bg-white text-[#ff9600] shadow-xs border border-slate-200'
                    : 'text-slate-600'
                }`}
              >
                <Shield className="w-3.5 h-3.5 stroke-[2.5]" />
                لوحة المشرف
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  onChangeView('student');
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeView === 'student'
                    ? 'bg-white text-[#58cc02] shadow-xs border border-slate-200'
                    : 'text-slate-600'
                }`}
              >
                <Layers className="w-3.5 h-3.5 stroke-[2.5]" />
                واجهة الاختبارات
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
