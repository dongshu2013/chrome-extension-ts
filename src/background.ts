// Background script for the extension
import { Storage } from "@plasmohq/storage"

import { saveTwitterProfileData } from "./services/apiService"
import type { AppState } from "./types/app"

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
  },

  // AI Parser settings for DOM parsing
  aiParserSettings: {
    enabled: false,
    apiKey: "",
    modelId: "google/gemma-3-27b-it:free"
  },

  // API settings
  apiSettings: {
    apiUrl: "https://api.example.com/twitter-data",
    apiKey: "",
    enabled: false
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

      // Ensure all settings sections exist by merging with defaults
      if (!initialState.settings.apiSettings) {
        initialState.settings.apiSettings = DEFAULT_SETTINGS.apiSettings
      }

      // Ensure AI parser settings exist
      if (!initialState.settings.aiParserSettings) {
        initialState.settings.aiParserSettings =
          DEFAULT_SETTINGS.aiParserSettings
      }

      // Save the updated state with all required settings
      await saveAppState(initialState)
    } else {
      // If there's no stored state, save the default state
      await saveAppState(initialState)
    }
  } catch (error) {
    console.error("Failed to initialize app state:", error)
  }
}

// Initialize the state
initializeAppState()

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

/**
 * Handle save profile data message
 * @param message Message with profile data
 * @param sendResponse Response callback
 */
async function handleSaveProfileData(message, sendResponse) {
  try {
    console.log("[Background] Saving profile data:", message.username)

    const { profileData } = message

    if (!profileData) {
      sendResponse({ success: false, error: "No profile data provided" })
      return
    }

    // Save profile data
    const response = await saveTwitterProfileData(profileData)

    // Add to recently analyzed users
    if (response.success) {
      const state = await getAppState()

      // Check if user is already in the list
      if (!state.lastAnalyzedUsers.includes(profileData.profile.username)) {
        // Add to beginning of the list
        state.lastAnalyzedUsers.unshift(profileData.profile.username)

        // Keep only the last 10 users
        if (state.lastAnalyzedUsers.length > 10) {
          state.lastAnalyzedUsers = state.lastAnalyzedUsers.slice(0, 10)
        }

        await saveAppState(state)
      }
    }

    sendResponse(response)
  } catch (error) {
    console.error("[Background] Error saving profile data:", error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    })
  }
}

/**
 * Handle get saved profiles message
 * @param message Message with request
 * @param sendResponse Response callback
 */
async function handleGetSavedProfiles(message, sendResponse) {
  try {
    console.log("[Background] Getting saved profiles")

    const state = await getAppState()

    sendResponse({
      success: true,
      data: state.lastAnalyzedUsers
    })
  } catch (error) {
    console.error("[Background] Error getting saved profiles:", error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    })
  }
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
  console.log("[Background] Message received:", message.type)

  // Handle different message types
  switch (message.type) {
    case "GET_APP_STATE":
      handleGetAppState(sendResponse)
      return true

    case "UPDATE_SETTINGS":
      handleUpdateSettings(message, sendResponse)
      return true

    case "SAVE_PROFILE_DATA":
      handleSaveProfileData(message, sendResponse)
      return true

    case "GET_SAVED_PROFILES":
      handleGetSavedProfiles(message, sendResponse)
      return true

    case "PING":
      sendResponse({
        success: true,
        message: "Background service is running"
      })
      return true

    default:
      console.warn("[Background] Unknown message type:", message.type)
      sendResponse({ success: false, error: "Unknown message type" })
      return false
  }
})
