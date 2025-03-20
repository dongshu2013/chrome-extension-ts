/**
 * 应用设置接口
 */
export interface Settings {
  // 用户界面设置
  uiSettings: {
    theme: "light" | "dark" | "system"
    fontSize: number
    compactMode: boolean
  }
  
  // 分析设置
  analysisSettings: {
    autoAnalyze: boolean
    analysisDepth: "basic" | "standard" | "deep"
    showAdvancedMetrics: boolean
    analysisCacheTime: number // 缓存时间（小时）
  }
  
  // 搜索设置
  searchSettings: {
    searchResultsLimit: number
    sortBy: "relevance" | "followers" | "alphabetical"
    includeVerifiedOnly: boolean
  }
  
  // 隐私设置
  privacySettings: {
    saveSearchHistory: boolean
    shareAnonymousUsage: boolean
  }
  
  // Twitter API设置
  twitterApiSettings: {
    bearerToken: string
    apiEnabled: boolean
  }
  
  // AI模型设置
  aiModelSettings: {
    enabled: boolean
    apiKey: string
    modelId: string
    temperature: number
    maxTokens: number
    systemPrompt: string
  }
  
  // 回复设置
  replySettings: {
    remindViewDetails: boolean
    maxReplyLength: number
    useEmojis: boolean
  }
}

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS: Settings = {
  uiSettings: {
    theme: "system",
    fontSize: 14,
    compactMode: false
  },
  
  analysisSettings: {
    autoAnalyze: false,
    analysisDepth: "standard",
    showAdvancedMetrics: false,
    analysisCacheTime: 24
  },
  
  searchSettings: {
    searchResultsLimit: 10,
    sortBy: "relevance",
    includeVerifiedOnly: false
  },
  
  privacySettings: {
    saveSearchHistory: true,
    shareAnonymousUsage: false
  },
  
  twitterApiSettings: {
    bearerToken: "",
    apiEnabled: false
  },
  
  aiModelSettings: {
    enabled: false,
    apiKey: "",
    modelId: "gpt-3.5-turbo",
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: "你是一个专业的Twitter用户分析助手，善于分析用户的性格特征、兴趣爱好和沟通风格。请根据用户的推文内容进行分析并提供有用的见解。"
  },
  
  replySettings: {
    remindViewDetails: false,
    maxReplyLength: 140,
    useEmojis: true
  }
}

export interface Profile {
  id: string;
  name: string;
  text: string;
  createdAt: number;
  lastModified: number;
}

export interface ProfileStore {
  profiles: Profile[];
  activeProfileId?: string;
}

/**
 * List of valid OpenAI model IDs
 */
export const VALID_MODEL_IDS = [
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-16k",
  "gpt-4",
  "gpt-4-turbo",
  "gpt-4-32k",
];
