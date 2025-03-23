import React from "react"

import type { TwitterSettings } from "../../types/sidebar"

interface SettingsTabProps {
  settings: TwitterSettings
  setSettings: React.Dispatch<React.SetStateAction<TwitterSettings>>
  saveSettings: () => void
  resetSettings: () => void
  saving: boolean
}

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
