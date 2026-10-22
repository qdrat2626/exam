import React, { useState, useEffect, useCallback } from 'react';
import { User, Exam, Submission } from './types';
import { getExams, getAllSubmissions, getAllUsers } from './lib/firebase';
import { soundFX } from './lib/audio';
import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { StudentDashboard } from './components/student/StudentDashboard';
import { ExamTakingSession } from './components/student/ExamTakingSession';
import { ExamResultView } from './components/student/ExamResultView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LivingBackground } from './components/LivingBackground';

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

  // Sound enabled state
  const [soundEnabled, setSoundEnabled] = useState(soundFX.enabled);

  // Load backend data from Firestore with high resilience
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

  // When user logs in, set initial view based on role
  const handleAuthSuccess = (user: User) => {
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

  // If not logged in, show AuthScreen
  if (!currentUser) {
    return <AuthScreen onSuccess={handleAuthSuccess} />;
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
      <div className="min-h-screen relative pb-12 overflow-hidden">
        <LivingBackground />
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
        <div className="relative z-10">
          <ExamResultView
            submission={viewingSubmission}
            onBack={() => setViewingSubmission(null)}
          />
        </div>
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
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black">
          <span className="w-2 h-2 rounded-full bg-[#58cc02] animate-pulse" />
          قاعدة بيانات Firebase متصلة سحابياً (مشروع exam-65429)
        </span>
        <span className="text-slate-300">•</span>
        <span>منظومة الاختبارات التفاعلية الذكية</span>
      </footer>
    </div>
  );
}
