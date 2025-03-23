/**
 * DOM Utility Functions
 * Contains functions for DOM manipulation and scraping
 */

import type { Post } from "../types/sidebar"

/**
 * Create sidebar container in the DOM
 * @returns DOM container element
 */
export function createSidebarContainer(): HTMLDivElement {
  // First, remove any existing sidebar to avoid duplicates
  const existingContainer = document.getElementById("twitter-analysis-sidebar")
  if (existingContainer) {
    existingContainer.remove()
  }

  // Create a new container with specific positioning to stay on the right side
  const container = document.createElement("div")
  container.id = "twitter-analysis-sidebar"
  container.className = "twitter-analysis-sidebar"
  container.style.position = "fixed"
  container.style.right = "0"
  container.style.top = "0"
  container.style.zIndex = "9999"
  container.style.height = "100vh"
  container.style.maxWidth = "380px"
  container.style.width = "var(--sidebar-width, 380px)"
  container.style.boxShadow = "var(--shadow-lg, -5px 0 15px rgba(0, 0, 0, 0.1))"
  container.style.backgroundColor = "var(--surface-color, #ffffff)"
  document.body.appendChild(container)
  return container
}

/**
 * Extract tweet text with formatting
 * @param article Article element containing the tweet
 * @returns Extracted tweet text
 */
export function extractTweetText(article: Element): string {
  try {
    // 1. First try standard tweetText element
    const tweetTextElement = article.querySelector('[data-testid="tweetText"]')
    if (tweetTextElement) {
      return extractTextWithFormatting(tweetTextElement)
    }

    // 2. For nested tweets or quoted tweets, look for text in tweet body
    const quotedTweetTexts = article.querySelectorAll(
      'div[lang="en"], div[dir="auto"]'
    )
    if (quotedTweetTexts && quotedTweetTexts.length > 0) {
      let fullText = ""
      quotedTweetTexts.forEach((textDiv) => {
        // Skip UI elements and hidden content
        if (
          textDiv.getAttribute("aria-hidden") !== "true" &&
          !textDiv.closest('div[role="button"]') &&
          !textDiv.closest('a[role="link"]') &&
          !textDiv.closest('div[role="group"]') && // engagement data area
          textDiv.textContent?.trim()
        ) {
          const extractedText = extractTextWithFormatting(textDiv).trim()
          if (extractedText && !fullText.includes(extractedText)) {
            fullText += extractedText + " "
          }
        }
      })

      if (fullText.trim()) {
        return fullText.trim()
      }
    }

    // 3. If still not found, try all visible dir="auto" elements
    const allTextElements = article.querySelectorAll(
      '[dir="auto"]:not([aria-hidden="true"])'
    )
    if (allTextElements && allTextElements.length > 0) {
      let combinedText = ""
      allTextElements.forEach((element) => {
        // Check if it's tweet text and not UI elements
        if (
          element.textContent?.trim() &&
          !element.closest('div[role="button"]') &&
          !element.closest('a[role="link"]') &&
          !element.closest('div[role="group"]')
        ) {
          const text = element.textContent.trim()
          if (!combinedText.includes(text)) {
            combinedText += text + " "
          }
        }
      })
      return combinedText.trim()
    }

    return ""
  } catch (error) {
    console.error("Error extracting tweet text:", error)
    return ""
  }
}

/**
 * Recursively extract text, preserving formatting
 * @param element Element to extract text from
 * @returns Formatted text
 */
export function extractTextWithFormatting(element: Element): string {
  let text = ""

  try {
    // Recursive function to process nodes
    const processNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || ""
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element

        // Special handling for emoji images
        if (element.nodeName === "IMG") {
          const alt = element.getAttribute("alt")
          return alt || ""
        }

        // Special handling for links (hashtags, mentions, URLs)
        if (element.nodeName === "A") {
          const href = element.getAttribute("href") || ""
          const linkText = element.textContent || ""

          if (href.includes("/hashtag/")) {
            // This is a hashtag
            return linkText
          } else if (href.match(/\/[A-Za-z0-9_]+$/)) {
            // This is a mention
            return linkText
          } else if (href.includes("/search?q=")) {
            // This is a searchable term (like $HONEY)
            return linkText
          } else {
            // This is a URL
            return linkText
          }
        }

        // For other elements, process all child nodes
        let childText = ""
        element.childNodes.forEach((child) => {
          childText += processNode(child)
        })

        // For block-level elements, add appropriate spacing
        if (window.getComputedStyle(element).display === "block") {
          if (!childText.endsWith(" ")) {
            childText += " "
          }
        }

        return childText
      }

      return ""
    }

    // Process all child nodes of the element
    element.childNodes.forEach((node) => {
      text += processNode(node)
    })

    // Clean up consecutive spaces
    return text.replace(/\s+/g, " ").trim()
  } catch (error) {
    console.error("Error recursively extracting text:", error)
    return element.textContent?.trim() || ""
  }
}

