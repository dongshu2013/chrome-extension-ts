import type { PlasmoCSConfig } from "plasmo"

import {
  injectSidebar,
  openSidebarWithTab,
  removeSidebar
} from "../components/TwitterSidebar/sidebarManager"
import { getCurrentTwitterUsername } from "../utils/twitterUtils"

import "./sidebar.css"

// Script should run on Twitter and X.com
export const config: PlasmoCSConfig = {
  matches: ["*://*.twitter.com/*", "*://*.x.com/*"]
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
    if (removeSidebar()) {
      // Sidebar was removed
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

              // Open sidebar with the scraper tab
              openSidebarWithTab("scraper", userName)

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

    removeSidebar()

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
        removeSidebar()
        injectSidebar(message.username, message.activeTabOverride)
        sendResponse({ success: true, message: "Sidebar opened successfully" })
      } catch (err) {
        console.error("Failed to open sidebar:", err)
        sendResponse({ success: false, error: "Failed to open sidebar" })
      }
      return true
    } else if (message && message.action === "OPEN_SIDEBAR_POST_DETAIL") {
      try {
        removeSidebar()
        openSidebarWithTab("postDetail")
        sendResponse({
          success: true,
          message: "Post detail tab opened successfully"
        })
      } catch (err) {
        console.error("Failed to open post detail tab:", err)
        sendResponse({
          success: false,
          error: "Failed to open post detail tab"
        })
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
