import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { User, Exam, Submission, UserRole } from '../types';
import { normalizeArabic, isDefaultSupervisor, SAMPLE_EXAM_JSON } from './utils';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDQNqDXPgIEEySwHBnLnOb2BtlzdW6wqIE",
  authDomain: "exam-65429.firebaseapp.com",
  projectId: "exam-65429",
  storageBucket: "exam-65429.firebasestorage.app",
  messagingSenderId: "859271874220",
  appId: "1:859271874220:web:8ad86d6450c41c391d0109",
  measurementId: "G-JRNZCDZYD0"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Initial seed for default demo exam if none exists in Firestore
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
 * Find or create a user by full 4-part name directly in Firestore (full cloud sync, zero local storage)
 */
export async function findOrCreateUser(fullName: string): Promise<{ user: User; isNew: boolean }> {
  const cleanName = fullName.trim();
  const normalized = normalizeArabic(cleanName);
  const now = new Date().toISOString();
  const isSupervisor = isDefaultSupervisor(cleanName);

  const usersCol = collection(db, 'users');
  const q = query(usersCol, where('normalizedName', '==', normalized));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const docData = snapshot.docs[0].data() as User;
    const userDocRef = doc(db, 'users', snapshot.docs[0].id);
    const effectiveRole: UserRole = isSupervisor || docData.role === 'admin' ? 'admin' : 'student';

    const updatedUser: User = {
      ...docData,
      id: snapshot.docs[0].id,
      role: effectiveRole,
      lastLoginAt: now
    };

    await updateDoc(userDocRef, { lastLoginAt: now, role: effectiveRole });
    return { user: updatedUser, isNew: false };
  }

  // Create new user in Firestore
  const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newUser: User = {
    id: newUserId,
    fullName: cleanName,
    normalizedName: normalized,
    role: isSupervisor ? 'admin' : 'student',
    createdAt: now,
    lastLoginAt: now
  };

  await setDoc(doc(db, 'users', newUserId), newUser);
  return { user: newUser, isNew: true };
}

/**
 * Fetch all registered users directly from Firestore
 */
export async function getAllUsers(): Promise<User[]> {
  const snap = await getDocs(collection(db, 'users'));
  const users: User[] = [];
  snap.forEach(d => users.push(d.data() as User));

  if (users.length === 0) {
    const supervisor: User = {
      id: 'admin_root',
      fullName: 'محمد منتصر محمد يونس',
      normalizedName: normalizeArabic('محمد منتصر محمد يونس'),
      role: 'admin',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', supervisor.id), supervisor);
    users.push(supervisor);
  }

  return users;
}

/**
 * Admin: Add new user directly to Firestore
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

  await setDoc(doc(db, 'users', userId), newUser);
  return newUser;
}

/**
 * Admin: Update user role in Firestore
 */
export async function updateUserRole(userId: string, newRole: UserRole): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { role: newRole });
}

/**
 * Fetch all exams directly from Firestore
 */
export async function getExams(): Promise<Exam[]> {
  const snap = await getDocs(collection(db, 'exams'));
  const exams: Exam[] = [];
  snap.forEach(d => exams.push(d.data() as Exam));

  if (exams.length === 0) {
    await setDoc(doc(db, 'exams', defaultStarterExam.id), defaultStarterExam);
    exams.push(defaultStarterExam);
  }

  return exams;
}

/**
 * Save or update exam directly in Firestore
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

  await setDoc(doc(db, 'exams', examId), fullExam);
  return fullExam;
}

/**
 * Delete an exam from Firestore
 */
export async function deleteExam(examId: string): Promise<void> {
  await deleteDoc(doc(db, 'exams', examId));
}

/**
 * Delete a user from Firestore
 */
export async function deleteUser(userId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId));
}

/**
 * Delete a submission from Firestore
 */
export async function deleteSubmission(submissionId: string): Promise<void> {
  await deleteDoc(doc(db, 'submissions', submissionId));
}

/**
 * Toggle exam active status in Firestore
 */
export async function toggleExamActive(examId: string, isActive: boolean): Promise<void> {
  await updateDoc(doc(db, 'exams', examId), { isActive });
}

/**
 * Submit exam result directly to Firestore
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

  await setDoc(doc(db, 'submissions', id), fullSubmission);
  return fullSubmission;
}

/**
 * Get submissions for an exam from Firestore
 */
export async function getSubmissionsForExam(examId: string): Promise<Submission[]> {
  const q = query(collection(db, 'submissions'), where('examId', '==', examId), orderBy('submittedAt', 'desc'));
  const snap = await getDocs(q);
  const subs: Submission[] = [];
  snap.forEach(d => subs.push(d.data() as Submission));
  return subs;
}

/**
 * Get all submissions across all exams from Firestore
 */
export async function getAllSubmissions(): Promise<Submission[]> {
  const snap = await getDocs(collection(db, 'submissions'));
  const subs: Submission[] = [];
  snap.forEach(d => subs.push(d.data() as Submission));
  return subs;
}

/**
 * Get user's submissions from Firestore
 */
export async function getUserSubmissions(userId: string): Promise<Submission[]> {
  const q = query(collection(db, 'submissions'), where('userId', '==', userId));
  const snap = await getDocs(q);
  const subs: Submission[] = [];
  snap.forEach(d => subs.push(d.data() as Submission));
  return subs;
}
