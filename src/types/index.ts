export type NavTab = "mentor" | "practice" | "quiz" | "learn" | "progress" | "autopsy";
export type Tab = NavTab;


export type MessageRole = "user" | "teacher" | "system";

export interface MathStep {
  id: number;
  label: string;
  equation: string;
  explanation: string;
}

export interface TeacherMessage {
  id: number;
  role: MessageRole;
  text: string;
  tone?: "encouraging" | "analytical" | "calm" | "celebratory";
  steps?: MathStep[];
  suggestions?: string[];
  choices?: { label: string; isCorrect?: boolean }[];
  actionLabel?: string;
}

export interface PracticeQuestion {
  id: number;
  category: string;
  difficulty: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface PracticeSession {
  category: string;
  difficulty: string;
  questions: PracticeQuestion[];
  currentIndex: number;
  score: number;
  answers: Array<{ questionId: number; selectedIndex: number; isCorrect: boolean }>;
}

export interface QuizQuestion {
  id: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: string;
}

export interface QuizSession {
  difficulty: string;
  startedAt: number;
  timeLimit: number;
  questions: QuizQuestion[];
  currentIndex: number;
  answers: Array<{ questionId: number; selectedIndex: number; isCorrect: boolean; timeSpent: number }>;
  score: number;
}

export interface Lesson {
  id: number;
  title: string;
  category: string;
  level: string;
  duration: string;
  summary: string;
  objectives: string[];
}

export interface StudentProfile {
  currentLevel: string;
  strongSkills: string[];
  weakSkills: string[];
  repeatedMistakes: string[];
  questionsSolved: number;
  practiceHistory: string[];
  quizPerformance: number;
  learningTime: number;
  hintsUsed: number;
  accuracy: number;
  responseSpeed: number;
}
