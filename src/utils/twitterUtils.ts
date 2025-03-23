/**
 * Twitter Utility Functions
 * Contains reusable functions for Twitter data extraction and formatting
 */

/**
 * Get current Twitter username from URL
 * @returns Username from Twitter URL
 */
export function getCurrentTwitterUsername(): string {
  const url = window.location.href
  const match = url.match(/(?:twitter\.com|x\.com)\/([^/\?]+)/)
  return match && match[1] !== "home" ? match[1] : ""
}

/**
 * Get username from current Twitter path
 * @returns Username from the current path
 */
export function getCurrentUsername(): string {
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

/**
 * Check if current page is a post detail page
 * @returns Boolean indicating if current page is a post detail page
 */
export function isPostDetailPage(): boolean {
  return window.location.href.includes("/status/")
}

/**
 * Extract post ID from current URL
 * @returns Post ID from the URL or empty string
 */
export function getPostIdFromUrl(): string {
  const match = window.location.href.match(/status\/(\d+)/)
  return match && match[1] ? match[1] : ""
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
 * Format date for display
 * @param timestamp ISO timestamp string
 * @returns Formatted date string
 */
export function formatDate(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString() + " " + date.toLocaleTimeString()
}
