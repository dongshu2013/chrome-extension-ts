import { type TwitterPostData } from "../../../types/twitter"
import {
  extractEngagementMetrics,
  extractHashtags,
  extractLinks,
  extractMediaContent,
  extractMentions,
  extractTextContent
} from "../extractors/content-extractors"

/**
 * Scrolls down the Twitter timeline
 * Implements multiple strategies to ensure scrolling works
 */
export function scrollDown(count: number = 1): void {
  for (let i = 0; i < count; i++) {
    try {
      // Get the current scroll position before scrolling
      const beforeScrollTop = document.documentElement.scrollTop

      // 尝试多种滚动策略，从温和到激进
      // 1. 标准滚动 - 滚动到页面底部
      window.scrollTo(0, document.body.scrollHeight)

      // 记录滚动状态
      console.log(
        `初始滚动：从 ${beforeScrollTop} 到 ${document.documentElement.scrollTop}`
      )

      // 2. 如果滚动不足，尝试替代方法
      if (document.documentElement.scrollTop - beforeScrollTop < 300) {
        console.log("标准滚动效果不足，尝试替代方法")

        // 2.1 尝试找出主时间线元素进行滚动
        const timelineSelectors = [
          '[data-testid="primaryColumn"]',
          'main[role="main"]',
          'div[aria-label*="Timeline"]',
          'section[role="region"]',
          'div[data-testid="sidebarColumn"] + div' // 主列常在侧边栏列之后
        ]

        let scrollApplied = false
        for (const selector of timelineSelectors) {
          const timeline = document.querySelector(selector)
          if (timeline) {
            try {
              // 尝试滚动此元素
              timeline.scrollTop = timeline.scrollHeight
              console.log(`滚动了选择器为 ${selector} 的时间线元素`)
              scrollApplied = true
              break
            } catch (e) {
              console.error(`尝试滚动 ${selector} 时出错:`, e)
            }
          }
        }

        // 2.2 如果没有找到可滚动元素，使用更激进的滚动
        if (!scrollApplied) {
          console.log("未找到可滚动的时间线元素，使用页面滚动替代")
          // 使用大滚动量
          window.scrollBy(0, 1500)
        }
      }

      // 3. 额外的滚动策略 - "抖动"滚动，有时可以触发加载器
      setTimeout(() => {
        try {
          // 向上滚动一点再向下滚动，这有时能触发懒加载
          window.scrollBy(0, -100)
          setTimeout(() => window.scrollBy(0, 300), 200)
        } catch (e) {
          console.error("抖动滚动时出错:", e)
        }
      }, 500)

      // 4. 如果页面有无限滚动特性，尝试触发交互刷新
      setTimeout(() => {
        try {
          // 模拟用户交互，有助于触发某些懒加载机制
          const potentialTriggers = document.querySelectorAll(
            'div[role="button"]:not([aria-disabled="true"])'
          )
          if (potentialTriggers.length > 0) {
            // 找到页面底部附近的按钮
            const viewportHeight = window.innerHeight
            const bottomTriggers = Array.from(potentialTriggers).filter(
              (el) => {
                const rect = el.getBoundingClientRect()
                return (
                  rect.top > viewportHeight * 0.7 &&
                  rect.top < viewportHeight * 1.2
                )
              }
            )

            if (bottomTriggers.length > 0) {
              // 不实际点击，只记录找到了
              console.log(`发现了 ${bottomTriggers.length} 个可能的加载触发器`)
            }
          }
        } catch (e) {
          console.error("尝试查找加载触发器时出错:", e)
        }
      }, 1000)
    } catch (e) {
      console.error("滚动过程中发生错误:", e)
      // 回退到简单滚动
      window.scrollTo(0, document.body.scrollHeight)
    }
  }
}

/**
 * Finds all tweet elements in the current DOM
 * Uses multiple selectors to ensure finding all posts
 * @returns Array of Element objects representing tweets
 */
