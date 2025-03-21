import React, { useEffect, useState } from "react"

import "../style.css"

import { aiService } from "../services/ai"

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
    // In a real implementation, this would fetch data from your backend
    const fetchUserAnalytics = async () => {
      try {
        setLoading(true)

        // Simulate API call with timeout
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // Mock data for demonstration
        setUserStats({
          followersCount: 12345,
          followingCount: 654,
          tweetsCount: 2876,
          likesCount: 5432,
          joinDate: "2018-03-15"
        })

        setUserActivity({
          tweetsPerDay: 3.2,
          mostActiveDay: "Saturday",
          mostActiveHour: "18:00",
          engagementRate: 4.7
        })

        setError(null)
      } catch (err) {
        console.error("Error fetching user analytics:", err)
        setError("获取用户分析数据失败，请稍后重试")
      } finally {
        setLoading(false)
      }
    }

    if (username) {
      fetchUserAnalytics()
    } else {
      setError("未提供用户名")
      setLoading(false)
    }
  }, [username])

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="spinner"></div>
        <p>加载用户分析...</p>
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
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="analytics-container">
      <h2 className="analytics-title">用户分析: @{username}</h2>

      {userStats && (
        <div className="stats-card">
          <h3>账号概况</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">
                {userStats.followersCount.toLocaleString()}
              </span>
              <span className="stat-label">粉丝</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {userStats.followingCount.toLocaleString()}
              </span>
              <span className="stat-label">关注</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {userStats.tweetsCount.toLocaleString()}
              </span>
              <span className="stat-label">推文</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {userStats.likesCount.toLocaleString()}
              </span>
              <span className="stat-label">喜欢</span>
            </div>
          </div>
          <p className="join-date">
            加入时间:{" "}
            {new Date(userStats.joinDate).toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric"
            })}
          </p>
        </div>
      )}

      {userActivity && (
        <div className="activity-card">
          <h3>活跃度分析</h3>
          <div className="activity-item">
            <span className="activity-label">平均每日推文:</span>
            <span className="activity-value">{userActivity.tweetsPerDay}</span>
          </div>
          <div className="activity-item">
            <span className="activity-label">最活跃日:</span>
            <span className="activity-value">{userActivity.mostActiveDay}</span>
          </div>
          <div className="activity-item">
            <span className="activity-label">最活跃时段:</span>
            <span className="activity-value">
              {userActivity.mostActiveHour}
            </span>
          </div>
          <div className="activity-item">
            <span className="activity-label">互动率:</span>
            <span className="activity-value">
              {userActivity.engagementRate}%
            </span>
          </div>
        </div>
      )}

      <div className="analytics-actions">
        <button className="btn btn-primary">生成详细报告</button>
        <button className="btn btn-outline">导出数据</button>
      </div>
    </div>
  )
}

export default ExploreAnalytics
