import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { User, Exam, Submission, UserRole } from '../types';
import { normalizeArabic, isDefaultSupervisor, SAMPLE_EXAM_JSON } from './utils';

// User's provided Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDQNqDXPgIEEySwHBnLnOb2BtlzdW6wqIE",
  authDomain: "exam-65429.firebaseapp.com",
  projectId: "exam-65429",
  storageBucket: "exam-65429.firebasestorage.app",
  messagingSenderId: "859271874220",
  appId: "1:859271874220:web:8ad86d6450c41c391d0109",
  measurementId: "G-JRNZCDZYD0"
};

// Initialize Firebase safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

// Local cache keys for offline & backup persistence
const CACHE_USERS_KEY = 'duo_cached_users';
const CACHE_EXAMS_KEY = 'duo_cached_exams';
const CACHE_SUBMISSIONS_KEY = 'duo_cached_submissions';

function getLocal<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocal<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota or disabled
  }
}

// Initial seed for default demo exam if none exists
const defaultStarterExam: Exam = {
  id: 'starter_exam_01',
  title: SAMPLE_EXAM_JSON.title,
  description: SAMPLE_EXAM_JSON.description,
  durationMinutes: SAMPLE_EXAM_JSON.durationMinutes,
  isUnlimitedTime: SAMPLE_EXAM_JSON.isUnlimitedTime,
  isOpenWindow: true,
  questions: SAMPLE_EXAM_JSON.questions.map((q, idx) => ({
    ...q,
    id: `q_init_${idx + 1}`,
    type: q.type as 'single' | 'multiple'
  })),
  totalPoints: 20,
  passingPoints: 10,
  createdBy: 'محمد منتصر محمد يونس',
  createdAt: new Date().toISOString(),
  isActive: true
};

/**
 * Find or create a user by full 4-part name
 */
export async function findOrCreateUser(fullName: string): Promise<{ user: User; isNew: boolean }> {
  const cleanName = fullName.trim();
  const normalized = normalizeArabic(cleanName);
  const now = new Date().toISOString();

  // Check if this is the default supervisor
  const isSupervisor = isDefaultSupervisor(cleanName);

  // 1. Try checking Firestore
  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('normalizedName', '==', normalized));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const docData = snapshot.docs[0].data() as User;
      const userDocRef = doc(db, 'users', snapshot.docs[0].id);

      // If matches supervisor name or already admin, maintain admin role
      const effectiveRole: UserRole = isSupervisor || docData.role === 'admin' ? 'admin' : 'student';

      const updatedUser: User = {
        ...docData,
        id: snapshot.docs[0].id,
        role: effectiveRole,
        lastLoginAt: now
      };

      try {
        await updateDoc(userDocRef, { lastLoginAt: now, role: effectiveRole });
      } catch {
        // silent
      }

      // Update local cache
      const cached = getLocal<User[]>(CACHE_USERS_KEY, []);
      const idx = cached.findIndex(u => u.id === updatedUser.id);
      if (idx >= 0) cached[idx] = updatedUser;
      else cached.push(updatedUser);
      setLocal(CACHE_USERS_KEY, cached);

      return { user: updatedUser, isNew: false };
    }
  } catch (err) {
    console.warn('Firestore query failed, using local cache fallback', err);
  }

  // 2. Fallback check local cache
  const cachedUsers = getLocal<User[]>(CACHE_USERS_KEY, []);
  const cachedMatch = cachedUsers.find(u => u.normalizedName === normalized);
  if (cachedMatch) {
    cachedMatch.lastLoginAt = now;
    if (isSupervisor) cachedMatch.role = 'admin';
    setLocal(CACHE_USERS_KEY, cachedUsers);
    return { user: cachedMatch, isNew: false };
  }

  // 3. New user creation
  const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newUser: User = {
    id: newUserId,
    fullName: cleanName,
    normalizedName: normalized,
    role: isSupervisor ? 'admin' : 'student',
    createdAt: now,
    lastLoginAt: now
  };

  try {
    await setDoc(doc(db, 'users', newUserId), newUser);
  } catch (err) {
    console.warn('Firestore write failed, saved to local cache', err);
  }

  cachedUsers.push(newUser);
  setLocal(CACHE_USERS_KEY, cachedUsers);

  return { user: newUser, isNew: true };
}

