import {
  type TwitterComment,
  type TwitterPostDetail
} from "../../../types/twitter"
import {
  extractEngagementMetrics,
  extractHashtags,
  extractLinks,
  extractMediaContent,
  extractMentions,
  extractTextContent
} from "../extractors/content-extractors"
import { parseTwitterNumber } from "../utils/parsers"
import { scrollDown } from "./dom-utils"

/**
 * Extracts detailed information about a tweet including comments
 * @param postId The Twitter post ID to scrape details for
 * @param commentsCount Number of comments to retrieve (default: 10)
 * @returns Promise with TwitterPostDetail object
 */
export async function scrapeTwitterPostDetail(
  postId: string,
  commentsCount: number = 10
): Promise<TwitterPostDetail> {
  console.log(`Starting to scrape details for post: ${postId}`)

  try {
    // Get the main post data first
    const postElement = document.querySelector('article[data-testid="tweet"]')
    if (!postElement) {
      throw new Error("Main post element not found")
    }

    // Extract basic post information
    const postData = extractPostData(postElement)

    // Initialize the detail object with the base data
    const postDetail: TwitterPostDetail = {
      ...postData,
      comments: [],
      commentsFetched: false,
      commentCount: 0
    }

    // Extract detailed media information if present
    if (postData.media && postData.media.length > 0) {
      postDetail.detailedMedia = extractDetailedMedia(postElement)
    }

    // Now fetch comments
    const comments = await scrapeComments(postId, commentsCount)
    postDetail.comments = comments
    postDetail.commentsFetched = true
    postDetail.commentCount = comments.length

    // Try to get the total comment count from the UI
    const commentCountElement = postElement.querySelector(
      '[data-testid="reply"]'
    )
    if (commentCountElement) {
      const commentCountText = commentCountElement.textContent || ""
      const match = commentCountText.match(/(\d+[\d,.]*)/)?.[1]
      if (match) {
        postDetail.commentCount = parseTwitterNumber(match)
      }
    }

    return postDetail
  } catch (error) {
    console.error("Error scraping post detail:", error)
    throw new Error(`Failed to scrape post detail: ${error.message}`)
  }
}

/**
 * Extracts data from a post element
 * @param postElement The post DOM element
 * @returns TwitterPostData object
 */
