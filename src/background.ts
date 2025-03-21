// Background script for the extension
import { Storage } from "@plasmohq/storage"

// Initialize storage
const storage = new Storage()

/**
 * App state interface
 */
interface AppState {
  currentUsername: string | null
  settings: any
  lastAnalyzedUsers: string[]
  cache: Record<string, any>
}

/**
 * Default settings
 */
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
  }
}

/**
 * Initial app state
 */
const initialState: AppState = {
  currentUsername: null,
  settings: DEFAULT_SETTINGS,
  lastAnalyzedUsers: [],
  cache: {}
}

// Background script initialization
console.log("[Background] Twitter User Analyzer - Background script started")

/**
 * Get app state
 */
async function getAppState(): Promise<AppState> {
  try {
    const state = (await storage.get("appState")) as AppState | null
    return state || initialState
  } catch (error) {
    console.error("[Background] Failed to get app state:", error)
    return initialState
  }
}

/**
 * Save app state
 */
async function saveAppState(state: AppState): Promise<void> {
  try {
    await storage.set("appState", state)
  } catch (error) {
    console.error("Failed to save app state:", error)
    throw error
  }
}

// Initialize app state when the background script loads
async function initializeAppState() {
  try {
    const storedState = (await storage.get("appState")) as AppState | undefined
    if (storedState) {
      initialState.settings = storedState.settings || DEFAULT_SETTINGS
      initialState.lastAnalyzedUsers = storedState.lastAnalyzedUsers || []
      initialState.cache = storedState.cache || {}
    } else {
      // If there's no stored state, save the default state
      await saveAppState(initialState)
    }
  } catch (error) {
    console.error("Error initializing app state:", error)
  }
}

// Initialize the state
initializeAppState()

// Update app settings
async function updateSettings(settings: any): Promise<void> {
  try {
    const state = await getAppState()
    state.settings = settings
    await storage.set("appState", state)
    console.log("[Background] Settings updated:", settings)
  } catch (error) {
    console.error("[Background] Failed to update settings:", error)
    throw error
  }
}

// Handler for GET_APP_STATE
function handleGetAppState(sendResponse) {
  sendResponse({
    success: true,
    state: initialState
  })
}

// Handler for UPDATE_SETTINGS
async function handleUpdateSettings(message, sendResponse) {
  try {
    const { settings } = message
    initialState.settings = settings
    await saveAppState(initialState)
    sendResponse({ success: true })
  } catch (error) {
    console.error("Error updating settings:", error)
    sendResponse({ success: false, error: "Failed to update settings" })
  }
}

// Handler for GET_USER_POSTS
function handleGetUserPosts(message, sendResponse) {
  const { username } = message
  console.log("Fetching posts for user:", username)

  // Generate dummy posts
  setTimeout(() => {
    const posts = generateDummyPosts(username, 10)
    sendResponse({ success: true, posts })
  }, 800) // Simulate network delay
}

// Handler for ANALYZE_USER
function handleAnalyzeUser(message, sendResponse) {
  const { username, posts } = message
  console.log("Analyzing user:", username)

  // Simulate analysis
  setTimeout(() => {
    const analysis = generateAIAnalysis(username, posts)
    sendResponse({ success: true, analysis })
  }, 2000) // Simulate AI analysis delay
}

// Handler for AUTO_REPLY
function handleAutoReply(message, sendResponse) {
  const { postId, username, aiAnalysis } = message
  console.log("Generating auto reply for post:", postId, "by user:", username)

  // Simulate reply generation
  setTimeout(() => {
    const reply = generateAutoReply(username, aiAnalysis)
    sendResponse({ success: true, reply })
  }, 1500) // Simulate reply generation delay
}

// Handler for LIKE_POST
function handleLikePost(message, sendResponse) {
  const { postId } = message
  console.log("Liking post:", postId)

  // Simulate like action
  setTimeout(() => {
    sendResponse({ success: true })
  }, 500) // Simulate action delay
}

// Handler for REPOST_TWEET
function handleRepostTweet(message, sendResponse) {
  const { postId } = message
  console.log("Reposting tweet:", postId)

  // Simulate repost action
  setTimeout(() => {
    sendResponse({ success: true })
  }, 500) // Simulate action delay
}

// Handler for GET_USER_ANALYTICS
function handleGetUserAnalytics(message, sendResponse) {
  const { username } = message
  console.log("Fetching analytics for user:", username)

  // Simulate analytics generation
  setTimeout(() => {
    const analytics = generateUserAnalytics(username)
    sendResponse({ success: true, analytics })
  }, 1000) // Simulate data generation delay
}

