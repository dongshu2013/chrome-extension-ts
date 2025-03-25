import React from "react"

import type { TwitterSettings } from "../../types/sidebar"

interface SettingsTabProps {
  settings: TwitterSettings
  setSettings: React.Dispatch<React.SetStateAction<TwitterSettings>>
  saveSettings: () => void
  resetSettings: () => void
  saving: boolean
}

// AI model options for DOM parsing
const aiParserModels = [
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

/**
 * Settings Tab Component
 * Handles settings UI for the Twitter Analyzer
 */
const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  setSettings,
  saveSettings,
  resetSettings,
  saving
}) => {
  return (
    <div className="settings-tab">
      {/* AI Settings */}
      <div className="settings-section">
        <div className="settings-section-title">AI Settings</div>
        <div className="settings-content">
          <div className="settings-form-group">
            <div className="settings-toggle">
              <span className="settings-toggle-label">Enable AI Analysis</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.aiModelSettings.enabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      aiModelSettings: {
                        ...settings.aiModelSettings,
                        enabled: e.target.checked
                      }
                    })
                  }
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <p className="settings-description">
              Use AI to analyze user profiles
            </p>
          </div>

          <div className="settings-form-group">
            <label className="settings-label">OpenAI API Key</label>
            <input
              type="password"
              className="settings-input"
              value={settings.aiModelSettings.apiKey || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  aiModelSettings: {
                    ...settings.aiModelSettings,
                    apiKey: e.target.value
                  }
                })
              }
              placeholder="Enter your OpenAI API key"
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-label">Model</label>
            <select
              className="settings-input"
              value={settings.aiModelSettings.modelId}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  aiModelSettings: {
                    ...settings.aiModelSettings,
                    modelId: e.target.value
                  }
                })
              }>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
            </select>
          </div>
        </div>
      </div>

      {/* AI Parser Settings for DOM parsing */}
      <div className="settings-section">
        <div className="settings-section-title">AI DOM Parser</div>
        <div className="settings-content">
          <div className="settings-form-group">
            <div className="settings-toggle">
              <span className="settings-toggle-label">
                Enable AI DOM Parser
              </span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.aiParserSettings.enabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      aiParserSettings: {
                        ...settings.aiParserSettings,
                        enabled: e.target.checked
                      }
                    })
                  }
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <p className="settings-description">
              Use AI to parse Twitter DOM content when traditional scraping
              fails
            </p>
          </div>

          <div className="settings-form-group">
            <label className="settings-label">OpenRouter API Key</label>
            <input
              type="password"
              className="settings-input"
              value={settings.aiParserSettings.apiKey || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  aiParserSettings: {
                    ...settings.aiParserSettings,
                    apiKey: e.target.value
                  }
                })
              }
              placeholder="Enter your OpenRouter API key"
            />
            <p className="settings-description">
              Get an API key from{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer">
                openrouter.ai/keys
              </a>
            </p>
          </div>

          <div className="settings-form-group">
            <label className="settings-label">AI Parser Model</label>
            <select
              className="settings-input"
              value={settings.aiParserSettings.modelId}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  aiParserSettings: {
                    ...settings.aiParserSettings,
                    modelId: e.target.value
                  }
                })
              }>
              {aiParserModels.map((model) => (
                <option key={model.id} value={model.value}>
                  {model.name}
                </option>
              ))}
            </select>
            <p className="settings-description">
              {
                aiParserModels.find(
                  (model) => model.value === settings.aiParserSettings.modelId
                )?.description
              }
            </p>
          </div>
        </div>
      </div>

      {/* Interface Settings */}
      <div className="settings-section">
        <div className="settings-section-title">Interface Settings</div>
        <div className="settings-content">
          <div className="settings-form-group">
            <div className="settings-toggle">
              <span className="settings-toggle-label">Compact Mode</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.uiSettings.compactMode}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      uiSettings: {
                        ...settings.uiSettings,
                        compactMode: e.target.checked
                      }
                    })
                  }
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <p className="settings-description">
              Show more information in less space
            </p>
          </div>

          <div className="settings-form-group">
            <div className="settings-toggle">
              <span className="settings-toggle-label">
                Show Advanced Metrics
              </span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.analysisSettings.showAdvancedMetrics}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      analysisSettings: {
                        ...settings.analysisSettings,
                        showAdvancedMetrics: e.target.checked
                      }
                    })
                  }
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <p className="settings-description">
              Display additional statistics and analytics
            </p>
          </div>
        </div>
      </div>
      {/* Actions */}
      <div className="settings-actions">
        <button className="btn btn-reset" onClick={resetSettings}>
          Reset
        </button>
        <button
          className="btn btn-save"
          onClick={saveSettings}
          disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  )
}

export default SettingsTab
