/**
 * Twitter 用户分析结果接口
 */
export interface TwitterUserAnalysis {
  username: string;
  displayName?: string;
  avatar?: string;
  generatedAt: number;
  analysisResult?: {
    traits?: string[];
    interests?: string[];
    communicationStyle?: string;
    summary?: string;
    replyTemplates?: string[];
  };
  generatedReply?: string;
}
