import { TabToolkit } from '../tools/tab-toolkit';
import { WebToolkit } from '../tools/web-toolkit';

export interface ToolCall {
  tool: string;
  params: Record<string, any> | any[];
}

export class ToolExecutor {
  // Map of available tools
  private toolMap: Record<string, (...args: any[]) => any> = {
    'TabToolkit.openTab': TabToolkit.openTab,
    'TabToolkit.closeTab': TabToolkit.closeTab,
    'TabToolkit.findTab': TabToolkit.findTab,
    'TabToolkit.switchToTab': TabToolkit.switchToTab,
    'TabToolkit.waitForTabLoad': TabToolkit.waitForTabLoad,
    'TabToolkit.getCurrentActiveTab': TabToolkit.getCurrentActiveTab,
    'WebToolkit.findElement': WebToolkit.prototype.findElement,
    'WebToolkit.clickElement': WebToolkit.prototype.clickElement,
    'WebToolkit.fillInput': WebToolkit.prototype.fillInput,
    'WebToolkit.extractText': WebToolkit.prototype.extractText
  };

  // Execute a single tool call
  async executeTool(toolCall: ToolCall): Promise<any> {
    const tool = this.toolMap[toolCall.tool];
    
    if (!tool) {
      throw new Error(`Tool not found: ${toolCall.tool}`);
    }

    // Convert params to an array of values
    const paramValues = Array.isArray(toolCall.params) 
      ? toolCall.params 
      : Object.values(toolCall.params);

    // Use rest parameter to handle spread argument
    return tool(...paramValues);
  }

  // Execute a sequence of tool calls
  async executeToolCalls(toolCalls: ToolCall[]): Promise<any[]> {
    const results = [];

    for (const toolCall of toolCalls) {
      try {
        const result = await this.executeTool(toolCall);
        results.push({
          tool: toolCall.tool,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          tool: toolCall.tool,
          success: false,
          error: String(error)
        });
        
        // Stop execution if a tool call fails
        break;
      }
    }

    return results;
  }

  // Parse tool calls from AI response
  parseToolCalls(aiResponse: string): ToolCall[] {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(aiResponse.trim());
      
      // Validate the structure
      if (Array.isArray(parsed)) {
        return parsed;
      }
      
      throw new Error('Invalid tool call format');
    } catch (jsonError) {
      // Fallback: try to extract JSON from code block
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
      
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch (parseError) {
          throw new Error('Failed to parse tool calls');
        }
      }
      
      throw new Error('No valid tool calls found in AI response');
    }
  }
}

// Singleton instance
export const toolExecutor = new ToolExecutor();
