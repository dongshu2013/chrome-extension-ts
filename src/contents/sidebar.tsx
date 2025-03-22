import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"

import ExploreAnalytics from "../components/ExploreAnalytics"
import ProfileScraper from "../components/ProfileScraper"
import type { TwitterProfileData } from "../types/twitter"

import "./sidebar.css"

// Add type declaration for window
declare global {
  interface Window {
    twitterAnalysisObserver?: MutationObserver
    twitterScrollMonitorActive?: boolean
  }
}

// Default settings
const DEFAULT_SETTINGS = {
  // UI settings
  uiSettings: {
    theme: "system",
    fontSize: 14,
    compactMode: false
  },

  // Analysis settings
  analysisSettings: {
    autoAnalyze: false,
    analysisDepth: "standard",
    showAdvancedMetrics: false,
    analysisCacheTime: 24
  },

  // Twitter API settings
  twitterApiSettings: {
    bearerToken: "",
    apiEnabled: false
  },

  // AI model settings
  aiModelSettings: {
    enabled: false,
    apiKey: "",
    modelId: "gpt-3.5-turbo",
    temperature: 0.7,
    maxTokens: 2000
  }
}

// User posts interface
interface Post {
  id: string
  text: string
  timestamp: string
  likeCount: number
  retweetCount: number
  replyCount: number
}

// Script should run on Twitter and X.com
export const config: PlasmoCSConfig = {
  matches: ["*://*.twitter.com/*", "*://*.x.com/*"]
}

