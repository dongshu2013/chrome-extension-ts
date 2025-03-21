import { Storage } from "@plasmohq/storage"

import { aiService } from "./services/ai"
import { twitterApi } from "./services/twitter"
import { twitterPostScraper } from "./services/twitter-post-scraper"
import { twitterScraper } from "./services/twitter-scraper"
import type { TwitterUserAnalysis } from "./twitter/analyzer"
import { DEFAULT_SETTINGS, type Settings } from "./types"
import type { TwitterPost, TwitterSearchUser } from "./types/twitter"

// Initialize storage
const storage = new Storage()

/**
 * 应用状态接口
 */
interface AppState {
  searchResults: TwitterSearchUser[]
  selectedUsers: TwitterSearchUser[]
  userAnalyses: Record<string, TwitterUserAnalysis>
  currentUsername: string | null
  searchQuery: string
  settings: Settings
}

/**
 * 初始应用状态
 */
const initialState: AppState = {
  searchResults: [],
  selectedUsers: [],
  userAnalyses: {},
  currentUsername: null,
  searchQuery: "",
  settings: DEFAULT_SETTINGS
}

// 响应消息请求
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    console.log("Background script received message:", message)

    // PING - 健康检查
    if (message.type === "PING") {
      sendResponse({
        success: true,
        message: "后台脚本正在运行",
        timestamp: Date.now()
      })
      return false
    }

    // SEARCH - 搜索用户
    if (message.type === "SEARCH") {
      handleSearch(message.query)
        .then((results) => sendResponse({ success: true, users: results }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "搜索失败"
          })
        )
      return true // 异步响应
    }

    // UPDATE_SELECTED_USERS - 更新已选择用户
    if (message.type === "UPDATE_SELECTED_USERS") {
      updateSelectedUsers(message.users)
        .then(() => sendResponse({ success: true }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "更新失败"
          })
        )
      return true // 异步响应
    }

    // ADD_USER_TO_SELECTED - 添加单个用户到已选择列表
    if (message.type === "ADD_USER_TO_SELECTED") {
      addUserToSelected(message.username)
        .then((success) => sendResponse({ success }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "添加用户失败"
          })
        )
      return true // 异步响应
    }

    // GET_APP_STATE - 获取应用状态
    if (message.type === "GET_APP_STATE") {
      getAppState()
        .then((state) => sendResponse({ success: true, state }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "获取状态失败"
          })
        )
      return true // 异步响应
    }

    // UPDATE_SETTINGS - 更新设置
    if (message.type === "UPDATE_SETTINGS") {
      updateSettings(message.settings)
        .then(() => sendResponse({ success: true }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "更新设置失败"
          })
        )
      return true // 异步响应
    }

    // ANALYZE_USER - 分析用户
    if (message.type === "ANALYZE_USER") {
      analyzeUser(message.username)
        .then((analysis) => sendResponse({ success: true, analysis }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "分析用户失败"
          })
        )
      return true // 异步响应
    }

    // GENERATE_REPLY - 生成回复
    if (message.type === "GENERATE_REPLY") {
      generateReply(message.username, message.context)
        .then((reply) => sendResponse({ success: true, reply }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "生成回复失败"
          })
        )
      return true // 异步响应
    }

    // BATCH_ANALYZE - 批量分析多个用户
    if (message.type === "BATCH_ANALYZE") {
      batchAnalyzeUsers(message.usernames)
        .then((results) => sendResponse({ success: true, results }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "批量分析失败"
          })
        )
      return true // 异步响应
    }

    // OPEN_SIDEBAR - 打开侧边栏
    if (message.type === "OPEN_SIDEBAR") {
      // 检查当前活动标签是否是Twitter
      chrome.tabs.query(
        {
          active: true,
          url: ["*://*.twitter.com/*", "*://*.x.com/*"]
        },
        (tabs) => {
          if (tabs.length > 0 && tabs[0].id) {
            // 发送消息给内容脚本打开侧边栏
            chrome.tabs.sendMessage(
              tabs[0].id,
              { action: "OPEN_SIDEBAR" },
              (response) => {
                sendResponse({
                  success: true,
                  message: "已发送打开侧边栏请求",
                  tabInfo: tabs[0]
                })
              }
            )
          } else {
            sendResponse({
              success: false,
              error: "当前活动标签不是Twitter"
            })
          }
        }
      )
      return true // 异步响应
    }

    // 测试Twitter API Token
    if (message.type === "TEST_TWITTER_TOKEN") {
      testTwitterToken(message.token)
        .then((isValid) => sendResponse({ success: isValid }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "验证失败"
          })
        )
      return true // 异步响应
    }

    // 测试OpenAI API Key
    if (message.type === "TEST_OPENAI_API_KEY") {
      testOpenAIApiKey(message.apiKey)
        .then((isValid) => sendResponse({ success: isValid }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "验证失败"
          })
        )
      return true // 异步响应
    }

    // FETCH_POSTS - Get posts from a Twitter user's profile
    if (message.type === "FETCH_POSTS") {
      fetchTwitterPosts(message.username, message.count || 20)
        .then((posts) =>
          sendResponse({
            success: true,
            posts,
            timestamp: Date.now()
          })
        )
        .catch((error) =>
          sendResponse({
            success: false,
            error:
              error instanceof Error ? error.message : "Failed to fetch posts"
          })
        )
      return true // Async response
    }

    // 未知消息类型
    sendResponse({ success: false, error: "未知消息类型" })
    return false
  } catch (error) {
    console.error("处理消息时出错:", error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "处理消息失败"
    })
    return false
  }
})

