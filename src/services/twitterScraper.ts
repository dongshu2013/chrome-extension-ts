import {
  type TwitterPostData,
  type TwitterPostMedia,
  type TwitterProfile,
  type TwitterProfileData
} from "../types/twitter"

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
    const posts: TwitterPostData[] = []
    const processedIds = new Set<string>()

    // Function to scroll down
    const scrollDown = () => {
      window.scrollTo(0, document.body.scrollHeight)
    }

    // More reliable way to find all tweet elements
    const findTweetElements = (): Element[] => {
      // Try multiple selectors to ensure we get all tweets
      const selectors = [
        'article[data-testid="tweet"]',
        'div[data-testid="cellInnerDiv"]', // New Twitter UI might use this
        'div[data-testid="tweetDetail"]', // For tweet details
        'div[role="article"]' // Generic fallback
      ]

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector)
        if (elements.length > 0) {
          return Array.from(elements)
        }
      }

      // If no elements found, try a more generic approach
      return Array.from(document.querySelectorAll("article"))
    }

    // Function to extract post data from the DOM
    const extractPostsFromDOM = () => {
      // Find all post articles in the timeline
      const postElements = findTweetElements()
      console.log(`Found ${postElements.length} potential post elements`)

      let successCount = 0
      let errorCount = 0

      postElements.forEach((post) => {
        try {
          // Extract tweet ID - look for status links
          const postLinks = post.querySelectorAll('a[href*="/status/"]')
          let id = ""
          let postUrl = ""

          // Try to find the best link that contains the status ID
          for (const link of Array.from(postLinks)) {
            const href = link.getAttribute("href") || ""
            const idMatch = href.match(/\/status\/(\d+)/)
            if (idMatch) {
              id = idMatch[1]
              postUrl = href.startsWith("http")
                ? href
                : `https://twitter.com${href}`
              break
            }
          }

          // Skip if we can't find an ID or if we've already processed this post
          if (!id || processedIds.has(id)) return

          // Add to processed IDs set to avoid duplicates
          processedIds.add(id)

          // Extract post text
          const textElement = post.querySelector('[data-testid="tweetText"]')
          let extractedText = extractTextContent(textElement)
          const html = textElement?.innerHTML || ""

          // Extract post timestamp
          const timeElement = post.querySelector("time")
          const createdAt = timeElement?.getAttribute("datetime") || ""

          // Extract author information - try multiple selectors
          const authorElement =
            post.querySelector('[data-testid="User-Name"]') ||
            post.querySelector('[data-testid="Tweet-User-Name"]')

          let authorDisplayName = ""
          let authorUsername = ""

          if (authorElement) {
            // Look for the display name
            const nameSpan = authorElement.querySelector('span[dir="auto"]')
            authorDisplayName = nameSpan?.textContent || ""

            // Look for the username
            const usernameSpan = authorElement.querySelector(
              'span:not([dir="auto"])'
            )
            authorUsername = usernameSpan?.textContent?.replace("@", "") || ""
          }

          // If we still couldn't find the username, try another approach
          if (!authorUsername) {
            const usernameElement = post.querySelector('span[dir="ltr"]')
            if (usernameElement?.textContent?.startsWith("@")) {
              authorUsername = usernameElement.textContent.replace("@", "")
            }
          }

          const authorProfileUrl = authorUsername
            ? `https://twitter.com/${authorUsername}`
            : ""

          // Extract author avatar
          const authorAvatarElement = post.querySelector(
            '[data-testid="Tweet-User-Avatar"] img, [data-testid="UserAvatar-Container"] img'
          )
          const authorAvatar = authorAvatarElement?.getAttribute("src") || ""

          // Check if author is verified
          const isVerified = !!authorElement?.querySelector(
            'svg[data-testid="icon-verified"]'
          )

          // Extract engagement metrics
          const metrics = extractEngagementMetrics(post)

          // Extract media content
          let extractedMedia = extractMediaContent(post)

          // Extract links, hashtags, and mentions
          const links = extractLinks(textElement)
          const hashtags = extractHashtags(extractedText)
          const mentionedUsers = extractMentions(extractedText)

          // Check if it's a reply
          const isReply = !!post.querySelector('[data-testid="reply"]')
          let replyToId = ""
          let replyToUsername = ""

          if (isReply) {
            const replyElement = post.previousElementSibling?.querySelector(
              'a[href*="/status/"]'
            )
            const replyUrl = replyElement?.getAttribute("href") || ""
            const replyMatch = replyUrl.match(/\/status\/(\d+)/)
            replyToId = replyMatch ? replyMatch[1] : ""
            replyToUsername = replyUrl.split("/")[1] || ""
          }

          // Check if it's a retweet or quote - IMPROVED LOGIC
          const repostContext = post.querySelector(
            '[data-testid="socialContext"]'
          )
          // Only mark as retweet if we actually find proper repost text indicators
          const isRetweet = !!(
            repostContext &&
            (repostContext.textContent?.includes("reposted") ||
              repostContext.textContent?.includes("Retweeted"))
          )

          // Add detailed logging for debugging retweet detection
          if (repostContext) {
            console.log(`Repost context found: "${repostContext.textContent}"`)
            console.log(`Is this classified as a retweet? ${isRetweet}`)
          }

          let originalPost: Partial<TwitterPostData> | null = null

          if (
            repostContext ||
            post.querySelector(
              '[aria-labelledby*="id__"] > [role="link"], .css-175oi2r[tabindex="0"][role="link"]'
            )
          ) {
            // Method 1: Find the "X reposted" text to confirm it's a repost
            const isReposted =
              repostContext?.textContent?.includes("reposted") ||
              repostContext?.textContent?.includes("Retweeted")

            // Extract the original author from repost text
            let originalAuthor = ""
            if (isReposted && repostContext) {
              originalAuthor =
                repostContext.textContent
                  ?.replace(/\s+reposted$/i, "")
                  ?.replace(/\s+Retweeted$/i, "")
                  ?.trim() || ""
              console.log(
                `Extracted original author from repost context: "${originalAuthor}"`
              )
            }

            // Method 2: Look for quote content - first attempt using traditional method
            let quoteElement = post.querySelector(
              '[data-testid="tweetText"] + div'
            )

            // Advanced quote detection: Look for the "Quote" indicator element
            // This handles the new Twitter UI for quoted tweets
            if (!quoteElement) {
              console.log("Looking for quote using advanced methods")

              // Method 2.1: Look for "Quote" text in a dir="ltr" element
              const quoteIndicators = Array.from(
                post.querySelectorAll(".css-1jxf684, .css-901oao, .css-175oi2r")
              )
                .filter((el) => (el.textContent || "").trim() === "Quote")
                .map(
                  (el) =>
                    el.closest('.css-175oi2r[role="link"]') ||
                    el.closest('.css-175oi2r[tabindex="0"]')
                )
                .filter(Boolean)

              if (quoteIndicators.length > 0) {
                console.log("Found quote indicator element")
                // Get the closest parent that contains the full quote
                quoteElement =
                  quoteIndicators[0]?.closest('.css-175oi2r[tabindex="0"]') ||
                  quoteIndicators[0]?.closest('.css-175oi2r[id*="id__"]')
              }

              // Method 2.2: If we still don't have a quote element, try to find the embedded tweet
              if (!quoteElement) {
                // Look for embedded tweet containers
                quoteElement = post.querySelector(
                  '[aria-labelledby*="id__"] > [role="link"], .css-175oi2r[tabindex="0"][role="link"]'
                )
              }
            }

            // Create the original post object if we have a quote element or it's a repost
            if (quoteElement || isReposted) {
              console.log("Extracting original post data")

              try {
                originalPost = {
                  id: "",
                  text: "",
                  createdAt: "",
                  authorUsername: "",
                  authorDisplayName: "",
                  authorProfileUrl: "",
                  likeCount: 0,
                  retweetCount: 0,
                  replyCount: 0
                }

                // If it's a quoted tweet, extract the content
                if (quoteElement) {
                  console.log("Processing as a quoted tweet")

                  // Extract quote content text
                  const quoteTextElement = quoteElement.querySelector(
                    '[data-testid="tweetText"]'
                  )
                  originalPost.text =
                    extractTextContent(quoteTextElement) ||
                    quoteElement.textContent ||
                    ""
                  originalPost.html = quoteTextElement?.innerHTML || ""

                  // Extract quote author information
                  const quoteAuthorElement =
                    quoteElement.querySelector('[data-testid="User-Name"]') ||
                    quoteElement.querySelector(
                      '.css-175oi2r[data-testid^="User-Name"]'
                    )

                  if (quoteAuthorElement) {
                    // Extract display name from first span with text
                    const displayNameElement =
                      quoteAuthorElement.querySelector('span[dir="auto"]') ||
                      quoteAuthorElement.querySelector(".css-1jxf684")
                    originalPost.authorDisplayName =
                      displayNameElement?.textContent || ""

                    // Extract username (starts with @)
                    const usernameElement =
                      quoteAuthorElement.querySelector('span[dir="ltr"]') ||
                      Array.from(
                        quoteAuthorElement.querySelectorAll("span")
                      ).find((span) => (span.textContent || "").startsWith("@"))
                    originalPost.authorUsername =
                      usernameElement?.textContent?.replace("@", "") || ""

                    if (originalPost.authorUsername) {
                      originalPost.authorProfileUrl = `https://twitter.com/${originalPost.authorUsername}`
                    }

                    // Check if verified
                    originalPost.isVerified =
                      !!quoteAuthorElement.querySelector(
                        'svg[data-testid="icon-verified"]'
                      )
                  }

                  // Extract quote URL and ID
                  const quoteLinkElement = quoteElement.querySelector(
                    'a[href*="/status/"]'
                  )
                  if (quoteLinkElement) {
                    const quoteUrl = quoteLinkElement.getAttribute("href") || ""
                    const quoteMatch = quoteUrl.match(/\/status\/(\d+)/)
                    originalPost.id = quoteMatch ? quoteMatch[1] : ""

                    if (originalPost.id && originalPost.authorUsername) {
                      originalPost.postUrl = `https://twitter.com/${originalPost.authorUsername}/status/${originalPost.id}`
                    }
                  } else {
                    // Try to find ID from the element attributes
                    const idAttrs = ["id", "aria-labelledby"]
                    for (const attr of idAttrs) {
                      const attrValue = quoteElement.getAttribute(attr) || ""
                      const idMatch =
                        attrValue.match(/status\/(\d+)/) ||
                        attrValue.match(/\d{10,}/)
                      if (idMatch && idMatch[1]) {
                        originalPost.id = idMatch[1]
                        break
                      }
                    }
                  }

                  // Extract quote avatar
                  const avatarElement = quoteElement.querySelector(
                    'img[src*="profile_images"]'
                  )
                  originalPost.authorAvatar =
                    avatarElement?.getAttribute("src") || ""

                  // Extract quote media if any
                  const mediaContainer = quoteElement.querySelector(
                    '[data-testid="tweetPhoto"], [data-testid="videoPlayer"]'
                  )
                  if (mediaContainer) {
                    originalPost.media = extractMediaContent(mediaContainer)
                  }

                  // Extract quote timestamp
                  const timeElement = quoteElement.querySelector("time")
                  originalPost.createdAt =
                    timeElement?.getAttribute("datetime") || ""

                  // Try to extract engagement metrics for the quote
                  try {
                    const metricElements = quoteElement.querySelectorAll(
                      '[data-testid="reply"], [data-testid="retweet"], [data-testid="like"], [data-testid="analyticsButton"]'
                    )

                    metricElements.forEach((el) => {
                      const testId = el.getAttribute("data-testid")
                      const countText = el.textContent || "0"

                      if (testId === "reply") {
                        originalPost!.replyCount = parseTwitterNumber(countText)
                      } else if (testId === "retweet") {
                        originalPost!.retweetCount =
                          parseTwitterNumber(countText)
                      } else if (testId === "like") {
                        originalPost!.likeCount = parseTwitterNumber(countText)
                      } else if (testId === "analyticsButton") {
                        originalPost!.viewCount = parseTwitterNumber(countText)
                      }
                    })
                  } catch (e) {
                    console.log("Error extracting quote metrics:", e)
                  }
                } else if (isReposted) {
                  console.log("Processing as a retweet without quote")

                  // For simple retweets (no quote), get the original author from the repost context
                  originalPost.authorUsername = originalAuthor

                  if (originalPost.authorUsername) {
                    originalPost.authorProfileUrl = `https://twitter.com/${originalPost.authorUsername}`

                    // For simple retweets, the main tweet content is actually the original tweet
                    originalPost.text = extractedText
                    originalPost.html = html
                    originalPost.createdAt = createdAt
                    originalPost.likeCount = metrics.likeCount
                    originalPost.retweetCount = metrics.retweetCount
                    originalPost.replyCount = metrics.replyCount
                    originalPost.viewCount = metrics.viewCount
                    originalPost.media = [...extractedMedia] // Use spread to create a copy

                    // The ID might be the same since it's just a retweet
                    originalPost.id = id
                    originalPost.postUrl = postUrl

                    // In this case, the original author data needs additional extraction
                    // since the container tweet is showing the repost
                    // We need to look for the actual original author information
                    // If we couldn't get more specific information, use what we have
                    originalPost.authorDisplayName =
                      originalAuthor || authorDisplayName

                    // Try to extract more author information if possible
                    const authorElements = post.querySelectorAll(
                      '[data-testid="User-Name"]'
                    )
                    // Skip the first author element (which is the retweeter)
                    if (authorElements.length > 1) {
                      const originalAuthorElement = authorElements[1]
                      // Extract display name from second author element (original author)
                      const displayNameElement =
                        originalAuthorElement.querySelector('span[dir="auto"]')
                      if (displayNameElement) {
                        originalPost.authorDisplayName =
                          displayNameElement.textContent ||
                          originalPost.authorDisplayName
                      }
                    }

                    // The current tweet becomes just a container for the original
                    extractedText = "" // Clear the container tweet content since it's moved to original
                    extractedMedia = [] // Clear media since it's moved to original
                  }
                }

                console.log(
                  `Extracted original post by @${originalPost.authorUsername}: ${originalPost.text?.substring(0, 30)}...`
                )
              } catch (error) {
                console.error("Error extracting original post data:", error)
                // Reset original post if we failed to extract it properly
                originalPost = null
              }
            }
          }

          try {
            // Create post data object
            const postData: TwitterPostData = {
              id,
              text: extractedText,
              html,
              createdAt,
              authorUsername,
              authorDisplayName,
              authorProfileUrl,
              authorAvatar,
              isVerified,
              likeCount: metrics.likeCount,
              retweetCount: metrics.retweetCount,
              replyCount: metrics.replyCount,
              viewCount: metrics.viewCount,
              media: extractedMedia,
              links,
              hashtags,
              mentionedUsers,
              isReply,
              replyToId,
              replyToUsername,
              isRetweet, // Now this will be true only for genuine retweets
              originalPost: originalPost || undefined,
              postUrl:
                postUrl || `https://twitter.com/${authorUsername}/status/${id}`
            }

            posts.push(postData)
            console.log(
              `Added post ID: ${id}, isRetweet: ${isRetweet}, type: ${isRetweet ? "Repost" : isReply ? "Reply" : "Tweet"}`
            )
          } catch (error) {
            console.error("Error creating post data object:", error)
          }
        } catch (error) {
          errorCount++
          console.error("Error extracting post data:", error)
        }
      })

      console.log(
        `Successfully extracted ${successCount} posts, failed to extract ${errorCount} posts`
      )
      console.log(`Total posts extracted so far: ${posts.length}`)
    }

    // Extract initial posts
    extractPostsFromDOM()
    console.log("Initial posts extracted. Now scrolling to load more...")

    // Scroll and extract more posts
    for (let i = 0; i < scrollCount; i++) {
      // Scroll down to load more tweets
      scrollDown()

      // Wait longer for new posts to load
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Extract posts after scrolling
      const beforeCount = posts.length
      extractPostsFromDOM()
      const afterCount = posts.length

      console.log(
        `Scroll #${i + 1}: Added ${afterCount - beforeCount} more posts`
      )

      // If we didn't add any new posts after scrolling, try one more time with a longer wait
      if (beforeCount === afterCount && i < scrollCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        scrollDown()
        await new Promise((resolve) => setTimeout(resolve, 3000))
        extractPostsFromDOM()

        const newAfterCount = posts.length
        console.log(
          `Retry scroll #${i + 1}: Added ${newAfterCount - afterCount} more posts`
        )
      }
    }

    console.log(`Final post count: ${posts.length}`)
    return posts
  } catch (error) {
    console.error("Error scraping Twitter posts:", error)
    throw new Error("Failed to scrape Twitter posts")
  }
}