export function findTweetElements(): Element[] {
  // 减少选择器数量，只保留最可靠的几个
  const selectors = [
    'article[data-testid="tweet"]',
    'div[data-testid="tweetDetail"]',
    'div[data-testid="cellInnerDiv"]',
    'div[role="article"]'
  ]

  // 为了更全面的搜索，我们会组合所有选择器的结果，然后去重
  const allPotentialElements = new Set<Element>()
  const processedStatusIds = new Set<string>() // 记录已处理的推文ID

  // 尝试每个选择器并添加到集合中
  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll(selector)
      console.log(`Selector '${selector}' found ${elements.length} elements`)
      elements.forEach((el) => {
        // 获取推文ID，如果已处理过此ID则跳过
        const statusLink =
          el.querySelector('a[href*="/status/"]')?.getAttribute("href") || ""
        const statusMatch = statusLink.match(/status\/(\d+)/)
        const statusId = statusMatch ? statusMatch[1] : ""

        if (statusId && processedStatusIds.has(statusId)) {
          return
        }

        // 必须同时满足条件才被视为有效推文
        const hasStatusLink = statusId !== ""
        const hasUserInfo =
          el.querySelector('[data-testid="User-Name"]') !== null

        if (hasStatusLink && hasUserInfo) {
          processedStatusIds.add(statusId)
          allPotentialElements.add(el)
        }
      })
    } catch (error) {
      console.error(`Error using selector '${selector}':`, error)
    }
  }

  console.log(
    `Found ${allPotentialElements.size} unique tweet elements with ${processedStatusIds.size} unique IDs`
  )
  return Array.from(allPotentialElements)
}

/**
 * Determines if an element is likely a tweet container
 * @param element DOM element to check
 * @returns boolean indicating if element is likely a tweet
 */
export function isLikelyTweetContainer(element: Element): boolean {
  // 如果元素本身或其子元素包含以下任一特征，则可能是推文容器
  // 先检查直接特征
  const directCheck =
    element.querySelector('a[href*="/status/"]') !== null || // 包含status链接
    element.querySelector("time") !== null || // 包含时间元素
    element.querySelector('[data-testid="User-Name"]') !== null || // 包含用户名
    element.querySelector('[role="group"]') !== null || // 包含互动按钮组
    element.querySelector('[data-testid="tweetText"]') !== null || // 包含推文文本
    element.querySelector('[data-testid="socialContext"]') !== null || // 包含社交上下文（如转发）
    element.querySelector('img[alt*="Image"]') !== null // 包含图片

  if (directCheck) return true

  // 检查特定的属性和内容
  const hasAttributeCheck =
    (element.getAttribute("role") === "article" ||
      element.tagName.toLowerCase() === "article") &&
    (element.getAttribute("tabindex") === "0" ||
      element.getAttribute("tabindex") === "-1") &&
    (element.getAttribute("aria-labelledby")?.includes("id__") || // 包含id__的aria-labelledby
      element.getAttribute("data-testid")?.includes("tweet") || // 包含tweet的data-testid
      element.getAttribute("data-testid")?.includes("cell")) // 包含cell的data-testid

  if (hasAttributeCheck) return true

  // 内容检查 - 如果包含典型的推文互动单词
  const contentCheck =
    element.textContent?.includes("Reply") ||
    element.textContent?.includes("Repost") ||
    element.textContent?.includes("Like") ||
    element.textContent?.includes("View") ||
    element.textContent?.includes("reposted") ||
    element.textContent?.includes("replied to")

  if (contentCheck) return true

  // 最终检查 - 是否有嵌套的article元素，且内容像推文
  const nestedArticle = element.querySelector("article")
  if (
    nestedArticle &&
    (nestedArticle.querySelector("time") ||
      nestedArticle.querySelector('[data-testid="User-Name"]'))
  ) {
    return true
  }

  // 否则不是推文容器
  return false
}

/**
 * Extracts posts from the current DOM state
 * @returns Array of TwitterPostData objects
 */
