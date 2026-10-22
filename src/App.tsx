import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Exam, Submission } from './types';
import {
  getExams,
  getAllSubmissions,
  getAllUsers,
  subscribeToUserDoc,
  subscribeToSubmissions,
  subscribeToExams,
  subscribeToUsers
} from './lib/firebase';
import { soundFX } from './lib/audio';
import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { StudentDashboard } from './components/student/StudentDashboard';
import { ExamTakingSession } from './components/student/ExamTakingSession';
import { ExamResultView } from './components/student/ExamResultView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LivingBackground } from './components/LivingBackground';
import { AlertCircle, X } from 'lucide-react';

const CURRENT_USER_STORAGE_KEY = 'duo_exam_user_session';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeView, setActiveView] = useState<'student' | 'admin'>('student');
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Active taking exam or viewing result
  const [activeSessionExam, setActiveSessionExam] = useState<Exam | null>(null);
  const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(null);
  const viewingSubmissionRef = useRef<Submission | null>(null);
  viewingSubmissionRef.current = viewingSubmission;

  // Real-time termination notice (when account is deleted by admin)
  const [terminationNotice, setTerminationNotice] = useState<string | null>(null);

  // Real-time notification toast (e.g., attempt deleted by admin)
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Sound enabled state
  const [soundEnabled, setSoundEnabled] = useState(soundFX.enabled);

  // Load initial data
  const loadAllData = useCallback(async () => {
    setLoadingData(true);
    try {
      const results = await Promise.allSettled([
        getExams(),
        getAllSubmissions(),
        getAllUsers()
      ]);

      if (results[0].status === 'fulfilled') {
        setExams(results[0].value);
      }
      if (results[1].status === 'fulfilled') {
        setSubmissions(results[1].value);
      }
      if (results[2].status === 'fulfilled') {
        setUsers(results[2].value);
      }
    } catch (err) {
      console.error('Error fetching data from database:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Real-time user listener: If admin deletes user from DB, IMMEDIATELY terminate session!
  useEffect(() => {
    if (!currentUser?.id) return;

    const unsubscribe = subscribeToUserDoc(currentUser.id, (freshUser) => {
      if (!freshUser) {
        // Account was deleted in Firestore by admin!
        soundFX.playError();
        setCurrentUser(null);
        setActiveSessionExam(null);
        setViewingSubmission(null);
        localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
        setTerminationNotice('تم حذف هذا الحساب وإنهاء الجلسة فورياً بواسطة إدارة منصة أهل القرءان.');
      } else {
        // Live updates to user profile or role
        setCurrentUser((prev) => {
          if (!prev) return freshUser;
          if (prev.role !== freshUser.role || prev.fullName !== freshUser.fullName) {
            return { ...prev, ...freshUser };
          }
          return prev;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id]);

  // Real-time submissions listener: If admin deletes an attempt, it instantly vanishes everywhere!
  useEffect(() => {
    const unsubscribe = subscribeToSubmissions((freshSubs) => {
      setSubmissions(freshSubs);

      // If student is currently viewing a submission that was deleted, close it and notify them
      const currentViewing = viewingSubmissionRef.current;
      if (currentViewing && !freshSubs.some((s) => s.id === currentViewing.id)) {
        setViewingSubmission(null);
        soundFX.playPop();
        setToastNotice('تم حذف هذه المحاولة من قِبل إدارة المنصة.');
        setTimeout(() => setToastNotice(null), 6000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Real-time exams listener: Live updates for created, edited, and deleted exams
  useEffect(() => {
    const unsubscribe = subscribeToExams((freshExams) => {
      setExams(freshExams);

      // If active exam being taken was deleted, cancel safely
      setActiveSessionExam((prev) => {
        if (prev && !freshExams.some((e) => e.id === prev.id)) {
          soundFX.playError();
          setToastNotice('تم إلغاء أو حذف هذا الاختبار من قِبل الإدارة.');
          setTimeout(() => setToastNotice(null), 6000);
          return null;
        }
        return prev;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Real-time users listener for admin dashboard
  useEffect(() => {
    const unsubscribe = subscribeToUsers((freshUsers) => {
      setUsers(freshUsers);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // When user logs in
  const handleAuthSuccess = (user: User) => {
    setTerminationNotice(null);
    setCurrentUser(user);
    try {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // storage quota
    }
    setActiveView(user.role === 'admin' ? 'admin' : 'student');
    loadAllData();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveSessionExam(null);
    setViewingSubmission(null);
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  };

  const handleToggleSound = () => {
    const nextState = soundFX.toggle();
    setSoundEnabled(nextState);
  };

  // If not logged in, show AuthScreen with termination alert if applicable
  if (!currentUser) {
    return <AuthScreen onSuccess={handleAuthSuccess} terminationNotice={terminationNotice} />;
  }

  // Active exam taking mode (focused, no navbar distractions)
  if (activeSessionExam) {
    return (
      <ExamTakingSession
        exam={activeSessionExam}
        currentUser={currentUser}
        onFinish={(sub) => {
          setActiveSessionExam(null);
          setViewingSubmission(sub);
          loadAllData();
        }}
        onCancel={() => setActiveSessionExam(null)}
      />
    );
  }

  // Viewing detailed submission result
  if (viewingSubmission) {
    return (
      <div className="min-h-screen relative flex flex-col justify-between overflow-hidden">
        <LivingBackground />
        <div className="relative z-10">
          <Navbar
            currentUser={currentUser}
            onLogout={handleLogout}
            activeView={activeView}
            onChangeView={(v) => {
              setViewingSubmission(null);
              setActiveView(v);
            }}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            isSyncing={loadingData}
            onRefreshData={loadAllData}
          />
          <div className="py-4">
            <ExamResultView
              submission={viewingSubmission}
              onBack={() => setViewingSubmission(null)}
            />
          </div>
        </div>

        {/* Footer for Result View */}
        <footer className="border-t-2 border-slate-200 bg-white/95 backdrop-blur-xs py-5 px-4 text-center text-xs font-bold text-slate-500 relative z-10 flex flex-wrap items-center justify-center gap-3">
          <span className="font-black text-slate-700 text-sm">
            جميع الحقوق محفوظة لمنصة أهل القرءان
          </span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black">
            <span className="w-2 h-2 rounded-full bg-[#58cc02] animate-pulse" />
            قاعدة بيانات Firebase متصلة سحابياً (مشروع exam-65429)
          </span>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col justify-between overflow-hidden">
      <LivingBackground />

      <div className="relative z-10">
        <Navbar
          currentUser={currentUser}
          onLogout={handleLogout}
          activeView={activeView}
          onChangeView={setActiveView}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          isSyncing={loadingData}
          onRefreshData={loadAllData}
        />

        {/* Global Floating Real-time Toast Notice */}
        {toastNotice && (
          <div className="max-w-md mx-auto mt-4 px-4">
            <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-b-4 border-amber-400 text-amber-900 flex items-center justify-between shadow-lg animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span className="text-xs font-bold">{toastNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastNotice(null)}
                className="p-1 text-amber-700 hover:bg-amber-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <main className="pb-16">
          {activeView === 'admin' && currentUser.role === 'admin' ? (
            <AdminDashboard
              currentUser={currentUser}
              exams={exams}
              submissions={submissions}
              users={users}
              onReloadData={loadAllData}
              onSaveExam={(savedExam) => {
                setExams((prev) => {
                  const idx = prev.findIndex((e) => e.id === savedExam.id);
                  if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = savedExam;
                    return next;
                  }
                  return [savedExam, ...prev];
                });
              }}
              onDeleteExam={(examId) => {
                setExams((prev) => prev.filter((e) => e.id !== examId));
                setSubmissions((prev) => prev.filter((s) => s.examId !== examId));
              }}
              onPreviewExam={(exam) => {
                setActiveSessionExam(exam);
              }}
            />
          ) : (
            <StudentDashboard
              currentUser={currentUser}
              exams={exams}
              submissions={submissions}
              onStartExam={(exam) => {
                setActiveSessionExam(exam);
              }}
              onViewResult={(sub) => {
                setViewingSubmission(sub);
              }}
            />
          )}
        </main>
      </div>

      {/* Global Footer */}
      <footer className="border-t-2 border-slate-200 bg-white/95 backdrop-blur-xs py-5 px-4 text-center text-xs font-bold text-slate-500 relative z-10 flex flex-wrap items-center justify-center gap-3">
        <span className="font-black text-slate-700 text-sm">
          جميع الحقوق محفوظة لمنصة أهل القرءان
        </span>
        <span className="text-slate-300">•</span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black">
          <span className="w-2 h-2 rounded-full bg-[#58cc02] animate-pulse" />
          قاعدة بيانات Firebase متصلة سحابياً (مشروع exam-65429)
        </span>
      </footer>
    </div>
  );
}