/**
 * 添加单个用户到已选择列表
 */
async function addUserToSelected(username: string): Promise<boolean> {
  try {
    console.log(`添加用户到已选择列表: ${username}`)

    // 先搜索该用户
    const users = await handleSearch(username)

    // 检查是否找到匹配的用户
    const user = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    )

    if (!user) {
      console.warn(`未找到与用户名 ${username} 匹配的用户`)
      return false
    }

    // 获取当前状态
    const state = await getAppState()

    // 检查用户是否已经在列表中
    const alreadyExists = state.selectedUsers.some(
      (u) => u.id === user.id || u.username === user.username
    )

    if (alreadyExists) {
      console.log(`用户 ${username} 已经在已选择列表中`)
      return true
    }

    // 添加用户到列表
    state.selectedUsers.push(user)

    // 保存更新后的状态
    await saveAppState(state)

    console.log(`已添加用户 ${username} 到已选择列表`)
    return true
  } catch (error) {
    console.error(`添加用户 ${username} 到已选择列表失败:`, error)
    throw error
  }
}

/**
 * 处理搜索请求
 */
async function handleSearch(query: string): Promise<TwitterSearchUser[]> {
  try {
    console.log(`处理搜索请求: ${query}`)

    // 获取当前状态
    const state = await getAppState()

    // 创建一个标记表示我们是否找到了结果
    let foundResults = false
    let results: TwitterSearchUser[] = []

    // 步骤1: 尝试使用爬虫获取数据
    try {
      console.log("尝试使用爬虫获取Twitter用户数据")

      // 获取搜索URL供用户查看
      const searchUrl = twitterScraper.getSearchUrl(query)
      console.log(`Twitter搜索URL: ${searchUrl}`)

      // 尝试使用爬虫获取数据
      const scrapedResults = await twitterScraper.scrapeUsers(query)

      if (scrapedResults && scrapedResults.length > 0) {
        console.log(`爬虫找到了 ${scrapedResults.length} 个结果`)
        results = scrapedResults
        foundResults = true
      } else {
        console.log("爬虫未找到结果，尝试其他方法")
      }
    } catch (error) {
      console.error("爬虫搜索失败:", error)
      console.log("尝试使用API或模拟数据")
    }

    // 步骤2: 如果爬虫失败，尝试使用Twitter API
    if (
      !foundResults &&
      state.settings.twitterApiSettings.apiEnabled &&
      state.settings.twitterApiSettings.bearerToken
    ) {
      console.log("使用Twitter API搜索用户")

      // 设置token
      twitterApi.setBearerToken(state.settings.twitterApiSettings.bearerToken)

      // 使用API搜索
      try {
        const limit = state.settings.searchSettings.searchResultsLimit || 10
        const apiResults = await twitterApi.searchUsers(query, limit)

        if (apiResults.length > 0) {
          console.log(`使用Twitter API找到 ${apiResults.length} 个结果`)
          results = apiResults
          foundResults = true
        } else {
          console.log("Twitter API没有找到结果，使用备用模拟数据")
        }
      } catch (error) {
        console.error("Twitter API搜索失败:", error)
        console.log("使用备用模拟数据")
      }
    } else if (!foundResults) {
      console.log("Twitter API未启用或者爬虫失败，使用模拟数据")
    }

    // 步骤3: 如果前两种方法都失败，使用模拟数据
    if (!foundResults) {
      console.log("使用模拟搜索数据")
      results = generateMockSearchResults(query)
    }

    // 保存搜索结果到存储
    state.searchResults = results
    state.searchQuery = query
    await saveAppState(state)

    // 根据排序方式处理
    return sortSearchResults(results, state.settings.searchSettings.sortBy)
  } catch (error) {
    console.error("搜索处理失败:", error)
    throw error
  }
}

