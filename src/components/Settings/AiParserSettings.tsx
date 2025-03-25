import React, { useEffect, useState } from "react"

import { twitterPostDetailScraper } from "../../services/post-scraper"

interface AIModelOption {
  id: string
  name: string
  value: string
  description: string
}

/**
 * AI Parser Settings Component
 * Allows users to configure the AI-based DOM parsing options
 */
const AiParserSettings: React.FC = () => {
  const [useAIFallback, setUseAIFallback] = useState<boolean>(false)
  const [apiKey, setApiKey] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>(
    "google/gemma-3-27b-it:free"
  )
  const [savedSettings, setSavedSettings] = useState<boolean>(false)

  const aiModels: AIModelOption[] = [
    {
      id: "gemma3",
      name: "Gemma 3 27B",
      value: "google/gemma-3-27b-it:free",
      description: "Google's Gemma 3 27B model (default)"
    },
    {
      id: "mistralSmall",
      name: "Mistral Small 3.1",
      value: "mistralai/mistral-small-3.1-24b-instruct:free",
      description: "Mistral AI's Small 3.1 24B model"
    },
    {
      id: "gemini",
      name: "Gemini 2.0 Pro",
      value: "google/gemini-2.0-pro-exp-02-05:free",
      description: "Google's Gemini 2.0 Pro with 1M token context window"
    }
  ]

  // Load saved settings on component mount
  useEffect(() => {
    // Load settings from chrome.storage.local
    chrome.storage.local.get(
      ["useAIFallback", "aiApiKey", "aiModel"],
      (result) => {
        setUseAIFallback(result.useAIFallback || false)
        setApiKey(result.aiApiKey || "")
        setSelectedModel(result.aiModel || "google/gemma-3-27b-it:free")

        // Configure the scraper with the loaded settings
        if (result.useAIFallback) {
          twitterPostDetailScraper.configureAIFallback(
            result.useAIFallback,
            result.aiApiKey,
            result.aiModel
          )
        }
      }
    )
  }, [])

  // Handle saving settings
  const handleSaveSettings = () => {
    // Save to chrome.storage.local
    chrome.storage.local.set(
      {
        useAIFallback: useAIFallback,
        aiApiKey: apiKey,
        aiModel: selectedModel
      },
      () => {
        setSavedSettings(true)

        // Configure the scraper with the new settings
        twitterPostDetailScraper.configureAIFallback(
          useAIFallback,
          apiKey,
          selectedModel
        )

        // Reset the saved notification after 3 seconds
        setTimeout(() => setSavedSettings(false), 3000)
      }
    )
  }

  return (
    <div
      className="ai-parser-settings"
      style={{ padding: "16px", color: "#333" }}>
      <h2
        style={{
          fontSize: "1.5rem",
          marginBottom: "16px",
          fontWeight: "bold"
        }}>
        AI Parser Settings
      </h2>

      <div style={{ marginBottom: "16px" }}>
        <p style={{ marginBottom: "8px", fontStyle: "italic" }}>
          When traditional scraping methods fail, the extension can use AI to
          parse the Twitter DOM into structured JSON data.
        </p>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "flex", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={useAIFallback}
            onChange={(e) => setUseAIFallback(e.target.checked)}
            style={{ marginRight: "8px" }}
          />
          <span>Enable AI fallback for failed scraping attempts</span>
        </label>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label
          style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
          OpenRouter API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your OpenRouter API key"
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc"
          }}
        />
        <p style={{ marginTop: "4px", fontSize: "0.75rem", color: "#666" }}>
          Get an API key from{" "}
          <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">
            openrouter.ai/keys
          </a>
        </p>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label
          style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
          AI Model
        </label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc"
          }}>
          {aiModels.map((model) => (
            <option key={model.id} value={model.value}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <h3
          style={{ fontSize: "1rem", marginBottom: "8px", fontWeight: "bold" }}>
          Model Details
        </h3>
        {aiModels
          .filter((model) => model.value === selectedModel)
          .map((model) => (
            <div key={model.id} style={{ marginBottom: "8px" }}>
              <p style={{ marginBottom: "4px" }}>{model.description}</p>
              <p style={{ fontSize: "0.75rem", color: "#666" }}>
                Model ID: {model.value}
              </p>
            </div>
          ))}
      </div>

      <button
        onClick={handleSaveSettings}
        style={{
          padding: "8px 16px",
          backgroundColor: "#3b82f6",
          color: "white",
          borderRadius: "4px",
          border: "none",
          cursor: "pointer",
          fontWeight: "bold"
        }}>
        Save Settings
      </button>

      {savedSettings && (
        <p style={{ color: "green", marginTop: "8px" }}>
          Settings saved successfully!
        </p>
      )}
    </div>
  )
}

export default AiParserSettings