/**
 * Fetch all registered users
 */
export async function getAllUsers(): Promise<User[]> {
  const localUsers = getLocal<User[]>(CACHE_USERS_KEY, []);
  try {
    const snap = await getDocs(collection(db, 'users'));
    if (!snap.empty) {
      const users: User[] = [];
      snap.forEach(d => users.push(d.data() as User));
      setLocal(CACHE_USERS_KEY, users);
      return users;
    }
  } catch (err) {
    console.warn('Failed to fetch users from Firestore, using cache', err);
  }

  // If local empty, seed supervisor
  if (localUsers.length === 0) {
    const supervisor: User = {
      id: 'admin_root',
      fullName: 'محمد منتصر محمد يونس',
      normalizedName: normalizeArabic('محمد منتصر محمد يونس'),
      role: 'admin',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    localUsers.push(supervisor);
    setLocal(CACHE_USERS_KEY, localUsers);
  }
  return localUsers;
}

/**
 * Admin: Add new user directly
 */
export async function createUserByAdmin(fullName: string, role: UserRole): Promise<User> {
  const cleanName = fullName.trim();
  const normalized = normalizeArabic(cleanName);
  const now = new Date().toISOString();
  const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newUser: User = {
    id: userId,
    fullName: cleanName,
    normalizedName: normalized,
    role,
    createdAt: now,
    lastLoginAt: now
  };

  try {
    await setDoc(doc(db, 'users', userId), newUser);
  } catch (err) {
    console.warn('Firestore create user error', err);
  }

  const cached = getLocal<User[]>(CACHE_USERS_KEY, []);
  cached.push(newUser);
  setLocal(CACHE_USERS_KEY, cached);

  return newUser;
}

/**
 * Admin: Update user role (promote to admin or demote to student)
 */
export async function updateUserRole(userId: string, newRole: UserRole): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), { role: newRole });
  } catch (err) {
    console.warn('Firestore update role error', err);
  }

  const cached = getLocal<User[]>(CACHE_USERS_KEY, []);
  const user = cached.find(u => u.id === userId);
  if (user) {
    user.role = newRole;
    setLocal(CACHE_USERS_KEY, cached);
  }
}

const SEEDED_KEY = 'duo_starter_seeded_flag';

/**
 * Fetch all exams
 */
export async function getExams(): Promise<Exam[]> {
  try {
    const snap = await getDocs(collection(db, 'exams'));
    if (!snap.empty) {
      const exams: Exam[] = [];
      snap.forEach(d => exams.push(d.data() as Exam));
      setLocal(CACHE_EXAMS_KEY, exams);
      return exams;
    }
  } catch (err) {
    console.warn('Firestore get exams error', err);
  }

  let local = getLocal<Exam[]>(CACHE_EXAMS_KEY, []);
  const alreadySeeded = localStorage.getItem(SEEDED_KEY);

  if (local.length === 0 && !alreadySeeded) {
    local = [defaultStarterExam];
    setLocal(CACHE_EXAMS_KEY, local);
    localStorage.setItem(SEEDED_KEY, 'true');
  }
  return local;
}

/**
 * Save or update exam
 */