/**
 * 根据指定的排序方式对搜索结果排序
 */
function sortSearchResults(
  results: TwitterSearchUser[],
  sortBy: string = "relevance"
): TwitterSearchUser[] {
  switch (sortBy) {
    case "followers":
      return [...results].sort((a, b) => b.followersCount - a.followersCount)

    case "alphabetical":
      return [...results].sort((a, b) => a.username.localeCompare(b.username))

    case "relevance":
    default:
      // 假设结果已经按相关性排序，或者我们不改变顺序
      return results
  }
}

/**
 * 生成模拟搜索结果
 */
function generateMockSearchResults(query: string): TwitterSearchUser[] {
  const queryLower = query.toLowerCase()
  // 添加更多样化的模拟数据和对查询的相关匹配

  // 预定义的知名用户数据
  const celebrityUsers = [
    {
      id: "elonmusk_id",
      username: "elonmusk",
      name: "Elon Musk",
      displayName: "Elon Musk",
      profile_image_url:
        "https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_400x400.jpg",
      verified: true,
      profileUrl: "https://twitter.com/elonmusk",
      bio: "CEO of Tesla, SpaceX, Neuralink and The Boring Company",
      followersCount: 150000000,
      followingCount: 220
    },
    {
      id: "BillGates_id",
      username: "BillGates",
      name: "Bill Gates",
      displayName: "Bill Gates",
      profile_image_url:
        "https://pbs.twimg.com/profile_images/1414439092373254147/JdS8yLGI_400x400.jpg",
      verified: true,
      profileUrl: "https://twitter.com/BillGates",
      bio: "Co-chair of the Bill & Melinda Gates Foundation",
      followersCount: 62900000,
      followingCount: 418
    },
    {
      id: "ylecun_id",
      username: "ylecun",
      name: "Yann LeCun",
      displayName: "Yann LeCun",
      profile_image_url:
        "https://pbs.twimg.com/profile_images/1483577865056702469/rWA-3_T7_400x400.jpg",
      verified: true,
      profileUrl: "https://twitter.com/ylecun",
      bio: "Chief AI Scientist at Meta, Professor at NYU",
      followersCount: 542000,
      followingCount: 1342
    }
  ]

  // 如果查询匹配这些知名用户，将它们作为结果返回
  const matchedCelebrities = celebrityUsers.filter(
    (user) =>
      user.username.toLowerCase().includes(queryLower) ||
      user.name.toLowerCase().includes(queryLower) ||
      user.bio.toLowerCase().includes(queryLower)
  )

  if (matchedCelebrities.length > 0) {
    return matchedCelebrities
  }

  // 否则生成一些随机结果
  return [
    {
      id: "mock_" + Date.now() + "_1",
      username: `${queryLower}_official`,
      displayName: `${query} Official`,
      profile_image_url: "https://via.placeholder.com/48?text=User1",
      verified: true,
      profileUrl: `https://twitter.com/${queryLower}_official`,
      bio: `Official account for ${query}`,
      followersCount: 10000,
      followingCount: 500
    },
    {
      id: "mock_" + Date.now() + "_2",
      username: `real_${queryLower}`,
      displayName: `Real ${query}`,
      profile_image_url: "https://via.placeholder.com/48?text=User2",
      verified: false,
      profileUrl: `https://twitter.com/real_${queryLower}`,
      bio: `Fan of ${query}`,
      followersCount: 5000,
      followingCount: 1000
    },
    {
      id: "mock_" + Date.now() + "_3",
      username: `${queryLower}_fan`,
      displayName: `${query} Fan Club`,
      profile_image_url: "https://via.placeholder.com/48?text=User3",
      verified: false,
      profileUrl: `https://twitter.com/${queryLower}_fan`,
      bio: `The biggest ${query} fan club`,
      followersCount: 2000,
      followingCount: 800
    }
  ]
}

