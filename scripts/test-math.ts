import { MathVerifier } from "../src/services/math-verifier";

interface TestCase {
  question: string;
  expectedAnswer: string;
  expectedType: string;
}

const testCases: TestCase[] = [
  { question: "25% of 800", expectedAnswer: "200", expectedType: "percentage" },
  { question: "2x + 5 = 15", expectedAnswer: "5", expectedType: "equation" },
  { question: "x² + 5x + 6 = 0", expectedAnswer: "-2, -3", expectedType: "equation" },
  { question: "d/dx(x²)", expectedAnswer: "2x", expectedType: "calculus" },
  { question: "∫ x² dx", expectedAnswer: "x^3/3", expectedType: "calculus" },
  { question: "15% of 240", expectedAnswer: "36", expectedType: "percentage" },
  { question: "3/4 + 1/4", expectedAnswer: "1", expectedType: "fraction" },
  { question: "2/3 × 3/5", expectedAnswer: "2/5", expectedType: "fraction" },
  { question: "√144", expectedAnswer: "12", expectedType: "arithmetic" },
  { question: "12 × 13", expectedAnswer: "156", expectedType: "arithmetic" },
];

export function runMathTests() {
  console.log("=== MathMentor Mathematical Test Suite ===");
  let passed = 0;

  for (const tc of testCases) {
    const classification = MathVerifier.classifyMathTask(tc.question);

    const mockSolution = {
      problemType: classification.type,
      difficulty: classification.difficulty,
      method: "Test solution",
      steps: [{ explanation: "Step 1", expression: tc.question }],
      finalAnswer: tc.expectedAnswer,
      verificationExpression: tc.question,
      confidence: 1.0,
    };

    const res = MathVerifier.verifySolution(mockSolution, tc.question);

    if (res.isValid) {
      console.log(`[PASS] ${tc.question} => ${tc.expectedAnswer} (${res.badge})`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.question} => Expected ${tc.expectedAnswer} | Detail: ${res.detail}`);
    }
  }

  console.log(`\nResults: ${passed}/${testCases.length} Passed.`);
  return passed === testCases.length;
}

if (require.main === module) {
  runMathTests();
}
