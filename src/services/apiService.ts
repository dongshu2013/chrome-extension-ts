import { TwitterProfileData } from "../types/twitter"

// Define the API endpoint URL - this should be configurable
let API_BASE_URL = "https://api.example.com/twitter-data"

/**
 * Interface for API service configuration
 */
export interface ApiServiceConfig {
  apiUrl: string
  apiKey?: string
  timeout?: number
}

/**
 * Interface for API response
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

/**
 * Configure the API service
 * @param config API service configuration
 */
export function configureApiService(config: ApiServiceConfig): void {
  if (config.apiUrl) {
    API_BASE_URL = config.apiUrl
  }
}

/**
 * Save Twitter profile data to the database via API
 * @param profileData Twitter profile data to save
 * @returns API response with status
 */
export async function saveTwitterProfileData(
  profileData: TwitterProfileData
): Promise<ApiResponse<{ id: string }>> {
  try {
    // Get API endpoint from storage if available
    const storage = chrome.storage.local
    const settings = await new Promise<any>((resolve) => {
      storage.get("appState", (result) => {
        resolve(result.appState?.settings)
      })
    })

    const apiUrl = settings?.apiSettings?.apiUrl || API_BASE_URL
    const apiKey = settings?.apiSettings?.apiKey || ""

    // Prepare headers
    const headers: HeadersInit = {
      "Content-Type": "application/json"
    }

    // Add API key if available
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`
    }

    // Make POST request to API
    const response = await fetch(`${apiUrl}/profiles`, {
      method: "POST",
      headers,
      body: JSON.stringify(profileData)
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error("API error:", responseData)
      return {
        success: false,
        error: responseData.message || "Failed to save profile data",
        statusCode: response.status
      }
    }

    return {
      success: true,
      data: responseData,
      statusCode: response.status
    }
  } catch (error) {
    console.error("Error saving Twitter profile data:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }
  }
}

/**
 * Get Twitter profile data from the database via API
 * @param username Twitter username to fetch
 * @returns API response with profile data
 */
export async function getTwitterProfileData(
  username: string
): Promise<ApiResponse<TwitterProfileData>> {
  try {
    // Get API endpoint from storage if available
    const storage = chrome.storage.local
    const settings = await new Promise<any>((resolve) => {
      storage.get("appState", (result) => {
        resolve(result.appState?.settings)
      })
    })

    const apiUrl = settings?.apiSettings?.apiUrl || API_BASE_URL
    const apiKey = settings?.apiSettings?.apiKey || ""

    // Prepare headers
    const headers: HeadersInit = {
      "Content-Type": "application/json"
    }

    // Add API key if available
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`
    }

    // Make GET request to API
    const response = await fetch(`${apiUrl}/profiles/${username}`, {
      method: "GET",
      headers
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error("API error:", responseData)
      return {
        success: false,
        error: responseData.message || "Failed to get profile data",
        statusCode: response.status
      }
    }

    return {
      success: true,
      data: responseData,
      statusCode: response.status
    }
  } catch (error) {
    console.error("Error getting Twitter profile data:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }
  }
}

/**
 * Delete Twitter profile data from the database via API
 * @param username Twitter username to delete
 * @returns API response with status
 */
export async function deleteTwitterProfileData(
  username: string
): Promise<ApiResponse<void>> {
  try {
    // Get API endpoint from storage if available
    const storage = chrome.storage.local
    const settings = await new Promise<any>((resolve) => {
      storage.get("appState", (result) => {
        resolve(result.appState?.settings)
      })
    })

    const apiUrl = settings?.apiSettings?.apiUrl || API_BASE_URL
    const apiKey = settings?.apiSettings?.apiKey || ""

    // Prepare headers
    const headers: HeadersInit = {
      "Content-Type": "application/json"
    }

    // Add API key if available
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`
    }

    // Make DELETE request to API
    const response = await fetch(`${apiUrl}/profiles/${username}`, {
      method: "DELETE",
      headers
    })

    if (!response.ok) {
      const responseData = await response.json().catch(() => ({}))
      console.error("API error:", responseData)
      return {
        success: false,
        error: responseData.message || "Failed to delete profile data",
        statusCode: response.status
      }
    }

    return {
      success: true,
      statusCode: response.status
    }
  } catch (error) {
    console.error("Error deleting Twitter profile data:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }
  }
}