// Create sidebar container
function createSidebarContainer() {
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

// Twitter sidebar component
function TwitterSidebar({ username }: { username?: string }) {
  const [activeTab, setActiveTab] = useState<
    "posts" | "ai" | "settings" | "scraper"
  >("scraper")
  const [currentUser, setCurrentUser] = useState<string>(
    username || getCurrentTwitterUsername()
  )
  const [userDisplayName, setUserDisplayName] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [scrapedData, setScrapedData] = useState<TwitterProfileData | null>(
    null
  )

  // 添加引用以监听滚动事件
  const postsContainerRef = useRef<HTMLDivElement>(null)

  // Load settings
  useEffect(() => {
    async function loadSettingsFromStorage() {
      try {
        // Try to get settings from background script
        chrome.runtime.sendMessage({ type: "GET_APP_STATE" }, (response) => {
          if (
            response &&
            response.success &&
            response.state &&
            response.state.settings
          ) {
            setSettings(response.state.settings)
          } else {
            console.warn(
              "Could not get settings from background, using defaults"
            )
            setSettings(DEFAULT_SETTINGS)
          }
        })
      } catch (error) {
        console.error("Failed to load settings:", error)
        setSettings(DEFAULT_SETTINGS)
      }
    }

    loadSettingsFromStorage()
  }, [])

  // Get user display name from the DOM
  useEffect(() => {
    if (currentUser) {
      // 获取用户显示名称（昵称）
      const displayName = getCurrentUserDisplayName()
      setUserDisplayName(displayName)
      fetchUserPosts(currentUser)
    }
  }, [currentUser])

  // 设置滚动监听
  useEffect(() => {
    if (activeTab === "posts") {
      // 当用户切换到Posts标签时，设置滚动同步
      if (postsContainerRef.current) {
        console.log("初始化滚动同步机制...")

        // 设置Twitter页面滚动监听，在用户滚动时自动加载更多内容
        setupTwitterScrollMonitor(setPosts)

        // 设置侧边栏滚动同步，在滚动到底部时自动加载更多内容
        setupSidebarScrollSync(postsContainerRef)
      }
    }
  }, [activeTab, postsContainerRef.current])

  // 获取用户显示名称（昵称）
  function getCurrentUserDisplayName(): string {
    try {
      // 尝试从个人资料页获取显示名称
      const nameElements = document.querySelectorAll(
        'h1[dir="auto"], h2[dir="auto"]'
      )

      for (const element of nameElements) {
        // 查找包含文本但不包含@符号的元素
        if (
          element.textContent &&
          !element.textContent.includes("@") &&
          element.textContent.trim().length > 0
        ) {
          return element.textContent.trim()
        }
      }

      // 如果找不到，返回用户名
      return currentUser
    } catch (error) {
      console.error("获取用户昵称时出错:", error)
      return currentUser
    }
  }

  // Fetch user posts - with improved DOM scraping
  const fetchUserPosts = async (username: string) => {
    setLoading(true)
    setError(null)

    try {
      // First try to scrape posts from the DOM if we're on the user's profile page
      const currentPathUsername = getCurrentUsername()

      if (currentPathUsername === username) {
        // We're on the user's profile page, try scraping first
        const scrapedPosts = scrapeUserPostsFromDOM()

        if (scrapedPosts.length > 0) {
          setPosts(scrapedPosts)
          setLoading(false)
          return
        }
      }

      // If we couldn't scrape posts or we're not on the user's profile page,
      // fall back to the background script method
      chrome.runtime.sendMessage(
        { type: "GET_USER_POSTS", username },
        (response) => {
          if (response && response.success && response.posts) {
            setPosts(response.posts)
          } else {
            // No posts available from background script
            console.warn("Could not get posts from background")

            // Try one more time with DOM scraping after a delay
            // This helps in case Twitter's dynamic content wasn't fully loaded
            setTimeout(() => {
              const lastAttemptPosts = scrapeUserPostsFromDOM()
              if (lastAttemptPosts.length > 0) {
                setPosts(lastAttemptPosts)
              } else {
                setPosts([])
                setError("Failed to load posts. Try using the Refresh button.")
              }
              setLoading(false)
            }, 2000)
            return
          }
          setLoading(false)
        }
      )
    } catch (error) {
      console.error("Failed to fetch user posts:", error)
      setPosts([])
      setError("Failed to load posts. Please try again.")
      setLoading(false)
    }
  }

  // Add a refresh posts function
  const refreshPosts = () => {
    manuallyLoadPosts(currentUser, setLoading, setPosts, setError)
  }

  // Format tweet text to highlight hashtags, mentions, and URLs
  const formatTweetText = (text: string): JSX.Element[] => {
    if (!text) return [<span key="empty"></span>]

    // Regex patterns for Twitter entities
    const hashtagPattern = /#[\w\u4e00-\u9fa5]+/g
    const mentionPattern = /@[\w]+/g
    const urlPattern = /https?:\/\/[^\s]+/g

    // Split the text and retain the matches
    const parts: Array<{
      text: string
      type: "text" | "hashtag" | "mention" | "url"
    }> = []

    // Find all entities and their positions
    const entities: Array<{
      index: number
      length: number
      text: string
      type: "hashtag" | "mention" | "url"
    }> = []

    // Find hashtags
    let match
    while ((match = hashtagPattern.exec(text)) !== null) {
      entities.push({
        index: match.index,
        length: match[0].length,
        text: match[0],
        type: "hashtag"
      })
    }

    // Find mentions
    while ((match = mentionPattern.exec(text)) !== null) {
      entities.push({
        index: match.index,
        length: match[0].length,
        text: match[0],
        type: "mention"
      })
    }

    // Find URLs
    while ((match = urlPattern.exec(text)) !== null) {
      entities.push({
        index: match.index,
        length: match[0].length,
        text: match[0],
        type: "url"
      })
    }

    // Sort entities by index
    entities.sort((a, b) => a.index - b.index)

    let lastIndex = 0

    // Build the parts array
    entities.forEach((entity) => {
      // Add text before the entity
      if (entity.index > lastIndex) {
        parts.push({
          text: text.substring(lastIndex, entity.index),
          type: "text"
        })
      }

      // Add the entity
      parts.push({ text: entity.text, type: entity.type })

      // Update lastIndex
      lastIndex = entity.index + entity.length
    })

    // Add any remaining text
    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), type: "text" })
    }

    // Convert parts to JSX elements
    return parts.map((part, index) => {
      switch (part.type) {
        case "hashtag":
          return (
            <span key={index} className="tweet-hashtag">
              {part.text}
            </span>
          )
        case "mention":
          return (
            <span key={index} className="tweet-mention">
              {part.text}
            </span>
          )
        case "url":
          return (
            <span key={index} className="tweet-url">
              {part.text}
            </span>
          )
        default:
          return <span key={index}>{part.text}</span>
      }
    })
  }

  // Function to scrape user posts from the DOM with improved selectors
  function scrapeUserPostsFromDOM(): Post[] {
    const scrapedPosts: Post[] = []

    try {
      console.log("开始抓取推文...")
      // Try multiple selectors to find tweets (Twitter's DOM structure can vary)
      const tweetSelectors = [
        'article[role="article"][data-testid="tweet"]',
        'article[role="article"]',
        'div[data-testid="cellInnerDiv"] article',
        'section[role="region"] article',
        'div[aria-label*="Timeline"] article',
        // 添加更多匹配选择器，包括带有大量aria-labelledby属性的文章
        "article[aria-labelledby]"
      ]

      // Try each selector until we find tweets
      let tweetArticles: NodeListOf<Element> | null = null
      for (const selector of tweetSelectors) {
        const elements = document.querySelectorAll(selector)
        if (elements && elements.length > 0) {
          console.log(`找到 ${elements.length} 个推文使用选择器: ${selector}`)
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
      console.log("当前用户名:", urlUsername)

      // Process each tweet we found
      tweetArticles.forEach((article, index) => {
        try {
          // First verify this is a tweet from the profile owner (not a retweet or reply)
          // Look for links containing the username
          const userLinks = article.querySelectorAll(
            `a[href*="/${urlUsername}"]`
          )

          // 检查是否有其他可能是用户名的链接
          let isUserTweet = userLinks && userLinks.length > 0

          // 如果没有找到用户名链接，检查是否有其他标识表明这是用户的推文
          if (!isUserTweet) {
            // 尝试查找用户名文本
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

          console.log(`处理推文 #${index}`)

          // 扩展推文文本提取逻辑，支持多种推文结构
          let tweetText = extractTweetText(article)

          if (!tweetText) {
            console.log("没有找到推文文本，跳过")
            return
          }

          console.log("推文文本:", tweetText.substring(0, 50) + "...")

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

          // 获取互动数据
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
          console.error("处理推文时出错:", error)
        }
      })

      console.log(`成功爬取 ${scrapedPosts.length} 条推文`)
      return scrapedPosts
    } catch (error) {
      console.error("Error in scrapeUserPostsFromDOM:", error)
      return []
    }
  }

  // 提取推文文本的新函数，支持多种推文结构
  function extractTweetText(article: Element): string {
    try {
      // 1. 首先尝试标准的tweetText元素
      const tweetTextElement = article.querySelector(
        '[data-testid="tweetText"]'
      )
      if (tweetTextElement) {
        return extractTextWithFormatting(tweetTextElement)
      }

      // 2. 对于嵌套推文或引用推文，查找推文主体内的文本
      const quotedTweetTexts = article.querySelectorAll(
        'div[lang="en"], div[dir="auto"]'
      )
      if (quotedTweetTexts && quotedTweetTexts.length > 0) {
        let fullText = ""
        quotedTweetTexts.forEach((textDiv) => {
          // 跳过UI元素和已隐藏的内容
          if (
            textDiv.getAttribute("aria-hidden") !== "true" &&
            !textDiv.closest('div[role="button"]') &&
            !textDiv.closest('a[role="link"]') &&
            !textDiv.closest('div[role="group"]') && // 互动数据区域
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

      // 3. 如果还是找不到，尝试使用所有可见的dir="auto"元素
      const allTextElements = article.querySelectorAll(
        '[dir="auto"]:not([aria-hidden="true"])'
      )
      if (allTextElements && allTextElements.length > 0) {
        let combinedText = ""
        allTextElements.forEach((element) => {
          // 检查是否是推文文本而不是UI元素
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
      console.error("提取推文文本时出错:", error)
      return ""
    }
  }

  // 递归提取文本，保留格式
  function extractTextWithFormatting(element: Element): string {
    let text = ""

    try {
      // 递归函数处理节点
      const processNode = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent || ""
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element

          // 特殊处理图像表情符号
          if (element.nodeName === "IMG") {
            const alt = element.getAttribute("alt")
            return alt || ""
          }

          // 特殊处理链接 (hashtags, mentions, URLs)
          if (element.nodeName === "A") {
            const href = element.getAttribute("href") || ""
            const linkText = element.textContent || ""

            if (href.includes("/hashtag/")) {
              // 这是一个hashtag
              return linkText
            } else if (href.match(/\/[A-Za-z0-9_]+$/)) {
              // 这是一个mention
              return linkText
            } else if (href.includes("/search?q=")) {
              // 这是一个searchable term (如 $HONEY)
              return linkText
            } else {
              // 这是一个URL
              return linkText
            }
          }

          // 对于其他元素，处理所有子节点
          let childText = ""
          element.childNodes.forEach((child) => {
            childText += processNode(child)
          })

          // 对于块级元素添加适当的空格
          if (window.getComputedStyle(element).display === "block") {
            if (!childText.endsWith(" ")) {
              childText += " "
            }
          }

          return childText
        }

        return ""
      }

      // 处理元素的所有子节点
      element.childNodes.forEach((node) => {
        text += processNode(node)
      })

      // 清理连续的空格
      return text.replace(/\s+/g, " ").trim()
    } catch (error) {
      console.error("递归提取文本时出错:", error)
      return element.textContent?.trim() || ""
    }
  }

  // 提取推文的互动数据
  function extractEngagementData(article: Element): {
    likeCount: number
    retweetCount: number
    replyCount: number
  } {
    let likeCount = 0
    let retweetCount = 0
    let replyCount = 0

    try {
      // 1. 首先尝试查找data-testid属性标识的互动元素
      const engagementContainer = article.querySelector('div[role="group"]')

      if (engagementContainer) {
        // 查找所有互动元素
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

        // 如果通过data-testid找不到，尝试使用SVG路径匹配
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
              // 回复图标
              replyCount = number
            } else if (
              svgPath.includes("M4.5 3.88l4.432") ||
              button.innerHTML.includes("retweet")
            ) {
              // 转发图标
              retweetCount = number
            } else if (
              svgPath.includes("M16.697 5.5c-1.222") ||
              button.innerHTML.includes("like")
            ) {
              // 点赞图标
              likeCount = number
            }
          })
        }
      }

      // 2. 如果还是找不到，尝试直接查找数字
      if (likeCount === 0 && retweetCount === 0 && replyCount === 0) {
        // 查找所有span元素中包含数字的元素
        const allSpans = article.querySelectorAll("span")
        const numberSpans = Array.from(allSpans).filter((span) => {
          const text = span.textContent?.trim() || ""
          // 只匹配纯数字或带有K/M/B后缀的数字
          return /^\d+$|^\d+(\.\d+)?[KkMmBb]$/.test(text)
        })

        // 假设顺序是回复、转发、点赞
        if (numberSpans.length >= 3) {
          replyCount = parseTwitterNumber(numberSpans[0].textContent || "")
          retweetCount = parseTwitterNumber(numberSpans[1].textContent || "")
          likeCount = parseTwitterNumber(numberSpans[2].textContent || "")
        }
      }

      console.log(
        `互动数据: 回复=${replyCount}, 转发=${retweetCount}, 点赞=${likeCount}`
      )

      return { likeCount, retweetCount, replyCount }
    } catch (error) {
      console.error("提取互动数据时出错:", error)
      return { likeCount: 0, retweetCount: 0, replyCount: 0 }
    }
  }

  // Improved helper function to parse Twitter number formats (e.g., "1.5K", "23.4K", "1M")
  function parseTwitterNumber(text: string): number {
    if (!text) return 0

    // Clean up the text
    const cleanText = text.replace(/[,\s]/g, "").trim()

    // 如果文本不包含任何数字，返回0
    if (!/\d/.test(cleanText)) return 0

    // 提取数字部分和后缀
    const match = cleanText.match(/(\d+(?:\.\d+)?)([KkMmBb])?/)
    if (!match) return 0

    const num = parseFloat(match[1])
    let multiplier = 1

    // 处理后缀
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

  // Add a function to manually reload posts for the current user
  function manuallyLoadPosts(
    username: string,
    setLoading: Function,
    setPosts: Function,
    setError: Function
  ) {
    setLoading(true)
    setError(null)

    try {
      const scrapedPosts = scrapeUserPostsFromDOM()

      if (scrapedPosts.length > 0) {
        setPosts(scrapedPosts)
        setLoading(false)
        return true
      }

      // If we don't have posts, try to scroll down to load more
      window.scrollBy(0, 500) // Scroll down a bit

      // Try again after a short delay
      setTimeout(() => {
        const moreScrapedPosts = scrapeUserPostsFromDOM()
        if (moreScrapedPosts.length > 0) {
          setPosts(moreScrapedPosts)
        } else {
          setError("No posts found. Try refreshing the page.")
        }
        setLoading(false)
      }, 1500)

      return false
    } catch (error) {
      console.error("Error manually loading posts:", error)
      setError("Error loading posts. Please try again.")
      setLoading(false)
      return false
    }
  }

  // Get current username from URL path
  function getCurrentUsername(): string {
    const url = window.location.href
    const match = url.match(/(?:twitter\.com|x\.com)\/([^/\?#]+)/)

    // If it's a valid username (not home, explore, etc.)
    if (
      match &&
      match[1] &&
      ![
        "home",
        "explore",
        "notifications",
        "messages",
        "i",
        "settings"
      ].includes(match[1])
    ) {
      return match[1]
    }

    return ""
  }

  // Generate AI analysis
  const generateAIAnalysis = async () => {
    if (!posts.length) {
      setError("No posts available for analysis")
      return
    }

    setIsGeneratingAI(true)
    setError(null)

    try {
      chrome.runtime.sendMessage(
        {
          type: "ANALYZE_USER",
          username: currentUser,
          posts: posts.map((post) => post.text)
        },
        (response) => {
          if (response && response.success && response.analysis) {
            setAiAnalysis(response.analysis)
          } else {
            setError("Failed to generate analysis. Please try again.")
            // No fallback to mock data
            setAiAnalysis(null)
          }
          setIsGeneratingAI(false)
        }
      )
    } catch (error) {
      console.error("AI analysis error:", error)
      setError("Error generating analysis. Please try again.")
      // No fallback to mock data
      setAiAnalysis(null)
      setIsGeneratingAI(false)
    }
  }

  // Auto reply to a post
  const autoReply = async (postId: string) => {
    if (!aiAnalysis) {
      setError("Please generate AI analysis first")
      return
    }

    setLoading(true)
    try {
      chrome.runtime.sendMessage(
        {
          type: "AUTO_REPLY",
          postId,
          username: currentUser,
          aiAnalysis
        },
        (response) => {
          if (response && response.success) {
            setNotification("Reply created successfully!")
            setTimeout(() => setNotification(null), 3000)
          } else {
            setError("Failed to create reply. Please try again.")
          }
          setLoading(false)
        }
      )
    } catch (error) {
      console.error("Auto reply error:", error)
      setError("Error creating reply. Please try again.")
      setLoading(false)
    }
  }

  // Like a post
  const likePost = async (postId: string) => {
    setLoading(true)
    try {
      chrome.runtime.sendMessage({ type: "LIKE_POST", postId }, (response) => {
        if (response && response.success) {
          // Update local posts data to show like status
          setPosts(
            posts.map((post) =>
              post.id === postId
                ? { ...post, likeCount: post.likeCount + 1 }
                : post
            )
          )
          setNotification("Post liked successfully!")
          setTimeout(() => setNotification(null), 3000)
        } else {
          setError("Failed to like post. Please try again.")
        }
        setLoading(false)
      })
    } catch (error) {
      console.error("Like post error:", error)
      setError("Error liking post. Please try again.")
      setLoading(false)
    }
  }

  // Repost/retweet
  const repostTweet = async (postId: string) => {
    setLoading(true)
    try {
      chrome.runtime.sendMessage(
        { type: "REPOST_TWEET", postId },
        (response) => {
          if (response && response.success) {
            // Update local posts data to show repost status
            setPosts(
              posts.map((post) =>
                post.id === postId
                  ? { ...post, retweetCount: post.retweetCount + 1 }
                  : post
              )
            )
            setNotification("Tweet reposted successfully!")
            setTimeout(() => setNotification(null), 3000)
          } else {
            setError("Failed to repost tweet. Please try again.")
          }
          setLoading(false)
        }
      )
    } catch (error) {
      console.error("Repost tweet error:", error)
      setError("Error reposting tweet. Please try again.")
      setLoading(false)
    }
  }

  // Save settings
  const saveSettings = () => {
    setSaving(true)

    chrome.runtime.sendMessage(
      {
        type: "UPDATE_SETTINGS",
        settings: settings
      },
      (response) => {
        if (response && response.success) {
          setNotification("Settings saved successfully!")
          setTimeout(() => setNotification(null), 3000)
        } else {
          setError("Failed to save settings. Please try again.")
        }
        setSaving(false)
      }
    )
  }

  // Reset settings
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
    setNotification("Settings reset (not yet saved)")
    setTimeout(() => setNotification(null), 3000)
  }

  // Format date for display
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString()
  }

  // Close the sidebar
  const closeSidebar = () => {
    const sidebar = document.getElementById("twitter-analysis-sidebar")
    if (sidebar) {
      sidebar.remove()
    }
  }

  // Render posts tab content
  const renderPostsTab = () => {
    if (loading) {
      return <div className="loading-spinner">Loading posts...</div>
    }

    if (error) {
      return (
        <div className="error-message">
          <p>{error}</p>
          <button className="refresh-button" onClick={refreshPosts}>
            Refresh Posts
          </button>
        </div>
      )
    }

    if (!posts || posts.length === 0) {
      return (
        <div className="no-data">
          <p>No posts available for this user.</p>
          <button className="refresh-button" onClick={refreshPosts}>
            Refresh Posts
          </button>
        </div>
      )
    }

    return (
      <div className="posts-container">
        <div className="posts-header">
          <h3>Recent Posts</h3>
          <button
            className="refresh-button"
            onClick={refreshPosts}
            title="Refresh posts">
            <span>↻</span>
          </button>
        </div>
        <div className="posts-list" ref={postsContainerRef}>
          {posts.map((post) => (
            <div key={post.id} className="post-item">
              <p className="post-text">{formatTweetText(post.text)}</p>
              <p className="post-date">{formatDate(post.timestamp)}</p>
              <div className="post-actions">
                <span className="post-action">
                  <span className="action-icon">💬</span> {post.replyCount}
                </span>
                <span className="post-action">
                  <span className="action-icon">🔄</span> {post.retweetCount}
                </span>
                <span className="post-action">
                  <span className="action-icon">❤️</span> {post.likeCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Render AI tab with integrated analytics
  const renderAITab = () => {
    return (
      <div className="ai-tab">
        {/* 集成分析数据 */}
        <div className="analytics-section">
          <h3>User Analysis</h3>
          <ExploreAnalytics username={currentUser} />
        </div>

        <div className="ai-section">
          <h3>AI Analysis</h3>
          <button
            className="generate-btn"
            onClick={generateAIAnalysis}
            disabled={isGeneratingAI || !posts.length}>
            {isGeneratingAI ? "Generating..." : "Generate Analysis"}
          </button>

          {isGeneratingAI ? (
            <div className="loading-spinner"></div>
          ) : aiAnalysis ? (
            <div className="ai-analysis">
              <h4>Personality Traits</h4>
              <p>{aiAnalysis}</p>
            </div>
          ) : (
            <p className="no-data">
              Click "Generate Analysis" to get AI-driven insights.
            </p>
          )}
        </div>
      </div>
    )
  }

  // Add auto-scroll functionality when Twitter page scrolls
  function setupTwitterScrollMonitor(
    setPosts: React.Dispatch<React.SetStateAction<Post[]>>
  ) {
    // 检查是否已经设置了滚动监听器
    if (window["twitterScrollMonitorActive"]) return

    // 标记已经设置了监听器
    window["twitterScrollMonitorActive"] = true

    let lastScrollY = window.scrollY
    let lastPostCount = 0
    let scrollTimer: number | null = null

    // 当用户滚动Twitter页面时触发
    window.addEventListener("scroll", () => {
      // 清除之前的定时器
      if (scrollTimer) {
        window.clearTimeout(scrollTimer)
      }

      // 设置新的定时器，滚动停止后执行
      scrollTimer = window.setTimeout(() => {
        // 只在用户向下滚动且滚动大于100px时触发
        if (window.scrollY > lastScrollY + 100) {
          console.log("检测到向下滚动，尝试抓取新内容...")
          const newPosts = scrapeUserPostsFromDOM()

          // 只在找到新内容时更新
          if (newPosts.length > lastPostCount) {
            console.log(
              `找到新内容: ${newPosts.length - lastPostCount} 条新推文`
            )
            setPosts(newPosts)
            lastPostCount = newPosts.length
          }
        }

        lastScrollY = window.scrollY
      }, 300) // 等待300ms确保滚动已停止
    })

    console.log("已设置Twitter滚动监听")
  }

  // Function to sync sidebar scroll with Twitter page
  function setupSidebarScrollSync(
    postsContainerRef: React.RefObject<HTMLDivElement>
  ) {
    if (!postsContainerRef.current) return

    // 防止重复设置
    if (postsContainerRef.current.getAttribute("data-scroll-synced") === "true")
      return
    postsContainerRef.current.setAttribute("data-scroll-synced", "true")

    // 侧边栏滚动事件处理
    let sidebarScrollTimer: number | null = null

    postsContainerRef.current.addEventListener("scroll", () => {
      if (!postsContainerRef.current) return

      // 清除之前的定时器
      if (sidebarScrollTimer) {
        window.clearTimeout(sidebarScrollTimer)
      }

      // 设置新的定时器，滚动停止后执行
      sidebarScrollTimer = window.setTimeout(() => {
        // 检查是否滚动到底部
        const { scrollTop, scrollHeight, clientHeight } =
          postsContainerRef.current
        const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 50

        if (scrolledToBottom) {
          console.log("侧边栏滚动到底部，触发Twitter页面滚动")

          // 滚动Twitter页面加载更多内容
          window.scrollBy({ top: 800, behavior: "smooth" })

          // 等待内容加载
          setTimeout(() => {
            const newPosts = scrapeUserPostsFromDOM()
            // 如果有新内容，自动更新
            if (newPosts.length > 0) {
              setPosts(newPosts)
            }
          }, 2000)
        }
      }, 200)
    })

    console.log("已设置侧边栏滚动同步")
  }

  // Handle successful scrape
  const handleScraperSuccess = (data: TwitterProfileData) => {
    setScrapedData(data)
    console.log("Scraped data:", data)
  }

  // Handle scraper error
  const handleScraperError = (error: string) => {
    console.error("Scraper error:", error)
  }

  // Add a new tab for the scraper
  const renderScraperTab = () => {
    return (
      <div className="twitter-analysis-tab-content">
        <ProfileScraper
          username={username || getCurrentUsername()}
          scrollCount={5}
          onSuccess={handleScraperSuccess}
          onError={handleScraperError}
        />
      </div>
    )
  }

  return (
    <div className="twitter-analysis-sidebar-inner">
      <div className="sidebar-header">
        <h2>Twitter Analyzer</h2>
        <button className="close-button" onClick={closeSidebar}>
          ×
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {notification && (
        <div className="notification">
          <p>{notification}</p>
        </div>
      )}

      <div className="user-info">
        {userDisplayName && userDisplayName !== currentUser && (
          <p className="display-name">{userDisplayName}</p>
        )}
        <p className="username">
          <span className="username-text">@{currentUser}</span>
        </p>
      </div>

      <div className="tabs">
        <button
          className={activeTab === "scraper" ? "active" : ""}
          onClick={() => setActiveTab("scraper")}>
          <span className="icon icon-scraper">🕵️</span>
          Profile Scraper
        </button>
        <button
          className={activeTab === "settings" ? "active" : ""}
          onClick={() => setActiveTab("settings")}>
          <span className="icon icon-settings">⚙️</span>
          Settings
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "scraper" && renderScraperTab()}

        {activeTab === "settings" && (
          <div className="settings-tab">
            {/* Twitter API Settings */}
            {/* <div className="settings-section">
              <div className="settings-section-title">Twitter API Settings</div>
              <div className="settings-content">
                <div className="settings-form-group">
                  <div className="settings-toggle">
                    <span className="settings-toggle-label">
                      Enable Twitter API
                    </span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.twitterApiSettings.apiEnabled}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            twitterApiSettings: {
                              ...settings.twitterApiSettings,
                              apiEnabled: e.target.checked
                            }
                          })
                        }
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <p className="settings-description">
                    Connect to Twitter API for real data
                  </p>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">API Bearer Token</label>
                  <input
                    type="password"
                    className="settings-input"
                    value={settings.twitterApiSettings.bearerToken || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        twitterApiSettings: {
                          ...settings.twitterApiSettings,
                          bearerToken: e.target.value
                        }
                      })
                    }
                    placeholder="Enter your Twitter API Bearer Token"
                  />
                </div>
              </div>
            </div> */}

            {/* AI Settings */}
            <div className="settings-section">
              <div className="settings-section-title">AI Settings</div>
              <div className="settings-content">
                <div className="settings-form-group">
                  <div className="settings-toggle">
                    <span className="settings-toggle-label">
                      Enable AI Analysis
                    </span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.aiModelSettings.enabled}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            aiModelSettings: {
                              ...settings.aiModelSettings,
                              enabled: e.target.checked
                            }
                          })
                        }
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <p className="settings-description">
                    Use AI to analyze user profiles
                  </p>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">OpenAI API Key</label>
                  <input
                    type="password"
                    className="settings-input"
                    value={settings.aiModelSettings.apiKey || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        aiModelSettings: {
                          ...settings.aiModelSettings,
                          apiKey: e.target.value
                        }
                      })
                    }
                    placeholder="Enter your OpenAI API key"
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Model</label>
                  <select
                    className="settings-input"
                    value={settings.aiModelSettings.modelId}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        aiModelSettings: {
                          ...settings.aiModelSettings,
                          modelId: e.target.value
                        }
                      })
                    }>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interface Settings */}
            <div className="settings-section">
              <div className="settings-section-title">Interface Settings</div>
              <div className="settings-content">
                <div className="settings-form-group">
                  <div className="settings-toggle">
                    <span className="settings-toggle-label">Compact Mode</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.uiSettings.compactMode}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            uiSettings: {
                              ...settings.uiSettings,
                              compactMode: e.target.checked
                            }
                          })
                        }
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <p className="settings-description">
                    Show more information in less space
                  </p>
                </div>

                <div className="settings-form-group">
                  <div className="settings-toggle">
                    <span className="settings-toggle-label">
                      Show Advanced Metrics
                    </span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.analysisSettings.showAdvancedMetrics}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            analysisSettings: {
                              ...settings.analysisSettings,
                              showAdvancedMetrics: e.target.checked
                            }
                          })
                        }
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <p className="settings-description">
                    Display additional statistics and analytics
                  </p>
                </div>
              </div>
            </div>
            {/* Actions */}
            <div className="settings-actions">
              <button className="btn btn-reset" onClick={resetSettings}>
                Reset
              </button>
              <button
                className="btn btn-save"
                onClick={saveSettings}
                disabled={saving}>
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Get current Twitter username
function getCurrentTwitterUsername(): string {
  const url = window.location.href
  const match = url.match(/(?:twitter\.com|x\.com)\/([^/\?]+)/)
  return match && match[1] !== "home" ? match[1] : ""
}