/**
 * Extract engagement data from a tweet
 * @param article Article element containing the tweet
 * @returns Object with like, retweet, and reply counts
 */
export function extractEngagementData(article: Element): {
  likeCount: number
  retweetCount: number
  replyCount: number
} {
  let likeCount = 0
  let retweetCount = 0
  let replyCount = 0

  try {
    // 1. First try engagement elements with data-testid attributes
    const engagementContainer = article.querySelector('div[role="group"]')

    if (engagementContainer) {
      // Find all engagement elements
      const replyElement = engagementContainer.querySelector(
        'div[data-testid="reply"]'
      )
      const retweetElement = engagementContainer.querySelector(
        'div[data-testid="retweet"]'
      )
      const likeElement = engagementContainer.querySelector(
        'div[data-testid="like"]'
      )

      if (replyElement) {
        replyCount = parseTwitterNumber(replyElement.textContent || "")
      }

      if (retweetElement) {
        retweetCount = parseTwitterNumber(retweetElement.textContent || "")
      }

      if (likeElement) {
        likeCount = parseTwitterNumber(likeElement.textContent || "")
      }

      // If not found via data-testid, try matching by SVG paths
      if (likeCount === 0 && retweetCount === 0 && replyCount === 0) {
        const buttons = Array.from(engagementContainer.children)

        buttons.forEach((button) => {
          const svgPath =
            button.querySelector("svg path")?.getAttribute("d") || ""
          const text = button.textContent || ""
          const number = parseTwitterNumber(text)

          if (
            svgPath.includes("M1.751 10c0-4.42") ||
            button.innerHTML.includes("reply")
          ) {
            // Reply icon
            replyCount = number
          } else if (
            svgPath.includes("M4.5 3.88l4.432") ||
            button.innerHTML.includes("retweet")
          ) {
            // Retweet icon
            retweetCount = number
          } else if (
            svgPath.includes("M16.697 5.5c-1.222") ||
            button.innerHTML.includes("like")
          ) {
            // Like icon
            likeCount = number
          }
        })
      }
    }

    // 2. If still not found, try finding numbers directly
    if (likeCount === 0 && retweetCount === 0 && replyCount === 0) {
      // Find all span elements containing numbers
      const allSpans = article.querySelectorAll("span")
      const numberSpans = Array.from(allSpans).filter((span) => {
        const text = span.textContent?.trim() || ""
        // Match pure numbers or numbers with K/M/B suffixes
        return /^\d+$|^\d+(\.\d+)?[KkMmBb]$/.test(text)
      })

      // Assume order is reply, retweet, like
      if (numberSpans.length >= 3) {
        replyCount = parseTwitterNumber(numberSpans[0].textContent || "")
        retweetCount = parseTwitterNumber(numberSpans[1].textContent || "")
        likeCount = parseTwitterNumber(numberSpans[2].textContent || "")
      }
    }

    return { likeCount, retweetCount, replyCount }
  } catch (error) {
    console.error("Error extracting engagement data:", error)
    return { likeCount: 0, retweetCount: 0, replyCount: 0 }
  }
}

/**
 * Parse Twitter number formats (e.g., "1.5K", "23.4K", "1M")
 * @param text Twitter number text to parse
 * @returns Numeric value
 */
