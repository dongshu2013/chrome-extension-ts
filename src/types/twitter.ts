export interface TwitterAuthor {
  username: string;
  displayName: string;
  profileUrl: string;
}

export interface TwitterReply {
  content: string;
  timestamp: string;
  author: TwitterAuthor;
}

export interface BaseTwitterPost {
  id: string;
  content: string;
  timestamp: string;
  author: TwitterAuthor;
  likesCount?: number;
  retweetsCount?: number;
  repliesCount?: number;
  url?: string;
  replies?: TwitterReply[]; // List of replies to this tweet
}

export interface NormalTwitterPost extends BaseTwitterPost {
  type: 'normal';
}

export interface TwitterReplyPost extends BaseTwitterPost {
  type: 'reply';
  replyTo: BaseTwitterPost; // The tweet being replied to
}

export interface TwitterRepost extends BaseTwitterPost {
  type: 'repost';
  originalPost: BaseTwitterPost;
  hasQuote: boolean;
  quoteComment?: string;
}

export type TwitterPost = NormalTwitterPost | TwitterReplyPost | TwitterRepost;
