import { gemini } from "./gemini";

export const FALLBACK_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

export interface GeminiRouterResult {
  success: boolean;
  model?: string;
  text?: string;
  error?: {
    message: string;
    status: number;
    errorType?: string;
  };
}

function extractStatusCode(error: any): number {
  if (typeof error?.status === "number" && error.status >= 400 && error.status < 600) {
    return error.status;
  }
  if (typeof error?.statusCode === "number" && error.statusCode >= 400 && error.statusCode < 600) {
    return error.statusCode;
  }
  if (typeof error?.response?.status === "number" && error.response.status >= 400 && error.response.status < 600) {
    return error.response.status;
  }
  const msg = String(error?.message || error || "");
  const match = msg.match(/\b(400|401|403|404|429|500|502|503|504)\b/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 500;
}

function sanitizeErrorMessage(msg: string): string {
  const apiKey = process.env.GEMINI_API_KEY;
  let sanitized = msg || "Gemini request failed";
  if (apiKey) {
    sanitized = sanitized.replaceAll(apiKey, "[REDACTED_API_KEY]");
  }
  sanitized = sanitized.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, "[REDACTED_API_KEY]");
  sanitized = sanitized.replace(/AQ\.[A-Za-z0-9_-]+/g, "[REDACTED_API_KEY]");
  return sanitized;
}

/**
 * Executes a Gemini request with automatic model fallback.
 * Primary model: gemini-3.5-flash
 * Fallbacks: gemini-3.6-flash -> gemini-3.5-flash-lite -> gemini-3.1-flash-lite
 */
export async function generateWithGeminiFallback(contents: any[]): Promise<GeminiRouterResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: {
        message: "GEMINI_API_KEY is missing. Add it to .env.local and restart Next.js.",
        status: 401,
        errorType: "CONFIG_ERROR",
      },
    };
  }

  let lastStatus = 500;

  for (let i = 0; i < FALLBACK_MODELS.length; i++) {
    const model = FALLBACK_MODELS[i];
    console.log(`[Gemini] Trying ${model}`);

    try {
      const response = await gemini.models.generateContent({
        model,
        contents,
      });

      const text = response.text || "";
      console.log(`[Gemini] ${model} → success`);

      return {
        success: true,
        model,
        text,
      };
    } catch (error: any) {
      const status = extractStatusCode(error);
      lastStatus = status;

      console.log(`[Gemini] ${model} → ${status}`);

      // Invalid API Key (401): Stop immediately, do NOT fallback
      if (status === 401) {
        const msg = sanitizeErrorMessage(error?.message || "Invalid API key.");
        return {
          success: false,
          error: {
            message: msg,
            status: 401,
            errorType: "INVALID_API_KEY",
          },
        };
      }

      // Eligible for fallback: 429 (Quota), 503 (Unavailable), 404 (Not Found), 403 (Permission Denied)
      if (status === 429 || status === 503 || status === 404 || status === 403) {
        if (i < FALLBACK_MODELS.length - 1) {
          const nextModel = FALLBACK_MODELS[i + 1];
          console.log(`[Gemini] Falling back to ${nextModel}`);
          continue;
        }
      } else {
        // Non-fallback error (e.g. 400 Bad Request)
        const msg = sanitizeErrorMessage(error?.message || "Gemini API request failed.");
        return {
          success: false,
          error: {
            message: msg,
            status,
            errorType: "API_ERROR",
          },
        };
      }
    }
  }

  // All configured fallback models returned 429 / 503 / 404 / 403
  return {
    success: false,
    error: {
      message: "Gemini is temporarily unavailable because the available model quotas have been reached.",
      status: lastStatus || 429,
      errorType: "ALL_MODELS_UNAVAILABLE",
    },
  };
}
