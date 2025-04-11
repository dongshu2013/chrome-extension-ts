import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, conversationDB } from '../utils/indexed-db';

// Define environment variables type
interface Environment {
  OPENAI_API_KEY?: string;
}

// Safely access environment variables
const getEnvVar = (key: keyof Environment): string => {
  // In Chrome extension, use chrome.runtime.getManifest() or other extension-specific methods
  const value = (globalThis as any).process?.env?.[key] || '';
  return value;
};

// Define the structure of tool descriptions
interface ToolDescription {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export class AIConversationService {
  private openai: OpenAI;
  private abortController: AbortController | null = null;

  constructor(apiKey?: string) {
    // Prioritize passed apiKey, then environment variable
    const key = apiKey || getEnvVar('OPENAI_API_KEY') || '';
    
    if (!key) {
      throw new Error('No OpenAI API key provided');
    }

    this.openai = new OpenAI({ 
      apiKey: key, 
      dangerouslyAllowBrowser: true 
    });
  }

  // Generate tool descriptions for AI model
  private getToolDescriptions(): ToolDescription[] {
    return [
      // Tab Toolkit Tools
      {
        name: 'TabToolkit.openTab',
        description: 'Open a new browser tab with a specific URL',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL to open in the new tab'
            }
          },
          required: ['url']
        }
      },
      {
        name: 'TabToolkit.closeTab',
        description: 'Close a specific browser tab',
        parameters: {
          type: 'object',
          properties: {
            tabId: {
              type: 'number',
              description: 'The ID of the tab to close'
            }
          },
          required: ['tabId']
        }
      },
      {
        name: 'TabToolkit.findTab',
        description: 'Find tabs by URL or title',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Exact URL to match'
            },
            title: {
              type: 'string',
              description: 'Exact title to match'
            }
          }
        }
      },
      {
        name: 'TabToolkit.switchToTab',
        description: 'Switch to a specific tab by its ID',
        parameters: {
          type: 'object',
          properties: {
            tabId: {
              type: 'number',
              description: 'The ID of the tab to switch to'
            }
          },
          required: ['tabId']
        }
      },
      {
        name: 'TabToolkit.waitForTabLoad',
        description: 'Wait for a specific tab to finish loading',
        parameters: {
          type: 'object',
          properties: {
            tabId: {
              type: 'number',
              description: 'The ID of the tab to wait for'
            },
            timeout: {
              type: 'number',
              description: 'Maximum wait time in milliseconds (default: 10000)'
            }
          },
          required: ['tabId']
        }
      },
      {
        name: 'TabToolkit.getCurrentActiveTab',
        description: 'Get the currently active tab in the current window',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      
      // Web Toolkit Tools
      {
        name: 'WebToolkit.findElement',
        description: 'Find an element on the page using a CSS selector',
        parameters: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'CSS selector to find the element'
            },
            timeout: {
              type: 'number',
              description: 'Maximum time to wait for element (in milliseconds)'
            }
          },
          required: ['selector']
        }
      },
      {
        name: 'WebToolkit.clickElement',
        description: 'Click an element on the current page',
        parameters: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'CSS selector for the element to click'
            }
          },
          required: ['selector']
        }
      },
      {
        name: 'WebToolkit.fillInput',
        description: 'Fill an input element with a value',
        parameters: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'CSS selector for the input element'
            },
            value: {
              type: 'string',
              description: 'Value to fill in the input'
            }
          },
          required: ['selector', 'value']
        }
      },
      {
        name: 'WebToolkit.extractText',
        description: 'Extract text content from an element',
        parameters: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'CSS selector for the element to extract text from'
            }
          },
          required: ['selector']
        }
      },
      {
        name: 'WebToolkit.scrollToElement',
        description: 'Scroll the page to a specific element',
        parameters: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'CSS selector for the element to scroll to'
            },
            behavior: {
              type: 'string',
              description: 'Scroll behavior (auto, smooth)',
              enum: ['auto', 'smooth']
            }
          },
          required: ['selector']
        }
      },
      {
        name: 'WebToolkit.selectOption',
        description: 'Select an option in a select element',
        parameters: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'CSS selector for the select element'
            },
            value: {
              type: 'string',
              description: 'Value of the option to select'
            }
          },
          required: ['selector', 'value']
        }
      }
    ];
  }

  // Prepare conversation context for AI
  private async prepareConversationContext(
    conversationId: string
  ): Promise<OpenAI.ChatCompletionMessageParam[]> {
    const messages = await conversationDB.getConversationMessages(conversationId);
    
    // Transform messages to OpenAI format
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  // Send conversation to AI and get response
  async sendConversation(
    userMessage: string, 
    onTokenReceived?: (token: string) => void
  ): Promise<string> {
    // Generate a unique conversation ID
    const conversationId = uuidv4();

    // Save user message
    const userMessageRecord: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
      conversationId,
      status: 'pending'
    };
    const userMessageId = await conversationDB.saveMessage(userMessageRecord);

    // Prepare conversation context
    const conversationContext = await this.prepareConversationContext(conversationId);

    // Abort any ongoing request
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    try {
      // Send to OpenAI
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          ...conversationContext,
          { 
            role: 'user', 
            content: userMessage 
          },
          {
            role: 'system',
            content: `
              You are an AI agent that can interact with web pages using specific tools.
              Available tools: ${JSON.stringify(this.getToolDescriptions())}
              
              Your task is to:
              1. Understand the user's request
              2. Plan a sequence of tool calls to accomplish the task
              3. Return a JSON array of tool calls with their parameters
              
              Example response:
              [
                {
                  "tool": "TabToolkit.openTab",
                  "params": { "url": "https://twitter.com" }
                },
                {
                  "tool": "WebToolkit.fillInput",
                  "params": { 
                    "selector": "#search-box", 
                    "value": "AI automation" 
                  }
                }
              ]
            `
          }
        ],
        stream: true,
        max_tokens: 500
      }, { signal: this.abortController.signal });

      let fullResponse = '';
      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        fullResponse += token;
        onTokenReceived?.(token);
      }

      // Save AI response
      const aiMessageRecord: ChatMessage = {
        role: 'assistant',
        content: fullResponse,
        timestamp: Date.now(),
        conversationId,
        status: 'completed'
      };
      await conversationDB.saveMessage(aiMessageRecord);

      // Update user message status
      await conversationDB.updateMessageStatus(userMessageId, 'completed');

      return fullResponse;
    } catch (error) {
      // Handle cancellation or other errors
      await conversationDB.updateMessageStatus(userMessageId, 'error');
      throw error;
    }
  }

  // Cancel ongoing request
  cancelRequest() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

// Singleton instance with placeholder API key
export const aiService = new AIConversationService(
  getEnvVar('OPENAI_API_KEY')
);
