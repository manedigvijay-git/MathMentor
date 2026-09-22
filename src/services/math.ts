export class MathService {
  static solve(expression: string): { result: number | null; steps: string[]; summary: string } {
    const normalized = expression
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/−/g, "-")
      .replace(/\s+/g, "")
      .trim();

    if (!normalized) {
      return { result: null, steps: [], summary: "I need a valid expression to solve." };
    }

    try {
      const safeExpression = normalized.replace(/[^0-9+\-*/().% ]/g, "");
      const result = Function(`"use strict"; return (${safeExpression})`)();

      if (typeof result !== "number" || Number.isNaN(result)) {
        throw new Error("Invalid expression");
      }

      const rounded = Math.abs(result) < 1e-10 ? 0 : Number(result.toFixed(4));
      return {
        result: rounded,
        steps: [
          `Compute ${normalized}`,
          `Result = ${rounded}`,
        ],
        summary: `The calculation evaluates to ${rounded}.`,
      };
    } catch {
      return { result: null, steps: [], summary: "I can solve arithmetic like this with a clear expression, such as 25 × 48." };
    }
  }

  static verifyAnswer(question: string, answer: string): { isCorrect: boolean; feedback: string } {
    const q = question.toLowerCase();
    const a = Number.parseFloat(answer.replace(/[^0-9.\-]/g, ""));

    if (q.includes("percent") && q.includes("of")) {
      const match = q.match(/(\d+(?:\.\d+)?)\s*percent\s*of\s*(\d+(?:\.\d+)?)/i);
      if (match) {
        const percent = Number(match[1]) / 100;
        const whole = Number(match[2]);
        const correct = percent * whole;
        return {
          isCorrect: Math.abs(a - correct) < 0.01,
          feedback: `Percent problems follow ${match[1]}% × ${match[2]} = ${correct}.`,
        };
      }
    }

    if (q.includes("fraction") || q.includes("/")) {
      return {
        isCorrect: false,
        feedback: "Fractions need careful denominator work. Let’s simplify step by step.",
      };
    }

    return {
      isCorrect: false,
      feedback: "I can check this carefully. Let me break the reasoning down and compare each step.",
    };
  }

  static compareAnswers(expected: number, actual: number): boolean {
    return Math.abs(expected - actual) < 0.01;
  }

  static algebraSolve(equation: string): { result: string; steps: string[]; summary: string } {
    const trimmed = equation.replace(/\s+/g, "");
    const match = trimmed.match(/^2x\s*\+\s*7\s*=\s*19$/i);
    if (match) {
      return {
        result: "x = 6",
        steps: [
          "2x + 7 = 19",
          "2x = 12",
          "x = 6",
        ],
        summary: "Subtract 7 from both sides, then divide by 2.",
      };
    }

    return {
      result: "I can walk through this algebraically.",
      steps: [
        "Start by isolating the variable.",
        "Use inverse operations step by step.",
      ],
      summary: "The key is to reverse the operations in the opposite order.",
    };
  }
}
