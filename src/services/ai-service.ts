import type { Settings } from "../types/index"
import type { TwitterUserAnalysis } from "../types/twitter"

/**
 * AI服务类 - 处理与AI模型的交互
 */
class AIService {
  private apiKey: string = ""
  private modelId: string = "gpt-3.5-turbo"
  private systemPrompt: string = ""

  /**
   * 初始化AI服务
   */
  public initialize(settings: Settings): void {
    this.apiKey = settings.aiModelSettings.apiKey
    this.modelId = settings.aiModelSettings.modelId
    this.systemPrompt = settings.aiModelSettings.systemPrompt
    console.log("AI service initialized", { modelId: this.modelId })
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
    console.log(`Analyze user: ${username}, tweets number: ${tweets.length}`)

    if (!this.apiKey) {
      throw new Error("Has not set API key")
    }

    try {
      // 准备分析提示
      const userContent = `
Username: @${username}
${bio ? `Bio: ${bio}` : ""}
Tweet samples:
${tweets.slice(0, 10).join("\n")}
`

      const messages = [
        {
          role: "system",
          content:
            this.systemPrompt ||
            "You are a professional Twitter user analysis assistant, good at analyzing the personality traits, interests and communication style of users. Please analyze the user's tweets and provide useful insights."
        },
        {
          role: "user",
          content: `Please analyze the following Twitter user information:
1. Personality traits (5 traits)
2. Interests (5 interests)
3. Communication style (brief description)
4. Overall analysis summary (one paragraph)
5. 2-3 personalized reply templates for this type of user

Answer in JSON format, as follows:
{
  "traits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
  "interests": ["interest1", "interest2", "interest3", "interest4", "interest5"],
  "communicationStyle": "brief description of communication style",
  "summary": "overall analysis summary",
  "replyTemplates": ["reply template1", "reply template2", "reply template3"]
}

User information:
${userContent}`
        }
      ]

      // 调用API
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.modelId,
            messages: messages,
            temperature: settings.aiModelSettings.temperature,
            max_tokens: settings.aiModelSettings.maxTokens
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        console.error("AI API call failed:", data)
        throw new Error(
          `API call failed: ${data.error?.message || "Unknown error"}`
        )
      }

      const content = data.choices[0]?.message?.content

      if (!content) {
        throw new Error("API returned empty content")
      }

      // 解析JSON响应
      try {
        // 尝试提取JSON部分
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        const jsonString = jsonMatch ? jsonMatch[0] : content
        const analysis = JSON.parse(jsonString)
        return analysis
      } catch (jsonError) {
        console.error(
          "Failed to parse AI response JSON:",
          jsonError,
          "Original content:",
          content
        )
        throw new Error("Failed to parse AI analysis result")
      }
    } catch (error) {
      console.error("AI analysis failed:", error)
      throw error
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
    this.apiKey = apiKey

    // 准备默认分析结果
    const defaultAnalysis: TwitterUserAnalysis = {
      username,
      personalityTraits: [
        "analytical",
        "curious",
        "social",
        "innovative",
        "logical"
      ],
      interests: [
        "technology",
        "social media",
        "current events",
        "entertainment",
        "culture"
      ],
      communicationStyle: ["direct", "information-rich"],
      summary: `@${username} is a person who likes to share information and opinions.`,
      timestamp: Date.now()
    }

    // 如果没有推文，返回默认分析
    if (!tweets || tweets.length === 0) {
      return defaultAnalysis
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
      )

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
      }
    } catch (error) {
      console.error("Failed to analyze user:", error)
      return defaultAnalysis
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
    this.apiKey = apiKey

    try {
      // 准备提示
      const messages = [
        {
          role: "system",
          content:
            "You are a personal assistant, helping users generate personalized replies针对特定Twitter用户。你的回复应该与对方的性格特点和兴趣相关，并且友好、自然。"
        },
        {
          role: "user",
          content: `Please generate a friendly and personalized reply based on the following Twitter user analysis:

Username: @${username}
Personality traits: ${userAnalysis.personalityTraits.join(", ")}
Interests: ${userAnalysis.interests.join(", ")}
Communication style: ${userAnalysis.communicationStyle.join(", ")}
Overall analysis: ${userAnalysis.summary}

${remindViewDetails ? "Please kindly remind the user to view the post details in the reply." : ""}

Keep the reply within ${maxLength} characters, maintaining a friendly and natural tone.`
        }
      ]

      // 调用API
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.modelId,
            messages: messages,
            temperature: 0.7,
            max_tokens: maxLength * 2,
            top_p: 1
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          `API call failed: ${data.error?.message || "Unknown error"}`
        )
      }

      let reply = data.choices[0]?.message?.content || ""

      // 确保回复不超过最大长度
      if (reply.length > maxLength) {
        reply = reply.substring(0, maxLength)
      }

      return reply
    } catch (error) {
      console.error("Failed to generate reply:", error)

      // 生成备用回复
      const traits = userAnalysis.personalityTraits.slice(0, 2).join(" and ")
      let reply = `Hi @${username}! It seems you are a ${traits} person, interested in ${userAnalysis.interests[0] || "social media"}.`

      if (remindViewDetails) {
        reply += " Click to view more about your analysis!"
      }

      return reply
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
          Authorization: `Bearer ${apiKey}`
        }
      })

      if (response.ok) {
        return true
      }

      const errorData = await response.json()
      console.error("OpenAI API key validation failed:", errorData)
      return false
    } catch (error) {
      console.error("Error testing OpenAI API key:", error)
      return false
    }
  }

  /**
   * 验证API密钥
   */
  public async validateApiKey(apiKey: string): Promise<boolean> {
    return this.testApiKey(apiKey)
  }
}

// 导出单例实例
export const aiService = new AIService()
