export type UserRole = 'admin' | 'student';

export interface User {
  id: string;
  fullName: string;
  normalizedName: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt: string;
}

export type QuestionType = 'single' | 'multiple';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  correctAnswers: number[]; // 0-indexed indices of correct options
  points: number;
  explanation?: string;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  durationMinutes: number; // e.g. 15, 30, 60
  isUnlimitedTime: boolean; // if true, durationMinutes is ignored
  startsAt?: string; // ISO string or empty
  endsAt?: string; // ISO string or empty
  isOpenWindow: boolean; // if true, always open without start/end restriction
  questions: Question[];
  totalPoints: number;
  passingPoints?: number;
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}

export interface StudentAnswer {
  questionId: string;
  selectedIndices: number[];
  isCorrect: boolean;
  earnedPoints: number;
}

export interface Submission {
  id: string;
  examId: string;
  examTitle: string;
  userId: string;
  userFullName: string;
  answers: Record<string, number[]>; // questionId -> selectedIndices
  score: number;
  maxScore: number;
  percentage: number;
  timeSpentSeconds: number;
  submittedAt: string;
  questionSnapshots: Question[];
}