/**
 * 更新已选择用户
 */
async function updateSelectedUsers(users: TwitterSearchUser[]): Promise<void> {
  try {
    const state = await getAppState()
    state.selectedUsers = users
    await saveAppState(state)
  } catch (error) {
    console.error("更新已选择用户失败:", error)
    throw error
  }
}

/**
 * 更新设置
 */
async function updateSettings(newSettings: Partial<Settings>): Promise<void> {
  try {
    const state = await getAppState()
    state.settings = { ...state.settings, ...newSettings }
    await saveAppState(state)
  } catch (error) {
    console.error("更新设置失败:", error)
    throw error
  }
}

/**
 * 获取应用状态
 */
async function getAppState(): Promise<AppState> {
  try {
    // 首先尝试从存储中获取现有状态
    const existingState = (await storage.get("appState")) as AppState | null

    // 如果不存在或不完整，使用初始状态
    if (!existingState || typeof existingState !== "object") {
      return { ...initialState }
    }

    // 合并现有状态和初始状态，确保所有字段都存在
    return {
      searchResults: existingState.searchResults || initialState.searchResults,
      selectedUsers: existingState.selectedUsers || initialState.selectedUsers,
      userAnalyses: existingState.userAnalyses || initialState.userAnalyses,
      currentUsername:
        existingState.currentUsername || initialState.currentUsername,
      searchQuery: existingState.searchQuery || initialState.searchQuery,
      settings: {
        ...initialState.settings,
        ...(existingState.settings || {})
      }
    }
  } catch (error) {
    console.error("获取应用状态失败:", error)
    // 如果发生错误，返回初始状态
    return { ...initialState }
  }
}

/**
 * 保存应用状态
 */
async function saveAppState(state: AppState): Promise<void> {
  try {
    await storage.set("appState", state)
  } catch (error) {
    console.error("保存应用状态失败:", error)
    throw error
  }
}

/**
 * 分析用户
 */
async function analyzeUser(username: string): Promise<TwitterUserAnalysis> {
  try {
    console.log(`分析用户: ${username}`)

    // 获取现有状态
    const state = await getAppState()

    // 检查缓存配置
    const cacheTimeMs =
      (state.settings.analysisSettings.analysisCacheTime || 24) * 60 * 60 * 1000

    // 检查是否已经有该用户的分析
    if (state.userAnalyses[username] && cacheTimeMs > 0) {
      // 如果分析是在缓存时间内生成的，直接返回
      const analysis = state.userAnalyses[username]
      const analysisAge = Date.now() - (analysis.generatedAt || 0)

      if (analysisAge < cacheTimeMs) {
        console.log(`使用缓存的用户分析: ${username}`)
        return analysis
      }
    }

    // 检查AI设置
    if (
      state.settings.aiModelSettings.enabled &&
      state.settings.aiModelSettings.apiKey
    ) {
      console.log("使用AI服务分析用户")

      try {
        // 初始化AI服务
        aiService.initialize(state.settings)

        // 获取用户推文
        let userTweets: string[] = []
        let userProfile: TwitterSearchUser | null = null

        // 步骤1: 尝试使用爬虫获取用户推文和资料
        try {
          console.log("尝试使用爬虫获取用户推文")

          // 获取用户资料
          userProfile = await twitterScraper.scrapeUserProfile(username)
          if (userProfile) {
            console.log("成功获取用户资料信息")
          }

          // 获取用户推文
          userTweets = await twitterScraper.scrapeUserTweets(username)
          console.log(`爬虫成功获取了 ${userTweets.length} 条推文`)
        } catch (error) {
          console.error("爬虫获取推文失败:", error)
          console.log("尝试使用API或模拟数据")
        }

        // 步骤2: 如果爬虫失败，尝试使用Twitter API
        if (
          userTweets.length === 0 &&
          state.settings.twitterApiSettings.apiEnabled &&
          state.settings.twitterApiSettings.bearerToken
        ) {
          console.log("使用Twitter API获取用户推文")
          twitterApi.setBearerToken(
            state.settings.twitterApiSettings.bearerToken
          )

          // 先获取用户信息
          const apiUserInfo = await twitterApi.getUserByUsername(username)

          if (apiUserInfo) {
            // 如果找到用户，获取他们的推文
            userTweets = await twitterApi.getUserTweets(apiUserInfo.id, 20)
            console.log(`从Twitter API获取了 ${userTweets.length} 条推文`)

            // 如果还没有用户资料，使用API结果
            if (!userProfile) {
              userProfile = apiUserInfo
            }
          } else {
            console.log(`Twitter API未找到用户 ${username}`)
          }
        }

        // 步骤3: 如果前两种方法都失败，使用模拟数据
        if (userTweets.length === 0) {
          console.log("使用模拟推文数据")
          userTweets = generateMockTweets(username, 10)
        }

        // 使用AI服务分析
        const analysisResult = await aiService.analyzeTwitterUser(
          username,
          userTweets,
          state.settings,
          userProfile ? userProfile.bio : undefined
        )

        // 构建分析结果
        const aiAnalysis: TwitterUserAnalysis = {
          username,
          generatedAt: Date.now(),
          analysisResult: {
            traits: analysisResult.traits,
            interests: analysisResult.interests,
            communicationStyle: analysisResult.communicationStyle,
            summary: analysisResult.summary,
            replyTemplates: analysisResult.replyTemplates
          }
        }

        // 保存结果
        state.userAnalyses[username] = aiAnalysis
        await saveAppState(state)

        return aiAnalysis
      } catch (error) {
        console.error("AI分析失败:", error)
        console.log("回退到模拟分析")
      }
    } else {
      console.log("AI分析未启用，使用模拟分析")
    }

    // 如果AI分析未启用或失败，使用模拟分析
    const mockAnalysis = generateMockAnalysis(username)

    // 保存分析结果
    state.userAnalyses[username] = mockAnalysis
    await saveAppState(state)

    return mockAnalysis
  } catch (error) {
    console.error(`分析用户 ${username} 失败:`, error)
    throw error
  }
}

