import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it to .env.local and restart Next.js."
    );
  }
  return new GoogleGenAI({ apiKey });
}

// Export a proxy singleton so `gemini.models.generateContent(...)` works directly while dynamically fetching `process.env.GEMINI_API_KEY`
export const gemini = new Proxy({} as GoogleGenAI, {
  get(_target, prop, receiver) {
    const client = getGeminiClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
