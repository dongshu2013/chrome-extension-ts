import { type TwitterSearchUser } from "../types/twitter";

/**
 * Twitter API 服务类
 * 实现Twitter API的调用，获取真实用户数据
 */
export class TwitterApiService {
  private baseUrl = "https://api.twitter.com/2";
  private bearerToken: string | null = null;

  /**
   * 设置Bearer Token
   * @param token Twitter API的Bearer Token
   */
  public setBearerToken(token: string): void {
    this.bearerToken = token;
  }

  /**
   * 获取Bearer Token
   * @returns 当前设置的Bearer Token
   */
  public getBearerToken(): string | null {
    return this.bearerToken;
  }

  /**
   * 验证当前的Bearer Token
   * @returns 如果token有效则返回true，否则返回false
   */
  public async validateToken(): Promise<boolean> {
    if (!this.bearerToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/users/me`, {
        headers: {
          Authorization: `Bearer ${this.bearerToken}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error("验证Twitter API token失败:", error);
      return false;
    }
  }

  /**
   * 搜索Twitter用户
   * @param query 搜索关键词
   * @param limit 结果数量限制
   * @returns 搜索结果用户列表
   */
  public async searchUsers(query: string, limit: number = 10): Promise<TwitterSearchUser[]> {
    if (!this.bearerToken) {
      throw new Error("未设置Twitter API token");
    }

    try {
      const url = new URL(`${this.baseUrl}/users/search`);
      url.searchParams.append("q", query);
      url.searchParams.append("max_results", limit.toString());
      url.searchParams.append("user.fields", "id,username,name,profile_image_url,description,verified_type,public_metrics");
      
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.bearerToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Twitter API调用失败: ${response.status} ${response.statusText} - ${
            errorData.errors ? JSON.stringify(errorData.errors) : JSON.stringify(errorData)
          }`
        );
      }

      const data = await response.json();
      
      // 将Twitter API格式转换为应用内格式
      return data.data.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        displayName: user.name,
        profile_image_url: user.profile_image_url,
        verified: !!user.verified_type,
        profileUrl: `https://twitter.com/${user.username}`,
        bio: user.description || "",
        followersCount: user.public_metrics?.followers_count || 0,
        followingCount: user.public_metrics?.following_count || 0
      }));
    } catch (error) {
      console.error(`搜索Twitter用户失败: ${error}`);
      
      // 如果API调用失败，返回空结果
      return [];
    }
  }

  /**
   * 获取用户详情
   * @param username 用户名
   * @returns 用户详情
   */
  public async getUserByUsername(username: string): Promise<TwitterSearchUser | null> {
    if (!this.bearerToken) {
      throw new Error("未设置Twitter API token");
    }

    try {
      const url = new URL(`${this.baseUrl}/users/by/username/${username}`);
      url.searchParams.append("user.fields", "id,username,name,profile_image_url,description,verified_type,public_metrics");
      
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.bearerToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `获取Twitter用户失败: ${response.status} ${response.statusText} - ${
            errorData.errors ? JSON.stringify(errorData.errors) : JSON.stringify(errorData)
          }`
        );
      }

      const data = await response.json();
      const user = data.data;
      
      if (!user) return null;
      
      return {
        id: user.id,
        username: user.username,
        name: user.name,
        displayName: user.name,
        profile_image_url: user.profile_image_url,
        verified: !!user.verified_type,
        profileUrl: `https://twitter.com/${user.username}`,
        bio: user.description || "",
        followersCount: user.public_metrics?.followers_count || 0,
        followingCount: user.public_metrics?.following_count || 0
      };
    } catch (error) {
      console.error(`获取Twitter用户详情失败: ${error}`);
      return null;
    }
  }

  /**
   * 获取用户最近的推文
   * @param userId 用户ID
   * @param count 获取的推文数量
   * @returns 推文列表
   */
  public async getUserTweets(userId: string, count: number = 20): Promise<string[]> {
    if (!this.bearerToken) {
      throw new Error("未设置Twitter API token");
    }

    try {
      const url = new URL(`${this.baseUrl}/users/${userId}/tweets`);
      url.searchParams.append("max_results", count.toString());
      url.searchParams.append("tweet.fields", "text,created_at");
      url.searchParams.append("exclude", "retweets,replies");
      
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.bearerToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `获取用户推文失败: ${response.status} ${response.statusText} - ${
            errorData.errors ? JSON.stringify(errorData.errors) : JSON.stringify(errorData)
          }`
        );
      }

      const data = await response.json();
      
      // 只返回推文文本内容
      return data.data?.map(tweet => tweet.text) || [];
    } catch (error) {
      console.error(`获取用户推文失败: ${error}`);
      return [];
    }
  }
}

// 创建单例实例
export const twitterApi = new TwitterApiService(); 