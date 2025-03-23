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
  isThreadPart?: boolean // 是否为推文串的一部分
  threadIndicator?: string // 推文串的指示符，如 "1/5", "线程", "🧵" 等

  // 推文串关联属性
  threadPosition?: number // 在推文串中的位置（如：1/5 中的1）
  threadCount?: number // 推文串的总数（如：1/5 中的5）
  previousThreadId?: string // 前一条推文ID（在推文串中）
  nextThreadId?: string // 后一条推文ID（在推文串中）
  threadHeadId?: string // 推文串首条推文ID

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

/**
 * Twitter comment interface
 */
export interface TwitterComment {
  id: string
  text: string
  html?: string
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
  isReply?: boolean
  replyToId?: string
  postUrl: string
}

/**
 * Detailed Twitter post interface with comments and additional metrics
 */
export interface TwitterPostDetail extends TwitterPostData {
  comments: TwitterComment[] // List of comments to this post
  commentsFetched: boolean // Whether comments have been fetched
  commentCount: number // Total number of comments (may be more than fetched)
  detailedMedia?: {
    images: {
      url: string
      altText?: string
      width?: number
      height?: number
    }[]
    videos: {
      url: string
      thumbnailUrl?: string
      duration?: string
      width?: number
      height?: number
      views?: number
    }[]
    gifs: {
      url: string
      thumbnailUrl?: string
      width?: number
      height?: number
    }[]
    audio?: {
      url: string
      duration?: string
    }[]
  }
  analytics?: {
    impressions?: number
    engagements?: number
    profileClicks?: number
    linkClicks?: number
    detailExpands?: number
    mediaViews?: number
  }
}
