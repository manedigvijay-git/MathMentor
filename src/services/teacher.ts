import type { PracticeQuestion, QuizQuestion, TeacherMessage } from "@/types";

export class TeacherService {
  static async ask(question: string): Promise<TeacherMessage> {
    const text = question.trim();

    if (!text) {
      return {
        id: Date.now(),
        role: "teacher",
        text: "Hello. What mathematical question would you like to work through today?",
        tone: "calm",
        suggestions: ["Explain fractions", "Solve 2x + 7 = 19", "Check my work"],
      };
    }

    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || data.error) {
        const statusCode = data.error?.status || res.status;
        const errorMsg = data.error?.message || (typeof data.error === "string" ? data.error : "Gemini connection failed");
        let help = "";
        if (statusCode === 401) help = "Invalid or expired API key.";
        else if (statusCode === 403) help = "The API key does not have permission to use Gemini API.";
        else if (statusCode === 404) help = "The requested Gemini model was not found.";
        else if (statusCode === 429) help = "Gemini API quota/rate limit exceeded.";
        else if (statusCode === 503) help = "Gemini service temporarily unavailable.";

        return {
          id: Date.now(),
          role: "teacher",
          text: `Gemini API error (${statusCode}):\n${help ? help + "\n" : ""}${errorMsg}`,
          tone: "analytical",
        };
      }

      return {
        id: Date.now(),
        role: "teacher",
        text: data.text || data.answer || "No response received.",
        tone: "encouraging",
      };
    } catch (err: any) {
      return {
        id: Date.now(),
        role: "teacher",
        text: `Gemini API error (500):\n${err.message || "Failed to fetch"}`,
        tone: "analytical",
      };
    }
  }

  static explain(question: string): TeacherMessage {
    return {
      id: Date.now(),
      role: "teacher",
      text: `Here is a clear explanation for: ${question}. We begin by recognizing the operation, simplify the structure, and then verify the result with a quick check.`,
      tone: "calm",
      steps: [
        { id: 1, label: "Understand", equation: "Identify the operation", explanation: "Determine whether we are adding, subtracting, multiplying, or comparing parts." },
        { id: 2, label: "Model", equation: "Set up the structure", explanation: "Translate the wording into a clear mathematical form." },
        { id: 3, label: "Solve", equation: "Apply the method", explanation: "Use the correct operation and keep the reasoning visible." },
      ],
    };
  }

  static giveHint(question: string): TeacherMessage {
    return {
      id: Date.now(),
      role: "teacher",
      text: "A strong next step is to isolate the variable or simplify the expression before calculating the final value.",
      tone: "encouraging",
      suggestions: ["Try the inverse operation", "Show the worked example", "Check for a common factor"],
    };
  }

  static checkWork(question: string): TeacherMessage {
    return {
      id: Date.now(),
      role: "teacher",
      text: "Let’s check each step carefully. I want to see where the reasoning changes direction before we decide whether the solution is correct.",
      tone: "analytical",
      choices: [
        { label: "Explain the error", isCorrect: true },
        { label: "Give the final answer", isCorrect: false },
      ],
    };
  }

  static generatePractice(topic: string): PracticeQuestion[] {
    const base: PracticeQuestion[] = [
      {
        id: 1,
        category: "Fractions",
        difficulty: "Medium",
        prompt: "What is \(\frac{3}{4} + \frac{1}{4}\)?",
        options: ["1", "\(\frac{1}{2}\)", "\(\frac{4}{8}\)", "\(\frac{3}{8}\)"],
        correctIndex: 0,
        explanation: "The denominators are the same, so we add the numerators and keep the common denominator.",
      },
      {
        id: 2,
        category: "Percentages",
        difficulty: "Medium",
        prompt: "What is 25% of 800?",
        options: ["200", "25", "800", "100"],
        correctIndex: 0,
        explanation: "25% = 0.25, and 0.25 × 800 = 200.",
      },
      {
        id: 3,
        category: "Algebra",
        difficulty: "Medium",
        prompt: "Solve: \(2x + 7 = 19\)",
        options: ["x = 6", "x = 7", "x = 5", "x = 3"],
        correctIndex: 0,
        explanation: "Subtract 7 from both sides, then divide by 2.",
      },
    ];

    if (topic.toLowerCase().includes("fraction")) {
      return base.slice(0, 1).concat(base[2]);
    }

    return base;
  }

  static generateQuiz(topic?: string): QuizQuestion[] {
    const quiz: QuizQuestion[] = [
      {
        id: 1,
        prompt: "What is 12 × 8?",
        options: ["96", "94", "108", "84"],
        correctIndex: 0,
        explanation: "12 × 8 = 96.",
        category: "Multiplication",
      },
      {
        id: 2,
        prompt: "What is 30% of 150?",
        options: ["45", "30", "15", "50"],
        correctIndex: 0,
        explanation: "30% = 0.30, and 0.30 × 150 = 45.",
        category: "Percentages",
      },
      {
        id: 3,
        prompt: "Solve: \(x + 12 = 20\)",
        options: ["x = 8", "x = 32", "x = 6", "x = 10"],
        correctIndex: 0,
        explanation: "Subtract 12 from both sides to isolate x.",
        category: "Algebra",
      },
    ];

    if (topic) {
      return quiz.filter((question) => question.category.toLowerCase().includes(topic.toLowerCase()) || question.category === "Multiplication");
    }

    return quiz;
  }

  static analyzeMistake(mistake: string): TeacherMessage {
    return {
      id: Date.now(),
      role: "teacher",
      text: `I’ve noticed the issue is usually caused by ${mistake}. The key idea is to revisit the operation and check whether the rule is being applied in the correct order.`,
      tone: "celebratory",
      suggestions: ["Explain this step", "Give a similar problem", "Show complete solution"],
    };
  }
}
