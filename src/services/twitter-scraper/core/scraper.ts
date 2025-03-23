import {
  type TwitterPostData,
  type TwitterProfile,
  type TwitterProfileData
} from "../../../types/twitter"
import { parseTwitterNumber } from "../utils/parsers"
import {
  extractPostsFromDOM,
  processThreadGroup,
  scrollDown
} from "./dom-utils"

/**
 * Scrapes Twitter/X profile information from the profile page
 * @returns TwitterProfile object with user information
 */
export async function scrapeTwitterProfile(): Promise<TwitterProfile> {
  try {
    // User header section - contains avatar, name, username, bio
    const headerSection = document.querySelector(
      '[data-testid="UserProfileHeader_Items"]'
    )?.parentElement?.parentElement

    // User name and username
    const displayName =
      document.querySelector('[data-testid="UserName"]')?.querySelector("span")
        ?.textContent || ""
    const usernameElement = document
      .querySelector('[data-testid="UserName"]')
      ?.querySelectorAll("span")[1]
    const username = usernameElement?.textContent?.replace("@", "") || ""

    // User avatar
    const avatarElement = document
      .querySelector('[data-testid="UserAvatar"]')
      ?.querySelector("img")
    const avatar = avatarElement?.getAttribute("src") || ""

    // User banner
    const bannerElement = document
      .querySelector('[data-testid="UserProfileHeader_Items"]')
      ?.parentElement?.parentElement?.parentElement?.querySelector("img")
    const banner = bannerElement?.getAttribute("src") || ""

    // User bio
    const bioElement = document.querySelector('[data-testid="UserDescription"]')
    const bio = bioElement?.textContent || ""

    // ===== New follower/following count extraction approach =====
    let followersCount = 0
    let followingCount = 0

    // Method 1: Try to find the metrics in the profile header main page (most common format)
    const metricElements = document.querySelectorAll(
      '[role="presentation"] [role="link"]'
    )
    console.log(
      `Found ${metricElements.length} possible metric elements in the profile header`
    )

    metricElements.forEach((element) => {
      try {
        const text = element.textContent || ""
        // Look for number followed by "Following" or "Followers"
        if (text.includes("Following")) {
          const match = text.match(/(\d+[\d,.]*)\s*Following/)
          if (match && match[1]) {
            followingCount = parseTwitterNumber(match[1])
            console.log(
              `Found followingCount: ${followingCount} from text: "${text}"`
            )
          }
        } else if (text.includes("Followers")) {
          const match = text.match(/(\d+[\d,.]*)\s*Followers/)
          if (match && match[1]) {
            followersCount = parseTwitterNumber(match[1])
            console.log(
              `Found followersCount: ${followersCount} from text: "${text}"`
            )
          }
        }
      } catch (e) {
        console.error("Error parsing metric element", e)
      }
    })

    // Method 2: Look for spans with numeric content next to "Following" or "Followers" text
    if (followersCount === 0 || followingCount === 0) {
      console.log("Trying alternative method to find metrics")
      // This approach looks for number spans near "Following" or "Followers" text
      document.querySelectorAll("span").forEach((span) => {
        try {
          const text = span.textContent || ""
          // Check if the span contains only a number (or number with K/M suffix)
          if (/^[\d,.]+[KkMmBb]?$/.test(text.trim())) {
            // Check the next sibling or parent for "Followers" or "Following" text
            const parentText = span.parentElement?.textContent || ""
            const siblingText = span.nextElementSibling?.textContent || ""

            if (
              parentText.includes("Following") ||
              siblingText.includes("Following")
            ) {
              followingCount = parseTwitterNumber(text)
              console.log(
                `Found followingCount (alt method): ${followingCount} from text: "${text}"`
              )
            } else if (
              parentText.includes("Followers") ||
              siblingText.includes("Followers")
            ) {
              followersCount = parseTwitterNumber(text)
              console.log(
                `Found followersCount (alt method): ${followersCount} from text: "${text}"`
              )
            }
          }
        } catch (e) {
          console.error("Error parsing span element", e)
        }
      })
    }

    // Method 3: Look for direct visible counts in the main profile view
    if (followersCount === 0 || followingCount === 0) {
      console.log("Trying direct text extraction method")

      // Try to find elements with specific visible patterns
      const allSpans = document.querySelectorAll("span")
      allSpans.forEach((span) => {
        try {
          const text = span.textContent || ""
          if (/^\d+$/.test(text.trim()) || /^\d+[KkMmBb]$/.test(text.trim())) {
            // If it's just a number, check what's next to it
            const nextElement = span.nextElementSibling
            const previousElement = span.previousElementSibling
            const parentText = span.parentElement?.textContent || ""

            // Check surrounding text for clues
            if (
              nextElement?.textContent?.includes("Following") ||
              previousElement?.textContent?.includes("Following") ||
              parentText.includes("Following")
            ) {
              followingCount = parseTwitterNumber(text)
              console.log(
                `Found followingCount (direct method): ${followingCount} from text: "${text}"`
              )
            } else if (
              nextElement?.textContent?.includes("Follower") ||
              previousElement?.textContent?.includes("Follower") ||
              parentText.includes("Follower")
            ) {
              followersCount = parseTwitterNumber(text)
              console.log(
                `Found followersCount (direct method): ${followersCount} from text: "${text}"`
              )
            }
          }
        } catch (e) {
          console.error("Error in direct text extraction", e)
        }
      })
    }

    // Method 4: Last resort - try to extract from href attributes and aria-labels
    if (followersCount === 0 || followingCount === 0) {
      console.log("Trying href and aria-label based extraction")

      // Look for elements with href containing followers/following
      document
        .querySelectorAll('a[href*="followers"], a[href*="following"]')
        .forEach((link) => {
          try {
            const href = link.getAttribute("href") || ""
            const label = link.getAttribute("aria-label") || ""
            const text = link.textContent || ""

            // First try to extract from aria-label which might contain the full info
            if (label) {
              if (label.includes("followers")) {
                const match = label.match(/(\d+[\d,.]*)\s*followers/)
                if (match && match[1]) {
                  followersCount = parseTwitterNumber(match[1])
                  console.log(
                    `Found followersCount (aria): ${followersCount} from label: "${label}"`
                  )
                }
              } else if (label.includes("following")) {
                const match = label.match(/(\d+[\d,.]*)\s*following/)
                if (match && match[1]) {
                  followingCount = parseTwitterNumber(match[1])
                  console.log(
                    `Found followingCount (aria): ${followingCount} from label: "${label}"`
                  )
                }
              }
            }

            // If not found from aria-label, try the text content
            if (
              text &&
              ((href.includes("followers") && followersCount === 0) ||
                (href.includes("following") && followingCount === 0))
            ) {
              // Extract just the number part
              const numberMatch = text.match(/^([\d,.]+[KkMmBb]?)/)
              if (numberMatch && numberMatch[1]) {
                if (href.includes("followers")) {
                  followersCount = parseTwitterNumber(numberMatch[1])
                  console.log(
                    `Found followersCount (href): ${followersCount} from text: "${text}"`
                  )
                } else if (href.includes("following")) {
                  followingCount = parseTwitterNumber(numberMatch[1])
                  console.log(
                    `Found followingCount (href): ${followingCount} from text: "${text}"`
                  )
                }
              }
            }
          } catch (e) {
            console.error("Error in href extraction", e)
          }
        })
    }

    // Log the final results for debugging
    console.log(
      `Final metrics: Followers=${followersCount}, Following=${followingCount}`
    )

    // Posts count might not be directly available on newer Twitter/X
    const postsCountElement = document.querySelector(
      '[data-testid="profileTimeline"] a[href$="/posts"] div[dir="ltr"] span'
    )
    let postsCount = postsCountElement
      ? parseTwitterNumber(postsCountElement.textContent || "0")
      : 0

    // Alternative approach for posts count
    if (postsCount === 0) {
      const tabList = document.querySelector('[role="tablist"]')
      if (tabList) {
        const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'))
        tabs.forEach((tab) => {
          const label = tab.getAttribute("aria-label") || ""
          if (label.includes("post") || label.includes("Post")) {
            const countSpan = tab.querySelector('span[dir="ltr"] > span')
            if (countSpan) {
              postsCount = parseTwitterNumber(countSpan.textContent || "0")
            }
          }
        })
      }
    }

    // Verify check
    const isVerified = !!document.querySelector(
      '[data-testid="UserName"] svg[data-testid="icon-verified"]'
    )

    // Join date
    const joinDateElement = document.querySelector(
      '[data-testid="UserProfileHeader_Items"]'
    )?.textContent
    const joinDateMatch = joinDateElement?.match(/Joined\s(.+)/)
    const joinDate = joinDateMatch ? joinDateMatch[1] : ""

    // Location
    const locationElement = document.querySelector(
      '[data-testid="UserProfileHeader_Items"] span[data-testid="UserLocation"]'
    )
    const location = locationElement?.textContent || ""

    // Website
    const websiteElement = document.querySelector(
      '[data-testid="UserProfileHeader_Items"] a[data-testid="UserUrl"]'
    )
    const website = websiteElement?.getAttribute("href") || ""

    // Profile URL
    const profileUrl = window.location.href

    return {
      username,
      displayName,
      bio,
      avatar,
      banner,
      followersCount,
      followingCount,
      postsCount,
      isVerified,
      joinDate,
      location,
      website,
      profileUrl
    }
  } catch (error) {
    console.error("Error scraping Twitter profile:", error)
    throw new Error("Failed to scrape Twitter profile")
  }
}

