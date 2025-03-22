import React, { useEffect, useState } from "react"

import { Storage } from "@plasmohq/storage"

import "./style.css"

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
  },

  // Add API settings section to the options page
  apiSettings: {
    apiUrl: "https://api.example.com/twitter-data",
    apiKey: "",
    enabled: false
  }
}

function OptionsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [saveStatus, setSaveStatus] = useState("")

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storage = new Storage()
        const appState = await storage.get("appState")

        if (appState?.settings) {
          // Merge with default settings to ensure all fields exist
          setSettings({
            ...DEFAULT_SETTINGS,
            ...appState.settings,
            // Ensure API settings exist
            apiSettings: {
              ...DEFAULT_SETTINGS.apiSettings,
              ...(appState.settings.apiSettings || {})
            }
          })
        }
      } catch (error) {
        console.error("Failed to load settings:", error)
      }
    }

    loadSettings()
  }, [])

  const saveSettings = async () => {
    try {
      const storage = new Storage()
      const appState = (await storage.get("appState")) || {}

      await storage.set("appState", {
        ...appState,
        settings
      })

      setSaveStatus("Settings saved successfully!")
      setTimeout(() => setSaveStatus(""), 3000)
    } catch (error) {
      console.error("Failed to save settings:", error)
      setSaveStatus("Failed to save settings. Please try again.")
      setTimeout(() => setSaveStatus(""), 3000)
    }
  }

  const handleSettingChange = (section, setting, value) => {
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [setting]: value
      }
    })
  }

  return (
    <div className="options-container">
      <h1>Twitter User Analyzer Settings</h1>

      {saveStatus && (
        <div
          className={`save-status ${saveStatus.includes("Failed") ? "error" : "success"}`}>
          {saveStatus}
        </div>
      )}

      <div className="options-sections">
        {/* UI Settings */}
        <div className="options-section">
          <h2>UI Settings</h2>
          <div className="options-form">
            <div className="form-group">
              <label>Theme:</label>
              <select
                value={settings.uiSettings.theme}
                onChange={(e) =>
                  handleSettingChange("uiSettings", "theme", e.target.value)
                }>
                <option value="system">System Default</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div className="form-group">
              <label>Font Size:</label>
              <input
                type="number"
                value={settings.uiSettings.fontSize}
                onChange={(e) =>
                  handleSettingChange(
                    "uiSettings",
                    "fontSize",
                    parseInt(e.target.value)
                  )
                }
                min="10"
                max="24"
              />
            </div>

            <div className="form-group">
              <label>Compact Mode:</label>
              <input
                type="checkbox"
                checked={settings.uiSettings.compactMode}
                onChange={(e) =>
                  handleSettingChange(
                    "uiSettings",
                    "compactMode",
                    e.target.checked
                  )
                }
              />
            </div>
          </div>
        </div>

        {/* Analysis Settings */}
        <div className="options-section">
          <h2>Analysis Settings</h2>
          <div className="options-form">
            <div className="form-group">
              <label>Auto-Analyze:</label>
              <input
                type="checkbox"
                checked={settings.analysisSettings.autoAnalyze}
                onChange={(e) =>
                  handleSettingChange(
                    "analysisSettings",
                    "autoAnalyze",
                    e.target.checked
                  )
                }
              />
            </div>

            <div className="form-group">
              <label>Analysis Depth:</label>
              <select
                value={settings.analysisSettings.analysisDepth}
                onChange={(e) =>
                  handleSettingChange(
                    "analysisSettings",
                    "analysisDepth",
                    e.target.value
                  )
                }>
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="deep">Deep</option>
              </select>
            </div>

            <div className="form-group">
              <label>Cache Time (hours):</label>
              <input
                type="number"
                value={settings.analysisSettings.analysisCacheTime}
                onChange={(e) =>
                  handleSettingChange(
                    "analysisSettings",
                    "analysisCacheTime",
                    parseInt(e.target.value)
                  )
                }
                min="1"
                max="720"
              />
            </div>
          </div>
        </div>

        {/* Twitter API Settings */}
        <div className="options-section">
          <h2>Twitter API Settings</h2>
          <div className="options-form">
            <div className="form-group">
              <label>API Enabled:</label>
              <input
                type="checkbox"
                checked={settings.twitterApiSettings.apiEnabled}
                onChange={(e) =>
                  handleSettingChange(
                    "twitterApiSettings",
                    "apiEnabled",
                    e.target.checked
                  )
                }
              />
            </div>

            <div className="form-group">
              <label>Bearer Token:</label>
              <input
                type="password"
                value={settings.twitterApiSettings.bearerToken}
                onChange={(e) =>
                  handleSettingChange(
                    "twitterApiSettings",
                    "bearerToken",
                    e.target.value
                  )
                }
                placeholder="Enter your Twitter API Bearer Token"
              />
            </div>
          </div>
        </div>

        {/* AI Model Settings */}
        <div className="options-section">
          <h2>AI Model Settings</h2>
          <div className="options-form">
            <div className="form-group">
              <label>AI Enabled:</label>
              <input
                type="checkbox"
                checked={settings.aiModelSettings.enabled}
                onChange={(e) =>
                  handleSettingChange(
                    "aiModelSettings",
                    "enabled",
                    e.target.checked
                  )
                }
              />
            </div>

            <div className="form-group">
              <label>API Key:</label>
              <input
                type="password"
                value={settings.aiModelSettings.apiKey}
                onChange={(e) =>
                  handleSettingChange(
                    "aiModelSettings",
                    "apiKey",
                    e.target.value
                  )
                }
                placeholder="Enter your OpenAI API Key"
              />
            </div>

            <div className="form-group">
              <label>Model:</label>
              <select
                value={settings.aiModelSettings.modelId}
                onChange={(e) =>
                  handleSettingChange(
                    "aiModelSettings",
                    "modelId",
                    e.target.value
                  )
                }>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="gpt-4">GPT-4</option>
              </select>
            </div>
          </div>
        </div>

        {/* Profile Scraper API Settings */}
        <div className="options-section">
          <h2>Profile Scraper API Settings</h2>
          <p className="section-description">
            Configure the API endpoint for saving scraped Twitter/X profile
            data.
          </p>
          <div className="options-form">
            <div className="form-group">
              <label>API Enabled:</label>
              <input
                type="checkbox"
                checked={settings.apiSettings.enabled}
                onChange={(e) =>
                  handleSettingChange(
                    "apiSettings",
                    "enabled",
                    e.target.checked
                  )
                }
              />
            </div>

            <div className="form-group">
              <label>API URL:</label>
              <input
                type="text"
                value={settings.apiSettings.apiUrl}
                onChange={(e) =>
                  handleSettingChange("apiSettings", "apiUrl", e.target.value)
                }
                placeholder="https://api.example.com/twitter-data"
              />
            </div>

            <div className="form-group">
              <label>API Key:</label>
              <input
                type="password"
                value={settings.apiSettings.apiKey}
                onChange={(e) =>
                  handleSettingChange("apiSettings", "apiKey", e.target.value)
                }
                placeholder="Enter your API Key"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="options-actions">
        <button onClick={saveSettings}>Save Settings</button>
      </div>
    </div>
  )
}

export default OptionsPage
