import type { TwitterPostDetail } from "../types/twitter"

/**
 * AI Parser Service
 * Uses external AI models to parse Twitter DOM content into structured JSON
 * when traditional scraping methods fail
 */
export class AIParserService {
  private apiKey: string = "" // OpenRouter API key
  private defaultModel: string = "google/gemma-3-27b-it:free"
  private models = {
    mistralSmall: "mistralai/mistral-small-3.1-24b-instruct:free",
    gemma3: "google/gemma-3-27b-it:free",
    gemini: "google/gemini-2.0-pro-exp-02-05:free"
  }

  /**
   * Set the API key for OpenRouter
   * @param key The API key
   */
  setApiKey(key: string): void {
    this.apiKey = key
  }

  /**
   * Set the default model to use
   * @param model The model identifier
   */
  setDefaultModel(model: string): void {
    if (Object.values(this.models).includes(model)) {
      this.defaultModel = model
    } else {
      console.warn(
        `Model ${model} not recognized, using default ${this.defaultModel}`
      )
    }
  }

  /**
   * Parses Twitter post DOM content into structured JSON using AI
   * @param domContent The HTML content to parse
   * @param model Optional model to use (defaults to the service default)
   * @returns Promise with TwitterPostDetail object
   */
  async parseDomToPostDetail(
    domContent: string,
    model: string = this.defaultModel
  ): Promise<TwitterPostDetail> {
    if (!this.apiKey) {
      throw new Error(
        "API key not set. Please set an API key before using the AI parser."
      )
    }

    console.log(`Parsing DOM content with AI model: ${model}`)

    try {
      const prompt = this.createParsingPrompt(domContent)
      const jsonResponse = await this.callOpenRouterAPI(prompt, model)

      // Parse the JSON response into a TwitterPostDetail object
      const postDetail = this.processAIResponse(jsonResponse)

      return postDetail
    } catch (error) {
      console.error("Error in AI parsing:", error)
      throw new Error(
        `AI parsing failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Creates a prompt for the AI model to parse Twitter post DOM
   * @param domContent The HTML content to parse
   * @returns Formatted prompt string
   */
  private createParsingPrompt(domContent: string): string {
    return `
You are an expert in extracting structured data from Twitter/X HTML content.

I will provide you with HTML DOM content from a Twitter post page. 
Please extract all relevant information and format it as a clean JSON object with the following structure:

{
  "id": "string",                     // Post ID
  "text": "string",                   // Post text content
  "createdAt": "string",              // Creation date ISO format
  "authorUsername": "string",         // Username without @
  "authorDisplayName": "string",      // Display name
  "authorProfileUrl": "string",       // Profile URL
  "authorAvatar": "string",           // Avatar image URL
  "isVerified": boolean,              // Whether author is verified
  "likeCount": number,                // Number of likes
  "retweetCount": number,             // Number of retweets
  "replyCount": number,               // Number of replies
  "viewCount": number,                // Number of views
  "media": [                          // Media attachments
    {
      "type": "string",               // "image", "video", or "gif"
      "url": "string",                // Media URL
      "thumbnailUrl": "string",       // For videos/GIFs
      "altText": "string"             // For images
    }
  ],
  "links": ["string"],                // External links in the post
  "hashtags": ["string"],             // Hashtags without #
  "mentionedUsers": ["string"],       // Mentioned users without @
  "isReply": boolean,                 // Whether this is a reply
  "replyToId": "string",              // ID of the post being replied to
  "replyToUsername": "string",        // Username being replied to
  "isRetweet": boolean,               // Whether this is a retweet
  "postUrl": "string",                // Full URL to the post
  "comments": [                       // Array of replies/comments
    {
      "id": "string",                 // Comment ID
      "text": "string",               // Comment text
      "createdAt": "string",          // Creation date ISO format
      "authorUsername": "string",     // Username
      "authorDisplayName": "string",  // Display name
      "authorAvatar": "string",       // Avatar URL
      "isVerified": boolean,          // Whether author is verified
      "likeCount": number,            // Likes count
      "retweetCount": number,         // Retweets count
      "replyCount": number,           // Replies count
      "viewCount": number,            // Views count
      "isReply": boolean,             // Whether this is a reply to another comment
      "replyToId": "string",          // ID of the post/comment being replied to
      "media": [                      // Media in the comment
        {
          "type": "string",           // "image", "video", or "gif"
          "url": "string",            // Media URL
          "thumbnailUrl": "string",   // For videos/GIFs
          "altText": "string"         // For images
        }
      ],
      "postUrl": "string"             // URL to the comment
    }
  ]
}

Extract as much information as you can accurately, but don't guess data that isn't present.
For numerical values, parse numbers from text (e.g., "1.5K" → 1500).
Use null for missing optional data, not empty strings.
Output only valid JSON without any explanations.

Here's the HTML content to parse:
${domContent}
`
  }

  /**
   * Makes an API call to OpenRouter with the given prompt
   * @param prompt The prompt to send to the AI
   * @param model The model identifier
   * @returns Promise with the AI's JSON response
   */
  private async callOpenRouterAPI(
    prompt: string,
    model: string
  ): Promise<string> {
    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": "https://twitter.com", // Replace with your domain
            "X-Title": "Twitter Scraper Extension"
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: "system",
                content:
                  "You are an expert in parsing HTML content and extracting structured data from Twitter posts."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            max_tokens: 4000,
            temperature: 0.1 // Low temperature for more deterministic outputs
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`OpenRouter API error: ${response.status} ${errorData}`)
      }

      const data = await response.json()

      // Extract content from the response
      const content = data.choices && data.choices[0]?.message?.content

      if (!content) {
        throw new Error("No content returned from AI model")
      }

      // Extract JSON from the content (removing any surrounding text)
      const jsonMatch = content.match(/```(?:json)?([\s\S]*?)```/) ||
        content.match(/({[\s\S]*})/) || [null, content]

      const cleanedJson = jsonMatch[1].trim()

      return cleanedJson
    } catch (error) {
      console.error("Error calling OpenRouter API:", error)
      throw new Error(
        `Failed to call AI API: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Processes the AI response and converts it into a TwitterPostDetail object
   * @param jsonResponse The JSON string from the AI
   * @returns TwitterPostDetail object
   */
  private processAIResponse(jsonResponse: string): TwitterPostDetail {
    try {
      // Parse the JSON response
      const parsedData = JSON.parse(jsonResponse)

      // Ensure this is a proper TwitterPostDetail
      if (!parsedData.id || !parsedData.authorUsername) {
        throw new Error("AI response missing required post fields")
      }

      // Ensure all required fields exist with fallbacks
      const processedData: TwitterPostDetail = {
        ...parsedData,
        id: parsedData.id || "",
        authorUsername: parsedData.authorUsername || "",
        authorDisplayName: parsedData.authorDisplayName || "",
        text: parsedData.text || "",
        createdAt: parsedData.createdAt || new Date().toISOString(),
        comments: Array.isArray(parsedData.comments) ? parsedData.comments : [],
        commentsFetched: Boolean(
          parsedData.comments && parsedData.comments.length > 0
        ),
        commentCount: (parsedData.comments && parsedData.comments.length) || 0
      }

      return processedData
    } catch (error) {
      console.error("Error processing AI response:", error)
      console.error("Raw JSON response:", jsonResponse)
      throw new Error(
        `Failed to process AI response: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}

// Export singleton instance
export const aiParser = new AIParserService()