// Extension installation or update event handling
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === "install") {
    console.log("Extension installed")
    // Initialize app state storage
    await saveAppState({ ...initialState })
  } else if (reason === "update") {
    console.log("Extension updated")
    // Preserve existing settings, but update other initial state
    const state = await getAppState()
    await saveAppState({
      ...initialState,
      settings: state.settings || initialState.settings
    })
  }
})

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Make sure to respond asynchronously
  ;(async () => {
    try {
      // Handle different message types
      const { type } = message

      console.log("Background received message:", type)

      switch (type) {
        case "GET_USER_POSTS":
          handleGetUserPosts(message, sendResponse)
          break

        case "ANALYZE_USER":
          handleAnalyzeUser(message, sendResponse)
          break

        case "AUTO_REPLY":
          handleAutoReply(message, sendResponse)
          break

        case "LIKE_POST":
          handleLikePost(message, sendResponse)
          break

        case "REPOST_TWEET":
          handleRepostTweet(message, sendResponse)
          break

        case "GET_USER_ANALYTICS":
          handleGetUserAnalytics(message, sendResponse)
          break

        case "GET_APP_STATE":
          handleGetAppState(sendResponse)
          break

        case "UPDATE_SETTINGS":
          await handleUpdateSettings(message, sendResponse)
          break

        case "PING":
          sendResponse({
            success: true,
            message: "Background service is running"
          })
          break

        case "GET_USER_TWEETS":
          const { username } = message
          console.log(`[Background] Getting tweets for ${username}`)
          setTimeout(() => {
            const dummyTweets = generateDummyTweets(username, 10)
            sendResponse({ success: true, tweets: dummyTweets })
          }, 500)
          break

        default:
          console.warn("Unknown message type:", type)
          sendResponse({ success: false, error: "Unknown message type" })
      }
    } catch (error) {
      console.error("Error handling message:", error)
      sendResponse({ success: false, error: "Error handling message" })
    }
  })()

  // Return true to indicate we will respond asynchronously
  return true
})

/**
 * Generate dummy tweets for testing
 */
function generateDummyTweets(username: string, count: number) {
  const tweets = []
  for (let i = 0; i < count; i++) {
    tweets.push({
      id: `tweet-${i}-${Date.now()}`,
      text: `This is a sample tweet #${i} from ${username} about #TwitterAnalyzer`,
      created_at: new Date(Date.now() - i * 60000).toISOString(),
      user: {
        screen_name: username,
        name: username.charAt(0).toUpperCase() + username.slice(1),
        profile_image_url: "https://via.placeholder.com/48"
      },
      favorite_count: Math.floor(Math.random() * 100),
      retweet_count: Math.floor(Math.random() * 50),
      reply_count: Math.floor(Math.random() * 20)
    })
  }
  return tweets
}

/**
 * Generate dummy posts for testing
 */
