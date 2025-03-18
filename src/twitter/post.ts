import { Settings } from "../types";
import { callAiModel } from "../services/ai";
import {
  TwitterReply,
  NormalTwitterPost,
  TwitterReplyPost,
  TwitterRepost,
} from "../types/twitter";
import { extractAuthorInfo } from "./common";

export function isTwitterPostUrl(url: string): boolean {
  // Match twitter.com/username/status/id or x.com/username/status/id
  // Also allow www subdomain
  return /^https?:\/\/((?:www\.)?twitter\.com|(?:www\.)?x\.com)\/[^/]+\/status\/\d+$/.test(
    url
  );
}

export function extractTwitterPostFromDom():
  | NormalTwitterPost
  | TwitterReplyPost
  | TwitterRepost
  | null {
  try {
    console.log("Starting single post DOM extraction...");

    // Find the main tweet article
    const tweetElement = document.querySelector('article[data-testid="tweet"]');
    if (!tweetElement) {
      console.log("No tweet element found");
      return null;
    }

    // Extract common elements
    const contentElement = tweetElement.querySelector(
      '[data-testid="tweetText"]'
    );
    const content = contentElement?.textContent || "";
    console.log(`Found content: "${content.slice(0, 50)}..."`);

    const author = extractAuthorInfo(tweetElement);
    console.log(`Author: ${author.displayName} (@${author.username})`);

    const timeElement = tweetElement.querySelector("time");
    const timestamp = timeElement?.getAttribute("datetime") || "";
    console.log(`Timestamp: ${timestamp || "not found"}`);

    const statsContainer = tweetElement.querySelector('[role="group"]');
    const stats =
      statsContainer?.querySelectorAll('[data-testid$="count"]') || [];
    const [repliesCount, retweetsCount, likesCount] = Array.from(stats).map(
      (stat) => parseInt(stat?.textContent || "0", 10)
    );
    console.log(
      `Stats: ${repliesCount} replies, ${retweetsCount} retweets, ${likesCount} likes`
    );

    const url = window.location.href;
    const id = url.split("/status/")?.[1]?.split("?")?.[0] || "";

    // Check if it's a reply
    const replyElement = tweetElement.querySelector(
      '[data-testid="tweet-reply-context"]'
    );
    if (replyElement) {
      console.log("Tweet is a reply");
      const replyToAuthor = extractAuthorInfo(replyElement);
      const replyToContent =
        replyElement.querySelector('[data-testid="tweetText"]')?.textContent ||
        "";
      const replyToTime =
        replyElement.querySelector("time")?.getAttribute("datetime") || "";

      return {
        type: "reply",
        id,
        content,
        timestamp,
        author,
        likesCount,
        retweetsCount,
        repliesCount,
        url,
        replyTo: {
          id: "",
          content: replyToContent,
          timestamp: replyToTime,
          author: replyToAuthor,
        },
      };
    }

    // Check if it's a repost/quote
    const repostElement = tweetElement.querySelector(
      '[data-testid="tweet-repost-context"]'
    );
    if (repostElement) {
      console.log("Tweet is a repost/quote");
      const originalAuthor = extractAuthorInfo(repostElement);
      const quoteContent =
        tweetElement.querySelector('[data-testid="tweet-quoted"]')
          ?.textContent || "";
      const quoteTime =
        repostElement.querySelector("time")?.getAttribute("datetime") || "";
      const hasQuote = Boolean(quoteContent);
      const quoteComment = hasQuote ? content : undefined;

      return {
        type: "repost",
        id,
        content,
        timestamp,
        author,
        likesCount,
        retweetsCount,
        repliesCount,
        url,
        originalPost: {
          id: "",
          content: quoteContent,
          timestamp: quoteTime,
          author: originalAuthor,
        },
        hasQuote,
        quoteComment,
      };
    }

    // Normal post - extract replies
    console.log("Tweet is a normal post");
    const replies: TwitterReply[] = [];
    const replyElements = document.querySelectorAll(
      'article[data-testid="tweet"][tabindex="-1"]'
    );
    replyElements.forEach((reply, index) => {
      const replyContent =
        reply.querySelector('[data-testid="tweetText"]')?.textContent || "";
      const replyAuthor = extractAuthorInfo(reply);
      const replyTime =
        reply.querySelector("time")?.getAttribute("datetime") || "";

      replies.push({
        content: replyContent,
        timestamp: replyTime,
        author: replyAuthor,
      });
      console.log(
        `Extracted reply ${index + 1} from ${replyAuthor.displayName}`
      );
    });

    return {
      type: "normal",
      id,
      content,
      timestamp,
      author,
      likesCount,
      retweetsCount,
      repliesCount,
      url,
      replies: replies.length > 0 ? replies : undefined,
    };
  } catch (error) {
    console.error("Error extracting tweet from DOM:", error);
    return null;
  }
}

