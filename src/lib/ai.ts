import "server-only";

export function getAiApiKey(): string {
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    throw new Error("AI_API_KEY is not configured.");
  }

  return apiKey;
}
