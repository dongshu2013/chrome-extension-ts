import React from "react"

import type { SidebarTab } from "../../types/sidebar"

interface SidebarHeaderProps {
  activeTab: SidebarTab
  setActiveTab: React.Dispatch<React.SetStateAction<SidebarTab>>
  username: string
  userDisplayName: string
  closeSidebar: () => void
}

/**
 * Sidebar Header Component
 * Includes the title, close button, user info, and tab buttons
 */
const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  activeTab,
  setActiveTab,
  username,
  userDisplayName,
  closeSidebar
}) => {
  // 直接处理按钮点击事件的函数
  const handleTabClick = (tab: SidebarTab) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log(`Tab button clicked: ${tab}, current active tab: ${activeTab}`)
    // 如果已经是激活状态，则刷新以强制重新加载
    if (activeTab === tab) {
      console.log("Tab is already active, forcing refresh")
    }
    // 直接设置状态而非通过回调
    setActiveTab(tab)
    console.log(`Tab state should now be: ${tab}`)
  }

  return (
    <>
      <div className="sidebar-header">
        <h2>Twitter Analyzer</h2>
        <button className="close-button" onClick={closeSidebar}>
          ×
        </button>
      </div>

      <div className="user-info">
        {userDisplayName && userDisplayName !== username && (
          <p className="display-name">{userDisplayName}</p>
        )}
        <p className="username">
          <span className="username-text">@{username}</span>
        </p>
      </div>

      <div className="tabs">
        <button
          className={activeTab === "scraper" ? "active" : ""}
          onClick={handleTabClick("scraper")}>
          <span className="icon icon-scraper">🕵️</span>
          Profile Scraper
        </button>
        <button
          className={activeTab === "postDetail" ? "active" : ""}
          onClick={handleTabClick("postDetail")}>
          <span className="icon icon-post-detail">📝</span>
          Post Scraper
        </button>
        <button
          className={activeTab === "settings" ? "active" : ""}
          onClick={handleTabClick("settings")}>
          <span className="icon icon-settings">⚙️</span>
          Settings
        </button>
      </div>
    </>
  )
}

export default SidebarHeader
