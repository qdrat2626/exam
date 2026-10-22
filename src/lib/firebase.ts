import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  onSnapshot
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

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with ignoreUndefinedProperties to prevent setDoc crashes
export const db = (() => {
  try {
    return initializeFirestore(app, {
      ignoreUndefinedProperties: true
    });
  } catch {
    return getFirestore(app);
  }
})();

/**
 * Strips all undefined properties from nested objects/arrays to guarantee Firestore compatibility
 */
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// Initialize Firebase Analytics safely (guards against iframe / restricted storage)
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (err) {
    console.warn('Firebase Analytics not supported in this environment:', err);
  }
}

// Local cache keys for instant load & offline resilience
const STORAGE_EXAMS_KEY = 'duo_cached_exams';
const STORAGE_SUBS_KEY = 'duo_cached_submissions';
const STORAGE_USERS_KEY = 'duo_cached_users';
const STORAGE_DELETED_EXAMS_KEY = 'duo_deleted_exam_ids';
const STORAGE_INITIALIZED_KEY = 'duo_seed_initialized';

function getCachedData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setCachedData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore quota
  }
}

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
 * Check connection status with Firebase Firestore
 */
export async function testFirebaseConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const testDoc = doc(db, '_connection_test', 'ping');
    await setDoc(testDoc, { ping: Date.now() }, { merge: true });
    return { connected: true, latencyMs: Date.now() - start };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Firebase connection check failed:', msg);
    return { connected: false, latencyMs: Date.now() - start, error: msg };
  }
}

/**
 * Find or create a user by full name in Firestore
 */
export async function findOrCreateUser(fullName: string): Promise<{ user: User; isNew: boolean }> {
  const cleanName = fullName.trim();
  const normalized = normalizeArabic(cleanName);
  const now = new Date().toISOString();
  const isSupervisor = isDefaultSupervisor(cleanName);

  try {
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

      try {
        await updateDoc(userDocRef, { lastLoginAt: now, role: effectiveRole });
      } catch (err) {
        console.warn('Could not update user lastLoginAt in Firestore:', err);
      }
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
  } catch (err) {
    console.error('Firestore user lookup/create error, using local fallback:', err);
    // Offline / fallback fallback
    const fallbackId = `user_${Date.now()}`;
    const fallbackUser: User = {
      id: fallbackId,
      fullName: cleanName,
      normalizedName: normalized,
      role: isSupervisor ? 'admin' : 'student',
      createdAt: now,
      lastLoginAt: now
    };
    return { user: fallbackUser, isNew: true };
  }
}

/**
 * Fetch all registered users directly from Firestore
 */
export async function getAllUsers(): Promise<User[]> {
  try {
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
      try {
        await setDoc(doc(db, 'users', supervisor.id), supervisor);
      } catch {
        // ignore
      }
      users.push(supervisor);
    }

    setCachedData(STORAGE_USERS_KEY, users);
    return users;
  } catch (err) {
    console.warn('Error reading users from Firestore, using cache:', err);
    return getCachedData<User[]>(STORAGE_USERS_KEY, [
      {
        id: 'admin_root',
        fullName: 'محمد منتصر محمد يونس',
        normalizedName: normalizeArabic('محمد منتصر محمد يونس'),
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      }
    ]);
  }
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

  try {
    await setDoc(doc(db, 'users', userId), newUser);
  } catch (err) {
    console.warn('Error adding user to Firestore:', err);
  }

  // Update cache
  const cached = getCachedData<User[]>(STORAGE_USERS_KEY, []);
  setCachedData(STORAGE_USERS_KEY, [...cached, newUser]);

  return newUser;
}

/**
 * Admin: Update user role in Firestore
 */
export async function updateUserRole(userId: string, newRole: UserRole): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), { role: newRole });
  } catch (err) {
    console.warn('Error updating role in Firestore:', err);
  }

  const cached = getCachedData<User[]>(STORAGE_USERS_KEY, []);
  setCachedData(STORAGE_USERS_KEY, cached.map(u => u.id === userId ? { ...u, role: newRole } : u));
}

/**
 * Fetch all exams directly from Firestore
 */
