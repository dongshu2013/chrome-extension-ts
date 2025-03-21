// Mock tweet data
export const mockTweets = [
  { username: "user1", content: "This is a test tweet #1" },
  { username: "user2", content: "This is a test tweet #2" },
  { username: "user3", content: "This is a test tweet #3" }
]

// Mock user stats data
export const mockUserStats = (username: string) => ({
  followers: Math.floor(Math.random() * 10000),
  following: Math.floor(Math.random() * 2000),
  tweets: Math.floor(Math.random() * 5000),
  likes: Math.floor(Math.random() * 8000),
  joinDate: "May 2018"
})

// Mock user activity data
export const mockUserActivity = {
  dailyAvgTweets: (Math.random() * 5).toFixed(1),
  weekdayActivity: "Mostly weekends",
  preferredTime: "8-10 PM",
  mediaUsage: "Medium (30% posts with media)"
}

// Mock user posts data
export const mockUserPosts = (username: string, count: number = 10) => {
  const posts = []
  for (let i = 0; i < count; i++) {
    posts.push({
      id: `post-${i}`,
      content: `This is @${username}'s tweet #${i + 1}. ${
        Math.random() > 0.5 ? "#TwitterAPI" : ""
      }`,
      timestamp: new Date(
        Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
      ).toISOString(),
      likes: Math.floor(Math.random() * 100),
      retweets: Math.floor(Math.random() * 30),
      replies: Math.floor(Math.random() * 20)
    })
  }
  return posts
}

// Mock user analysis data
export const mockUserAnalysis = (username: string) => ({
  username,
  stats: mockUserStats(username),
  activity: mockUserActivity,
  posts: mockUserPosts(username, 10),
  topics: ["Technology", "Programming", "AI", "Data Science"],
  sentiment: {
    positive: 60,
    neutral: 30,
    negative: 10
  },
  engagement: {
    avgLikes: 45,
    avgRetweets: 12,
    avgReplies: 5
  }
})
