import React, { useCallback, useEffect, useRef, useState } from "react"

import type { SidebarTab, TwitterSidebarProps } from "../../types/sidebar"
import { DEFAULT_SETTINGS } from "../../types/sidebar"
import type { TwitterProfileData } from "../../types/twitter"
import { getCurrentUserDisplayName } from "../../utils/domUtils"
import {
  getCurrentTwitterUsername,
  isPostDetailPage
} from "../../utils/twitterUtils"
import Notification from "./Notification"
import PostDetailTab from "./PostDetailTab"
import ScraperTab from "./ScraperTab"
import SettingsTab from "./SettingsTab"
import SidebarHeader from "./SidebarHeader"

/**
 * Twitter Sidebar Component
 * Main container for the Twitter analyzer sidebar
 */
const TwitterSidebar: React.FC<TwitterSidebarProps> = ({
  username,
  activeTabOverride
}) => {
  console.log(
    "TwitterSidebar rendering with activeTabOverride:",
    activeTabOverride
  )

  // 使用更可靠的强制渲染技术
  const [rerenderKey, setRerenderKey] = useState(Date.now())
  const forceRerender = useCallback(() => {
    console.log("Forcing re-render of sidebar component")
    setRerenderKey(Date.now())
  }, [])

  // State management
  const [activeTab, setActiveTab] = useState<SidebarTab>(
    (activeTabOverride as SidebarTab) || "scraper"
  )
  const [currentUser, setCurrentUser] = useState<string>(
    username || getCurrentTwitterUsername()
  )
  const [userDisplayName, setUserDisplayName] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<string | null>(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [scrapedData, setScrapedData] = useState<TwitterProfileData | null>(
    null
  )
  const activeTabRef = useRef(activeTab)

  // 增强版的 Tab 切换处理函数
  const handleTabChange = useCallback(
    (newTab: SidebarTab) => {
      console.log(`Tab change requested from ${activeTab} to ${newTab}`)

      // 如果正在点击同一个标签，强制重新渲染
      if (activeTab === newTab) {
        console.log("Same tab clicked, forcing re-render")
        forceRerender()
      }

      // 无论如何都更新状态
      setActiveTab(newTab)
      activeTabRef.current = newTab

      console.log(`Active tab has been set to: ${newTab}`)
    },
    [activeTab, forceRerender]
  )

  // 确保 activeTabOverride 更新 activeTab 状态
  useEffect(() => {
    if (activeTabOverride) {
      console.log(`Updating active tab from override: ${activeTabOverride}`)
      setActiveTab(activeTabOverride as SidebarTab)
      activeTabRef.current = activeTabOverride as SidebarTab
      forceRerender() // 强制整个组件重新渲染
    }
  }, [activeTabOverride, forceRerender])

  // 检测当前页面是否为帖子详情页面
  useEffect(() => {
    console.log(
      "Running checkIfPostDetailPage effect, current activeTab:",
      activeTabRef.current
    )

    const checkIfPostDetailPage = () => {
      const isPostPage = isPostDetailPage()
      console.log("Checking post detail page:", isPostPage)

      // 如果当前页面是帖子详情页面，自动切换到 Post Detail 标签
      if (isPostPage && activeTabRef.current !== "postDetail") {
        console.log("Auto switching to post detail tab")
        setActiveTab("postDetail")
        activeTabRef.current = "postDetail"
        forceRerender() // 强制整个组件重新渲染
      }
    }

    // 初始检查
    checkIfPostDetailPage()

    // 监听 URL 变化
    const handleURLChange = () => {
      console.log("URL changed, rechecking page type")
      checkIfPostDetailPage()
    }

    // 添加事件监听器
    window.addEventListener("popstate", handleURLChange)

    // 清理函数
    return () => {
      window.removeEventListener("popstate", handleURLChange)
    }
  }, [forceRerender])

  // 获取用户显示名称
  useEffect(() => {
    if (currentUser) {
      const displayName = getCurrentUserDisplayName(currentUser)
      setUserDisplayName(displayName)
    }
  }, [currentUser])

  // 加载设置
  useEffect(() => {
    async function loadSettingsFromStorage() {
      try {
        // 尝试从后台脚本获取设置
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

  // 保存设置
  const saveSettings = () => {
    setSaving(true)

    chrome.runtime.sendMessage(
      {
        type: "UPDATE_SETTINGS",
        settings: settings
      },
      (response) => {
        if (response && response.success) {
          showNotification("Settings saved successfully!")
        } else {
          setError("Failed to save settings. Please try again.")
        }
        setSaving(false)
      }
    )
  }

  // 重置设置
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
    showNotification("Settings reset (not yet saved)")
  }

  // 显示自动消失的通知
  const showNotification = (message: string) => {
    setNotification(message)
    setTimeout(() => setNotification(null), 3000)
  }

  // 关闭侧边栏
  const closeSidebar = () => {
    const sidebar = document.getElementById("twitter-analysis-sidebar")
    if (sidebar) {
      sidebar.remove()
    }
  }

  // 处理采集器成功
  const handleScraperSuccess = (data: TwitterProfileData) => {
    setScrapedData(data)
    console.log("Scraped data:", data)
    showNotification("Profile scraped successfully!")
  }

  // 处理采集器错误
  const handleScraperError = (error: string) => {
    console.error("Scraper error:", error)
    setError(`Failed to scrape profile: ${error}`)
  }

  // 渲染当前活动标签内容
  const renderTabContent = () => {
    console.log(
      "Rendering tab content for activeTab:",
      activeTab,
      "with rerender key:",
      rerenderKey
    )

    switch (activeTab) {
      case "scraper":
        return (
          <ScraperTab
            key={`scraper-tab-${rerenderKey}`}
            username={currentUser}
            onSuccess={handleScraperSuccess}
            onError={handleScraperError}
          />
        )

      case "postDetail":
        console.log(
          "Rendering PostDetailTab with key:",
          `post-detail-tab-${rerenderKey}`
        )
        return (
          <PostDetailTab
            key={`post-detail-tab-${rerenderKey}`}
            commentsCount={10}
          />
        )

      case "settings":
        return (
          <SettingsTab
            key={`settings-tab-${rerenderKey}`}
            settings={settings}
            setSettings={setSettings}
            saveSettings={saveSettings}
            resetSettings={resetSettings}
            saving={saving}
          />
        )

      default:
        return (
          <ScraperTab
            key={`scraper-tab-${rerenderKey}`}
            username={currentUser}
          />
        )
    }
  }

  return (
    <div
      className="twitter-analysis-sidebar-inner"
      key={`sidebar-${rerenderKey}`}>
      <SidebarHeader
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        username={currentUser}
        userDisplayName={userDisplayName}
        closeSidebar={closeSidebar}
      />

      <Notification
        error={error}
        notification={notification}
        setError={setError}
      />

      <div
        className="tab-content"
        key={`tab-content-${activeTab}-${rerenderKey}`}>
        {renderTabContent()}
      </div>
    </div>
  )
}

export default TwitterSidebar