export async function getExams(): Promise<Exam[]> {
  const deletedIds = new Set(getCachedData<string[]>(STORAGE_DELETED_EXAMS_KEY, []));
  const hasInitialized = typeof window !== 'undefined' && localStorage.getItem(STORAGE_INITIALIZED_KEY) === 'true';

  try {
    const snap = await getDocs(collection(db, 'exams'));
    const exams: Exam[] = [];

    snap.forEach(d => {
      const examData = d.data() as Exam;
      const examId = examData.id || d.id;

      // Filter out explicitly deleted exams
      if (deletedIds.has(examId)) {
        // Clean up from Firestore if still lingering
        deleteDoc(d.ref).catch(() => {});
      } else {
        exams.push({ ...examData, id: examId });
      }
    });

    // Only seed on the VERY FIRST launch of a fresh install, NEVER after user deletes exams
    if (exams.length === 0 && !hasInitialized && !deletedIds.has(defaultStarterExam.id)) {
      try {
        await setDoc(doc(db, 'exams', defaultStarterExam.id), defaultStarterExam);
        exams.push(defaultStarterExam);
      } catch {
        // ignore
      }
      try {
        localStorage.setItem(STORAGE_INITIALIZED_KEY, 'true');
      } catch {
        // ignore
      }
    }

    setCachedData(STORAGE_EXAMS_KEY, exams);
    return exams;
  } catch (err) {
    console.warn('Error fetching exams from Firestore, using cache:', err);
    const cached = getCachedData<Exam[]>(STORAGE_EXAMS_KEY, []);
    return cached.filter(e => !deletedIds.has(e.id));
  }
}

/**
 * Save or update exam directly in Firestore
 */