/**
 * Scrapes Twitter/X profile and posts data
 * @param scrollCount Number of times to scroll to load more posts
 * @returns TwitterProfileData object with profile info and posts
 */
export async function scrapeTwitterProfileData(
  scrollCount = 5
): Promise<TwitterProfileData> {
  try {
    const profile = await scrapeTwitterProfile()
    const posts = await scrapeTwitterPosts(scrollCount)

    return {
      profile,
      posts,
      scrapedAt: Date.now()
    }
  } catch (error) {
    console.error("Error scraping Twitter profile data:", error)
    throw new Error("Failed to scrape Twitter profile data")
  }
}

/**
 * Extracts text content from a DOM element
 * @param element DOM element containing text
 * @returns Extracted text content
 */
function extractTextContent(element: Element | null): string {
  if (!element) return ""

  const text: string[] = []

  const processNode = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      text.push(node.textContent || "")
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Handle special elements
      const el = node as Element

      if (el.tagName === "IMG" && el.getAttribute("alt")) {
        // For emojis and other images with alt text
        text.push(el.getAttribute("alt") || "")
      } else if (
        el.tagName === "A" &&
        el.getAttribute("href")?.includes("/hashtag/")
      ) {
        // For hashtags
        text.push(el.textContent || "")
      } else if (
        el.tagName === "A" &&
        el.getAttribute("href")?.includes("/search?q=")
      ) {
        // For cashtags
        text.push(el.textContent || "")
      } else if (el.tagName === "A" && el.textContent?.startsWith("@")) {
        // For mentions
        text.push(el.textContent || "")
      } else if (el.tagName === "BR") {
        // Line breaks
        text.push("\n")
      } else {
        // Process child nodes
        for (const child of Array.from(el.childNodes)) {
          processNode(child)
        }
      }
    }
  }

  processNode(element)
  return text.join("").trim()
}

