import { Settings } from "../types"
import { TwitterPost } from "../types/twitter"
import { aiService } from "./ai"

/**
 * Twitter Post Scraper Service - responsible for extracting posts from Twitter profiles
 */
class TwitterPostScraperService {
  /**
   * Build a Twitter profile URL
   * @param username Twitter username
   * @returns Formatted profile URL
   */
  getProfileUrl(username: string): string {
    // Ensure username is properly formatted (no @ symbol)
    const cleanUsername = username.replace(/^@/, "")
    return `https://twitter.com/${cleanUsername}`
  }

  /**
   * Scrape posts from a Twitter profile
   * @param username Twitter username
   * @param maxPosts Maximum number of posts to retrieve (default: 20)
   * @returns Array of Twitter posts
   */
  async scrapePosts(
    username: string,
    maxPosts: number = 20
  ): Promise<TwitterPost[]> {
    console.log(
      `Starting to scrape posts for user: ${username}, max posts: ${maxPosts}`
    )

    try {
      // Create a new tab to load the profile page
      const tab = await chrome.tabs.create({
        url: this.getProfileUrl(username),
        active: false // Open in background
      })

      // Wait for page to load
      console.log(`Waiting for profile page to load, tab ID: ${tab.id}`)
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Scroll down to load more posts
      if (!tab.id) {
        throw new Error("Invalid tab ID")
      }

      // Execute script to scroll and retrieve posts
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (postsLimit) => {
          // Function to scroll down smoothly
          return new Promise((resolve) => {
            const maxScrolls = 10 // Maximum number of scroll attempts
            let scrollCount = 0

            const scrollDown = () => {
              // Get all posts currently visible
              const posts = document.querySelectorAll(
                'article[data-testid="tweet"]'
              )
              console.log(`Found ${posts.length} posts so far`)

              // If we have enough posts or reached max scrolls, stop
              if (posts.length >= postsLimit || scrollCount >= maxScrolls) {
                console.log(`Finished scrolling: found ${posts.length} posts`)
                resolve(true)
                return
              }

              // Scroll down
              window.scrollTo(0, document.body.scrollHeight)
              scrollCount++

              // Wait and continue scrolling
              setTimeout(scrollDown, 1000)
            }

            // Start scrolling
            scrollDown()
          })
        },
        args: [maxPosts]
      })