export function extractPostsFromDOM(): TwitterPostData[] {
  try {
    const posts: TwitterPostData[] = []
    const tweetElements = findTweetElements()

    console.log(`Processing ${tweetElements.length} potential tweet elements`)

    tweetElements.forEach((post) => {
      try {
        // Extract post ID from URL
        const statusLinkElement = post.querySelector('a[href*="/status/"]')
        const statusLink = statusLinkElement?.getAttribute("href") || ""
        const statusMatch = statusLink.match(/status\/(\d+)/)
        const id = statusMatch ? statusMatch[1] : ""

        if (!id) {
          console.log("Skipping post without ID")
          return // Skip posts without ID
        }

        // Check if post is a retweet
        const isRetweet =
          !!post.querySelector('[data-testid="socialContext"]') ||
          post.textContent?.includes("reposted") ||
          post.textContent?.includes("You reposted")

        // Extract author information
        const userNameElement = post.querySelector('[data-testid="User-Name"]')
        const userNameLink = userNameElement?.querySelector('a[role="link"]')
        const authorProfileUrl = userNameLink?.getAttribute("href") || ""

        // Extract username from profile URL
        const authorUsername =
          authorProfileUrl.replace(/^\//, "").split("/")[0] || ""

        // Get author display name
        const nameElement = userNameElement?.querySelector("span")
        const authorDisplayName = nameElement?.textContent || ""

        // Author avatar
        const avatarElement =
          post.querySelector('img[data-testid="tweetPhoto"]') ||
          post.querySelector('img[src*="profile_images"]')
        const authorAvatar = avatarElement?.getAttribute("src") || ""

        // Is verified
        const isVerified = !!userNameElement?.querySelector(
          '[data-testid="icon-verified"]'
        )

        // Created time
        const timeElement = post.querySelector("time")
        const createdAt =
          timeElement?.getAttribute("datetime") || new Date().toISOString()

        // Extract post text content
        const tweetTextElement = post.querySelector('[data-testid="tweetText"]')
        const text = extractTextContent(tweetTextElement)

        // Extract engagement metrics (likes, retweets, replies, views)
        const metrics = extractEngagementMetrics(post)

        // Extract media content (images, videos, GIFs)
        const media = extractMediaContent(post)

        // Extract links, hashtags, and mentions
        const links = extractLinks(tweetTextElement)
        const hashtags = extractHashtags(text)
        const mentionedUsers = extractMentions(text)

        // Reply information
        const replyContext = post.querySelector('[data-testid="reply"]')
        const isReply = !!replyContext

        let replyToId = ""
        let replyToUsername = ""

        if (isReply) {
          // Try to extract reply-to information
          const replyText = replyContext?.textContent || ""
          const replyToMatch = replyText.match(/Replying to @(\w+)/)
          replyToUsername = replyToMatch ? replyToMatch[1] : ""

          // If we have username but not ID, we can't do much more without additional API calls
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
        let originalPost: Partial<TwitterPostData> | undefined

        if (isRetweet) {
          // For retweets, try to extract original post information
          // This is a simplified version and might need enhancement
          originalPost = {
            // We might be limited in what we can extract from the UI for the original post
            authorUsername: "",
            authorDisplayName: "",
            text: ""
          }

          // Try to find the original post author
          const originalAuthorElement = post.querySelector(
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
        const postData: TwitterPostData = {
          id,
          text,
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
          postUrl
        }

        posts.push(postData)
        console.log(`Successfully extracted post with ID: ${id}`)
      } catch (error) {
        console.error("Error extracting post data:", error)
      }
    })

    return posts
  } catch (error) {
    console.error("Error in extractPostsFromDOM:", error)
    return []
  }
}

/**
 * Process a group of posts that might be part of the same thread
 * @param threadPosts Array of posts by the same author
 */
export function processThreadGroup(threadPosts: TwitterPostData[]): void {
  // 只有多于1条推文才可能是推文串
  if (threadPosts.length <= 1) return

  console.log(`Processing potential thread with ${threadPosts.length} posts`)

  // 按时间顺序排序（从旧到新）
  threadPosts.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  // 提取序号信息（如果有）
  threadPosts.forEach((post) => {
    // 检查是否包含序号格式 (如 "1/5")
    const match = post.text.match(/(\d+)\/(\d+)/)
    if (match) {
      // 添加线程位置和总数信息
      post.threadPosition = parseInt(match[1])
      post.threadCount = parseInt(match[2])
    }
  })

  // 为每条推文添加线程关联信息
  for (let i = 0; i < threadPosts.length; i++) {
    const post = threadPosts[i]

    // 设置线程内的位置（如果没有明确的序号）
    if (!post.threadPosition) {
      post.threadPosition = i + 1
    }

    // 如果没有设置总数，则使用数组长度
    if (!post.threadCount) {
      post.threadCount = threadPosts.length
    }

    // 设置线程首推文ID
    post.threadHeadId = threadPosts[0].id

    // 设置前一条推文ID（如果不是第一条）
    if (i > 0) {
      post.previousThreadId = threadPosts[i - 1].id
    }

    // 设置后一条推文ID（如果不是最后一条）
    if (i < threadPosts.length - 1) {
      post.nextThreadId = threadPosts[i + 1].id
    }

    // 设置isThreadPart标志
    post.isThreadPart = true
  }

  console.log(`Processed thread with ${threadPosts.length} posts`)
}