/**
 * Extracts engagement metrics from a post
 * @param post Post DOM element
 * @returns Object with engagement metrics
 */
function extractEngagementMetrics(post: Element): {
  likeCount: number
  retweetCount: number
  replyCount: number
  viewCount?: number
} {
  try {
    // Find all engagement elements
    const engagementElements = post.querySelectorAll(
      '[data-testid="reply"], [data-testid="retweet"], [data-testid="like"]'
    )

    let replyCount = 0
    let retweetCount = 0
    let likeCount = 0
    let viewCount

    // Extract counts from each element
    engagementElements.forEach((element) => {
      const testId = element.getAttribute("data-testid")
      const countText = element.textContent || "0"

      if (testId === "reply") {
        replyCount = parseTwitterNumber(countText)
      } else if (testId === "retweet") {
        retweetCount = parseTwitterNumber(countText)
      } else if (testId === "like") {
        likeCount = parseTwitterNumber(countText)
      }
    })

    // Try multiple methods to find view count (Twitter/X frequently changes its UI)

    // Method 1: Using analyticsButton (older Twitter UI)
    const viewElement = post.querySelector(
      '[data-testid="analyticsButton"] span'
    )
    if (viewElement) {
      viewCount = parseTwitterNumber(viewElement.textContent || "0")
      console.log("Found view count (Method 1):", viewCount)
    }

    // Method 2: Looking for links with analytics in href and views in aria-label
    if (!viewCount) {
      const analyticsLinks = post.querySelectorAll('a[href*="analytics"]')
      for (const link of analyticsLinks) {
        const ariaLabel = link.getAttribute("aria-label") || ""
        if (ariaLabel.includes("view") || ariaLabel.includes("View")) {
          // Extract from aria-label (e.g., "936 views. View post analytics")
          const match = ariaLabel.match(/(\d+(?:,\d+)*)\s+views?/)
          if (match && match[1]) {
            viewCount = parseTwitterNumber(match[1])
            console.log(
              "Found view count (Method 2):",
              viewCount,
              "from",
              ariaLabel
            )
            break
          }

          // If not found in aria-label, try to get from the span inside the link
          const spanText = link.querySelector("span")?.textContent
          if (spanText) {
            viewCount = parseTwitterNumber(spanText)
            console.log(
              "Found view count (Method 2b):",
              viewCount,
              "from span:",
              spanText
            )
            break
          }
        }
      }
    }

    // Method 3: Looking for any numeric span near analytics icon
    if (!viewCount) {
      // The views/analytics icon often has SVG with specific path data
      const analyticsIcons = post.querySelectorAll("svg")
      for (const icon of analyticsIcons) {
        // Check if this might be an analytics icon
        const pathElements = icon.querySelectorAll("path")
        for (const path of pathElements) {
          const pathData = path.getAttribute("d")
          // This is a partial match for the analytics icon path data
          if (
            pathData &&
            pathData.includes("zM8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2z")
          ) {
            // Find closest text element
            const parentElement = icon.closest("a")
            if (parentElement) {
              const textElement = parentElement.querySelector(
                '[data-testid="app-text-transition-container"]'
              )
              const textContent = textElement?.textContent || ""
              if (/^\d+$/.test(textContent.trim())) {
                viewCount = parseTwitterNumber(textContent)
                console.log(
                  "Found view count (Method 3):",
                  viewCount,
                  "from text near analytics icon"
                )
                break
              }
            }
          }
        }
        if (viewCount) break
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
 * Extracts media content from a post
 * @param post Post DOM element
 * @returns Array of TwitterPostMedia objects
 */
function extractMediaContent(post: Element): TwitterPostMedia[] {
  try {
    const media: TwitterPostMedia[] = []

    // Find image container
    const mediaContainer = post.querySelector(
      '[data-testid="tweetPhoto"], [data-testid="videoPlayer"]'
    )
    if (!mediaContainer) return media

    // Extract images
    const images = mediaContainer.querySelectorAll(
      'img:not([data-testid="Profile-Entity-Thumbnail"])'
    )
    images.forEach((img) => {
      const url = img.getAttribute("src") || ""
      const altText = img.getAttribute("alt") || ""

      if (url && !url.includes("profile_images")) {
        media.push({
          type: "image",
          url,
          altText
        })
      }
    })

    // Extract videos
    const videos = mediaContainer.querySelectorAll("video")
    videos.forEach((video) => {
      const url = video.getAttribute("src") || ""
      const poster = video.getAttribute("poster") || ""

      if (url) {
        media.push({
          type: "video",
          url,
          thumbnailUrl: poster
        })
      }
    })

    // Check for GIFs
    const gifContainer = mediaContainer.querySelector(
      '[data-testid="placeholderGif"]'
    )
    if (gifContainer) {
      const gifImg = gifContainer.querySelector("img")
      const url = gifImg?.getAttribute("src") || ""

      if (url) {
        media.push({
          type: "gif",
          url
        })
      }
    }

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
function extractLinks(element: Element | null): string[] {
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
function extractHashtags(text: string): string[] {
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
function extractMentions(text: string): string[] {
  const mentions: string[] = []
  const mentionRegex = /@(\w+)/g
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1])
  }

  return mentions
}

/**
 * Parses Twitter/X number format (like 1.5K, 2.3M) to a number
 * @param text Number text to parse
 * @returns Parsed number
 */
function parseTwitterNumber(text: string): number {
  if (!text || text === "") return 0

  // Remove commas and whitespace
  text = text.replace(/,|\s/g, "")

  // Parse numbers like "1.5K", "2.3M"
  const numericMatch = text.match(/^([\d.]+)([KkMmBb])?$/)
  if (numericMatch) {
    const [_, numPart, suffix] = numericMatch
    const base = parseFloat(numPart)

    if (suffix) {
      const upperSuffix = suffix.toUpperCase()
      if (upperSuffix === "K") return base * 1000
      if (upperSuffix === "M") return base * 1000000
      if (upperSuffix === "B") return base * 1000000000
    }

    return base
  }

  // Try to extract just the number
  const justNumbers = text.match(/^[\d,]+$/)
  if (justNumbers) {
    return parseInt(justNumbers[0].replace(/,/g, ""), 10)
  }

  return 0
}
