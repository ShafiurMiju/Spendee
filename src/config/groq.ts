import Config from 'react-native-config';

// Groq Cloud configuration for voice transaction parsing.
// Values are loaded from the local .env file through react-native-config.

export const GROQ_API_URL =
  (Config.GROQ_API_URL ?? 'https://api.groq.com/openai/v1/chat/completions').trim();
export const GROQ_MODEL =
  (Config.GROQ_MODEL ?? 'openai/gpt-oss-120b').trim();

export function getGroqApiKey(): string {
  return (Config.GROQ_API_KEY ?? '').trim();
}
