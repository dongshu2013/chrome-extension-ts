import { Settings } from "../types";
import { callAiModel } from "../services/ai";
import { TwitterPost } from "../types/twitter";
import { extractAuthorInfo } from "./common";

export function isTwitterProfileUrl(url: string): boolean {
  // Match twitter.com/username or x.com/username but not subpages
  // Also allow www subdomain
  return /^https?:\/\/((?:www\.)?twitter\.com|(?:www\.)?x\.com)\/[^/]+\/?$/.test(
    url
  );
}

export function isTwitterReplyUrl(url: string): boolean {
  if (!url) return false;
  
  console.log("Checking if URL is a Twitter reply URL:", url);
  
  // Match Twitter's reply URL patterns more comprehensively
  return (
    // Match the /intent/tweet pattern
    /^https?:\/\/((?:www\.)?twitter\.com|(?:www\.)?x\.com)\/[^/]+\/[^/]+\/tweet/.test(url) ||
    // Match the specific in_reply_to parameter
    /^https?:\/\/((?:www\.)?twitter\.com|(?:www\.)?x\.com)\/[^/]+\/intent\/tweet\?in_reply_to=/.test(url) ||
    // Match the specific in_reply_to parameter for x.com
    /^https?:\/\/((?:www\.)?twitter\.com|(?:www\.)?x\.com)\/intent\/post\?in_reply_to=/.test(url) ||
    // Match URLs with status and reply in them
    /^https?:\/\/((?:www\.)?twitter\.com|(?:www\.)?x\.com)\/[^/]+\/status\/[^/]+\/reply/.test(url)
  );
}

export function extractTwitterPostsFromDom(): TwitterPost[] {
  try {
    console.log("Starting DOM extraction...");
    const posts: TwitterPost[] = [];

    // Find all tweet articles
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    console.log(`Found ${tweets.length} tweets`);

    tweets.forEach((tweet, index) => {
      console.log(`Processing tweet ${index + 1}...`);

      // Find the tweet text content
      const contentElement = tweet.querySelector('[data-testid="tweetText"]');
      if (!contentElement) {
        console.log("No content element found, skipping tweet");
        return;
      }
      const content = contentElement.textContent || "";
      console.log(`- Content: "${content.slice(0, 50)}..."`);

      // Extract author info
      const author = extractAuthorInfo(tweet);
      console.log(`- Author: ${author.displayName} (@${author.username})`);

      // Find the tweet time element
      const timeElement = tweet.querySelector("time");
      const timestamp = timeElement?.getAttribute("datetime") || "";
      console.log(`- Timestamp: ${timestamp || "not found"}`);

      // Find tweet stats
      const statsContainer = tweet.querySelector('[role="group"]');
      const stats =
        statsContainer?.querySelectorAll('[data-testid$="count"]') || [];
      const [repliesCount, retweetsCount, likesCount] = Array.from(stats).map(
        (stat) => parseInt(stat?.textContent || "0", 10)
      );
      console.log(
        `- Stats: ${repliesCount} replies, ${retweetsCount} retweets, ${likesCount} likes`
      );

      // Find tweet URL
      const linkElement = tweet.querySelector('a[href*="/status/"]');
      const url = linkElement?.getAttribute("href");
      const id = url?.split("/status/")?.[1] || "";
      console.log(`- Tweet ID: ${id || "not found"}`);

      // Check if it's a reply
      const replyElement = tweet.querySelector(
        '[data-testid="tweet-reply-context"]'
      );
      if (replyElement) {
        const replyToAuthor = extractAuthorInfo(replyElement);
        const replyToContent =
          replyElement.querySelector('[data-testid="tweetText"]')
            ?.textContent || "";

        posts.push({
          type: "reply",
          id,
          content: contentElement.textContent || "",
          timestamp,
          author,
          likesCount,
          retweetsCount,
          repliesCount,
          url: url ? `https://twitter.com${url}` : undefined,
          replyTo: {
            id: "",
            content: replyToContent,
            timestamp: "",
            author: replyToAuthor,
          },
        });
        return;
      }

      // Check if it's a repost
      const repostElement = tweet.querySelector(
        '[data-testid="tweet-repost-context"]'
      );
      if (repostElement) {
        const originalAuthor = extractAuthorInfo(repostElement);
        const quoteContent =
          tweet.querySelector('[data-testid="tweet-quoted"]')?.textContent ||
          "";
        const hasQuote = Boolean(quoteContent);
        const quoteComment = hasQuote
          ? contentElement.textContent || ""
          : undefined;

        posts.push({
          type: "repost",
          id,
          content: contentElement.textContent || "",
          timestamp,
          author,
          likesCount,
          retweetsCount,
          repliesCount,
          url: url ? `https://twitter.com${url}` : undefined,
          originalPost: {
            id: "",
            content: quoteContent,
            timestamp: "",
            author: originalAuthor,
          },
          hasQuote,
          quoteComment,
        });
        return;
      }

      // Normal tweet
      posts.push({
        type: "normal",
        id,
        content: contentElement.textContent || "",
        timestamp,
        author,
        likesCount,
        retweetsCount,
        repliesCount,
        url: url ? `https://twitter.com${url}` : undefined,
      });
      console.log(`Successfully processed tweet ${index + 1}`);
    });

    return posts;
  } catch (error) {
    console.error("Error extracting tweets from DOM:", error);
    return [];
  }
}