// Inject sidebar
function injectSidebar(username?: string) {
  const container = createSidebarContainer()
  const root = createRoot(container)
  root.render(<TwitterSidebar username={username} />)
}

// Create trigger button
function createTriggerButton() {
  // Remove any existing button first
  const existingButton = document.getElementById("twitter-analysis-trigger")
  if (existingButton) {
    existingButton.remove()
  }

  // Create button with reliable positioning, styled like Twitter's action buttons
  const button = document.createElement("button")
  button.id = "twitter-analysis-trigger"
  button.classList.add("twitter-analysis-button")

  // Set appropriate styling
  button.style.backgroundColor = "transparent"
  button.style.color = "var(--text-color-secondary, #536471)"
  button.style.border = "none"
  button.style.borderRadius = "9999px"
  button.style.padding = "8px"
  button.style.margin = "0 2px"
  button.style.cursor = "pointer"
  button.style.fontSize = "13px"
  button.style.fontWeight = "bold"
  button.style.display = "inline-flex"
  button.style.alignItems = "center"
  button.style.justifyContent = "center"

  button.innerHTML = `
    <span style="display: flex; align-items: center; justify-content: center;">
      <svg viewBox="0 0 24 24" width="18" height="18" style="margin-right: 4px;">
        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
      </svg>
      Analyze User
    </span>
  `
  button.title = "Analyze User"

  // Position the button near profile actions instead of as a floating button
  const insertButtonNearProfile = () => {
    // Try to find the profile actions area (buttons near the profile)
    const actionButtons = document.querySelectorAll('div[role="button"]')
    let profileActionsArea = null

    // Look for appropriate action buttons container
    for (const actionButton of actionButtons) {
      const text = actionButton.textContent?.toLowerCase()
      // Find a container that has typical profile buttons
      if (text && (text.includes("follow") || text.includes("message"))) {
        profileActionsArea = actionButton.parentElement
        if (profileActionsArea) break
      }
    }

    // If profile action area is found, insert our button there
    if (profileActionsArea && profileActionsArea.parentElement) {
      // Create a wrapper to match Twitter's style
      const buttonWrapper = document.createElement("div")
      buttonWrapper.style.display = "inline-block"
      buttonWrapper.style.marginLeft = "8px"
      buttonWrapper.appendChild(button)

      // Insert after the profile actions
      profileActionsArea.parentElement.appendChild(buttonWrapper)
      return true
    }

    // If we can't find a place near profile actions, try to find tweets on the page
    const tweets = document.querySelectorAll("article")
    if (tweets.length > 0) {
      // If there are tweets but no profile actions, add the floating button
      addFloatingButton()
      return true
    }

    return false
  }

  // Add floating button as fallback
  const addFloatingButton = () => {
    // Style as floating button
    button.style.position = "fixed"
    button.style.right = "20px"
    button.style.bottom = "80px"
    button.style.zIndex = "9998"
    button.style.width = "auto"
    button.style.height = "auto"
    button.style.borderRadius = "20px"
    button.style.backgroundColor = "var(--accent-color, #805ad5)"
    button.style.color = "white"
    button.style.padding = "8px 16px"
    button.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)"

    document.body.appendChild(button)
  }

  // Try to insert button near profile, or add floating button as fallback
  if (!insertButtonNearProfile()) {
    // If we couldn't insert near profile now, try again later when more elements load
    setTimeout(() => {
      if (!document.getElementById("twitter-analysis-trigger")) {
        if (!insertButtonNearProfile()) {
          addFloatingButton()
        }
      }
    }, 3000)
  }

  // Add click event listener
  button.addEventListener("click", () => {
    const sidebar = document.getElementById("twitter-analysis-sidebar")
    if (sidebar) {
      sidebar.remove()
    } else {
      injectSidebar(getCurrentTwitterUsername())
    }
  })
}

