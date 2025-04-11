export interface Settings {
  openaiUrl: string;
  apiKey?: string;
  model: string;
}

export const DEFAULT_SETTINGS: Settings = {
  openaiUrl: 'https://openrouter.ai/api/v1',
  model: 'google/gemini-2.0-flash-001',
};
