import type { Settings } from "./index";
import type { TwitterSearchUser } from "./twitter";
import type { TwitterUserAnalysis } from "../twitter/analyzer";

/**
 * 应用设置接口
 */
export interface Settings {
  // 用户界面设置
  uiSettings: {
    theme: "light" | "dark" | "system";
    fontSize: number;
    compactMode: boolean;
  };
  
  // 分析设置
  analysisSettings: {
    autoAnalyze: boolean;
    analysisDepth: "basic" | "standard" | "deep";
    showAdvancedMetrics: boolean;
    analysisCacheTime: number; // 小时
  };
  
  // 搜索设置
  searchSettings: {
    searchResultsLimit: number;
    sortBy: "relevance" | "followers" | "alphabetical";
    includeVerifiedOnly: boolean;
  };
  
  // 隐私设置
  privacySettings: {
    saveSearchHistory: boolean;
    shareAnonymousUsage: boolean;
  };
  
  // Twitter API设置
  twitterApiSettings: {
    bearerToken: string;
    apiEnabled: boolean;
  };
  
  // AI模型设置
  aiModelSettings: {
    enabled: boolean;
    apiKey: string;
    modelId: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  };
  
  // 回复设置
  replySettings: {
    remindViewDetails: boolean;
    maxReplyLength: number;
    useEmojis: boolean;
  };
}

/**
 * 应用状态接口
 */
export interface AppState {
  searchResults: TwitterSearchUser[];
  selectedUsers: TwitterSearchUser[];
  userAnalyses: Record<string, TwitterUserAnalysis>;
  currentUsername: string | null;
  searchQuery: string;
  settings: Settings;
  searchHistory: string[];
  recentAnalyses: Record<string, any>;
  lastSearch: {
    query: string;
    results: any[];
    timestamp: number;
  } | null;
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
    systemPrompt: "你是一个专业的Twitter用户分析助手，善于分析用户的性格特征、兴趣爱好和沟通风格。请根据用户的推文内容进行分析并提供有用的见解。"
  },
  
  // 回复设置
  replySettings: {
    remindViewDetails: false,
    maxReplyLength: 140,
    useEmojis: true
  }
}; 