// Create user hover analyze buttons
function createHoverButtons() {
  // Check if we should skip hover buttons based on URL
  function shouldSkipHoverButtons() {
    // Don't add hover buttons on the left sidebar or other navigation pages
    const path = window.location.pathname
    return (
      path === "/" ||
      path === "/home" ||
      path === "/explore" ||
      path === "/notifications" ||
      path === "/messages" ||
      path.includes("/settings")
    )
  }

  // Remove existing observer if any
  if (window.twitterAnalysisObserver) {
    window.twitterAnalysisObserver.disconnect()
  }

  // Don't add hover buttons on navigation pages
  if (shouldSkipHoverButtons()) {
    return
  }

  // Detect Twitter user avatars in the page
  const observer = new MutationObserver((mutations) => {
    // Skip if we're on a page where we shouldn't show hover buttons
    if (shouldSkipHoverButtons()) {
      return
    }

    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        // Find user avatars in tweets/posts with more precise targeting
        // This selector specifically targets profile images in the main timeline
        const profileImages = document.querySelectorAll(
          'article img[src*="profile_images"]'
        )

        profileImages.forEach((img) => {
          if (img.getAttribute("data-analysis-button-added")) return

          const parent = img.closest("div")
          if (!parent) return

          img.setAttribute("data-analysis-button-added", "true")

          // Add hover event to avatar element
          parent.addEventListener("mouseenter", () => {
            // If there's already an analysis button, don't create another
            if (parent.querySelector(".hover-analysis-button")) return

            const hoverButton = document.createElement("button")
            hoverButton.className = "hover-analysis-button"
            hoverButton.style.position = "absolute"
            hoverButton.style.top = "50%"
            hoverButton.style.left = "50%"
            hoverButton.style.transform = "translate(-50%, -50%)"
            hoverButton.style.backgroundColor = "var(--accent-color, #805ad5)"
            hoverButton.style.color = "white"
            hoverButton.style.border = "none"
            hoverButton.style.borderRadius = "4px"
            hoverButton.style.padding = "4px 8px"
            hoverButton.style.fontSize = "12px"
            hoverButton.style.fontWeight = "600"
            hoverButton.style.cursor = "pointer"
            hoverButton.style.zIndex = "100"
            hoverButton.innerHTML = "Analyze"
            hoverButton.title = "Analyze this user"

            parent.style.position = "relative"
            parent.appendChild(hoverButton)

            // Get username information
            let username = ""

            // Try to get username from page elements
            const usernameEl = parent
              .closest("article")
              ?.querySelector('a[href*="/status/"]')
            if (usernameEl) {
              const href = usernameEl.getAttribute("href")
              if (href) {
                const match = href.match(/\/([^\/]+)\/status\//)
                if (match && match[1]) {
                  username = match[1]
                }
              }
            }

            // Click event - open sidebar and add to analysis list
            hoverButton.addEventListener("click", (e) => {
              e.stopPropagation()
              e.preventDefault()

              // Get user profile
              const userName = username || "unknown"

              // Open sidebar
              const sidebar = document.getElementById(
                "twitter-analysis-sidebar"
              )
              if (!sidebar) {
                injectSidebar(userName)
              }

              // Send message to sidebar
              setTimeout(() => {
                // Use custom event to add user to analysis list
                const event = new CustomEvent("add-user-to-analysis", {
                  detail: { username: userName }
                })
                document.dispatchEvent(event)
              }, 300)
            })
          })

          // Remove button on mouse leave
          parent.addEventListener("mouseleave", () => {
            const button = parent.querySelector(".hover-analysis-button")
            if (button) {
              button.remove()
            }
          })
        })
      }
    }
  })

  // Save observer reference to window for future cleanup
  window.twitterAnalysisObserver = observer

  // Start observing DOM changes with a more targeted approach
  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}

