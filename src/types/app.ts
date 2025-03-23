import type { TwitterUserAnalysis } from "../twitter/analyzer"
import type { Settings } from "./index"
import type { TwitterSearchUser } from "./twitter"

/**
 * 应用状态接口
 */
export interface AppState {
  searchResults: TwitterSearchUser[]
  selectedUsers: TwitterSearchUser[]
  userAnalyses: Record<string, TwitterUserAnalysis>
  currentUsername: string | null
  searchQuery: string
  settings: Settings
  searchHistory: string[]
  recentAnalyses: Record<string, any>
  lastSearch: {
    query: string
    results: any[]
    timestamp: number
  } | null
}

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS: Settings = {
  // 用户界面设置
  uiSettings: {
    theme: "system",
    fontSize: 14,
    compactMode: false
  },

  // 分析设置
  analysisSettings: {
    autoAnalyze: false,
    analysisDepth: "standard",
    showAdvancedMetrics: false,
    analysisCacheTime: 24
  },

  // 搜索设置
  searchSettings: {
    searchResultsLimit: 10,
    sortBy: "relevance",
    includeVerifiedOnly: false
  },

  // 隐私设置
  privacySettings: {
    saveSearchHistory: true,
    shareAnonymousUsage: false
  },

  // Twitter API设置
  twitterApiSettings: {
    bearerToken: "",
    apiEnabled: false
  },

  // AI模型设置
  aiModelSettings: {
    enabled: false,
    apiKey: "",
    modelId: "gpt-3.5-turbo",
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt:
      "You are a professional Twitter user analysis assistant, good at analyzing the personality traits, interests and communication style of users. Please analyze the user's tweets and provide useful insights."
  },

  // 回复设置
  replySettings: {
    remindViewDetails: false,
    maxReplyLength: 140,
    useEmojis: true
  }
}
