import type { Settings } from "../types";
import { VALID_MODEL_IDS } from "../types";

interface ChatMessage {
  role: "user" | "assistant" | "system";
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
    max_tokens?: number;
  }): Promise<ChatCompletion> {
    // Validate the model ID before making the API call
    if (!params.model || params.model === "openai") {
      console.warn(
        `Invalid model ID '${params.model}' detected, replacing with 'gpt-3.5-turbo'`
      );
      params = { ...params, model: "gpt-3.5-turbo" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
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

/**
 * AI服务类
 * 实现与大模型的交互，用于分析用户和生成回复
 */
export class AiService {
  private openai: LightOpenAI | null = null;
  
  /**
   * 初始化AI服务
   * @param settings 应用设置
   */
  public initialize(settings: Settings): void {
    if (!settings.aiModelSettings.enabled || !settings.aiModelSettings.apiKey) {
      this.openai = null;
      return;
    }
    
    this.openai = new LightOpenAI({
      baseURL: "https://api.openai.com/v1",
      apiKey: settings.aiModelSettings.apiKey
    });
  }
  
  /**
   * 验证API密钥有效性
   * @param apiKey OpenAI API密钥
   * @returns 密钥是否有效
   */
  public async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const tempOpenAI = new LightOpenAI({
        baseURL: "https://api.openai.com/v1",
        apiKey
      });
      
      // 尝试简单的API调用来验证密钥
      await tempOpenAI.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 5
      });
      
      return true;
    } catch (error) {
      console.error("验证OpenAI API密钥失败:", error);
      return false;
    }
  }
  
  /**
   * 调用AI模型
   * @param prompt 提示词
   * @param settings 应用设置
   * @returns 模型响应
   */
  public async callAiModel(
    prompt: string,
    settings: Settings,
    additionalMessages: ChatMessage[] = []
  ): Promise<string> {
    if (!settings.aiModelSettings.enabled || !settings.aiModelSettings.apiKey) {
      throw new Error("AI分析未启用或缺少API密钥");
    }

    // 确保初始化了OpenAI客户端
    if (!this.openai) {
      this.initialize(settings);
    }
    
    if (!this.openai) {
      throw new Error("无法初始化AI服务");
    }

    try {
      const modelId = validateAndFixModel(settings.aiModelSettings.modelId);
      
      // 构建消息列表
      const messages: ChatMessage[] = [
        {
          role: "system",
          content: settings.aiModelSettings.systemPrompt
        },
        ...additionalMessages,
        {
          role: "user",
          content: prompt
        }
      ];
      
      const response = await this.openai.createChatCompletion({
        model: modelId,
        messages,
        temperature: settings.aiModelSettings.temperature,
        max_tokens: settings.aiModelSettings.maxTokens
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error("调用AI API时出错:", error);
      throw new Error(`AI模型调用失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  /**
   * 分析Twitter用户
   * @param username 用户名
   * @param userTweets 用户推文
   * @param settings 应用设置
   * @param userBio 用户简介(可选)
   * @returns 分析结果
   */
  public async analyzeTwitterUser(
    username: string,
    userTweets: string[],
    settings: Settings,
    userBio?: string
  ): Promise<{
    traits: string[];
    interests: string[];
    communicationStyle: string;
    summary: string;
    replyTemplates: string[];
  }> {
    const tweetsText = userTweets.join("\n\n");
    
    let prompt = `请分析以下Twitter用户 @${username} 的推文`;
    
    // 如果提供了用户简介，加入分析
    if (userBio) {
      prompt += `和简介`;
    }
    
    prompt += `，并提供详细的用户特征分析:

`;

    // 添加用户简介信息
    if (userBio) {
      prompt += `用户简介:
${userBio}

`;
    }
    
    prompt += `用户的推文:
${tweetsText}

请以JSON格式回复，包含以下字段:
1. traits: 用户的5个主要性格特征 (字符串数组)
2. interests: 用户的5个主要兴趣爱好 (字符串数组)
3. communicationStyle: 用户的沟通风格 (字符串)
4. summary: 用户的整体描述摘要 (字符串)
5. replyTemplates: 3个适合回复该用户的模板 (字符串数组)

请确保回复是有效的JSON格式，不要添加额外的解释文本。`;

    const response = await this.callAiModel(prompt, settings);
    
    try {
      // 尝试解析JSON响应
      const analysisResult = JSON.parse(response);
      
      // 验证字段并提供默认值
      return {
        traits: Array.isArray(analysisResult.traits) ? analysisResult.traits : [],
        interests: Array.isArray(analysisResult.interests) ? analysisResult.interests : [],
        communicationStyle: analysisResult.communicationStyle || "未能识别沟通风格",
        summary: analysisResult.summary || "未能生成用户摘要",
        replyTemplates: Array.isArray(analysisResult.replyTemplates) ? analysisResult.replyTemplates : []
      };
    } catch (error) {
      console.error("解析AI分析结果失败:", error);
      console.log("AI原始响应:", response);
      
      // 返回错误信息
      return {
        traits: ["解析错误"],
        interests: ["解析错误"],
        communicationStyle: "解析AI响应时出错",
        summary: `无法正确解析AI的分析结果。错误: ${error instanceof Error ? error.message : "未知错误"}`,
        replyTemplates: ["很抱歉，无法生成回复模板。"]
      };
    }
  }

  /**
   * 生成个性化回复
   * @param targetUser 目标用户分析结果
   * @param topic 回复话题
   * @param settings 应用设置
   * @returns 生成的回复文本
   */
  public async generatePersonalizedReply(
    targetUser: {
      username: string;
      traits: string[];
      interests: string[];
      communicationStyle: string;
      summary: string;
    },
    topic: string,
    settings: Settings
  ): Promise<string> {
    const prompt = `请根据以下Twitter用户 @${targetUser.username} 的特征分析，生成一条针对话题"${topic}"的个性化回复:

用户特征:
- 性格特征: ${targetUser.traits.join(", ")}
- 兴趣爱好: ${targetUser.interests.join(", ")}
- 沟通风格: ${targetUser.communicationStyle}
- 用户摘要: ${targetUser.summary}

回复要求:
1. 考虑用户的兴趣和性格特征
2. 匹配用户的沟通风格
3. 围绕"${topic}"话题
4. 友好、有礼貌，但也要符合用户的期望
5. 不超过280个字符(Twitter限制)

请只生成回复内容，不需要额外的解释。`;

    return this.callAiModel(prompt, settings);
  }
}

/**
 * 验证并修复模型ID
 * @param model 模型ID
 * @returns 有效的模型ID
 */
function validateAndFixModel(model?: string): string {
  // 默认使用已知可用的模型ID
  const defaultModel = "gpt-3.5-turbo";

  // 如果没有模型或无效模型("openai")，使用默认值
  if (!model || model === "openai") {
    return defaultModel;
  }

  // 如果模型在有效模型列表中，使用它
  if (VALID_MODEL_IDS.includes(model)) {
    return model;
  }

  // 否则，警告并使用默认值
  console.warn(
    `模型'${model}'可能无效。使用${defaultModel}替代。`
  );
  return defaultModel;
}

// 创建并导出单例
export const aiService = new AiService();
