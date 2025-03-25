/**
 * Types for Twitter sidebar
 */

/**
 * User post interface
 */
export interface Post {
  id: string
  text: string
  timestamp: string
  likeCount: number
  retweetCount: number
  replyCount: number
}

/**
 * Twitter Analysis Settings
 */
export interface TwitterSettings {
  // UI settings
  uiSettings: {
    theme: string
    fontSize: number
    compactMode: boolean
  }

  // Analysis settings
  analysisSettings: {
    autoAnalyze: boolean
    analysisDepth: string
    showAdvancedMetrics: boolean
    analysisCacheTime: number
  }

  // Twitter API settings
  twitterApiSettings: {
    bearerToken: string
    apiEnabled: boolean
  }

  // AI model settings
  aiModelSettings: {
    enabled: boolean
    apiKey: string
    modelId: string
    temperature: number
    maxTokens: number
  }

  // AI Parser settings for DOM parsing
  aiParserSettings: {
    enabled: boolean
    apiKey: string
    modelId: string
  }
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: TwitterSettings = {
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
  },

  // AI Parser settings for DOM parsing
  aiParserSettings: {
    enabled: false,
    apiKey: "",
    modelId: "google/gemma-3-27b-it:free"
  }
}

/**
 * Props for TwitterSidebar component
 */
export interface TwitterSidebarProps {
  username?: string
  activeTabOverride?: string
}

/**
 * Sidebar Tab Type
 */
export type SidebarTab = "posts" | "ai" | "settings" | "scraper" | "postDetail"
