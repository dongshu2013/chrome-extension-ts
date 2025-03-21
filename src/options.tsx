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

  // Search settings
  searchSettings: {
    searchResultsLimit: 10,
    sortBy: "relevance",
    includeVerifiedOnly: false
  },

  // Privacy settings
  privacySettings: {
    saveSearchHistory: true,
    shareAnonymousUsage: false
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
    maxTokens: 2000,
    systemPrompt:
      "You are a professional Twitter user analysis assistant, skilled at analyzing users' personality traits, interests, and communication styles. Please analyze the user's tweets and provide useful insights."
  },

  // Reply settings
  replySettings: {
    remindViewDetails: false,
    maxReplyLength: 140,
    useEmojis: true
  }
}