/**
 * Scrapes Twitter/X posts with scrolling functionality
 * @param scrollCount Number of times to scroll to load more posts
 * @returns Array of TwitterPostData objects
 */
export async function scrapeTwitterPosts(
  scrollCount = 5
): Promise<TwitterPostData[]> {
  try {
    console.log("Starting Twitter post scraping with scrollCount:", scrollCount)
    const posts: TwitterPostData[] = []
    const processedIds = new Set<string>()
    let totalDiscoveredPosts = 0
    let duplicatePostsSkipped = 0

    // Implement post scraping with pagination
    for (let i = 0; i < scrollCount; i++) {
      console.log(`Scroll iteration ${i + 1}/${scrollCount}`)

      // Extract posts from current DOM state
      const newPosts = extractPostsFromDOM()
      totalDiscoveredPosts += newPosts.length

      // Filter out already processed posts
      const uniqueNewPosts = newPosts.filter(
        (post) => !processedIds.has(post.id)
      )

      // Log duplicates for debugging
      duplicatePostsSkipped += newPosts.length - uniqueNewPosts.length

      console.log(
        `Found ${uniqueNewPosts.length} new unique posts (skipped ${newPosts.length - uniqueNewPosts.length} duplicates)`
      )

      // Add new posts to our collection
      uniqueNewPosts.forEach((post) => {
        processedIds.add(post.id)
        posts.push(post)
      })

      // Process possible thread relationships
      const potentialThreads = new Map<string, TwitterPostData[]>()

      // Group posts by author
      posts.forEach((post) => {
        if (!potentialThreads.has(post.authorUsername)) {
          potentialThreads.set(post.authorUsername, [])
        }
        potentialThreads.get(post.authorUsername)?.push(post)
      })

      // Process each potential thread group
      potentialThreads.forEach((threadPosts) => {
        processThreadGroup(threadPosts)
      })

      // 记录当前进度
      console.log(`Progress: ${posts.length} unique posts collected so far`)

      // 如果经过多次抓取没有发现新内容，可能已经到底了
      if (i >= 2 && uniqueNewPosts.length === 0) {
        console.log("No new posts found after scrolling, stopping early")
        break
      }

      // Scroll down to load more posts
      if (i < scrollCount - 1) {
        await new Promise((resolve) => {
          scrollDown()
          setTimeout(resolve, 2000) // Wait for new content to load
        })
      }
    }

    console.log(`Finished scraping. Total posts collected: ${posts.length}`)
    console.log(
      `Efficiency: ${posts.length} unique posts from ${totalDiscoveredPosts} discovered (filtered ${duplicatePostsSkipped} duplicates)`
    )

    return posts
  } catch (error) {
    console.error("Error scraping Twitter posts:", error)
    return []
  }
}

/**
 * Scrapes both Twitter profile info and posts
 * @param scrollCount Number of times to scroll to load more posts
 * @returns TwitterProfileData object with profile and posts
 */
export async function scrapeTwitterProfileData(
  scrollCount = 5
): Promise<TwitterProfileData> {
  try {
    console.log("Starting combined Twitter profile and posts scraping")

    // Get profile information
    const profile = await scrapeTwitterProfile()

    // Get posts
    const posts = await scrapeTwitterPosts(scrollCount)

    return {
      profile,
      posts,
      scrapedAt: Date.now()
    }
  } catch (error) {
    console.error("Error in combined Twitter scraping:", error)
    throw new Error("Failed to scrape Twitter profile data")
  }
}