/**
 * 生成模拟推文
 */
function generateMockTweets(username: string, count: number): string[] {
  const mockTweets = [
    `很高兴今天能和大家分享我的想法 #思考`,
    `刚刚看了一部很棒的电影，推荐给大家！`,
    `科技的发展真是日新月异，期待未来的变化 #科技 #创新`,
    `今天的天气真好，适合出去走走`,
    `工作忙碌的一天结束了，终于可以休息了 #工作 #生活`,
    `读了一本有趣的书，获益良多 #阅读 #学习`,
    `美食是生活的一大乐趣，今天尝试了新菜谱 #美食 #烹饪`,
    `运动真的能改善心情，刚跑完5公里感觉很棒 #健身 #运动`,
    `思考人生的意义，每个人都有自己的答案 #哲学 #思考`,
    `音乐是我放松的方式，分享一首喜欢的歌 #音乐 #放松`,
    `旅行让我看到不同的世界，期待下次旅程 #旅行 #探索`,
    `最近的项目很有挑战性，但也很有成就感 #工作 #挑战`,
    `家人的支持是我前进的动力 #家庭 #感恩`,
    `友谊需要经营，感谢一直陪伴的朋友们 #友谊 #感谢`,
    `环保意识应该从小事做起 #环保 #可持续`
  ]

  const tweets = []
  for (let i = 0; i < count; i++) {
    tweets.push(mockTweets[Math.floor(Math.random() * mockTweets.length)])
  }

  return tweets
}

/**
 * 生成模拟用户分析
 */