// Initialize
function initTwitterAnalysis() {
  // Check if X/Twitter UI is fully loaded before initializing
  function isTwitterLoaded() {
    // Check for Twitter's main elements to ensure the UI is loaded
    const mainColumn = document.querySelector('main[role="main"]')
    const twitterLogo =
      document.querySelector('a[aria-label="X"]') ||
      document.querySelector('a[aria-label="Twitter"]')

    return !!mainColumn && !!twitterLogo
  }

  // Initialize our extension when Twitter UI is ready
  function initialize() {
    if (!isTwitterLoaded()) {
      // If Twitter hasn't loaded yet, wait and try again
      setTimeout(initialize, 1000)
      return
    }

    // Clean up existing elements to avoid duplicates
    const existingButton = document.getElementById("twitter-analysis-trigger")
    if (existingButton) existingButton.remove()

    const existingSidebar = document.getElementById("twitter-analysis-sidebar")
    if (existingSidebar) existingSidebar.remove()

    // Create UI elements
    createTriggerButton()
    createHoverButtons()
  }

  // Start initialization
  initialize()

  // Listen for messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.action === "OPEN_SIDEBAR") {
      try {
        const sidebar = document.getElementById("twitter-analysis-sidebar")
        if (sidebar) {
          sidebar.remove()
        }
        injectSidebar(message.username)
        sendResponse({ success: true, message: "Sidebar opened successfully" })
      } catch (err) {
        console.error("Failed to open sidebar:", err)
        sendResponse({ success: false, error: "Failed to open sidebar" })
      }
      return true
    }
    return false
  })

  // Re-initialize on navigation events within Twitter's SPA
  // This helps handle Twitter's client-side navigation
  function handleTwitterNavigation() {
    let lastUrl = location.href

    // Check for URL changes
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href
        // Wait a moment for Twitter's UI to update after navigation
        setTimeout(initialize, 1500)
      }
    })

    // Start observing for URL changes
    observer.observe(document.body, { childList: true, subtree: true })
  }

  // Set up navigation handling
  handleTwitterNavigation()
}

// Initialize on DOMContentLoaded or immediately if already loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTwitterAnalysis)
} else {
  initTwitterAnalysis()
}

// Export empty component to satisfy Plasmo's requirements
export default function TwitterSidebarWrapper() {
  return null
}