export async function saveExam(examData: Omit<Exam, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Promise<Exam> {
  const examId = examData.id || `exam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const totalPoints = examData.questions.reduce((sum, q) => sum + (q.points || 0), 0);

  // If this ID was previously marked deleted, unmark it
  const deletedIds = getCachedData<string[]>(STORAGE_DELETED_EXAMS_KEY, []);
  if (deletedIds.includes(examId)) {
    setCachedData(STORAGE_DELETED_EXAMS_KEY, deletedIds.filter(id => id !== examId));
  }
  try {
    localStorage.setItem(STORAGE_INITIALIZED_KEY, 'true');
  } catch {
    // ignore
  }

  const fullExam: Exam = {
    ...examData,
    id: examId,
    totalPoints,
    createdAt: examData.createdAt || now,
    isActive: examData.isActive !== undefined ? examData.isActive : true
  };

  const payload = cleanFirestoreData(fullExam);

  try {
    await setDoc(doc(db, 'exams', examId), payload);
  } catch (err) {
    console.error('Error saving exam to Firestore:', err);
  }

  // Update cache
  const cached = getCachedData<Exam[]>(STORAGE_EXAMS_KEY, []);
  const idx = cached.findIndex(e => e.id === examId);
  if (idx >= 0) {
    cached[idx] = fullExam;
    setCachedData(STORAGE_EXAMS_KEY, cached);
  } else {
    setCachedData(STORAGE_EXAMS_KEY, [fullExam, ...cached]);
  }

  return fullExam;
}

/**
 * Delete an exam from Firestore and cascade delete its submissions
 */
export async function deleteExam(examId: string): Promise<void> {
  if (!examId) return;

  // 1. Permanently record as deleted so getExams() never revives or seeds it
  const deletedIds = getCachedData<string[]>(STORAGE_DELETED_EXAMS_KEY, []);
  if (!deletedIds.includes(examId)) {
    setCachedData(STORAGE_DELETED_EXAMS_KEY, [...deletedIds, examId]);
  }
  try {
    localStorage.setItem(STORAGE_INITIALIZED_KEY, 'true');
  } catch {
    // ignore
  }

  // 2. Remove from local caches immediately
  const cachedExams = getCachedData<Exam[]>(STORAGE_EXAMS_KEY, []);
  setCachedData(STORAGE_EXAMS_KEY, cachedExams.filter(e => e.id !== examId));

  const cachedSubs = getCachedData<Submission[]>(STORAGE_SUBS_KEY, []);
  setCachedData(STORAGE_SUBS_KEY, cachedSubs.filter(s => s.examId !== examId));

  // 3. Delete from Firestore collection
  try {
    await deleteDoc(doc(db, 'exams', examId));
  } catch (err) {
    console.warn('Error deleting exam document from Firestore:', err);
  }

  // 4. Cascade delete all submissions for this exam to prevent orphaned data
  try {
    const q = query(collection(db, 'submissions'), where('examId', '==', examId));
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map(d => deleteDoc(d.ref).catch(() => {}));
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn('Error cleaning up submissions for deleted exam:', err);
  }
}

/**
 * Delete a user from Firestore and cleanup submissions
 */
export async function deleteUser(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (err) {
    console.warn('Error deleting user from Firestore:', err);
  }

  try {
    const q = query(collection(db, 'submissions'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const promises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(promises);
  } catch (err) {
    console.warn('Error cleaning up submissions for deleted user:', err);
  }

  const cachedUsers = getCachedData<User[]>(STORAGE_USERS_KEY, []);
  setCachedData(STORAGE_USERS_KEY, cachedUsers.filter(u => u.id !== userId));

  const cachedSubs = getCachedData<Submission[]>(STORAGE_SUBS_KEY, []);
  setCachedData(STORAGE_SUBS_KEY, cachedSubs.filter(s => s.userId !== userId));
}

/**
 * Delete a single submission from Firestore
 */
export async function deleteSubmission(submissionId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'submissions', submissionId));
  } catch (err) {
    console.warn('Error deleting submission from Firestore:', err);
  }

  const cachedSubs = getCachedData<Submission[]>(STORAGE_SUBS_KEY, []);
  setCachedData(STORAGE_SUBS_KEY, cachedSubs.filter(s => s.id !== submissionId));
}

/**
 * Delete multiple submissions in bulk from Firestore
 */
export async function deleteMultipleSubmissions(submissionIds: string[]): Promise<void> {
  if (submissionIds.length === 0) return;

  try {
    // Firestore batch supports up to 500 operations
    const chunks: string[][] = [];
    for (let i = 0; i < submissionIds.length; i += 400) {
      chunks.push(submissionIds.slice(i, i + 400));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(id => {
        batch.delete(doc(db, 'submissions', id));
      });
      await batch.commit();
    }
  } catch (err) {
    console.warn('Batch deletion failed, falling back to individual deletes:', err);
    await Promise.all(submissionIds.map(id => deleteDoc(doc(db, 'submissions', id)).catch(() => {})));
  }

  const idSet = new Set(submissionIds);
  const cachedSubs = getCachedData<Submission[]>(STORAGE_SUBS_KEY, []);
  setCachedData(STORAGE_SUBS_KEY, cachedSubs.filter(s => !idSet.has(s.id)));
}

/**
 * Delete all submissions for a given exam or for all exams
 */
export async function deleteAllSubmissionsForExam(examId: string): Promise<void> {
  try {
    let snap;
    if (examId === 'all') {
      snap = await getDocs(collection(db, 'submissions'));
    } else {
      const q = query(collection(db, 'submissions'), where('examId', '==', examId));
      snap = await getDocs(q);
    }
    const ids = snap.docs.map(d => d.id);
    await deleteMultipleSubmissions(ids);
  } catch (err) {
    console.warn('Error deleting all submissions for exam:', err);
  }
}

/**
 * Toggle exam active status in Firestore
 */
export async function toggleExamActive(examId: string, isActive: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, 'exams', examId), { isActive });
  } catch (err) {
    console.warn('Error toggling exam active in Firestore:', err);
  }

  const cached = getCachedData<Exam[]>(STORAGE_EXAMS_KEY, []);
  setCachedData(STORAGE_EXAMS_KEY, cached.map(e => e.id === examId ? { ...e, isActive } : e));
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

  const payload = cleanFirestoreData(fullSubmission);

  try {
    await setDoc(doc(db, 'submissions', id), payload);
  } catch (err) {
    console.error('Error submitting exam result to Firestore:', err);
  }

  const cached = getCachedData<Submission[]>(STORAGE_SUBS_KEY, []);
  setCachedData(STORAGE_SUBS_KEY, [fullSubmission, ...cached]);

  return fullSubmission;
}

/**
 * Get submissions for an exam from Firestore (sorted client-side, avoiding composite index errors)
 */
export async function getSubmissionsForExam(examId: string): Promise<Submission[]> {
  try {
    const q = query(collection(db, 'submissions'), where('examId', '==', examId));
    const snap = await getDocs(q);
    const subs: Submission[] = [];
    snap.forEach(d => subs.push(d.data() as Submission));
    subs.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return subs;
  } catch (err) {
    console.warn('Error fetching submissions for exam, using cache:', err);
    const cached = getCachedData<Submission[]>(STORAGE_SUBS_KEY, []);
    return cached
      .filter(s => s.examId === examId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }
}

/**
 * Get all submissions across all exams from Firestore
 */
export async function getAllSubmissions(): Promise<Submission[]> {
  try {
    const snap = await getDocs(collection(db, 'submissions'));
    const subs: Submission[] = [];
    snap.forEach(d => subs.push(d.data() as Submission));
    subs.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    setCachedData(STORAGE_SUBS_KEY, subs);
    return subs;
  } catch (err) {
    console.warn('Error reading submissions from Firestore, using cache:', err);
    return getCachedData<Submission[]>(STORAGE_SUBS_KEY, []);
  }
}

/**
 * Get user's submissions from Firestore
 */
export async function getUserSubmissions(userId: string): Promise<Submission[]> {
  try {
    const q = query(collection(db, 'submissions'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const subs: Submission[] = [];
    snap.forEach(d => subs.push(d.data() as Submission));
    subs.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return subs;
  } catch (err) {
    console.warn('Error reading user submissions from Firestore, using cache:', err);
    const cached = getCachedData<Submission[]>(STORAGE_SUBS_KEY, []);
    return cached
      .filter(s => s.userId === userId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }
}

/**
 * Real-time listener for user document.
 * If user doc is deleted by admin, immediately fires with null so caller can log them out!
 */
export function subscribeToUserDoc(
  userId: string,
  onUserChange: (user: User | null) => void
): () => void {
  try {
    const userRef = doc(db, 'users', userId);
    return onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onUserChange(null);
        } else {
          const data = snapshot.data() as User;
          onUserChange({ ...data, id: snapshot.id });
        }
      },
      (err) => {
        console.warn('Real-time user snapshot error:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to attach user snapshot listener:', err);
    return () => {};
  }
}

/**
 * Real-time listener for all submissions across the platform.
 * Instant live updates when admin deletes an attempt or student submits an attempt!
 */
export function subscribeToSubmissions(
  onUpdate: (subs: Submission[]) => void
): () => void {
  try {
    const subsCol = collection(db, 'submissions');
    return onSnapshot(
      subsCol,
      (snapshot) => {
        const subs: Submission[] = [];
        snapshot.forEach((d) => {
          subs.push(d.data() as Submission);
        });
        subs.sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        setCachedData(STORAGE_SUBS_KEY, subs);
        onUpdate(subs);
      },
      (err) => {
        console.warn('Real-time submissions snapshot error:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to attach submissions snapshot listener:', err);
    return () => {};
  }
}

/**
 * Real-time listener for exams collection.
 * Instant live updates when exams are added, modified, or deleted.
 */
export function subscribeToExams(
  onUpdate: (exams: Exam[]) => void
): () => void {
  try {
    const examsCol = collection(db, 'exams');
    return onSnapshot(
      examsCol,
      (snapshot) => {
        const deletedIds = new Set(getCachedData<string[]>(STORAGE_DELETED_EXAMS_KEY, []));
        const exams: Exam[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as Exam;
          const examId = data.id || d.id;
          if (!deletedIds.has(examId)) {
            exams.push({ ...data, id: examId });
          }
        });
        setCachedData(STORAGE_EXAMS_KEY, exams);
        onUpdate(exams);
      },
      (err) => {
        console.warn('Real-time exams snapshot error:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to attach exams snapshot listener:', err);
    return () => {};
  }
}

/**
 * Real-time listener for users collection.
 * Instant live updates for user list in admin panel.
 */
export function subscribeToUsers(
  onUpdate: (users: User[]) => void
): () => void {
  try {
    const usersCol = collection(db, 'users');
    return onSnapshot(
      usersCol,
      (snapshot) => {
        const users: User[] = [];
        snapshot.forEach((d) => {
          users.push(d.data() as User);
        });
        setCachedData(STORAGE_USERS_KEY, users);
        onUpdate(users);
      },
      (err) => {
        console.warn('Real-time users snapshot error:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to attach users snapshot listener:', err);
    return () => {};
  }
}

