import { NextResponse } from "next/server";
import { generateWithGeminiFallback } from "@/lib/gemini-router";

export async function GET() {
  return handleTest();
}

export async function POST() {
  return handleTest();
}

async function handleTest() {
  try {
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

    const result = await generateWithGeminiFallback(["Reply with exactly: GEMINI_CONNECTION_OK"]);

    if (result.success && result.text) {
      return NextResponse.json({
        success: true,
        model: result.model,
        response: result.text.trim() || "GEMINI_CONNECTION_OK",
      });
    }

    const errorDetail = result.error || {
      message: "Gemini is temporarily unavailable because the available model quotas have been reached.",
      status: 429,
    };

    return NextResponse.json(
      {
        success: false,
        error: errorDetail,
      },
      { status: errorDetail.status || 500 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error?.message || "Test endpoint failure.",
          status: 500,
        },
      },
      { status: 500 }
    );
  }
}
