import { type TwitterPostMedia } from "../../../types/twitter"
import { parseTwitterNumber } from "../utils/parsers"

/**
 * Extracts clean text content from a DOM element
 * Preserves newlines and spacing
 * @param element The DOM element to extract text from
 * @returns Extracted text content
 */
export function extractTextContent(element: Element | null): string {
  if (!element) return ""

  let result = ""

  // Track if we're inside a link or some other element we want to handle specially
  const processNode = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      // Text node - add its content
      result += node.textContent
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      const tagName = el.tagName.toLowerCase()

      if (tagName === "br") {
        // Add a newline for BR tags
        result += "\n"
      } else if (tagName === "a") {
        // For links, we may want to handle them specially
        const href = el.getAttribute("href")

        if (href && href.includes("/hashtag/")) {
          // It's a hashtag - preserve the # symbol
          result += el.textContent
        } else if (href && href.includes("/search?q=%24")) {
          // It's a cashtag - preserve the $ symbol
          result += el.textContent
        } else if (el.querySelector("img[alt]")) {
          // It might be an emoji - try to get the alt text
          const img = el.querySelector("img[alt]")
          result += img
            ? img.getAttribute("alt") || el.textContent
            : el.textContent
        } else {
          // Regular link - just get the text
          result += el.textContent
        }
      } else if (tagName === "img") {
        // Handle emojis and other images
        const alt = el.getAttribute("alt")
        if (alt) {
          result += alt
        }
      } else if (
        tagName === "span" &&
        el.getAttribute("aria-hidden") === "true"
      ) {
        // Skip hidden spans that might contain invisible content
        return
      } else {
        // For other elements, process their children
        el.childNodes.forEach(processNode)

        // Add appropriate spacing after certain block elements
        if (["p", "div"].includes(tagName) && !result.endsWith("\n")) {
          result += "\n"
        }
      }
    }
  }

  // Process all child nodes
  element.childNodes.forEach(processNode)

  // Clean up the result
  return result
    .replace(/\n{3,}/g, "\n\n") // Replace more than 2 consecutive newlines with just 2
    .trim()
}

/**
 * Extracts engagement metrics (likes, retweets, replies, views) from a post
 * @param post The post DOM element
 * @returns Object with engagement metrics
 */
