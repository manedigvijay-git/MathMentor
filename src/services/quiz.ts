import type { QuizQuestion, QuizSession } from "@/types";
import { MathVerifier } from "./math-verifier";

export class QuizService {
  /**
   * Allowed topics for Very Easy, Easy, Medium, Hard (NUMERICAL ONLY)
   */
  static readonly BASIC_TOPICS = [
    "Addition",
    "Subtraction",
    "Multiplication",
    "Division",
    "Fractions",
    "Decimals",
    "Percentages",
    "Ratios",
    "Averages",
    "Mental Math",
    "Number Patterns",
    "Word Problems",
  ];

  /**
   * Allowed topics for Very Hard (ADVANCED MATH ALLOWED)
   */
  static readonly ADVANCED_TOPICS = [
    "Algebra",
    "Geometry",
    "Trigonometry",
    "Calculus",
    "Probability",
    "Statistics",
  ];

  static getTimeLimit(difficulty: string): number {
    const map: Record<string, number> = {
      "Very Easy": 20,
      Easy: 20,
      Medium: 60,
      Hard: 300,
      "Very Hard": 600,
    };
    return map[difficulty] ?? 60;
  }

  /**
   * Generates deterministically verified quiz questions based on difficulty and topic
   */
  static generateQuestions(difficulty: string, topic?: string, count: number = 10): QuizQuestion[] {
    const pool: QuizQuestion[] = [];

    // Question generators for basic/numerical topics
    if (difficulty === "Very Easy" || difficulty === "Easy") {
      pool.push(
        {
          id: 1,
          prompt: "What is 7 + 5?",
          options: ["12", "11", "13", "10"],
          correctIndex: 0,
          explanation: "7 + 5 = 12.",
          category: "Addition",
        },
        {
          id: 2,
          prompt: "What is 12 − 4?",
          options: ["8", "7", "9", "6"],
          correctIndex: 0,
          explanation: "12 − 4 = 8.",
          category: "Subtraction",
        },
        {
          id: 3,
          prompt: "What is 6 × 3?",
          options: ["18", "16", "21", "12"],
          correctIndex: 0,
          explanation: "6 × 3 = 18.",
          category: "Multiplication",
        },
        {
          id: 4,
          prompt: "What is 20 ÷ 5?",
          options: ["4", "5", "6", "3"],
          correctIndex: 0,
          explanation: "20 ÷ 5 = 4.",
          category: "Division",
        },
        {
          id: 5,
          prompt: "What is 24 × 16?",
          options: ["384", "364", "404", "374"],
          correctIndex: 0,
          explanation: "24 × 16 = 384.",
          category: "Multiplication",
        },
        {
          id: 6,
          prompt: "What is 25% of 800?",
          options: ["200", "150", "250", "180"],
          correctIndex: 0,
          explanation: "25% of 800 is (25/100) × 800 = 200.",
          category: "Percentages",
        },
        {
          id: 7,
          prompt: "What is 0.5 + 0.25?",
          options: ["0.75", "0.85", "0.65", "1.0"],
          correctIndex: 0,
          explanation: "0.5 + 0.25 = 0.75.",
          category: "Decimals",
        }
      );
    } else if (difficulty === "Medium") {
      pool.push(
        {
          id: 1,
          prompt: "Evaluate: 125 ÷ 5 × 8 + 17",
          options: ["217", "200", "225", "195"],
          correctIndex: 0,
          explanation: "125 ÷ 5 = 25; 25 × 8 = 200; 200 + 17 = 217.",
          category: "Multi-step Arithmetic",
        },
        {
          id: 2,
          prompt: "A product costs ₹800 and has a 15% discount. What is the final price?",
          options: ["₹680", "₹700", "₹650", "₹720"],
          correctIndex: 0,
          explanation: "15% of ₹800 is ₹120. ₹800 - ₹120 = ₹680.",
          category: "Percentages",
        },
        {
          id: 3,
          prompt: "What is 3/4 + 1/4?",
          options: ["1", "1/2", "3/8", "2"],
          correctIndex: 0,
          explanation: "3/4 + 1/4 = 4/4 = 1.",
          category: "Fractions",
        },
        {
          id: 4,
          prompt: "What is 2/3 × 3/5?",
          options: ["2/5", "6/8", "1/3", "3/10"],
          correctIndex: 0,
          explanation: "(2 × 3) / (3 × 5) = 6/15 = 2/5.",
          category: "Fractions",
        }
      );
    } else if (difficulty === "Hard") {
      pool.push(
        {
          id: 1,
          prompt: "A car travels at 60 km/h for 2.5 hours and 80 km/h for 1.5 hours. What is the average speed?",
          options: ["67.5 km/h", "70 km/h", "65 km/h", "68 km/h"],
          correctIndex: 0,
          explanation: "Total distance = (60 × 2.5) + (80 × 1.5) = 150 + 120 = 270 km. Total time = 4 h. Avg speed = 270 / 4 = 67.5 km/h.",
          category: "Averages & Ratios",
        },
        {
          id: 2,
          prompt: "What is 15% of 240?",
          options: ["36", "32", "40", "34"],
          correctIndex: 0,
          explanation: "15% of 240 = 0.15 × 240 = 36.",
          category: "Percentages",
        }
      );
    } else {
      // Very Hard (Advanced Math Allowed)
      pool.push(
        {
          id: 1,
          prompt: "Solve for x: x² + 5x + 6 = 0",
          options: ["x = -2, -3", "x = 2, 3", "x = -1, -6", "x = 1, 6"],
          correctIndex: 0,
          explanation: "Factor as (x + 2)(x + 3) = 0. Roots are x = -2 and x = -3.",
          category: "Algebra",
        },
        {
          id: 2,
          prompt: "What is d/dx (x²)?",
          options: ["2x", "x", "x²", "2"],
          correctIndex: 0,
          explanation: "Using the power rule: d/dx(x^n) = n*x^(n-1). d/dx(x²) = 2x.",
          category: "Calculus",
        },
        {
          id: 3,
          prompt: "What is ∫ x² dx?",
          options: ["x³/3 + C", "2x + C", "x³ + C", "3x³ + C"],
          correctIndex: 0,
          explanation: "Power rule for integration: ∫ x^n dx = (x^(n+1))/(n+1) + C. ∫ x² dx = x³/3 + C.",
          category: "Calculus",
        }
      );
    }

    // Filter by topic if specified
    const filtered = topic ? pool.filter((q) => q.category.toLowerCase().includes(topic.toLowerCase())) : pool;
    const resultPool = filtered.length > 0 ? filtered : pool;

    // Verify each question answer with MathVerifier
    return resultPool.map((q) => {
      const mockSolution = {
        problemType: q.category,
        difficulty: difficulty as any,
        method: q.explanation,
        steps: [{ explanation: q.explanation, expression: q.prompt }],
        finalAnswer: q.options[q.correctIndex],
        verificationExpression: q.prompt,
        confidence: 1.0,
      };
      const vRes = MathVerifier.verifySolution(mockSolution, q.prompt);
      return {
        ...q,
        explanation: `${q.explanation} (${vRes.badge})`,
      };
    });
  }

  static createSession(difficulty: string, topic?: string, count: number = 10): QuizSession {
    const questions = this.generateQuestions(difficulty, topic, count);

    return {
      difficulty,
      startedAt: Date.now(),
      timeLimit: this.getTimeLimit(difficulty),
      questions,
      currentIndex: 0,
      answers: [],
      score: 0,
    };
  }

  static calculateResults(session: QuizSession) {
    const correct = session.answers.filter((a) => a.isCorrect).length;
    const wrong = session.answers.filter((a) => !a.isCorrect).length;
    const skipped = Math.max(0, session.questions.length - session.answers.length);
    const total = session.questions.length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const avgTime = session.answers.length
      ? Math.round(session.answers.reduce((sum, a) => sum + a.timeSpent, 0) / session.answers.length)
      : 0;

    let performanceLevel = "Developing";
    if (accuracy >= 90) performanceLevel = "Excellent";
    else if (accuracy >= 75) performanceLevel = "Good";

    return {
      correct,
      wrong,
      skipped,
      accuracy,
      score: Math.max(0, correct * 10),
      averageTime: avgTime,
      performanceLevel,
    };
  }
}