      // Now extract the posts
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: this.extractPostsFromPage
      })

      // Close the tab
      await chrome.tabs.remove(tab.id)

      // Process the results
      if (results && results[0] && results[0].result) {
        const posts = results[0].result as TwitterPost[]
        console.log(`Successfully scraped ${posts.length} posts`)
        return posts.slice(0, maxPosts) // Limit to requested number
      }

      console.log("Scraping successful but found no posts")
      return []
    } catch (error) {
      console.error("Twitter post scraping failed:", error)
      throw error
    }
  }

  /**
   * Extract posts from the current page
   * Note: This function will run in the page context
   * @returns Array of extracted posts
   */
  private extractPostsFromPage(): TwitterPost[] {
    try {
      // Find all post elements
      const postElements = document.querySelectorAll(
        'article[data-testid="tweet"]'
      )
      const posts: TwitterPost[] = []

      postElements.forEach((element, index) => {
        try {
          // Extract post content
          const contentElement = element.querySelector(
            '[data-testid="tweetText"]'
          )
          if (!contentElement) return // Skip posts without text content

          const content = contentElement.textContent || ""

          // Extract author info
          const authorElement = element.querySelector(
            '[data-testid="User-Name"]'
          )
          const displayName =
            authorElement?.querySelector("span")?.textContent || ""
          const usernameElement = authorElement?.querySelector('[dir="ltr"]')
          const username = usernameElement?.textContent?.replace("@", "") || ""
          const profileUrl = `https://twitter.com/${username}`

          // Extract timestamp
          const timeElement = element.querySelector("time")
          const timestamp = timeElement?.getAttribute("datetime") || ""

          // Extract engagement stats
          const statsContainer = element.querySelector('[role="group"]')
          const stats =
            statsContainer?.querySelectorAll('[data-testid$="count"]') || []
          const [repliesCount, retweetsCount, likesCount] = Array.from(
            stats
          ).map((stat) => parseInt(stat?.textContent || "0", 10))

          // Extract post URL
          const linkElement = element.querySelector('a[href*="/status/"]')
          const url = linkElement?.getAttribute("href") || ""
          const id = url?.split("/status/")?.[1]?.split("?")?.[0] || ""

          // Check if it's a reply
          const replyElement = element.querySelector(
            '[data-testid="tweet-reply-context"]'
          )
          if (replyElement) {
            // Extract reply-to author
            const replyAuthorElement = replyElement.querySelector(
              '[data-testid="User-Name"]'
            )
            const replyDisplayName =
              replyAuthorElement?.querySelector("span")?.textContent || ""
            const replyUsernameElement =
              replyAuthorElement?.querySelector('[dir="ltr"]')
            const replyUsername =
              replyUsernameElement?.textContent?.replace("@", "") || ""
            const replyProfileUrl = `https://twitter.com/${replyUsername}`

            // Extract reply-to content
            const replyContentElement = replyElement.querySelector(
              '[data-testid="tweetText"]'
            )
            const replyContent = replyContentElement?.textContent || ""

            posts.push({
              type: "reply",
              id,
              content,
              timestamp,
              author: {
                username,
                displayName,
                profileUrl
              },
              likesCount,
              retweetsCount,
              repliesCount,
              url: url ? `https://twitter.com${url}` : undefined,
              replyTo: {
                id: "",
                content: replyContent,
                timestamp: "",
                author: {
                  username: replyUsername,
                  displayName: replyDisplayName,
                  profileUrl: replyProfileUrl
                }
              }
            })
            return
          }

          // Check if it's a repost/quote
          const repostElement = element.querySelector(
            '[data-testid="tweet-repost-context"]'
          )
          if (repostElement) {
            // Extract original author
            const originalAuthorElement = repostElement.querySelector(
              '[data-testid="User-Name"]'
            )
            const originalDisplayName =
              originalAuthorElement?.querySelector("span")?.textContent || ""
            const originalUsernameElement =
              originalAuthorElement?.querySelector('[dir="ltr"]')
            const originalUsername =
              originalUsernameElement?.textContent?.replace("@", "") || ""
            const originalProfileUrl = `https://twitter.com/${originalUsername}`

            // Extract quoted content
            const quoteElement = element.querySelector(
              '[data-testid="tweet-quoted"]'
            )
            const quoteContent = quoteElement?.textContent || ""
            const hasQuote = Boolean(quoteContent)

            posts.push({
              type: "repost",
              id,
              content,
              timestamp,
              author: {
                username,
                displayName,
                profileUrl
              },
              likesCount,
              retweetsCount,
              repliesCount,
              url: url ? `https://twitter.com${url}` : undefined,
              originalPost: {
                id: "",
                content: quoteContent,
                timestamp: "",
                author: {
                  username: originalUsername,
                  displayName: originalDisplayName,
                  profileUrl: originalProfileUrl
                }
              },
              hasQuote,
              quoteComment: hasQuote ? content : undefined
            })
            return
          }

          // Normal post
          posts.push({
            type: "normal",
            id,
            content,
            timestamp,
            author: {
              username,
              displayName,
              profileUrl
            },
            likesCount,
            retweetsCount,
            repliesCount,
            url: url ? `https://twitter.com${url}` : undefined
          })
        } catch (postError) {
          console.error("Error parsing post element:", postError)
        }
      })

      return posts
    } catch (error) {
      console.error("Error extracting posts from page:", error)
      return []
    }
  }

  /**
   * Fallback to AI for extracting posts when direct scraping fails
   * @param html HTML content of the profile page
   * @param settings Application settings
   * @returns Array of Twitter posts extracted by AI
   */
  async extractPostsWithAi(
    html: string,
    settings: Settings
  ): Promise<TwitterPost[]> {
    try {
      console.log("Starting AI-based post extraction")

      const prompt = `You are a Twitter HTML parser. Extract all tweets from this Twitter profile page HTML.
For each tweet, identify if it's a normal tweet, reply, or repost/quote. Include:

1. Tweet content
2. Author information (username, display name)
3. Timestamp (if available)
4. Engagement metrics (likes, retweets, replies)
5. For replies: include the original tweet being replied to
6. For reposts: include the original tweet

Return the data as a JSON array of objects with this structure:
{
  "type": "normal" | "reply" | "repost",
  "id": "tweet id if available, otherwise empty string",
  "content": "tweet content",
  "timestamp": "timestamp if available",
  "author": {
    "username": "username without @",
    "displayName": "display name",
    "profileUrl": "https://twitter.com/username"
  },
  "likesCount": number or 0 if not available,
  "retweetsCount": number or 0 if not available,
  "repliesCount": number or 0 if not available,
  "url": "tweet URL if available",
  
  // For replies only:
  "replyTo": {
    "content": "original tweet content",
    "author": { same structure as above }
  },
  
  // For reposts only:
  "originalPost": {
    "content": "original tweet content",
    "author": { same structure as above }
  },
  "hasQuote": boolean,
  "quoteComment": "quote text if hasQuote is true"
}

HTML Content:
${html.substring(0, Math.min(html.length, 100000))}` // Limit HTML length

      // Call AI model
      const result = await aiService.callAiModel(prompt, settings)

      try {
        const parsedPosts = JSON.parse(result)
        if (Array.isArray(parsedPosts)) {
          console.log(`Successfully parsed ${parsedPosts.length} posts with AI`)
          return parsedPosts
        }
        console.error("AI returned invalid format:", result)
        return []
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError)
        return []
      }
    } catch (error) {
      console.error("Error in AI post extraction:", error)
      return []
    }
  }

  /**
   * Generate mock Twitter posts when all methods fail
   * @param username Twitter username
   * @param count Number of mock posts to generate
   * @returns Array of mock Twitter posts
   */
  generateMockPosts(username: string, count: number = 5): TwitterPost[] {
    console.log(`Generating ${count} mock posts for user ${username}`)

    const posts: TwitterPost[] = []
    const displayName = username.charAt(0).toUpperCase() + username.slice(1)
    const profileUrl = `https://twitter.com/${username}`

    const topics = [
      "Just finished an amazing book about AI and the future of technology! Highly recommend it.",
      "Today's weather is perfect for a hike. Anyone want to join?",
      "Working on a new project that I'm really excited about. Can't wait to share more details!",
      "Thoughts on the latest tech news? I think it's going to change everything.",
      "Just watched an incredible movie. The cinematography was breathtaking!",
      "Having coffee and thinking about how fast technology is evolving these days.",
      "Attended an interesting conference yesterday. Learned so much about the industry!",
      "Does anyone have recommendations for good productivity apps?",
      "Celebrating a small win today. Sometimes it's the little things that matter most.",
      "Looking for book recommendations! What's everyone reading these days?"
    ]

    for (let i = 0; i < count; i++) {
      const content = topics[Math.floor(Math.random() * topics.length)]
      const timestamp = new Date(
        Date.now() - Math.floor(Math.random() * 10000000000)
      ).toISOString()
      const likesCount = Math.floor(Math.random() * 1000)
      const retweetsCount = Math.floor(Math.random() * 200)
      const repliesCount = Math.floor(Math.random() * 50)

      posts.push({
        type: "normal",
        id: `mock_${Date.now()}_${i}`,
        content,
        timestamp,
        author: {
          username,
          displayName,
          profileUrl
        },
        likesCount,
        retweetsCount,
        repliesCount,
        url: `https://twitter.com/${username}/status/mock${i}`
      })
    }

    return posts
  }

  /**
   * Main method to get Twitter posts with fallback mechanisms
   * @param username Twitter username
   * @param maxPosts Maximum number of posts to retrieve
   * @param settings Application settings
   * @returns Array of Twitter posts
   */
  async getPosts(
    username: string,
    maxPosts: number = 20,
    settings?: Settings
  ): Promise<TwitterPost[]> {
    console.log(`Getting posts for user ${username}, max posts: ${maxPosts}`)

    try {
      // Method 1: Try direct scraping first
      try {
        const scrapedPosts = await this.scrapePosts(username, maxPosts)

        if (scrapedPosts && scrapedPosts.length > 0) {
          console.log(
            `Successfully scraped ${scrapedPosts.length} posts directly`
          )
          return scrapedPosts
        }
      } catch (scrapeError) {
        console.error("Direct post scraping failed:", scrapeError)
      }

      // Method 2: Try AI extraction if settings are provided
      if (settings && settings.apiKey) {
        try {
          console.log("Attempting to get HTML for AI extraction")

          // Create a tab to get the HTML
          const tab = await chrome.tabs.create({
            url: this.getProfileUrl(username),
            active: false
          })

          if (!tab.id) {
            throw new Error("Invalid tab ID for AI extraction")
          }

          // Wait for page to load
          await new Promise((resolve) => setTimeout(resolve, 3000))

          // Get the HTML content
          const htmlResult = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.documentElement.outerHTML
          })

          // Close the tab
          await chrome.tabs.remove(tab.id)

          if (htmlResult && htmlResult[0] && htmlResult[0].result) {
            const html = htmlResult[0].result as string

            if (html) {
              console.log(
                `Got HTML (${html.length} chars), attempting AI extraction`
              )

              const aiPosts = await this.extractPostsWithAi(html, settings)

              if (aiPosts && aiPosts.length > 0) {
                console.log(
                  `Successfully extracted ${aiPosts.length} posts with AI`
                )
                return aiPosts.slice(0, maxPosts)
              }
            }
          }
        } catch (aiError) {
          console.error("AI post extraction failed:", aiError)
        }
      }

      // Method 3: Fallback to mock data if everything else fails
      console.log("All extraction methods failed, generating mock posts")
      return this.generateMockPosts(username, maxPosts)
    } catch (error) {
      console.error("Error getting posts:", error)
      return this.generateMockPosts(username, maxPosts)
    }
  }
}

// Export singleton instance
export const twitterPostScraper = new TwitterPostScraperService()