export async function saveExam(examData: Omit<Exam, 'id' | 'createdAt'> & { id?: string }): Promise<Exam> {
  const examId = examData.id || `exam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const totalPoints = examData.questions.reduce((sum, q) => sum + (q.points || 0), 0);

  const fullExam: Exam = {
    ...examData,
    id: examId,
    totalPoints,
    createdAt: now,
    isActive: examData.isActive !== undefined ? examData.isActive : true
  };

  try {
    await setDoc(doc(db, 'exams', examId), fullExam);
  } catch (err) {
    console.warn('Firestore save exam error', err);
  }

  const cached = getLocal<Exam[]>(CACHE_EXAMS_KEY, []);
  const idx = cached.findIndex(e => e.id === examId);
  if (idx >= 0) cached[idx] = fullExam;
  else cached.unshift(fullExam);
  setLocal(CACHE_EXAMS_KEY, cached);

  return fullExam;
}

/**
 * Delete an exam
 */
export async function deleteExam(examId: string): Promise<void> {
  // Ensure seed flag is set so default starter exam does not resurrect
  localStorage.setItem(SEEDED_KEY, 'true');

  try {
    await deleteDoc(doc(db, 'exams', examId));
  } catch (err) {
    console.warn('Firestore delete exam error', err);
  }

  const cached = getLocal<Exam[]>(CACHE_EXAMS_KEY, []).filter(e => e.id !== examId);
  setLocal(CACHE_EXAMS_KEY, cached);
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (err) {
    console.warn('Firestore delete user error', err);
  }

  const cached = getLocal<User[]>(CACHE_USERS_KEY, []).filter(u => u.id !== userId);
  setLocal(CACHE_USERS_KEY, cached);
}

/**
 * Delete a submission
 */
export async function deleteSubmission(submissionId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'submissions', submissionId));
  } catch (err) {
    console.warn('Firestore delete submission error', err);
  }

  const cached = getLocal<Submission[]>(CACHE_SUBMISSIONS_KEY, []).filter(s => s.id !== submissionId);
  setLocal(CACHE_SUBMISSIONS_KEY, cached);
}

/**
 * Toggle exam active status
 */
export async function toggleExamActive(examId: string, isActive: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, 'exams', examId), { isActive });
  } catch (err) {
    console.warn('Firestore toggle active error', err);
  }

  const cached = getLocal<Exam[]>(CACHE_EXAMS_KEY, []);
  const exam = cached.find(e => e.id === examId);
  if (exam) {
    exam.isActive = isActive;
    setLocal(CACHE_EXAMS_KEY, cached);
  }
}

/**
 * Submit exam result
 */
export async function submitExamAttempt(
  submissionData: Omit<Submission, 'id' | 'submittedAt'>
): Promise<Submission> {
  const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const fullSubmission: Submission = {
    ...submissionData,
    id,
    submittedAt: now
  };

  try {
    await setDoc(doc(db, 'submissions', id), fullSubmission);
  } catch (err) {
    console.warn('Firestore submission save error', err);
  }

  const cached = getLocal<Submission[]>(CACHE_SUBMISSIONS_KEY, []);
  cached.unshift(fullSubmission);
  setLocal(CACHE_SUBMISSIONS_KEY, cached);

  return fullSubmission;
}

/**
 * Get all submissions or for a specific exam
 */
export async function getSubmissionsForExam(examId: string): Promise<Submission[]> {
  try {
    const q = query(collection(db, 'submissions'), where('examId', '==', examId), orderBy('submittedAt', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const subs: Submission[] = [];
      snap.forEach(d => subs.push(d.data() as Submission));
      return subs;
    }
  } catch (err) {
    console.warn('Firestore query submissions error, checking local', err);
  }

  const cached = getLocal<Submission[]>(CACHE_SUBMISSIONS_KEY, []);
  return cached.filter(s => s.examId === examId);
}

/**
 * Get all submissions across all exams
 */
export async function getAllSubmissions(): Promise<Submission[]> {
  try {
    const snap = await getDocs(collection(db, 'submissions'));
    if (!snap.empty) {
      const subs: Submission[] = [];
      snap.forEach(d => subs.push(d.data() as Submission));
      setLocal(CACHE_SUBMISSIONS_KEY, subs);
      return subs;
    }
  } catch (err) {
    console.warn('Firestore get all submissions error', err);
  }

  return getLocal<Submission[]>(CACHE_SUBMISSIONS_KEY, []);
}

/**
 * Get user's submissions
 */
export async function getUserSubmissions(userId: string): Promise<Submission[]> {
  try {
    const q = query(collection(db, 'submissions'), where('userId', '==', userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const subs: Submission[] = [];
      snap.forEach(d => subs.push(d.data() as Submission));
      return subs;
    }
  } catch (err) {
    console.warn('Firestore get user submissions error', err);
  }

  const cached = getLocal<Submission[]>(CACHE_SUBMISSIONS_KEY, []);
  return cached.filter(s => s.userId === userId);
}
