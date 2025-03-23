import React, { useEffect, useState } from "react"

import "./style.css"

// Logging
function log(message: string, ...args: any[]) {
  console.log(`[Twitter Analyzer] ${message}`, ...args)
}

function logError(message: string, error: any) {
  console.error(`[Twitter Analyzer] ERROR: ${message}`, error)
}

// Check if the current tab is a Twitter page
async function isTwitterPage(url: string): Promise<boolean> {
  return url.includes("twitter.com") || url.includes("x.com")
}

// Extract username from Twitter URL
function extractUsername(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/([^/\?]+)/)
  return match ? match[1] : null
}

// Get parameters from URL
function getParameterByName(name: string, url = window.location.href) {
  name = name.replace(/[\[\]]/g, "\\$&")
  const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)")
  const results = regex.exec(url)
  if (!results) return null
  if (!results[2]) return ""
  return decodeURIComponent(results[2].replace(/\+/g, " "))
}

// Popup component
function Popup() {
  const [username, setUsername] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isOnTwitterPost, setIsOnTwitterPost] = useState(false)
  const [currentUrl, setCurrentUrl] = useState("")

  // Add FontAwesome
  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
    document.head.appendChild(link)
  }, [])

  // Initialize
  useEffect(() => {
    async function init() {
      try {
        // Check current tab
        log("Getting current tab")
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true
        })
        const url = tabs[0].url || ""
        setCurrentUrl(url)

        // Check if this is a Twitter page
        const isTwitter = await isTwitterPage(url)
        log(`Is Twitter page: ${isTwitter}`)

        // Check if we're on a Twitter post
        const isPost = url.includes("/status/")
        setIsOnTwitterPost(isPost)

        if (isTwitter) {
          // Get username from URL
          const usernameFromUrl = extractUsername(url)
          if (usernameFromUrl && usernameFromUrl !== "home") {
            setUsername(usernameFromUrl)
            setConnected(true)
          } else {
            // Try to get username from URL parameters
            const usernameFromParam = getParameterByName("username")
            if (usernameFromParam) {
              setUsername(usernameFromParam)
              setConnected(true)
            } else {
              if (isPost) {
                // On a post page, we're still connected
                setConnected(true)
              } else {
                setError(
                  "Please navigate to a Twitter user profile to analyze."
                )
              }
            }
          }
        } else {
          setError("Please open Twitter to use this extension.")
        }
      } catch (err) {
        logError("Error initializing popup", err)
        setError("Failed to initialize. Please refresh and try again.")
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  // Open analytics in sidebar
  const openAnalytics = async () => {
    if (!username) {
      setError("Please navigate to a Twitter user profile first.")
      return
    }

    log(`Opening analytics for ${username}`)
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })
      const tabId = tabs[0]?.id

      if (!tabId) throw new Error("No active tab found")

      await chrome.tabs.sendMessage(tabId, {
        action: "OPEN_SIDEBAR",
        username: username
      })
    } catch (err) {
      logError("Failed to open sidebar", err)
      setError("Failed to open sidebar. Please refresh the page and try again.")
    }
  }

  // Open Twitter
  const openTwitter = () => {
    log("Opening Twitter")
    chrome.tabs.create({ url: "https://twitter.com" })
  }

  // Open Twitter Post Detail in sidebar
  const sendOpenPostDetailTab = async () => {
    log("Opening Post Detail in sidebar")
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })
      const tabId = tabs[0]?.id

      if (!tabId) throw new Error("No active tab found")

      await chrome.tabs.sendMessage(tabId, {
        action: "OPEN_SIDEBAR_POST_DETAIL",
        postId: extractPostId(currentUrl)
      })
    } catch (err) {
      logError("Failed to open sidebar post detail", err)
      setError("Failed to open sidebar. Please refresh the page and try again.")
    }
  }

  // Extract post ID from URL
  const extractPostId = (url: string): string | null => {
    const match = url.match(/status\/(\d+)/)
    return match ? match[1] : null
  }

  // If loading
  if (loading) {
    return (
      <div className="popup-container loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  // If error
  if (error && !connected) {
    return (
      <div className="popup-container error">
        <div className="error-message">
          <span className="icon-error"></span>
          <p>{error}</p>
        </div>
        <div className="actions-container">
          <button className="btn btn-primary" onClick={openTwitter}>
            <span className="icon-open"></span>
            Open Twitter
          </button>
        </div>
      </div>
    )
  }
  // Main view
  return (
    <div className="popup-container">
      <div className="popup-header">
        <div className="logo">
          <span className="icon-logo"></span>
          <h1>Twitter Analyzer</h1>
        </div>
      </div>

      {/* Analytics Card */}
      <div className="card">
        <div className="card-content">
          <div className="card-header">
            <span className="icon-explore"></span>
            <h2 className="card-title">Explore Analytics</h2>
          </div>
          {username && <p className="username">@{username}</p>}
          <p className="card-description">
            View user statistics, activity analysis, and interaction patterns
          </p>
        </div>
        <hr className="divider" />
        <div className="card-actions">
          <button
            className="btn btn-primary"
            onClick={openAnalytics}
            disabled={!username}>
            <span className="icon-stats"></span>
            View User Analytics
          </button>
        </div>
      </div>

      {/* Post Detail Card */}
      <div className="card">
        <div className="card-content">
          <div className="card-header">
            <i
              className="fas fa-comment-alt"
              style={{ marginRight: "8px" }}></i>
            <h2 className="card-title">Post Scraper</h2>
          </div>
          {isOnTwitterPost && (
            <p className="post-info">
              <i
                className="fas fa-check-circle"
                style={{ color: "green", marginRight: "4px" }}></i>
              Currently on a tweet
            </p>
          )}
          <p className="card-description">
            Extract detailed tweet information including comments, likes,
            reposts and media
          </p>
        </div>
        <hr className="divider" />
        <div className="card-actions">
          <button className="btn btn-primary" onClick={sendOpenPostDetailTab}>
            <i className="fas fa-search" style={{ marginRight: "8px" }}></i>
            Scrape Post Details
          </button>
        </div>
      </div>

      <div className="actions-container">
        <button className="btn btn-outline" onClick={openTwitter}>
          <span className="icon-open"></span>
          Open Twitter
        </button>
      </div>
    </div>
  )
}

export default Popup