function generateDummyPosts(username: string, count: number) {
  const posts = []
  const now = Date.now()
  const sixMonthsAgo = now - 6 * 30 * 24 * 60 * 60 * 1000

  for (let i = 0; i < count; i++) {
    // Generate a random timestamp between now and 6 months ago
    const timestamp = new Date(
      sixMonthsAgo + Math.random() * (now - sixMonthsAgo)
    ).toISOString()

    posts.push({
      id: `post-${i}-${username}-${Date.now()}`,
      text: getRealisticPostText(username, i),
      timestamp,
      likeCount: Math.floor(Math.random() * 100),
      retweetCount: Math.floor(Math.random() * 30),
      replyCount: Math.floor(Math.random() * 20)
    })
  }

  // Sort by timestamp (newest first)
  return posts.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

/**
 * Generate realistic post text
 */
function getRealisticPostText(username: string, index: number) {
  const topics = [
    "tech",
    "politics",
    "sports",
    "entertainment",
    "business",
    "science",
    "health"
  ]
  const topic = topics[Math.floor(Math.random() * topics.length)]

  const techPosts = [
    "Just tried the new update for #VSCode and it's a game changer! The performance improvements are incredible.",
    "AI isn't just about replacing jobs - it's about augmenting human capabilities and creating new opportunities. #TechFuture",
    "Hot take: Typescript > JavaScript and I'm tired of pretending it's not. #WebDev",
    "Finally switched to a mechanical keyboard and I can't believe I waited this long. My productivity is up 20%!",
    "The metaverse might be overhyped right now, but the underlying tech will transform how we interact online. #VR #AR"
  ]

  const politicsPosts = [
    "Regardless of your politics, we should all agree that voting is essential in a healthy democracy. #VoteToday",
    "Local politics matter more than national headlines for your day-to-day life. Get involved in your community!",
    "Just read a fascinating article about international diplomatic relations. The world is more interconnected than ever.",
    "Climate policy shouldn't be partisan. We all share one planet and need sustainable solutions. #ClimateAction",
    "Attended a town hall meeting yesterday. Encouraging to see so many engaged citizens asking tough questions."
  ]

  const sportsPosts = [
    "What a game last night! That last-minute goal had me jumping out of my seat! #SportsExcitement",
    "Hot take: Statistics in sports are interesting but can't capture the heart and determination of great athletes.",
    "My workout routine this month has been transformative. Consistency really is key. #FitnessJourney",
    "Predictions for the championship? I think we might see an underdog story this year. The talent pool is incredibly deep.",
    "Nothing beats the atmosphere of a live sporting event. The energy in the stadium today was electric!"
  ]

  const businessPosts = [
    "Startup culture glorifies hustle, but sustainable growth comes from balance and strategic thinking. #BusinessAdvice",
    "Just finished reading an insightful report on market trends for Q3. Fascinating shifts happening in consumer behavior.",
    "Remote work isn't just a pandemic trend - it's reshaping how we think about productivity and work-life balance.",
    "Attended a networking event that actually delivered value! Made some great connections in the industry. #Networking",
    "Customer service isn't just a department - it should be the foundation of your entire business philosophy."
  ]

  // Select appropriate template based on topic
  let templates = techPosts
  switch (topic) {
    case "politics":
      templates = politicsPosts
      break
    case "sports":
      templates = sportsPosts
      break
    case "business":
      templates = businessPosts
      break
    default:
      templates = techPosts
  }

  // Get a random template
  const template = templates[Math.floor(Math.random() * templates.length)]

  // Sometimes personalize with the username
  if (Math.random() > 0.7) {
    return `${template} What do you think, @${username}?`
  }

  return template
}

/**
 * Generate random Twitter handle
 */
function getRandomHandle() {
  const handles = [
    "techguru",
    "aiexpert",
    "devpro",
    "codemaster",
    "datawhiz",
    "innovator",
    "futurist",
    "researcher"
  ]
  return handles[Math.floor(Math.random() * handles.length)]
}

/**
 * Generate random user analytics data
 */
function generateUserAnalytics(username: string) {
  // Generate random statistics
  const stats = {
    followersCount: Math.floor(Math.random() * 5000) + 100,
    followingCount: Math.floor(Math.random() * 1000) + 50,
    tweetsCount: Math.floor(Math.random() * 3000) + 100,
    likesCount: Math.floor(Math.random() * 2000) + 50,
    joinDate: new Date(
      Date.now() - Math.floor(Math.random() * 5 * 365 * 24 * 60 * 60 * 1000)
    ).toISOString()
  }

  // Generate random activity metrics
  const activity = {
    tweetsPerDay: (Math.random() * 5).toFixed(1),
    mostActiveDay: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday"
    ][Math.floor(Math.random() * 7)],
    mostActiveHour: Math.floor(Math.random() * 24),
    engagementRate: (Math.random() * 5).toFixed(2) + "%"
  }

  return {
    username,
    stats,
    activity
  }
}

/**
 * Generate AI analysis
 */
function generateAIAnalysis(username: string, posts: string[]) {
  // Simulate AI personality analysis based on username and posts
  const personalities = [
    "analytical and detail-oriented",
    "creative and expressive",
    "passionate and opinionated",
    "thoughtful and reflective",
    "humorous and light-hearted",
    "professional and informative"
  ]

  const interests = [
    "technology trends",
    "current events",
    "arts and culture",
    "sports and fitness",
    "business and economy",
    "science and innovation"
  ]

  const randomPersonality =
    personalities[Math.floor(Math.random() * personalities.length)]
  const randomInterest1 =
    interests[Math.floor(Math.random() * interests.length)]
  const randomInterest2 =
    interests[Math.floor(Math.random() * interests.length)]

  return `Based on the content analysis, @${username} appears to be ${randomPersonality}. Their posts frequently discuss ${randomInterest1} and ${randomInterest2}, suggesting these are areas of interest or expertise. The communication style indicates someone who values clarity and engagement with their audience, often using a conversational tone to connect with followers.`
}

/**
 * Generate auto reply
 */
function generateAutoReply(username: string, aiAnalysis: string) {
  const replies = [
    `Great insights @${username}! I appreciate your perspective on this topic.`,
    `Thanks for sharing, @${username}. This adds a valuable viewpoint to the conversation.`,
    `Interesting point, @${username}. I hadn't considered that angle before.`,
    `I see what you mean, @${username}. Looking forward to more of your thoughts!`,
    `Well articulated, @${username}! You've given me something to think about.`
  ]

  return replies[Math.floor(Math.random() * replies.length)]
}