function generateMockAnalysis(username: string): TwitterUserAnalysis {
  // 预定义的知名用户分析
  const celebrityAnalyses: Record<string, TwitterUserAnalysis> = {
    elonmusk: {
      username: "elonmusk",
      generatedAt: Date.now(),
      analysisResult: {
        traits: ["独立思考", "创新", "冒险", "直言不讳", "工作狂"],
        interests: [
          "太空探索",
          "电动汽车",
          "人工智能",
          "可持续能源",
          "技术创新"
        ],
        communicationStyle: "直接、幽默、有时争议性",
        summary:
          "思维跳跃，对科技和未来充满热情，喜欢在社交媒体上分享想法和观点，经常引发讨论和辩论。",
        replyTemplates: [
          "感谢您的见解！您提出了关于[主题]的重要观点。作为一个注重创新的人，您可能也会对[相关主题]感兴趣。",
          "您的发言非常有启发性。考虑到您对[兴趣领域]的关注，我想分享一个相关的观点：[内容]。"
        ]
      }
    },
    BillGates: {
      username: "BillGates",
      generatedAt: Date.now(),
      analysisResult: {
        traits: ["分析性思维", "慈善", "全球视野", "谦逊", "终身学习者"],
        interests: ["全球健康", "气候变化", "教育", "技术创新", "读书"],
        communicationStyle: "深思熟虑、教育性、平和",
        summary:
          "理性而富有同情心，关注全球性问题，擅长将复杂话题简化为可理解的信息，注重基于数据的决策。",
        replyTemplates: [
          "您的观点很有见地。从全球健康的角度看，[相关内容]也是一个值得关注的问题。",
          "感谢分享！作为一个注重数据的人，您可能会对这些关于[主题]的研究发现感兴趣：[数据点]。"
        ]
      }
    },
    ylecun: {
      username: "ylecun",
      generatedAt: Date.now(),
      analysisResult: {
        traits: ["学术严谨", "开放思想", "好奇心", "创新", "合作"],
        interests: [
          "深度学习",
          "计算机视觉",
          "人工智能伦理",
          "科学研究",
          "技术教育"
        ],
        communicationStyle: "技术性、精确、教育性",
        summary:
          "思维严谨，关注AI领域的技术进步和伦理问题，善于解释复杂概念，积极参与学术和公共讨论。",
        replyTemplates: [
          "您的观点引发了我对[AI相关主题]的思考。从技术角度看，[补充技术细节]可能会对讨论有所帮助。",
          "这是个有趣的问题！考虑到深度学习的最新研究，[相关研究发现]可能会为您提供更多见解。"
        ]
      }
    }
  }

  // 如果是预定义的知名用户，返回对应的分析
  if (username in celebrityAnalyses) {
    return celebrityAnalyses[username]
  }

  // 否则生成随机分析
  // 特质列表
  const possibleTraits = [
    "分析性思维",
    "创新",
    "冒险",
    "社交",
    "谨慎",
    "直言不讳",
    "开放态度",
    "保守",
    "好奇心",
    "学术",
    "实用",
    "敏感",
    "积极乐观",
    "悲观",
    "幽默",
    "严肃",
    "节俭",
    "慷慨",
    "自信",
    "谦虚",
    "独立",
    "合作",
    "有条理",
    "灵活"
  ]

  // 兴趣列表
  const possibleInterests = [
    "科技",
    "政治",
    "艺术",
    "音乐",
    "电影",
    "旅行",
    "美食",
    "体育",
    "文学",
    "科学",
    "历史",
    "教育",
    "环保",
    "健康",
    "时尚",
    "摄影",
    "游戏",
    "社交媒体",
    "新闻",
    "投资",
    "加密货币",
    "人工智能",
    "创业",
    "设计"
  ]

  // 随机选择特质和兴趣
  const traits = []
  const interests = []

  for (let i = 0; i < 5; i++) {
    traits.push(
      possibleTraits[Math.floor(Math.random() * possibleTraits.length)]
    )
    interests.push(
      possibleInterests[Math.floor(Math.random() * possibleInterests.length)]
    )
  }

  // 避免重复
  const uniqueTraits = Array.from(new Set(traits))
  const uniqueInterests = Array.from(new Set(interests))

  // 沟通风格选项
  const communicationStyles = [
    "直接、简洁、实用",
    "友好、亲切、平易近人",
    "正式、专业、详细",
    "活泼、幽默、风趣",
    "深思熟虑、有条理、逻辑性强",
    "情感丰富、热情、表达性强",
    "学术、分析性、技术性",
    "启发性、教育性、鼓励性"
  ]

  // 随机选择沟通风格
  const communicationStyle =
    communicationStyles[Math.floor(Math.random() * communicationStyles.length)]

  // 生成总结
  const summaryTemplates = [
    `${username} 展现出[特质1]和[特质2]的特点，对[兴趣1]和[兴趣2]表现出浓厚的兴趣。`,
    `作为一个[特质1]的人，${username} 喜欢分享关于[兴趣1]的见解，同时也关注[兴趣2]。`,
    `${username} 的社交媒体活动展示了[特质1]和对[兴趣1]的热情，沟通风格通常是[沟通风格]。`
  ]

  let summary =
    summaryTemplates[Math.floor(Math.random() * summaryTemplates.length)]
  summary = summary
    .replace("[特质1]", uniqueTraits[0] || "分析性思维")
    .replace("[特质2]", uniqueTraits[1] || "开放态度")
    .replace("[兴趣1]", uniqueInterests[0] || "科技")
    .replace("[兴趣2]", uniqueInterests[1] || "社交媒体")
    .replace("[沟通风格]", communicationStyle)

  // 生成回复模板
  const replyTemplateStructures = [
    `感谢您的分享！作为一个关注[兴趣]的人，您可能会对[相关话题]感兴趣。`,
    `您的观点很有见地。从[特质]的角度看，[补充观点]也值得考虑。`,
    `作为一个[特质]的交流者，我认为您的评论关于[主题]很有价值，我想补充[补充信息]。`
  ]

  const replyTemplates = replyTemplateStructures.map((template) => {
    return template
      .replace(
        "[兴趣]",
        uniqueInterests[Math.floor(Math.random() * uniqueInterests.length)] ||
          "当前话题"
      )
      .replace(
        "[相关话题]",
        uniqueInterests[Math.floor(Math.random() * uniqueInterests.length)] ||
          "相关见解"
      )
      .replace(
        "[特质]",
        uniqueTraits[Math.floor(Math.random() * uniqueTraits.length)] ||
          "分析性"
      )
      .replace("[补充观点]", "这个主题的其他方面")
      .replace(
        "[主题]",
        uniqueInterests[Math.floor(Math.random() * uniqueInterests.length)] ||
          "当前讨论"
      )
      .replace("[补充信息]", "一些额外的相关信息")
  })

  return {
    username,
    generatedAt: Date.now(),
    analysisResult: {
      traits: uniqueTraits,
      interests: uniqueInterests,
      communicationStyle,
      summary,
      replyTemplates
    }
  }
}

