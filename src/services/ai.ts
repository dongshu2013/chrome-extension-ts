import { Settings } from '../types';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatCompletion {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

class LightOpenAI {
  private baseURL: string;
  private apiKey?: string;

  constructor(config: { baseURL: string; apiKey?: string }) {
    this.baseURL = config.baseURL;
    this.apiKey = config.apiKey;
  }

  async createChatCompletion(params: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
  }): Promise<ChatCompletion> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error (${response.status}): ${error}`);
    }

    return response.json();
  }
}

export async function callAiModel(prompt: string, settings: Settings): Promise<string> {
  try {
    const openai = new LightOpenAI({
      baseURL: settings.openaiUrl,
      apiKey: settings.apiKey,
    });

    const response = await openai.createChatCompletion({
      model: settings.model,
      messages: [{
        role: 'user',
        content: prompt
      }],
      temperature: 0.7,
    });

    return response.choices[0].message.content || '';
  } catch (error: unknown) {
    console.error('Error calling AI model:', error);
    throw new Error(`Failed to call AI model: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function summarizeProfile(posts: string[], existingContent: string = '', settings: Settings): Promise<string> {
  try {
    const prompt = `You are a Twitter profile analyzer. Given a set of tweets, create a concise profile description that captures the key characteristics, interests, and patterns in the user's tweets. If there's existing profile content, incorporate it and update with new insights.

${existingContent ? `Existing Profile Description:\n${existingContent}\n\n` : ''}

Tweets to analyze:
${posts.join('\n')}

Create a natural-sounding profile description that highlights:
1. Main topics and interests
2. Writing style and tone
3. Professional or personal focus
4. Notable patterns or themes`;

    return await callAiModel(prompt, settings);
  } catch (error: unknown) {
    console.error('Error summarizing profile:', error);
    throw new Error(`Failed to summarize profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
