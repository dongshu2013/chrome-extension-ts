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

/**
 * Twitter profile information interface
 */
export interface TwitterProfile {
  username: string
  displayName: string
  bio?: string
  avatar?: string
  banner?: string
  followersCount?: number
  followingCount?: number
  postsCount?: number
  isVerified?: boolean
  joinDate?: string
  location?: string
  website?: string
  profileUrl: string
}

/**
 * Twitter post media interface
 */
export interface TwitterPostMedia {
  type: "image" | "video" | "gif" | "audio"
  url: string
  thumbnailUrl?: string
  altText?: string
  duration?: string // For videos/audio
}

/**
 * Twitter post data interface with detailed metrics
 */
export interface TwitterPostData {
  id: string
  text: string
  html?: string // Original HTML content
  createdAt: string
  authorUsername: string
  authorDisplayName: string
  authorProfileUrl: string
  authorAvatar?: string
  isVerified?: boolean
  likeCount: number
  retweetCount: number
  replyCount: number
  viewCount?: number
  media?: TwitterPostMedia[]
  links?: string[]
  hashtags?: string[]
  mentionedUsers?: string[]
  isReply?: boolean
  replyToId?: string
  replyToUsername?: string
  isRetweet?: boolean
  originalPost?: Partial<TwitterPostData> // The original tweet for retweets
  postUrl: string
}

/**
 * Twitter profile data with posts interface
 */
export interface TwitterProfileData {
  profile: TwitterProfile
  posts: TwitterPostData[]
  scrapedAt: number // Timestamp when the data was scraped
}
