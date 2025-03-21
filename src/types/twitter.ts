export interface TwitterAuthor {
  username: string
  displayName: string
  profileUrl: string
}

export interface TwitterReply {
  content: string
  timestamp: string
  author: TwitterAuthor
}

export interface BaseTwitterPost {
  id: string
  content: string
  timestamp: string
  author: TwitterAuthor
  likesCount?: number
  retweetsCount?: number
  repliesCount?: number
  url?: string
  replies?: TwitterReply[] // List of replies to this tweet
}

export interface NormalTwitterPost extends BaseTwitterPost {
  type: "normal"
}

export interface TwitterReplyPost extends BaseTwitterPost {
  type: "reply"
  replyTo: BaseTwitterPost // The tweet being replied to
}

export interface TwitterRepost extends BaseTwitterPost {
  type: "repost"
  originalPost: BaseTwitterPost
  hasQuote: boolean
  quoteComment?: string
}

export type TwitterPost = NormalTwitterPost | TwitterReplyPost | TwitterRepost

/**
 * Twitter search user interface
 */
export interface TwitterSearchUser {
  id: string
  username: string
  displayName: string
  profile_image_url: string
  verified: boolean
  profileUrl: string
  bio: string
  followersCount: number
  followingCount: number
}

/**
 * Twitter user analysis result interface
 */
export interface TwitterUserAnalysis {
  username: string
  personalityTraits: string[]
  interests: string[]
  communicationStyle: string[]
  summary: string
  timestamp: number
}

/**
 * Twitter API search user response interface
 */
export interface TwitterApiSearchResponse {
  data: {
    id: string
    name: string
    username: string
    profile_image_url: string
    description: string
    verified: boolean
    public_metrics: {
      followers_count: number
      following_count: number
      tweet_count: number
      listed_count: number
    }
  }[]
}
