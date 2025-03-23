import React from "react"
import { createRoot } from "react-dom/client"

import type { SidebarTab } from "../../types/sidebar"
import { createSidebarContainer } from "../../utils/domUtils"
import { getCurrentTwitterUsername } from "../../utils/twitterUtils"
import TwitterSidebar from "./"

/**
 * Inject sidebar with optional username and active tab
 * @param username Optional username to set in the sidebar
 * @param activeTabOverride Optional tab to activate
 */
export function injectSidebar(
  username?: string,
  activeTabOverride?: string
): void {
  const container = createSidebarContainer()
  const root = createRoot(container)
  root.render(
    <TwitterSidebar
      username={username || getCurrentTwitterUsername()}
      activeTabOverride={activeTabOverride}
    />
  )
}

/**
 * Remove existing sidebar if present
 * @returns True if sidebar was found and removed
 */
export function removeSidebar(): boolean {
  const sidebar = document.getElementById("twitter-analysis-sidebar")
  if (sidebar) {
    sidebar.remove()
    return true
  }
  return false
}

/**
 * Toggle sidebar visibility
 * @param username Optional username to set in the sidebar
 * @param activeTabOverride Optional tab to activate
 * @returns True if sidebar was injected, false if it was removed
 */
export function toggleSidebar(
  username?: string,
  activeTabOverride?: string
): boolean {
  if (removeSidebar()) {
    return false
  } else {
    injectSidebar(username, activeTabOverride)
    return true
  }
}

/**
 * Open sidebar with specific tab active
 * @param tabName Tab to activate
 * @param username Optional username to set
 */
export function openSidebarWithTab(
  tabName: SidebarTab,
  username?: string
): void {
  // If sidebar exists, remove it first
  removeSidebar()

  // Create new sidebar with specified tab active
  injectSidebar(username, tabName)
}

/**
 * Open post detail sidebar
 * This is a convenience function for opening the sidebar with post detail tab
 */
export function openPostDetailSidebar(): void {
  openSidebarWithTab("postDetail")
}
