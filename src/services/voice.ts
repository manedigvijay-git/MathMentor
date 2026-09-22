export class VoiceService {
  static transcribe(rawText: string): string {
    return rawText.trim() || "What is 25 percent of 800?";
  }

  static speak(text: string): string {
    return text.length > 0 ? `${text.slice(0, 80)}...` : "Listening for your next question.";
  }
}
