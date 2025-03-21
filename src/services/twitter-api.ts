import { TwitterApiSearchResponse, TwitterSearchUser } from "../types/twitter"

/**
 * Twitter API服务类 - 处理与Twitter API的交互
 */
class TwitterApiService {
  private bearerToken: string = ""

  /**
   * 设置Bearer Token
   */
  public setBearerToken(token: string): void {
    this.bearerToken = token
  }

  /**
   * 搜索Twitter用户
   */
  public async searchUsers(
    query: string,
    bearerToken?: string
  ): Promise<TwitterSearchUser[]> {
    // 使用提供的token或者已保存的token
    const token = bearerToken || this.bearerToken

    if (!token) {
      throw new Error("未设置Twitter API Bearer Token")
    }

    try {
      // 构建Twitter API搜索URL
      const url = new URL("https://api.twitter.com/2/users/search")
      url.searchParams.append("query", query)
      url.searchParams.append("max_results", "10")
      url.searchParams.append(
        "user.fields",
        "description,profile_image_url,public_metrics,verified"
      )

      // 调用API
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Twitter API搜索失败:", errorData)
        throw new Error(
          `Twitter API请求失败: ${response.status} ${response.statusText}`
        )
      }

      const data = (await response.json()) as TwitterApiSearchResponse

      // 转换API结果为应用格式
      return this.convertTwitterApiUsers(data)
    } catch (error) {
      console.error("搜索Twitter用户失败:", error)
      throw error
    }
  }

  /**
   * 将Twitter API返回的用户数据转换为应用格式
   */
  private convertTwitterApiUsers(
    apiResponse: TwitterApiSearchResponse
  ): TwitterSearchUser[] {
    if (!apiResponse.data || !Array.isArray(apiResponse.data)) {
      return []
    }

    return apiResponse.data.map((user) => ({
      id: user.id,
      username: user.username,
      fullName: user.name,
      avatarUrl: user.profile_image_url || "",
      bio: user.description || "",
      isVerified: user.verified || false,
      followersCount: user.public_metrics?.followers_count || 0,
      followingCount: user.public_metrics?.following_count || 0
    }))
  }

  /**
   * 测试Twitter API Token
   */
  public async testToken(token: string): Promise<boolean> {
    try {
      // 尝试获取简单API信息
      const response = await fetch("https://api.twitter.com/2/users/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.ok) {
        return true
      }

      const errorData = await response.json()
      console.error("Twitter API Token验证失败:", errorData)
      return false
    } catch (error) {
      console.error("验证Twitter API Token失败:", error)
      return false
    }
  }

  /**
   * 验证Twitter API Token
   */
  public async validateToken(): Promise<boolean> {
    if (!this.bearerToken) {
      return false
    }
    return this.testToken(this.bearerToken)
  }
}

// 导出单例实例
export const twitterApi = new TwitterApiService()
