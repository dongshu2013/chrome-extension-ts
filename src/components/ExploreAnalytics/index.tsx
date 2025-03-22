import React, { useEffect, useState } from "react"

import "./index.css"

interface UserStats {
  followersCount: number
  followingCount: number
  tweetsCount: number
  likesCount: number
  joinDate: string
}

interface UserActivity {
  tweetsPerDay: number
  mostActiveDay: string
  mostActiveHour: string
  engagementRate: number
}

interface ExploreAnalyticsProps {
  username: string
}

const ExploreAnalytics: React.FC<ExploreAnalyticsProps> = ({ username }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [userActivity, setUserActivity] = useState<UserActivity | null>(null)

  useEffect(() => {
    const fetchUserAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)

        // Use chrome.runtime.sendMessage to get user analytics
        chrome.runtime.sendMessage(
          {
            type: "GET_USER_ANALYTICS",
            username
          },
          (response) => {
            if (response && response.success) {
              if (response.stats) {
                setUserStats(response.stats)
              }
              if (response.activity) {
                setUserActivity(response.activity)
              }
            } else {
              console.error("Failed to get user analytics:", response?.error)
              setError(
                "Failed to fetch user analytics. Please try again later."
              )

              // Generate some default data for display
              setUserStats({
                followersCount: Math.floor(Math.random() * 10000),
                followingCount: Math.floor(Math.random() * 1000),
                tweetsCount: Math.floor(Math.random() * 5000),
                likesCount: Math.floor(Math.random() * 10000),
                joinDate: new Date(
                  Date.now() - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000
                )
                  .toISOString()
                  .split("T")[0]
              })

              setUserActivity({
                tweetsPerDay: parseFloat((Math.random() * 5).toFixed(1)),
                mostActiveDay: ["Monday", "Wednesday", "Friday", "Saturday"][
                  Math.floor(Math.random() * 4)
                ],
                mostActiveHour: `${Math.floor(Math.random() * 12 + 1)}:00 ${Math.random() > 0.5 ? "AM" : "PM"}`,
                engagementRate: parseFloat((Math.random() * 10).toFixed(1))
              })
            }
            setLoading(false)
          }
        )
      } catch (err) {
        console.error("Error fetching user analytics:", err)
        setError("Failed to fetch user analytics. Please try again later.")
        setLoading(false)
      }
    }

    if (username) {
      fetchUserAnalytics()
    } else {
      setError("No username provided")
      setLoading(false)
    }
  }, [username])

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="spinner"></div>
        <p>Loading user analytics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="analytics-error">
        <p>{error}</p>
        <button
          className="btn btn-outline"
          onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="analytics-container">
      {userStats && (
        <div className="stats-card">
          <h3>Account Overview</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">
                {userStats.followersCount.toLocaleString()}
              </span>
              <span className="stat-label">Followers</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {userStats.followingCount.toLocaleString()}
              </span>
              <span className="stat-label">Following</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {userStats.tweetsCount.toLocaleString()}
              </span>
              <span className="stat-label">Tweets</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {userStats.likesCount.toLocaleString()}
              </span>
              <span className="stat-label">Likes</span>
            </div>
          </div>
          <p className="join-date">
            Joined:{" "}
            {new Date(userStats.joinDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric"
            })}
          </p>
        </div>
      )}

      {userActivity && (
        <div className="activity-card">
          <h3>Activity Analysis</h3>
          <div className="activity-item">
            <span className="activity-label">Average daily tweets:</span>
            <span className="activity-value">{userActivity.tweetsPerDay}</span>
          </div>
          <div className="activity-item">
            <span className="activity-label">Most active day:</span>
            <span className="activity-value">{userActivity.mostActiveDay}</span>
          </div>
          <div className="activity-item">
            <span className="activity-label">Most active time:</span>
            <span className="activity-value">
              {userActivity.mostActiveHour}
            </span>
          </div>
          <div className="activity-item">
            <span className="activity-label">Engagement rate:</span>
            <span className="activity-value">
              {userActivity.engagementRate}%
            </span>
          </div>
        </div>
      )}

      <div className="analytics-actions">
        <button className="btn btn-primary">Generate Detailed Report</button>
        <button className="btn btn-outline">Export Data</button>
      </div>
    </div>
  )
}

export default ExploreAnalytics
