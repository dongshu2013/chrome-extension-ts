import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"

import ExploreAnalytics from "../components/ExploreAnalytics"

import "./sidebar.css"

// Add type declaration for window
declare global {
  interface Window {
    twitterAnalysisObserver?: MutationObserver
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
    "analytics" | "posts" | "ai" | "settings"
  >("analytics")
  const [currentUser, setCurrentUser] = useState<string>(
    username || getCurrentTwitterUsername()
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)

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

  // Get current user's posts
  useEffect(() => {
    if (currentUser) {
      fetchUserPosts(currentUser)
    }
  }, [currentUser])

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
      // Try multiple selectors to find tweets (Twitter's DOM structure can vary)
      const tweetSelectors = [
        'div[data-testid="cellInnerDiv"]',
        'section[role="region"] div[data-testid="cellInnerDiv"]',
        'div[aria-label*="Timeline"] div[data-testid="cellInnerDiv"]',
        'div[data-testid="primaryColumn"] div[data-testid="cellInnerDiv"]'
      ]

      // Try each selector until we find tweets
      let tweetContainers: NodeListOf<Element> | null = null
      for (const selector of tweetSelectors) {
        const elements = document.querySelectorAll(selector)
        if (elements && elements.length > 0) {
          tweetContainers = elements
          break
        }
      }

      // If we didn't find any tweets, return empty array
      if (!tweetContainers || tweetContainers.length === 0) {
        console.warn("No tweet containers found on page")
        return []
      }

      // Username from URL for verification
      const urlUsername = getCurrentUsername().toLowerCase()

      // Process each tweet we found
      tweetContainers.forEach((container, index) => {
        try {
          // First verify this is a tweet from the profile owner (not a retweet or reply)
          const userLink = container.querySelector(
            'a[role="link"][href*="/' + urlUsername + '"]'
          )
          if (!userLink) {
            // Skip this container if it doesn't contain the user we're analyzing
            return
          }

          // Find the article element within the container
          const tweetEl = container.querySelector(
            'article[data-testid="tweet"]'
          )
          if (!tweetEl) return

          // Get tweet text with improved extraction
          let tweetText = ""
          // Look specifically for the tweet text container
          const tweetTextEl = tweetEl.querySelector(
            'div[data-testid="tweetText"]'
          )

          if (tweetTextEl) {
            // Process the tweet text element to preserve formatting, links and hashtags
            // Get all text nodes and links
            const textNodes = Array.from(tweetTextEl.childNodes)
            textNodes.forEach((node) => {
              // Handle text nodes
              if (node.nodeType === Node.TEXT_NODE) {
                tweetText += node.textContent || ""
              }
              // Handle link elements (hashtags, mentions, URLs)
              else if (node.nodeName === "A") {
                const linkEl = node as HTMLAnchorElement
                const href = linkEl.getAttribute("href") || ""

                // Add hashtags as they appear
                if (href.includes("/hashtag/")) {
                  tweetText += linkEl.textContent || ""
                }
                // Add mentions as they appear
                else if (href.match(/\/[A-Za-z0-9_]+$/)) {
                  tweetText += linkEl.textContent || ""
                }
                // Regular URLs
                else {
                  tweetText += linkEl.textContent || ""
                }
              }
              // Handle span elements (emojis, etc)
              else if (node.nodeName === "SPAN" || node.nodeName === "IMG") {
                tweetText += node.textContent || ""
              }
            })

            // Clean up the text
            tweetText = tweetText.trim()
          } else {
            // Fallback to simpler text extraction
            const textEl =
              tweetEl.querySelector("div[lang]") ||
              tweetEl.querySelector('div[dir="auto"]:not([aria-hidden="true"])')
            tweetText = textEl ? textEl.textContent?.trim() || "" : ""
          }

          // Extract the timestamp
          const timeElement = tweetEl.querySelector("time")
          const timestamp = timeElement
            ? timeElement.dateTime
            : new Date().toISOString()

          // Extract tweet ID from the article's closest link with status
          let tweetId = ""
          const articleParent = tweetEl.closest('div[role="link"]')
          if (articleParent) {
            const linkHref = articleParent.getAttribute("href") || ""
            const match = linkHref.match(/\/status\/(\d+)/)
            if (match && match[1]) {
              tweetId = match[1]
            }
          }

          // If ID still not found, try to find it in any status link
          if (!tweetId) {
            const statusLink = tweetEl.querySelector('a[href*="/status/"]')
            if (statusLink) {
              const href = statusLink.getAttribute("href") || ""
              const match = href.match(/\/status\/(\d+)/)
              if (match && match[1]) {
                tweetId = match[1]
              }
            }
          }

          // Fallback ID if needed
          if (!tweetId) {
            tweetId = `temp-${Date.now()}-${index}`
          }

          // Get engagement metrics with improved selectors
          let likeCount = 0
          let retweetCount = 0
          let replyCount = 0

          // Look for the group containing metrics
          const engagementGroup = tweetEl.querySelector('div[role="group"]')
          if (engagementGroup) {
            // Extract metrics
            // Likes
            const likeButton = engagementGroup.querySelector(
              'div[data-testid="like"]'
            )
            if (likeButton) {
              const likeText = likeButton.textContent || ""
              likeCount = parseTwitterNumber(likeText)
            }

            // Retweets
            const retweetButton = engagementGroup.querySelector(
              'div[data-testid="retweet"]'
            )
            if (retweetButton) {
              const retweetText = retweetButton.textContent || ""
              retweetCount = parseTwitterNumber(retweetText)
            }

            // Replies
            const replyButton = engagementGroup.querySelector(
              'div[data-testid="reply"]'
            )
            if (replyButton) {
              const replyText = replyButton.textContent || ""
              replyCount = parseTwitterNumber(replyText)
            }
          }

          // Only add posts with content that match the profile we're viewing
          if (tweetText.length > 0) {
            scrapedPosts.push({
              id: tweetId,
              text: tweetText,
              timestamp: timestamp,
              likeCount: likeCount,
              retweetCount: retweetCount,
              replyCount: replyCount
            })
          }
        } catch (error) {
          console.error("Error processing tweet:", error)
        }
      })

      console.log(`Scraped ${scrapedPosts.length} posts from page`)
      return scrapedPosts
    } catch (error) {
      console.error("Error in scrapeUserPostsFromDOM:", error)
      return []
    }
  }

  // Helper function to parse Twitter number formats (e.g., "1.5K", "23.4K", "1M")
  function parseTwitterNumber(text: string): number {
    if (!text) return 0

    // Extract number pattern
    const match = text.replace(/[,\s]/g, "").match(/(\d+(\.\d+)?)[KkMmBb]?/)
    if (!match) return 0

    const num = parseFloat(match[1])
    const multiplier = text.match(/[Kk]/)
      ? 1000
      : text.match(/[Mm]/)
        ? 1000000
        : text.match(/[Bb]/)
          ? 1000000000
          : 1

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
        <div className="posts-list">
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
        <p className="username">
          <span className="username-text">@{currentUser}</span>
        </p>
      </div>

      <div className="tabs">
        <button
          className={activeTab === "analytics" ? "active" : ""}
          onClick={() => setActiveTab("analytics")}>
          <span className="icon icon-analytics">📊</span>
          Analytics
        </button>
        <button
          className={activeTab === "posts" ? "active" : ""}
          onClick={() => setActiveTab("posts")}>
          <span className="icon icon-posts">📝</span>
          Posts
        </button>
        <button
          className={activeTab === "ai" ? "active" : ""}
          onClick={() => setActiveTab("ai")}>
          <span className="icon icon-ai">🤖</span>
          AI
        </button>
        <button
          className={activeTab === "settings" ? "active" : ""}
          onClick={() => setActiveTab("settings")}>
          <span className="icon icon-settings">⚙️</span>
          Settings
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "analytics" && (
          <div className="analytics-tab">
            <ExploreAnalytics username={currentUser} />
          </div>
        )}

        {activeTab === "posts" && (
          <div className="posts-tab">{renderPostsTab()}</div>
        )}

        {activeTab === "ai" && (
          <div className="ai-tab">
            <h3>AI Personality Analysis</h3>
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
                Click "Generate Analysis" to get AI-powered insights about this
                user.
              </p>
            )}
          </div>
        )}

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