/**
 * 生成回复
 */
async function generateReply(
  username: string,
  context: string
): Promise<string> {
  try {
    console.log(`为用户 ${username} 生成回复，上下文: ${context}`)

    // 获取应用状态
    const state = await getAppState()

    // 检查AI设置
    if (
      state.settings.aiModelSettings.enabled &&
      state.settings.aiModelSettings.apiKey
    ) {
      console.log("使用AI服务生成回复")

      try {
        // 初始化AI服务
        aiService.initialize(state.settings)

        // 获取用户分析
        let analysis = state.userAnalyses[username]

        // 如果没有分析结果，先进行分析
        if (!analysis) {
          analysis = await analyzeUser(username)
        }

        // 尝试获取用户的最新推文以提供更好的上下文
        let recentTweets: string[] = []
        try {
          console.log("获取用户最新推文以增强回复质量")
          recentTweets = await twitterScraper.scrapeUserTweets(username)
          console.log(`成功获取了 ${recentTweets.length} 条最新推文作为上下文`)
        } catch (error) {
          console.error("获取最新推文失败:", error)
          console.log("将只使用现有分析生成回复")
        }

        // 使用AI生成个性化回复
        if (analysis.analysisResult) {
          // 准备一些增强上下文的附加信息
          let enhancedContext = context

          // 添加推文引用
          if (recentTweets.length > 0) {
            enhancedContext += `\n\n参考用户最近的推文:\n${recentTweets.join("\n")}`
          }

          // 根据设置添加提醒访问详情
          if (state.settings.replySettings?.remindViewDetails) {
            enhancedContext += `\n请在回复中友好地提醒用户查看帖子详情。`
          }

          const reply = await aiService.generatePersonalizedReply(
            {
              username,
              traits: analysis.analysisResult.traits || [],
              interests: analysis.analysisResult.interests || [],
              communicationStyle:
                analysis.analysisResult.communicationStyle || "",
              summary: analysis.analysisResult.summary || ""
            },
            enhancedContext,
            state.settings
          )

          // 保存生成的回复
          analysis.generatedReply = reply
          state.userAnalyses[username] = analysis
          await saveAppState(state)

          return reply
        }
      } catch (error) {
        console.error("AI生成回复失败:", error)
        console.log("回退到模拟回复")
      }
    } else {
      console.log("AI生成回复未启用，使用模拟回复")
    }

    // 如果AI生成失败或未启用，使用模拟回复
    // 获取用户分析
    const analysis = await analyzeUser(username)

    // 如果有预设的回复模板，随机选择一个
    if (analysis.analysisResult?.replyTemplates?.length) {
      let template =
        analysis.analysisResult.replyTemplates[
          Math.floor(
            Math.random() * analysis.analysisResult.replyTemplates.length
          )
        ]

      // 增加关于详情的提醒
      const viewDetailsReminder = state.settings.replySettings
        ?.remindViewDetails
        ? " 如果您想了解更多，请查看详情。"
        : ""

      // 替换模板中的占位符
      template = template
        .replace("[主题]", context.substring(0, 10) + "...")
        .replace("[相关主题]", "相关话题")
        .replace(
          "[兴趣领域]",
          analysis.analysisResult.interests[0] || "相关领域"
        )
        .replace("[相关内容]", "相关观点")
        .replace("[补充观点]", "补充见解")
        .replace("[数据点]", "一些有趣的统计数据")
        .replace("[教育相关观点]", "教育的重要性")
        .replace("[AI相关主题]", "人工智能的发展")
        .replace("[补充技术细节]", "一些技术细节")
        .replace("[相关研究发现]", "最新研究结果")
        .replace("[伦理问题]", "AI伦理问题")
        .replace("[内容]", "我的补充观点")

      return template + viewDetailsReminder
    }

    // 如果没有模板，生成一个基本回复
    const viewDetailsReminder = state.settings.replySettings?.remindViewDetails
      ? " 如果您想了解更多，请查看详情。"
      : ""

    return `感谢您的分享！您的观点很有价值，我很欣赏您对${context.substring(0, 20)}...的见解。${viewDetailsReminder}`
  } catch (error) {
    console.error(`为用户 ${username} 生成回复失败:`, error)
    throw error
  }
}