export function parseTwitterNumber(text: string): number {
  if (!text) return 0

  // Clean up the text
  const cleanText = text.replace(/[,\s]/g, "").trim()

  // If text doesn't contain any numbers, return 0
  if (!/\d/.test(cleanText)) return 0

  // Extract number part and suffix
  const match = cleanText.match(/(\d+(?:\.\d+)?)([KkMmBb])?/)
  if (!match) return 0

  const num = parseFloat(match[1])
  let multiplier = 1

  // Handle suffix
  if (match[2]) {
    const suffix = match[2].toUpperCase()
    switch (suffix) {
      case "K":
        multiplier = 1000
        break
      case "M":
        multiplier = 1000000
        break
      case "B":
        multiplier = 1000000000
        break
    }
  }

  return Math.round(num * multiplier)
}

/**
 * Scrape user posts from DOM
 * @returns Array of posts
 */
export function scrapeUserPostsFromDOM(): Post[] {
  const scrapedPosts: Post[] = []

  try {
    console.log("Starting to scrape tweets...")
    // Try multiple selectors to find tweets (Twitter's DOM structure can vary)
    const tweetSelectors = [
      'article[role="article"][data-testid="tweet"]',
      'article[role="article"]',
      'div[data-testid="cellInnerDiv"] article',
      'section[role="region"] article',
      'div[aria-label*="Timeline"] article',
      // Add more matching selectors, including articles with many aria-labelledby attributes
      "article[aria-labelledby]"
    ]

    // Try each selector until we find tweets
    let tweetArticles: NodeListOf<Element> | null = null
    for (const selector of tweetSelectors) {
      const elements = document.querySelectorAll(selector)
      if (elements && elements.length > 0) {
        console.log(
          `Found ${elements.length} tweets using selector: ${selector}`
        )
        tweetArticles = elements
        break
      }
    }

    // If we didn't find any tweets, return empty array
    if (!tweetArticles || tweetArticles.length === 0) {
      console.warn("No tweet articles found on page")
      return []
    }

    // Username from URL for verification
    const urlUsername = getCurrentUsername().toLowerCase()
    console.log("Current username:", urlUsername)

    // Process each tweet we found
    tweetArticles.forEach((article, index) => {
      try {
        // First verify this is a tweet from the profile owner (not a retweet or reply)
        // Look for links containing the username
        const userLinks = article.querySelectorAll(`a[href*="/${urlUsername}"]`)

        // Check if there are other possible username links
        let isUserTweet = userLinks && userLinks.length > 0

        // If no username links found, check if there are other identifiers showing this is the user's tweet
        if (!isUserTweet) {
          // Try to find username text
          const usernameTextElements =
            article.querySelectorAll("span.css-1jxf684")
          for (const element of usernameTextElements) {
            if (element.textContent?.includes(`@${urlUsername}`)) {
              isUserTweet = true
              break
            }
          }
        }

        // Skip this article if it doesn't contain the user we're analyzing
        if (!isUserTweet) {
          return
        }

        console.log(`Processing tweet #${index}`)

        // Extract tweet text
        let tweetText = extractTweetText(article)

        if (!tweetText) {
          console.log("No tweet text found, skipping")
          return
        }

        console.log("Tweet text:", tweetText.substring(0, 50) + "...")

        // Extract the timestamp
        let timestamp = new Date().toISOString()
        const timeElement = article.querySelector("time")
        if (timeElement) {
          const dateTime = timeElement.getAttribute("datetime")
          if (dateTime) {
            timestamp = dateTime
          }
        }

        // Extract tweet ID from status links
        let tweetId = ""
        const statusLinks = article.querySelectorAll('a[href*="/status/"]')
        for (const link of statusLinks) {
          const href = link.getAttribute("href") || ""
          const match = href.match(/\/status\/(\d+)/)
          if (match && match[1]) {
            tweetId = match[1]
            break
          }
        }

        // Fallback ID if needed
        if (!tweetId) {
          tweetId = `temp-${Date.now()}-${index}`
        }

        // Get engagement data
        const engagementData = extractEngagementData(article)

        // Add the post to our collection
        scrapedPosts.push({
          id: tweetId,
          text: tweetText,
          timestamp: timestamp,
          likeCount: engagementData.likeCount,
          retweetCount: engagementData.retweetCount,
          replyCount: engagementData.replyCount
        })
      } catch (error) {
        console.error("Error processing tweet:", error)
      }
    })

    console.log(`Successfully scraped ${scrapedPosts.length} tweets`)
    return scrapedPosts
  } catch (error) {
    console.error("Error in scrapeUserPostsFromDOM:", error)
    return []
  }
}