export async function extractTwitterPostsFromAi(
  html: string,
  settings: Settings
): Promise<TwitterPost[]> {
  try {
    console.log("Starting AI-based extraction...");
    const prompt = `You are a Twitter HTML parser. Given the HTML content of a Twitter profile page, extract all the tweets. For each tweet, identify if it's a normal tweet, reply, or repost. Include:
1. Tweet content and metadata (timestamp, likes, retweets, replies)
2. Author information (username, display name)
3. For replies: include the original tweet being replied to
4. For reposts: include the original tweet and whether it has a quote

Return the data as a JSON array of objects with this structure:
{
  "type": "normal" | "reply" | "repost",
  "id": "tweet id",
  "content": "tweet content",
  "timestamp": "ISO timestamp",
  "author": {
    "username": "username without @",
    "displayName": "display name",
    "profileUrl": "https://twitter.com/username"
  },
  "likesCount": number,
  "retweetsCount": number,
  "repliesCount": number,
  "url": "tweet URL",
  // For replies only:
  "replyTo": {
    "content": "original tweet content",
    "author": { same as above }
  },
  // For reposts only:
  "originalPost": {
    "content": "original tweet content",
    "author": { same as above }
  },
  "hasQuote": boolean,
  "quoteComment": string or null
}

HTML Content:
${html}`;

    console.log("Sending request to AI model...");
    const result = await callAiModel(prompt, settings);
    console.log("Received AI response, parsing JSON...");

    try {
      const parsedPosts = JSON.parse(result);
      if (Array.isArray(parsedPosts)) {
        console.log(
          `Successfully parsed ${parsedPosts.length} posts from AI response`
        );
        return parsedPosts;
      }
      console.error("AI returned invalid format:", result);
      return [];
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      return [];
    }
  } catch (error: unknown) {
    console.error("Error in AI extraction:", error);
    throw new Error(
      `Failed to extract tweets using AI: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export interface ExtractTwitterPostsOptions {
  enableAI?: boolean; // If true, will fallback to AI extraction when DOM extraction fails
}

export async function extractTwitterPosts(
  html: string,
  settings: Settings,
  options: ExtractTwitterPostsOptions = { enableAI: true }
): Promise<TwitterPost[]> {
  try {
    console.log("Starting tweet extraction process...");

    // First try DOM extraction
    const domPosts = extractTwitterPostsFromDom();
    console.log(`DOM extraction returned ${domPosts.length} posts`);

    if (domPosts.length > 0) {
      console.log("Using DOM extraction results");
      return domPosts;
    }

    // If DOM extraction failed and AI is enabled, try AI extraction
    if (options.enableAI) {
      console.log("DOM extraction failed, falling back to AI extraction...");
      return await extractTwitterPostsFromAi(html, settings);
    }

    console.log("DOM extraction failed and AI fallback is disabled");
    return [];
  } catch (error: unknown) {
    console.error("Error extracting tweets:", error);
    throw new Error(
      `Failed to extract tweets: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