export async function extractTwitterPostFromAi(
  html: string,
  settings: Settings
): Promise<NormalTwitterPost | TwitterReplyPost | TwitterRepost | null> {
  try {
    console.log("Starting AI-based single post extraction...");
    const prompt = `You are a Twitter HTML parser. Given the HTML content of a single Twitter post page, extract the main tweet. Identify if it's a normal post, reply, or repost/quote. Include:

For normal posts:
- Tweet content and metadata (timestamp, likes, retweets, replies)
- Author information (username, display name)
- Any replies to the tweet

For replies:
- The reply content and metadata
- The original tweet being replied to
- Author information for both

For reposts/quotes:
- The repost content (if it's a quote) and metadata
- The original tweet being reposted
- Author information for both

Return the data as a JSON object with this structure for each type:

Normal post:
{
  "type": "normal",
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
  "replies": [
    {
      "content": "reply content",
      "timestamp": "ISO timestamp",
      "author": { same as above }
    }
  ]
}

Reply:
{
  "type": "reply",
  "id": "tweet id",
  ... same fields as normal ...,
  "replyTo": {
    "id": "original tweet id",
    "content": "original tweet content",
    "timestamp": "ISO timestamp",
    "author": { same as above }
  }
}

Repost:
{
  "type": "repost",
  "id": "tweet id",
  ... same fields as normal ...,
  "originalPost": {
    "id": "original tweet id",
    "content": "original tweet content",
    "timestamp": "ISO timestamp",
    "author": { same as above }
  },
  "hasQuote": boolean,
  "quoteComment": "quote text if hasQuote is true"
}

HTML Content:
${html}`;

    console.log("Sending request to AI model...");
    const result = await callAiModel(prompt, settings);
    console.log("Received AI response, parsing JSON...");

    try {
      const parsedPost = JSON.parse(result);
      if (parsedPost && typeof parsedPost === "object" && parsedPost.type) {
        console.log(
          `Successfully parsed ${parsedPost.type} tweet from AI response`
        );
        return parsedPost;
      }
      console.error("AI returned invalid format:", result);
      return null;
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      return null;
    }
  } catch (error: unknown) {
    console.error("Error in AI extraction:", error);
    throw new Error(
      `Failed to extract tweet using AI: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export interface ExtractTwitterPostOptions {
  enableAI?: boolean; // If true, will fallback to AI extraction when DOM extraction fails
}

export async function extractTwitterPost(
  html: string,
  settings: Settings,
  options: ExtractTwitterPostOptions = { enableAI: true }
): Promise<NormalTwitterPost | TwitterReplyPost | TwitterRepost | null> {
  try {
    console.log("Starting tweet extraction process...");

    // First try DOM extraction
    const domPost = extractTwitterPostFromDom();
    if (domPost) {
      console.log("Using DOM extraction result");
      return domPost;
    }

    // If DOM extraction failed and AI is enabled, try AI extraction
    if (options.enableAI) {
      console.log("DOM extraction failed, falling back to AI extraction...");
      return await extractTwitterPostFromAi(html, settings);
    }

    console.log("DOM extraction failed and AI fallback is disabled");
    return null;
  } catch (error: unknown) {
    console.error("Error extracting tweet:", error);
    throw new Error(
      `Failed to extract tweet: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export function convertTwitterPostToMarkdown(
  post: NormalTwitterPost | TwitterReplyPost | TwitterRepost
): string {
  console.log("Converting post to markdown format");

  let markdown = `## Tweet by [${post.author.displayName}](${
    post.author.profileUrl
  }) ${post.url ? `[🔗](${post.url})` : ""}\n`;
  markdown += `${post.content}\n\n`;

  // Add metadata if available
  const stats: string[] = [];
  if (post.likesCount) stats.push(`❤️ ${post.likesCount}`);
  if (post.retweetsCount) stats.push(`🔄 ${post.retweetsCount}`);
  if (post.repliesCount) stats.push(`💬 ${post.repliesCount}`);

  if (stats.length > 0) {
    markdown += `*${stats.join(" · ")}*\n`;
  }

  if (post.timestamp) {
    const date = new Date(post.timestamp);
    markdown += `*Posted on ${date.toLocaleDateString()}*\n`;
  }

  // Add replies if available
  if (post.replies && post.replies.length > 0) {
    markdown += "\n### Replies\n";
    post.replies.forEach((reply) => {
      markdown += `\n**[${reply.author.displayName}](${reply.author.profileUrl})**\n`;
      markdown += `${reply.content}\n`;
      if (reply.timestamp) {
        const replyDate = new Date(reply.timestamp);
        markdown += `*Posted on ${replyDate.toLocaleDateString()}*\n`;
      }
      markdown += "---\n";
    });
  }

  // Add replyTo or originalPost if available
  if (post.type === "reply") {
    markdown += "\n### Original Tweet\n";
    markdown += `**[${post.replyTo.author.displayName}](${post.replyTo.author.profileUrl})**\n`;
    markdown += `${post.replyTo.content}\n`;
    if (post.replyTo.timestamp) {
      const replyToDate = new Date(post.replyTo.timestamp);
      markdown += `*Posted on ${replyToDate.toLocaleDateString()}*\n`;
    }
  } else if (post.type === "repost") {
    markdown += "\n### Original Tweet\n";
    markdown += `**[${post.originalPost.author.displayName}](${post.originalPost.author.profileUrl})**\n`;
    markdown += `${post.originalPost.content}\n`;
    if (post.originalPost.timestamp) {
      const originalPostDate = new Date(post.originalPost.timestamp);
      markdown += `*Posted on ${originalPostDate.toLocaleDateString()}*\n`;
    }
    if (post.hasQuote) {
      markdown += "\n### Quote Comment\n";
      markdown += `${post.quoteComment}\n`;
    }
  }

  console.log("Markdown conversion complete");
  return markdown;
}
