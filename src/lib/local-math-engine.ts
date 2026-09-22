/**
 * Local Math Engine for deterministic calculation handling.
 * Prevents simple arithmetic/percentage/fraction questions from hitting Gemini API.
 */

export interface LocalMathResult {
  handled: boolean;
  answer?: string;
}

export function trySolveLocally(rawQuestion: string): LocalMathResult {
  const q = rawQuestion.trim().toLowerCase();

  // Normalize question text
  const cleanQ = q
    .replace(/what is|calculate|compute|solve|find/g, "")
    .replace(/\?/g, "")
    .trim();

  // Pattern 1: Percentage (e.g., "25% of 800", "30 percent of 150")
  const percentMatch = cleanQ.match(/^(\d+(?:\.\d+)?)\s*(?:%|percent)\s*of\s*(\d+(?:\.\d+)?)$/);
  if (percentMatch) {
    const p = parseFloat(percentMatch[1]);
    const total = parseFloat(percentMatch[2]);
    const val = (p / 100) * total;
    const valFormatted = Number.isInteger(val) ? val.toString() : val.toFixed(2);
    const frac = reduceFraction(p, 100);

    const answer = `To find \\(${p}\\%\\) of \\(${total}\\), convert the percentage to a decimal or fraction:

\\[
${p}\\% = ${p / 100} ${frac ? `= \\frac{${frac.n}}{${frac.d}}` : ""}
\\]

Now multiply by \\(${total}\\):

\\[
${p / 100} \\times ${total} = ${valFormatted}
\\]

So \\(${p}\\%\\) of \\(${total}\\) is **${valFormatted}**.`;

    return { handled: true, answer };
  }

  // Pattern 2: Basic Arithmetic (e.g. "25 + 37", "100 - 47", "12 * 8", "144 / 12", "12 × 8", "144 ÷ 12")
  const arithMatch = cleanQ.match(/^(\d+(?:\.\d+)?)\s*([\+\-\*\/×÷])\s*(\d+(?:\.\d+)?)$/);
  if (arithMatch) {
    const a = parseFloat(arithMatch[1]);
    const opRaw = arithMatch[2];
    const b = parseFloat(arithMatch[3]);

    let res = 0;
    let opSymbol = opRaw;

    if (opRaw === "+" || opRaw === "+") {
      res = a + b;
      opSymbol = "+";
    } else if (opRaw === "-" || opRaw === "-") {
      res = a - b;
      opSymbol = "-";
    } else if (opRaw === "*" || opRaw === "×") {
      res = a * b;
      opSymbol = "\\times";
    } else if (opRaw === "/" || opRaw === "÷") {
      if (b === 0) return { handled: true, answer: "Division by zero is undefined." };
      res = a / b;
      opSymbol = "\\div";
    }

    const resFormatted = Number.isInteger(res) ? res.toString() : res.toFixed(4);

    const answer = `Evaluating the expression:

\\[
${a} ${opSymbol} ${b} = ${resFormatted}
\\]

The result is **${resFormatted}**.`;

    return { handled: true, answer };
  }

  // Pattern 3: Fraction Operations (e.g., "3/4 + 1/2", "3/4 + 1/4")
  const fracMatch = cleanQ.match(/^(\d+)\/(\d+)\s*([\+\-])\s*(\d+)\/(\d+)$/);
  if (fracMatch) {
    const n1 = parseInt(fracMatch[1]);
    const d1 = parseInt(fracMatch[2]);
    const op = fracMatch[3];
    const n2 = parseInt(fracMatch[4]);
    const d2 = parseInt(fracMatch[5]);

    if (d1 === 0 || d2 === 0) return { handled: true, answer: "Denominators cannot be zero." };

    const commonD = lcm(d1, d2);
    const m1 = commonD / d1;
    const m2 = commonD / d2;
    const newN1 = n1 * m1;
    const newN2 = n2 * m2;
    const finalN = op === "+" ? newN1 + newN2 : newN1 - newN2;
    const simplified = reduceFraction(finalN, commonD);

    const answer = `To ${op === "+" ? "add" : "subtract"} \\(\\frac{${n1}}{${d1}}\\)` +
      ` and \\(\\frac{${n2}}{${d2}}\\), find a common denominator (${commonD}):

\\[
\\frac{${n1}}{${d1}} = \\frac{${newN1}}{${commonD}}, \\quad \\frac{${n2}}{${d2}} = \\frac{${newN2}}{${commonD}}
\\]

Now combine the numerators:

\\[
\\frac{${newN1} ${op} ${newN2}}{${commonD}} = \\frac{${finalN}}{${commonD}} ${simplified && (simplified.n !== finalN || simplified.d !== commonD) ? `= \\frac{${simplified.n}}{${simplified.d}}` : ""}
\\]

The result is \\(\\frac{${simplified ? simplified.n : finalN}}{${simplified ? simplified.d : commonD}}\\)` +
      ` (or **${(finalN / commonD).toFixed(2)}**).`;

    return { handled: true, answer };
  }

  // Pattern 4: Average of numbers (e.g. "average of 10, 20, 30" or "average 10 20 30")
  const avgMatch = cleanQ.match(/^average\s*(?:of\s*)?([0-9\s,\.]+)+$/);
  if (avgMatch) {
    const numbers = cleanQ
      .replace(/^average\s*(?:of\s*)?/, "")
      .split(/[\s,]+/)
      .map((n) => parseFloat(n))
      .filter((n) => !isNaN(n));

    if (numbers.length > 0) {
      const sum = numbers.reduce((acc, curr) => acc + curr, 0);
      const avg = sum / numbers.length;
      const avgFormatted = Number.isInteger(avg) ? avg.toString() : avg.toFixed(2);

      const answer = `To find the average of ${numbers.length} numbers, sum them up and divide by ${numbers.length}:

\\[
\\text{Sum} = ${numbers.join(" + ")} = ${sum}
\\]

\\[
\\text{Average} = \\frac{${sum}}{${numbers.length}} = ${avgFormatted}
\\]

The average is **${avgFormatted}**.`;

      return { handled: true, answer };
    }
  }

  // Pattern 5: Simple Linear Equation (e.g., "2x + 5 = 15")
  const eqMatch = cleanQ.match(/^(?:solve\s*)?(\d*)x\s*([\+\-])\s*(\d+)\s*=\s*(\d+)$/);
  if (eqMatch) {
    const coeff = eqMatch[1] ? parseInt(eqMatch[1]) : 1;
    const op = eqMatch[2];
    const constVal = parseInt(eqMatch[3]);
    const rightVal = parseInt(eqMatch[4]);

    const adjustedRight = op === "+" ? rightVal - constVal : rightVal + constVal;
    const finalX = adjustedRight / coeff;
    const xFormatted = Number.isInteger(finalX) ? finalX.toString() : finalX.toFixed(2);

    const answer = `To solve \\(${coeff === 1 ? "" : coeff}x ${op} ${constVal} = ${rightVal}\\), isolate \\(x\\):

First, ${op === "+" ? "subtract" : "add"} \\(${constVal}\\) ${op === "+" ? "from" : "to"} both sides:

\\[
${coeff === 1 ? "" : coeff}x = ${adjustedRight}
\\]

${coeff !== 1 ? `Now divide both sides by \\(${coeff}\\):\n\n\\[\nx = \\frac{${adjustedRight}}{${coeff}} = ${xFormatted}\n\\]` : ""}

So \\(x = ${xFormatted}\\).`;

    return { handled: true, answer };
  }

  return { handled: false };
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

function reduceFraction(n: number, d: number): { n: number; d: number } | null {
  if (d === 0) return null;
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