/**
 * Get current username from the DOM
 * @returns Username display name
 */
export function getCurrentUserDisplayName(currentUser: string): string {
  try {
    // Try to get display name from profile page
    const nameElements = document.querySelectorAll(
      'h1[dir="auto"], h2[dir="auto"]'
    )

    for (const element of nameElements) {
      // Find elements containing text but not @ symbol
      if (
        element.textContent &&
        !element.textContent.includes("@") &&
        element.textContent.trim().length > 0
      ) {
        return element.textContent.trim()
      }
    }

    // If not found, return username
    return currentUser
  } catch (error) {
    console.error("Error getting user display name:", error)
    return currentUser
  }
}

/**
 * Setup Twitter scroll monitor to load more content when scrolling
 * @param setPosts Function to update posts state
 */
export function setupTwitterScrollMonitor(
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>
) {
  // Check if scroll monitor is already set up
  if (window["twitterScrollMonitorActive"]) return

  // Mark that we've set up the monitor
  window["twitterScrollMonitorActive"] = true

  let lastScrollY = window.scrollY
  let lastPostCount = 0
  let scrollTimer: number | null = null

  // Triggered when user scrolls Twitter page
  window.addEventListener("scroll", () => {
    // Clear previous timer
    if (scrollTimer) {
      window.clearTimeout(scrollTimer)
    }

    // Set new timer, execute after scrolling stops
    scrollTimer = window.setTimeout(() => {
      // Only trigger when user scrolls down more than 100px
      if (window.scrollY > lastScrollY + 100) {
        console.log("Detected downward scroll, trying to fetch new content...")
        const newPosts = scrapeUserPostsFromDOM()

        // Only update when new content is found
        if (newPosts.length > lastPostCount) {
          console.log(
            `Found new content: ${newPosts.length - lastPostCount} new tweets`
          )
          setPosts(newPosts)
          lastPostCount = newPosts.length
        }
      }

      lastScrollY = window.scrollY
    }, 300) // Wait 300ms to ensure scrolling has stopped
  })

  console.log("Twitter scroll monitor set up")
}

/**
 * Setup sidebar scroll sync with Twitter page
 * @param postsContainerRef Reference to posts container
 * @param setPosts Function to update posts state
 */
export function setupSidebarScrollSync(
  postsContainerRef: React.RefObject<HTMLDivElement>,
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>
) {
  if (!postsContainerRef.current) return

  // Prevent duplicate setup
  if (postsContainerRef.current.getAttribute("data-scroll-synced") === "true")
    return
  postsContainerRef.current.setAttribute("data-scroll-synced", "true")

  // Sidebar scroll event handler
  let sidebarScrollTimer: number | null = null

  postsContainerRef.current.addEventListener("scroll", () => {
    if (!postsContainerRef.current) return

    // Clear previous timer
    if (sidebarScrollTimer) {
      window.clearTimeout(sidebarScrollTimer)
    }

    // Set new timer, execute after scrolling stops
    sidebarScrollTimer = window.setTimeout(() => {
      // Check if scrolled to bottom
      const { scrollTop, scrollHeight, clientHeight } =
        postsContainerRef.current
      const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 50

      if (scrolledToBottom) {
        console.log(
          "Sidebar scrolled to bottom, triggering Twitter page scroll"
        )

        // Scroll Twitter page to load more content
        window.scrollBy({ top: 800, behavior: "smooth" })

        // Wait for content to load
        setTimeout(() => {
          const newPosts = scrapeUserPostsFromDOM()
          // If new content, automatically update
          if (newPosts.length > 0) {
            setPosts(newPosts)
          }
        }, 2000)
      }
    }, 200)
  })

  console.log("Sidebar scroll sync set up")
}

// Helper function to get current username
function getCurrentUsername(): string {
  const url = window.location.href
  const match = url.match(/(?:twitter\.com|x\.com)\/([^/\?#]+)/)

  // If it's a valid username (not home, explore, etc.)
  if (
    match &&
    match[1] &&
    !["home", "explore", "notifications", "messages", "i", "settings"].includes(
      match[1]
    )
  ) {
    return match[1]
  }

  return ""
}