/**
 * 批量分析多个用户
 */
async function batchAnalyzeUsers(
  usernames: string[]
): Promise<Record<string, TwitterUserAnalysis>> {
  try {
    console.log(`批量分析用户: ${usernames.join(", ")}`)

    const results: Record<string, TwitterUserAnalysis> = {}

    // 分析每个用户
    for (const username of usernames) {
      results[username] = await analyzeUser(username)
    }

    return results
  } catch (error) {
    console.error(`批量分析用户失败:`, error)
    throw error
  }
}

// 扩展安装或更新事件处理
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === "install") {
    console.log("扩展已安装")
    // 初始化存储的应用状态
    await saveAppState({ ...initialState })
  } else if (reason === "update") {
    console.log("扩展已更新")
    // 保留现有设置，但更新其他初始状态
    const state = await getAppState()
    await saveAppState({
      ...initialState,
      settings: state.settings || initialState.settings,
      selectedUsers: state.selectedUsers || []
    })
  }
})

/**
 * 测试Twitter API Token
 */
async function testTwitterToken(token: string): Promise<boolean> {
  try {
    console.log("测试Twitter API Token")

    // 临时设置token
    twitterApi.setBearerToken(token)

    // 验证token
    const isValid = await twitterApi.validateToken()

    return isValid
  } catch (error) {
    console.error("验证Twitter API Token失败:", error)
    return false
  }
}

/**
 * 测试OpenAI API Key
 */
async function testOpenAIApiKey(apiKey: string): Promise<boolean> {
  try {
    console.log("测试OpenAI API Key")

    // 验证API密钥
    const isValid = await aiService.validateApiKey(apiKey)

    return isValid
  } catch (error) {
    console.error("验证OpenAI API Key失败:", error)
    return false
  }
}

/**
 * Fetch posts from a Twitter user's profile
 */
async function fetchTwitterPosts(
  username: string,
  count: number = 20
): Promise<TwitterPost[]> {
  try {
    console.log(`Fetching posts for Twitter user: ${username}, count: ${count}`)

    // Get current settings
    const state = await getAppState()

    // Use the twitter post scraper to get posts
    const posts = await twitterPostScraper.getPosts(
      username,
      count,
      state.settings
    )

    console.log(`Successfully fetched ${posts.length} posts for ${username}`)
    return posts
  } catch (error) {
    console.error(`Failed to fetch posts for ${username}:`, error)
    throw error
  }
}
