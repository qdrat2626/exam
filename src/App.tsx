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

  // Load backend data from Firestore
  const loadAllData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [fetchedExams, fetchedSubs, fetchedUsers] = await Promise.all([
        getExams(),
        getAllSubmissions(),
        getAllUsers()
      ]);
      setExams(fetchedExams);
      setSubmissions(fetchedSubs);
      setUsers(fetchedUsers);
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
      <div className="min-h-screen bg-[#f7f7f7] pb-12">
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
        />
        <ExamResultView
          submission={viewingSubmission}
          onBack={() => setViewingSubmission(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col justify-between">
      <div>
        <Navbar
          currentUser={currentUser}
          onLogout={handleLogout}
          activeView={activeView}
          onChangeView={setActiveView}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
        />

        <main className="pb-16">
          {activeView === 'admin' && currentUser.role === 'admin' ? (
            <AdminDashboard
              currentUser={currentUser}
              exams={exams}
              submissions={submissions}
              users={users}
              onReloadData={loadAllData}
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
      <footer className="border-t-2 border-slate-200 bg-white py-6 text-center text-xs font-bold text-slate-400">
        منظومة دولينجو للاختبارات التفاعلية • قاعدة بيانات سحابية مربوطة بالكامل • تصميم احترافي
      </footer>
    </div>
  );
}