function extractPostData(postElement: Element): TwitterPostDetail {
  // Extract post ID from URL
  const statusLinkElement = postElement.querySelector('a[href*="/status/"]')
  const statusLink = statusLinkElement?.getAttribute("href") || ""
  const statusMatch = statusLink.match(/status\/(\d+)/)
  const id = statusMatch ? statusMatch[1] : ""

  if (!id) {
    throw new Error("Could not extract post ID")
  }

  // Check if post is a retweet
  const isRetweet =
    !!postElement.querySelector('[data-testid="socialContext"]') ||
    postElement.textContent?.includes("reposted") ||
    postElement.textContent?.includes("You reposted")

  // Extract author information
  const userNameElement = postElement.querySelector('[data-testid="User-Name"]')
  const userNameLink = userNameElement?.querySelector('a[role="link"]')
  const authorProfileUrl = userNameLink?.getAttribute("href") || ""

  // Extract username from profile URL
  const authorUsername = authorProfileUrl.replace(/^\//, "").split("/")[0] || ""

  // Get author display name
  const nameElement = userNameElement?.querySelector("span")
  const authorDisplayName = nameElement?.textContent || ""

  // Author avatar
  const avatarElement =
    postElement.querySelector('img[data-testid="tweetPhoto"]') ||
    postElement.querySelector('img[src*="profile_images"]')
  const authorAvatar = avatarElement?.getAttribute("src") || ""

  // Is verified
  const isVerified = !!userNameElement?.querySelector(
    '[data-testid="icon-verified"]'
  )

  // Created time
  const timeElement = postElement.querySelector("time")
  const createdAt =
    timeElement?.getAttribute("datetime") || new Date().toISOString()

  // Extract post text content
  const tweetTextElement = postElement.querySelector(
    '[data-testid="tweetText"]'
  )
  const text = extractTextContent(tweetTextElement)

  // Try to get HTML content
  const html = tweetTextElement?.innerHTML || ""

  // Extract engagement metrics (likes, retweets, replies, views)
  const metrics = extractEngagementMetrics(postElement)

  // Extract media content (images, videos, GIFs)
  const media = extractMediaContent(postElement)

  // Extract links, hashtags, and mentions
  const links = extractLinks(tweetTextElement)
  const hashtags = extractHashtags(text)
  const mentionedUsers = extractMentions(text)

  // Reply information
  const replyContext = postElement.querySelector('[data-testid="reply"]')
  const isReply = !!replyContext

  let replyToId = ""
  let replyToUsername = ""

  if (isReply) {
    // Try to extract reply-to information
    const replyText = replyContext?.textContent || ""
    const replyToMatch = replyText.match(/Replying to @(\w+)/)
    replyToUsername = replyToMatch ? replyToMatch[1] : ""
  }

  // Thread indicators
  const isThreadPart =
    text.includes("🧵") ||
    text.match(/\d+\/\d+/) !== null ||
    text.includes("线程") ||
    text.includes("Thread")

  // Extract the indicator text if present (like "1/5")
  const threadMatch = text.match(/(\d+)\/(\d+)/)
  const threadIndicator = threadMatch
    ? threadMatch[0]
    : text.includes("🧵")
      ? "🧵"
      : text.includes("Thread")
        ? "Thread"
        : text.includes("线程")
          ? "线程"
          : ""

  // Get post URL
  const postUrl = `https://twitter.com/${authorUsername}/status/${id}`

  // Original post data for retweets
  let originalPost: Partial<TwitterPostDetail> | undefined

  if (isRetweet) {
    // For retweets, try to extract original post information
    originalPost = {
      authorUsername: "",
      authorDisplayName: "",
      text: ""
    }

    // Try to find the original post author
    const originalAuthorElement = postElement.querySelector(
      '[data-testid="socialContext"] span'
    )
    if (originalAuthorElement) {
      const originalAuthorText = originalAuthorElement.textContent || ""
      const originalAuthorMatch = originalAuthorText.match(/@(\w+)/)
      if (originalAuthorMatch) {
        originalPost.authorUsername = originalAuthorMatch[1]
      }
    }
  }

  // Create the post data object
  return {
    id,
    text,
    html,
    createdAt,
    authorUsername,
    authorDisplayName,
    authorProfileUrl: `https://twitter.com/${authorUsername}`,
    authorAvatar,
    isVerified,
    likeCount: metrics.likeCount,
    retweetCount: metrics.retweetCount,
    replyCount: metrics.replyCount,
    viewCount: metrics.viewCount,
    media,
    links,
    hashtags,
    mentionedUsers,
    isReply,
    replyToId,
    replyToUsername,
    isRetweet,
    isThreadPart,
    threadIndicator,
    originalPost: isRetweet ? originalPost : undefined,
    postUrl,
    // These will be populated later
    comments: [],
    commentsFetched: false,
    commentCount: 0
  }
}

/**
 * Extract detailed media information from a post
 * @param postElement The post DOM element
 * @returns Detailed media object
 */
function extractDetailedMedia(
  postElement: Element
): TwitterPostDetail["detailedMedia"] {
  const result = {
    images: [],
    videos: [],
    gifs: []
  }

  try {
    // Extract images with more details
    postElement
      .querySelectorAll('img[src*="twimg.com/media"]')
      .forEach((img: HTMLImageElement) => {
        if (
          img.src.includes("profile_images") ||
          img.alt === "Profile picture"
        ) {
          return // Skip profile pictures
        }

        // Get high quality image URL
        let highQualityUrl = img.src
        if (highQualityUrl.includes("pbs.twimg.com/media/")) {
          highQualityUrl = highQualityUrl.replace(
            /(\?format=|\?name=).*$/,
            "?format=jpg&name=orig"
          )
        }

        // Try to get dimensions from style or attributes
        const width = img.width || parseInt(img.style.width) || undefined
        const height = img.height || parseInt(img.style.height) || undefined

        result.images.push({
          url: highQualityUrl,
          altText: img.alt !== "Image" ? img.alt : undefined,
          width,
          height
        })
      })

    // Extract videos with more details
    postElement.querySelectorAll("video").forEach((video: HTMLVideoElement) => {
      const poster = video.poster
      const width = video.width || parseInt(video.style.width) || undefined
      const height = video.height || parseInt(video.style.height) || undefined

      // Try to get duration
      const duration = video.duration
        ? `${Math.floor(video.duration / 60)}:${Math.floor(video.duration % 60)
            .toString()
            .padStart(2, "0")}`
        : undefined

      // Get source URL
      let url = video.src
      if (!url) {
        const source = video.querySelector("source")
        if (source) {
          url = source.src
        }
      }

      if (url) {
        // Check if it's a GIF (Twitter shows GIFs as videos)
        const isGif =
          postElement.querySelector('[data-testid="placeholderGif"]') !==
            null ||
          video.classList.contains("GifPlayer") ||
          (video.parentElement &&
            video.parentElement.classList.contains("GifPlayer"))

        if (isGif) {
          result.gifs.push({
            url,
            thumbnailUrl: poster,
            width,
            height
          })
        } else {
          result.videos.push({
            url,
            thumbnailUrl: poster,
            duration,
            width,
            height
          })
        }
      }
    })

    return result
  } catch (error) {
    console.error("Error extracting detailed media:", error)
    return result
  }
}

/**
 * Scrapes comments from a Twitter post
 * @param postId The post ID to scrape comments for
 * @param count Maximum number of comments to retrieve
 * @returns Array of TwitterComment objects
 */
async function scrapeComments(
  postId: string,
  count: number = 10
): Promise<TwitterComment[]> {
  console.log(`Scraping comments for post ${postId}. Target count: ${count}`)
  const comments: TwitterComment[] = []
  const processedIds = new Set<string>()

  // Find the comments section
  const commentsContainer = document.querySelector(
    '[aria-label="Timeline: Conversation"]'
  )
  if (!commentsContainer) {
    console.warn("Comments container not found")
    return comments
  }

  // If count is -1 or less, we scrape all available comments
  const scrapeAllComments = count <= 0
  const maxAttempts = scrapeAllComments ? 30 : Math.ceil(count / 5)
  let consecutiveNoNewComments = 0
  const MAX_CONSECUTIVE_NO_NEW = 3 // Stop if no new comments after 3 attempts

  // Implementation of incremental loading with scrolling
  for (let i = 0; i < maxAttempts; i++) {
    console.log(
      `Comment scraping iteration ${i + 1}, current comments: ${comments.length}`
    )

    const previousCommentCount = comments.length

    // Find all comment elements
    const commentElements = commentsContainer.querySelectorAll(
      'article[data-testid="tweet"]'
    )

    // Process new comments
    commentElements.forEach((element) => {
      try {
        // Extract comment ID
        const statusLinkElement = element.querySelector('a[href*="/status/"]')
        const statusLink = statusLinkElement?.getAttribute("href") || ""
        const statusMatch = statusLink.match(/status\/(\d+)/)
        const id = statusMatch ? statusMatch[1] : ""

        // Skip if no ID or already processed
        if (!id || processedIds.has(id) || id === postId) {
          return
        }

        // Mark as processed
        processedIds.add(id)

        // Skip if we have enough comments and not scraping all
        if (!scrapeAllComments && comments.length >= count) {
          return
        }

        // Extract author information
        const userNameElement = element.querySelector(
          '[data-testid="User-Name"]'
        )
        const userNameLink = userNameElement?.querySelector('a[role="link"]')
        const authorProfileUrl = userNameLink?.getAttribute("href") || ""
        const authorUsername =
          authorProfileUrl.replace(/^\//, "").split("/")[0] || ""
        const nameElement = userNameElement?.querySelector("span")
        const authorDisplayName = nameElement?.textContent || ""

        // Author avatar
        const avatarElement = element.querySelector(
          'img[src*="profile_images"]'
        )
        const authorAvatar = avatarElement?.getAttribute("src") || ""

        // Is verified
        const isVerified = !!userNameElement?.querySelector(
          '[data-testid="icon-verified"]'
        )

        // Created time
        const timeElement = element.querySelector("time")
        const createdAt =
          timeElement?.getAttribute("datetime") || new Date().toISOString()

        // Extract text content
        const tweetTextElement = element.querySelector(
          '[data-testid="tweetText"]'
        )
        const text = extractTextContent(tweetTextElement)
        const html = tweetTextElement?.innerHTML || ""

        // Extract engagement metrics
        const metrics = extractEngagementMetrics(element)

        // Extract media
        const media = extractMediaContent(element)

        // Is this a reply to another comment?
        const isReply = !!element.querySelector('[data-testid="reply"]')
        let replyToId = ""

        if (isReply) {
          // Try to find which comment this is replying to
          const replyContext = element.querySelector('[data-testid="reply"]')
          const replyLink = replyContext?.querySelector('a[href*="/status/"]')
          const replyUrl = replyLink?.getAttribute("href") || ""
          const replyMatch = replyUrl.match(/status\/(\d+)/)
          replyToId = replyMatch ? replyMatch[1] : postId // Default to main post if not found
        } else {
          // If not explicitly a reply to another comment, it's a reply to the main post
          replyToId = postId
        }

        // Add to comments array
        comments.push({
          id,
          text,
          html,
          createdAt,
          authorUsername,
          authorDisplayName,
          authorProfileUrl: `https://twitter.com/${authorUsername}`,
          authorAvatar,
          isVerified,
          likeCount: metrics.likeCount,
          retweetCount: metrics.retweetCount,
          replyCount: metrics.replyCount,
          viewCount: metrics.viewCount,
          media,
          isReply,
          replyToId,
          postUrl: `https://twitter.com/${authorUsername}/status/${id}`
        })
      } catch (error) {
        console.error("Error extracting comment:", error)
      }
    })

    // Check if we found any new comments in this iteration
    if (comments.length === previousCommentCount) {
      consecutiveNoNewComments++
      console.log(
        `No new comments found in iteration ${i + 1}. Consecutive: ${consecutiveNoNewComments}`
      )

      // If we haven't found any new comments for consecutive iterations, we may have reached the end
      if (consecutiveNoNewComments >= MAX_CONSECUTIVE_NO_NEW) {
        console.log(
          "Reached maximum consecutive iterations with no new comments, stopping"
        )
        break
      }
    } else {
      // Reset counter when we find new comments
      consecutiveNoNewComments = 0
    }

    // If we're not scraping all comments and have enough, or this is the last iteration, break
    if (!scrapeAllComments && comments.length >= count) {
      console.log(`Reached target comment count ${count}, stopping`)
      break
    }

    // Scroll down to load more comments
    await new Promise<void>((resolve) => {
      scrollDown(2) // Scroll down twice for more content
      setTimeout(() => resolve(), 2500) // Wait longer for content to load
    })
  }

  console.log(`Scraped ${comments.length} comments for post ${postId}`)
  return comments
}

/**
 * Opens a Twitter post detail page and scrapes its information
 * @param postId The Twitter post ID to scrape
 * @param commentsCount Number of comments to retrieve
 * @returns Promise with TwitterPostDetail object
 */
export async function openAndScrapeTwitterPostDetail(
  postId: string,
  commentsCount: number = 10
): Promise<TwitterPostDetail> {
  console.log(`Opening Twitter post detail page for ID: ${postId}`)

  // Determine the URL for the post detail page
  // If we're already on the detail page, no need to navigate
  const currentUrl = window.location.href
  const isAlreadyOnDetailPage = currentUrl.includes(`/status/${postId}`)

  if (!isAlreadyOnDetailPage) {
    // We need to construct a URL. There are two ways:
    // 1. If we know the username, we can use the canonical URL
    // 2. If not, we can use the i/status/ID format which redirects to the canonical URL
    window.location.href = `https://twitter.com/i/status/${postId}`

    // Wait for the page to load
    await new Promise<void>((resolve) => {
      // Check if the page is loaded every 100ms
      const checkLoaded = () => {
        if (document.querySelector('article[data-testid="tweet"]')) {
          resolve()
        } else {
          setTimeout(checkLoaded, 100)
        }
      }

      setTimeout(checkLoaded, 1000) // Start checking after 1 second
    })
  }

  // Now that we're on the detail page, scrape the data
  return await scrapeTwitterPostDetail(postId, commentsCount)
}
