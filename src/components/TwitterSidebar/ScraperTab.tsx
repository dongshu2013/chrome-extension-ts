import React from "react"

import type { TwitterProfileData } from "../../types/twitter"
import ProfileScraper from "../ProfileScraper"

interface ScraperTabProps {
  username: string
  onSuccess?: (data: TwitterProfileData) => void
  onError?: (error: string) => void
}

/**
 * Scraper Tab Component for Twitter Sidebar
 * Renders the profile scraper interface
 */
const ScraperTab: React.FC<ScraperTabProps> = ({
  username,
  onSuccess,
  onError
}) => {
  // Default handlers if not provided
  const handleSuccess = (data: TwitterProfileData) => {
    console.log("Scraped data:", data)
    if (onSuccess) {
      onSuccess(data)
    }
  }

  const handleError = (error: string) => {
    console.error("Scraper error:", error)
    if (onError) {
      onError(error)
    }
  }

  return (
    <div className="twitter-analysis-tab-content">
      <ProfileScraper
        username={username}
        scrollCount={5}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  )
}

export default ScraperTab
