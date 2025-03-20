import { TwitterUserAnalysis } from "../types/twitter";
import { Settings } from "../types/app";

/**
 * AI服务类 - 处理与AI模型的交互
 */
class AIService {
  private apiKey: string = "";
  private modelId: string = "gpt-3.5-turbo";
  private systemPrompt: string = "";

  /**
   * 初始化AI服务
   */
  public initialize(settings: Settings): void {
    this.apiKey = settings.aiModelSettings.apiKey;
    this.modelId = settings.aiModelSettings.modelId;
    this.systemPrompt = settings.aiModelSettings.systemPrompt;
    console.log("AI服务已初始化", { modelId: this.modelId });
  }

  /**
   * 分析Twitter用户
   */
  public async analyzeTwitterUser(
    username: string,
    tweets: string[],
    settings: Settings,
    bio?: string
  ): Promise<any> {
    console.log(`分析用户: ${username}, 推文数量: ${tweets.length}`);

    if (!this.apiKey) {
      throw new Error("未设置API密钥");
    }

    try {
      // 准备分析提示
      const userContent = `
用户名: @${username}
${bio ? `个人简介: ${bio}` : ""}
推文样本:
${tweets.slice(0, 10).join("\n")}
`;

      const messages = [
        {
          role: "system",
          content: this.systemPrompt || "你是一个专业的Twitter用户分析助手，善于分析用户的性格特征、兴趣爱好和沟通风格。请根据用户的推文内容进行分析并提供有用的见解。"
        },
        {
          role: "user",
          content: `请根据以下Twitter用户的信息，分析该用户的:
1. 性格特点 (5项特点)
2. 兴趣爱好 (5项兴趣)
3. 沟通风格 (简洁描述)
4. 总体分析摘要 (一段话)
5. 针对这类用户的2-3个个性化回复模板

以JSON格式回答，格式如下:
{
  "traits": ["特点1", "特点2", "特点3", "特点4", "特点5"],
  "interests": ["兴趣1", "兴趣2", "兴趣3", "兴趣4", "兴趣5"],
  "communicationStyle": "沟通风格描述",
  "summary": "总体分析摘要",
  "replyTemplates": ["回复模板1", "回复模板2", "回复模板3"]
}

用户信息:
${userContent}`
        }
      ];

      // 调用API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.modelId,
          messages: messages,
          temperature: settings.aiModelSettings.temperature,
          max_tokens: settings.aiModelSettings.maxTokens
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("AI API调用失败:", data);
        throw new Error(`API调用失败: ${data.error?.message || "未知错误"}`);
      }

      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error("API返回的内容为空");
      }

      // 解析JSON响应
      try {
        // 尝试提取JSON部分
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : content;
        const analysis = JSON.parse(jsonString);
        return analysis;
      } catch (jsonError) {
        console.error("解析AI响应JSON失败:", jsonError, "原始内容:", content);
        throw new Error("无法解析AI分析结果");
      }
    } catch (error) {
      console.error("AI分析失败:", error);
      throw error;
    }
  }

  /**
   * 分析用户
   */
  public async analyzeUser(
    username: string,
    tweets: string[],
    apiKey: string
  ): Promise<TwitterUserAnalysis> {
    // 保存API密钥
    this.apiKey = apiKey;

    // 准备默认分析结果
    const defaultAnalysis: TwitterUserAnalysis = {
      username,
      personalityTraits: ["分析性", "好奇心", "社交性", "创新", "逻辑性"],
      interests: ["科技", "社交媒体", "当前事件", "娱乐", "文化"],
      communicationStyle: ["直接", "信息丰富"],
      summary: `@${username} 是一个喜欢分享信息和观点的人。`,
      timestamp: Date.now()
    };

    // 如果没有推文，返回默认分析
    if (!tweets || tweets.length === 0) {
      return defaultAnalysis;
    }

    try {
      // 调用API进行分析
      const aiResult = await this.analyzeTwitterUser(
        username,
        tweets,
        {
          aiModelSettings: {
            apiKey,
            modelId: this.modelId,
            temperature: 0.7,
            maxTokens: 2000,
            systemPrompt: this.systemPrompt,
            enabled: true
          }
        } as Settings,
        ""
      );

      // 转换API结果为TwitterUserAnalysis格式
      return {
        username,
        personalityTraits: aiResult.traits || defaultAnalysis.personalityTraits,
        interests: aiResult.interests || defaultAnalysis.interests,
        communicationStyle: Array.isArray(aiResult.communicationStyle) 
          ? aiResult.communicationStyle 
          : [aiResult.communicationStyle || "直接"],
        summary: aiResult.summary || defaultAnalysis.summary,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("AI分析用户失败:", error);
      return defaultAnalysis;
    }
  }

  /**
   * 生成回复
   */
  public async generateReply(
    username: string,
    userAnalysis: TwitterUserAnalysis,
    remindViewDetails: boolean,
    maxLength: number,
    apiKey: string
  ): Promise<string> {
    // 保存API密钥
    this.apiKey = apiKey;

    try {
      // 准备提示
      const messages = [
        {
          role: "system",
          content: "你是一个私人助理，帮助用户生成针对特定Twitter用户的个性化回复。你的回复应该与对方的性格特点和兴趣相关，并且友好、自然。"
        },
        {
          role: "user",
          content: `请根据以下Twitter用户的分析，生成一条友好、个性化的回复:

用户名: @${username}
性格特点: ${userAnalysis.personalityTraits.join(", ")}
兴趣爱好: ${userAnalysis.interests.join(", ")}
沟通风格: ${userAnalysis.communicationStyle.join(", ")}
总体分析: ${userAnalysis.summary}

${remindViewDetails ? "请在回复中友好地提醒用户查看帖子详情。" : ""}

回复不超过${maxLength}个字符，保持友好自然的语气。`
        }
      ];

      // 调用API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.modelId,
          messages: messages,
          temperature: 0.7,
          max_tokens: maxLength * 2,
          top_p: 1
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`API调用失败: ${data.error?.message || "未知错误"}`);
      }

      let reply = data.choices[0]?.message?.content || "";
      
      // 确保回复不超过最大长度
      if (reply.length > maxLength) {
        reply = reply.substring(0, maxLength);
      }

      return reply;
    } catch (error) {
      console.error("生成回复失败:", error);
      
      // 生成备用回复
      const traits = userAnalysis.personalityTraits.slice(0, 2).join("和");
      let reply = `嗨 @${username}！看起来你是一个${traits}的人，对${userAnalysis.interests[0] || "社交媒体"}很感兴趣。`;
      
      if (remindViewDetails) {
        reply += " 点击查看更多关于你的分析！";
      }
      
      return reply;
    }
  }

  /**
   * 测试API密钥
   */
  public async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });

      if (response.ok) {
        return true;
      }

      const errorData = await response.json();
      console.error("OpenAI API密钥验证失败:", errorData);
      return false;
    } catch (error) {
      console.error("测试OpenAI API密钥时出错:", error);
      return false;
    }
  }

  /**
   * 验证API密钥
   */
  public async validateApiKey(apiKey: string): Promise<boolean> {
    return this.testApiKey(apiKey);
  }
}

// 导出单例实例
export const aiService = new AIService(); 