export function extractEngagementMetrics(post: Element): {
  likeCount: number
  retweetCount: number
  replyCount: number
  viewCount?: number
} {
  try {
    let likeCount = 0
    let retweetCount = 0
    let replyCount = 0
    let viewCount: number | undefined = undefined

    // Most reliable approach: look for the engagement group
    const engagementGroup = post.querySelector('[role="group"]')

    if (engagementGroup) {
      // Find all interactive elements in the group
      const buttons = engagementGroup.querySelectorAll('div[role="button"]')
      buttons.forEach((button) => {
        const ariaLabel = button.getAttribute("aria-label") || ""
        const textContent = button.textContent || ""

        if (
          ariaLabel.includes("likes") ||
          ariaLabel.includes("Likes") ||
          ariaLabel.includes("liked") ||
          ariaLabel.includes("Like") ||
          textContent.includes("Like")
        ) {
          const match =
            ariaLabel.match(/(\d+[\d,.]*).*likes/i) ||
            textContent.match(/^(\d+[\d,.]*)[KkMm]?$/)

          if (match && match[1]) {
            likeCount = parseTwitterNumber(match[1])
          }
        } else if (
          ariaLabel.includes("repost") ||
          ariaLabel.includes("Repost") ||
          ariaLabel.includes("retweet") ||
          ariaLabel.includes("Retweet") ||
          textContent.includes("Repost")
        ) {
          const match =
            ariaLabel.match(/(\d+[\d,.]*).*reposts/i) ||
            ariaLabel.match(/(\d+[\d,.]*).*retweets/i) ||
            textContent.match(/^(\d+[\d,.]*)[KkMm]?$/)

          if (match && match[1]) {
            retweetCount = parseTwitterNumber(match[1])
          }
        } else if (
          ariaLabel.includes("replies") ||
          ariaLabel.includes("reply") ||
          ariaLabel.includes("Reply") ||
          textContent.includes("Reply")
        ) {
          const match =
            ariaLabel.match(/(\d+[\d,.]*).*replies/i) ||
            textContent.match(/^(\d+[\d,.]*)[KkMm]?$/)

          if (match && match[1]) {
            replyCount = parseTwitterNumber(match[1])
          }
        } else if (
          ariaLabel.includes("views") ||
          ariaLabel.includes("Views") ||
          ariaLabel.includes("impressions") ||
          textContent.includes("View")
        ) {
          const match =
            ariaLabel.match(/(\d+[\d,.]*).*views/i) ||
            ariaLabel.match(/(\d+[\d,.]*).*impressions/i) ||
            textContent.match(/^(\d+[\d,.]*)[KkMm]?$/)

          if (match && match[1]) {
            viewCount = parseTwitterNumber(match[1])
            console.log(
              `Extracted view count: ${viewCount} from "${ariaLabel || textContent}"`
            )
          }
        }
      })
    }

    // If we're missing counts, try the alternative approach
    if (likeCount === 0 && retweetCount === 0 && replyCount === 0) {
      // Look for explicit counters by their test IDs
      const replyButton = post.querySelector('[data-testid="reply"]')
      const retweetButton = post.querySelector('[data-testid="retweet"]')
      const likeButton = post.querySelector('[data-testid="like"]')

      if (replyButton) {
        const text = replyButton.textContent || ""
        const match = text.match(/^(\d+[\d,.]*)[KkMm]?/)
        if (match) {
          replyCount = parseTwitterNumber(match[1])
        }
      }

      if (retweetButton) {
        const text = retweetButton.textContent || ""
        const match = text.match(/^(\d+[\d,.]*)[KkMm]?/)
        if (match) {
          retweetCount = parseTwitterNumber(match[1])
        }
      }

      if (likeButton) {
        const text = likeButton.textContent || ""
        const match = text.match(/^(\d+[\d,.]*)[KkMm]?/)
        if (match) {
          likeCount = parseTwitterNumber(match[1])
        }
      }
    }

    // Additional search for view counts, which often appear in a separate area
    if (viewCount === undefined) {
      // First look for analytics container
      const analyticsSpans = post.querySelectorAll('[data-testid="analytics"]')
      analyticsSpans.forEach((span) => {
        if (viewCount === undefined) {
          const text = span.textContent || ""
          if (text.includes("Views") || text.includes("views")) {
            const match = text.match(/^(\d+[\d,.]*)[KkMm]?/)
            if (match) {
              viewCount = parseTwitterNumber(match[1])
              console.log(`Found view count in analytics: ${viewCount}`)
            }
          }
        }
      })

      // Look for view counts in any text that mentions views
      if (viewCount === undefined) {
        const allSpans = post.querySelectorAll("span")
        for (const span of allSpans) {
          const text = span.textContent || ""

          // Check if this span contains view counts
          if (
            text.includes("view") ||
            text.includes("View") ||
            text.includes("impression") ||
            text.includes("Impression") ||
            text.match(/^[\d,.]+[KkMm]?$/)
          ) {
            // Check if the next sibling mentions "views"
            const nextSibling = span.nextElementSibling
            if (
              nextSibling &&
              (nextSibling.textContent?.includes("view") ||
                nextSibling.textContent?.includes("View"))
            ) {
              viewCount = parseTwitterNumber(text)
              console.log(
                `Found view count with sibling indicator: ${viewCount}`
              )
              break
            }

            // Or check if the parent contains "views"
            const parentText = span.parentElement?.textContent || ""
            if (
              parentText.includes("view") ||
              parentText.includes("View") ||
              parentText.includes("impression") ||
              parentText.includes("Impression")
            ) {
              // Make sure this is actually a number
              const match = text.match(/^([\d,.]+[KkMm]?)$/)
              if (match) {
                viewCount = parseTwitterNumber(match[1])
                console.log(
                  `Found view count from parent context: ${viewCount}`
                )
                break
              }
            }
          }
        }
      }
    }

    return {
      likeCount,
      retweetCount,
      replyCount,
      viewCount
    }
  } catch (error) {
    console.error("Error extracting engagement metrics:", error)
    return {
      likeCount: 0,
      retweetCount: 0,
      replyCount: 0
    }
  }
}

/**
 * Extracts media content (images, videos, GIFs) from a post
 * @param post The post DOM element
 * @returns Array of TwitterPostMedia objects
 */
