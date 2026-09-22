import type { StudentProfile } from "@/types";

export class ProgressService {
  static getProfile(): StudentProfile {
    return {
      currentLevel: "Intermediate",
      strongSkills: ["Percentages", "Basic algebra", "Multiplication"],
      weakSkills: ["Fractions", "Word problems", "Multi-step ratio"],
      repeatedMistakes: ["Forgetting to invert when dividing fractions", "Dropping negative signs"],
      questionsSolved: 184,
      practiceHistory: ["Multiplication drill", "Percentage check", "Fractions review"],
      quizPerformance: 86,
      learningTime: 4.6,
      hintsUsed: 12,
      accuracy: 88,
      responseSpeed: 74,
    };
  }

  static getSummary(profile: StudentProfile) {
    return {
      overall: "Strong progress so far. Fractions are the next key focus area.",
      streak: "6-day learning streak",
      recommended: "Practice equivalent fractions and mixed numbers for 10 minutes.",
    };
  }
}
