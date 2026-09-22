import { NextResponse } from "next/server";
import { trySolveLocally } from "@/lib/local-math-engine";
import { generateWithGeminiFallback } from "@/lib/gemini-router";

// Server-side response cache (In-memory)
const responseCache = new Map<string, { text: string; provider: string; timestamp: number }>();

function normalizeQuery(text: string): string {
  return text
    .toLowerCase()
    .replace(/\bpercent\b/g, "%")
    .replace(/[^a-z0-9%+\-*/=]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { message, question, prompt, image, messages = [] } = body;
    const userMessage = (message || question || prompt || "").trim();

    if (!userMessage && !image) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Please provide a mathematical question or image.",
            status: 400,
          },
        },
        { status: 400 }
      );
    }

    // Step 1: Local Math Engine for simple calculations (0 Gemini API calls)
    if (userMessage && !image) {
      const localResult = trySolveLocally(userMessage);
      if (localResult.handled && localResult.answer) {
        return NextResponse.json({
          success: true,
          text: localResult.answer,
          answer: localResult.answer,
          model: "local-math-engine",
          provider: "local-math-engine",
          source: "local-math-engine",
        });
      }
    }

    // Step 2: Response Cache (0 Gemini API calls)
    const normalizedKey = normalizeQuery(userMessage);
    if (normalizedKey && !image && responseCache.has(normalizedKey)) {
      const cached = responseCache.get(normalizedKey)!;
      return NextResponse.json({
        success: true,
        text: cached.text,
        answer: cached.text,
        model: cached.provider,
        provider: cached.provider,
        source: "cache",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "GEMINI_API_KEY is missing. Add it to .env.local and restart Next.js.",
            status: 401,
          },
        },
        { status: 401 }
      );
    }

    // Build conversation context
    let context = "";
    if (Array.isArray(messages) && messages.length > 0) {
      context = messages
        .slice(-4)
        .map((m: any) => `${m.role === "assistant" || m.role === "teacher" ? "MathMentor" : "Student"}: ${m.content || m.text || ""}`)
        .join("\n\n");
    }

    const systemPrompt = `You are MathMentor, an expert personal mathematics teacher.

RESPONSE STYLE:
- Talk naturally to the student.
- Explain the reasoning in a conversational teaching style.
- Do not unnecessarily divide the response into "Step 1", "Step 2", "Step 3".
- Do not start every answer with "Let's understand..." or "Here is a step-by-step solution".
- Do not repeat the question unnecessarily.
- Do not add unnecessary introductions or conclusions.
- Do not ask "Would you like me to..." after every answer.
- Do not make the response sound like a school textbook.
- Do not make every answer extremely long.
- Match the explanation length to the difficulty of the question.

MARKDOWN RESTRICTIONS:
- Avoid decorative Markdown (no ### headings, ## headings, ---, ***).
- Do not use explicit step numbers like "1. Step One", "**Step 1:**", etc.
- Do not surround ordinary sentences with unnecessary **bold** formatting.
- Do not use bullet lists unless a list is genuinely useful.
- Do not use excessive emojis, decorative separators, or tables unless explicitly asked.

MATHEMATICAL NOTATION:
- Use clean mathematical notation.
- Use inline math such as: \\(P = 4s\\)
- Use displayed equations when an equation deserves its own line:
\\[
25 = 4s
\\]
- Do not output broken repeated notation.
- Use properly formatted LaTeX like \\(x^2\\) rather than x^2.

NATURAL MATH EXPLANATION:
- For a simple problem, explain it naturally without rigid structures.
- Just translate the situation into mathematics naturally, then solve it.

ADAPT TO THE STUDENT:
- Simple question: Give a short, direct explanation.
- Intermediate question: Explain reasoning clearly and show important mathematical steps.
- Difficult question: Give a deeper explanation, but still keep it conversational.
- If confused: Slow down and explain the underlying concept.
- If they make a mistake: Do not just say "incorrect." Say something natural like: "You're very close. The mistake happens when you divide by 3 here. Let's look at that step..." and explain why.

SOCRATIC TEACHING:
- Help the student discover the answer when appropriate.
- If they explicitly ask for the answer, give it directly without artificially withholding it.

CHECK MY WORK:
1. Understand their complete solution.
2. Find the FIRST incorrect step.
3. Explain exactly why that step is incorrect.
4. Continue from that point.
5. Give the corrected result.

WORD PROBLEMS:
- Identify what information matters.
- Translate the situation into mathematics naturally.
- Solve it. No rigid formal templates (like Given/Required/Solution).

CONVERSATIONAL BEHAVIOR:
- Remember previous context.
- If they ask "Why?", explain the previous answer instead of starting over.
- If they ask "Can you explain that more simply?", give a simpler explanation.
- Use analogies when useful.

FINAL ANSWER:
- Do not automatically add "Your Turn!" or "Let me know if you need anything else!".
- Priority is to answer the student's actual question.

IMPORTANT:
- Never invent calculations.
- Never change a verified mathematical answer.
- Show only the useful educational derivation.

OVERALL PERSONALITY:
- intelligent, calm, patient, conversational, encouraging, precise, adaptive.
- never condescending, never unnecessarily verbose.
- Answers should feel like a knowledgeable teacher sitting beside the student explaining the mathematics naturally.`;

    const fullPrompt = `${systemPrompt}\n\n${context ? `Conversation History:\n${context}\n\n` : ""}Student Problem: ${userMessage || "Solve and explain the problem shown in the image."}`;

    let contents: any[] = [];
    if (image && typeof image === "string") {
      const match = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
      if (match) {
        contents.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }
    contents.push(fullPrompt);

    // Call Gemini Router with automatic model fallback
    const routerResult = await generateWithGeminiFallback(contents);

    if (routerResult.success && routerResult.text) {
      // Cache successful answer
      if (normalizedKey && routerResult.model) {
        responseCache.set(normalizedKey, {
          text: routerResult.text,
          provider: routerResult.model,
          timestamp: Date.now(),
        });
      }

      return NextResponse.json({
        success: true,
        text: routerResult.text,
        answer: routerResult.text,
        model: routerResult.model,
        provider: routerResult.model,
        source: "gemini-api",
      });
    }

    // Fallback failed or error occurred
    const errorDetail = routerResult.error || {
      message: "Gemini is temporarily unavailable because the available model quotas have been reached.",
      status: 429,
      errorType: "ALL_MODELS_UNAVAILABLE",
    };

    return NextResponse.json(
      {
        success: false,
        errorType: errorDetail.errorType,
        error: errorDetail,
      },
      { status: errorDetail.status || 500 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        errorType: "SERVER_ERROR",
        error: {
          message: error?.message || "Internal server error.",
          status: 500,
        },
      },
      { status: 500 }
    );
  }
}