export function extractMediaContent(post: Element): TwitterPostMedia[] {
  try {
    const media: TwitterPostMedia[] = []
    const processedUrls = new Set<string>()

    // Find all media containers
    const possibleMediaContainers = [
      post.querySelectorAll('[data-testid="tweetPhoto"]'),
      post.querySelectorAll('[data-testid="tweetMedia"]'),
      post.querySelectorAll('[data-testid="videoPlayer"]'),
      post.querySelectorAll('a[href*="/photo/"]'),
      post.querySelectorAll('a[href*="/video/"]'),
      post.querySelectorAll('div[data-testid="card.wrapper"]')
    ]

    // Process each container type
    possibleMediaContainers.forEach((containers) => {
      containers.forEach((container) => {
        // Check for images
        const images = container.querySelectorAll("img")
        images.forEach((img) => {
          const url = img.getAttribute("src") || ""
          const altText = img.getAttribute("alt") || ""

          // Skip profile images and other non-media images
          if (
            !url ||
            url.includes("profile_images") ||
            url.includes("emoji") ||
            processedUrls.has(url) ||
            url.includes("video_thumb") || // Skip video thumbs for now
            altText === "Profile picture"
          ) {
            return
          }

          // Extract the highest quality version of the image
          let highQualityUrl = url

          // For Twitter images, try to get the original format
          if (url.includes("pbs.twimg.com/media/")) {
            // Replace format and size parameters
            highQualityUrl = url.replace(
              /(\?format=|\?name=).*$/,
              "?format=jpg&name=orig"
            )
          }

          processedUrls.add(url)
          media.push({
            type: "image",
            url: highQualityUrl,
            altText: altText !== "Image" ? altText : undefined
          })
        })

        // Check for videos
        const videos = container.querySelectorAll("video")
        videos.forEach((video) => {
          let url = video.getAttribute("src") || ""
          const poster = video.getAttribute("poster") || ""

          // If no direct URL, check sources
          if (!url) {
            const source = video.querySelector("source")
            if (source) {
              url = source.getAttribute("src") || ""
            }
          }

          if (url && !processedUrls.has(url)) {
            processedUrls.add(url)
            media.push({
              type: "video",
              url,
              thumbnailUrl: poster
            })
          }
        })
      })
    })

    // Check for GIF
    const gifElement = post.querySelector('[data-testid="placeholderGif"]')
    if (gifElement) {
      const gifImg = gifElement.querySelector("img")
      const url = gifImg?.getAttribute("src") || ""

      if (url && !processedUrls.has(url)) {
        processedUrls.add(url)
        media.push({
          type: "gif",
          url
        })
      }
    }

    // Last resort - if no media found yet, try more generic approaches
    if (media.length === 0) {
      // Look for any media links
      const mediaLinks = post.querySelectorAll(
        'a[href*="/photo/"], a[href*="/video/"]'
      )
      mediaLinks.forEach((link) => {
        const href = link.getAttribute("href") || ""
        const img = link.querySelector("img")
        const url = img?.getAttribute("src") || ""

        if (url && !processedUrls.has(url) && !url.includes("profile_images")) {
          processedUrls.add(url)
          media.push({
            type: href.includes("/video/") ? "video" : "image",
            url
          })
        }
      })

      // Look for video thumbnails
      const thumbs = post.querySelectorAll(
        'img[src*="video_thumb"], img[src*="ext_tw_video_thumb"]'
      )
      thumbs.forEach((thumb) => {
        const url = thumb.getAttribute("src") || ""
        if (url && !processedUrls.has(url)) {
          processedUrls.add(url)
          media.push({
            type: "video",
            url: "#", // Thumbnail only, can't get direct video URL
            thumbnailUrl: url
          })
        }
      })
    }

    console.log(`Extracted ${media.length} media items from tweet`)
    return media
  } catch (error) {
    console.error("Error extracting media content:", error)
    return []
  }
}

/**
 * Extracts links from a post
 * @param element Post text DOM element
 * @returns Array of links
 */
export function extractLinks(element: Element | null): string[] {
  if (!element) return []

  const links: string[] = []
  const linkElements = element.querySelectorAll("a")

  linkElements.forEach((link) => {
    const href = link.getAttribute("href")
    if (
      href &&
      !href.includes("/hashtag/") &&
      !href.includes("/search?q=") &&
      !href.includes("/status/")
    ) {
      // Extract actual URL for t.co links
      const expandedUrl = link.getAttribute("title") || href
      links.push(expandedUrl)
    }
  })

  return links
}

/**
 * Extracts hashtags from text
 * @param text Post text content
 * @returns Array of hashtags
 */
export function extractHashtags(text: string): string[] {
  const hashtags: string[] = []
  const hashtagRegex = /#(\w+)/g
  let match

  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push(match[1])
  }

  return hashtags
}

/**
 * Extracts mentions from text
 * @param text Post text content
 * @returns Array of mentioned usernames
 */
export function extractMentions(text: string): string[] {
  const mentions: string[] = []
  const mentionRegex = /@(\w+)/g
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1])
  }

  return mentions
}
