import { TwitterSearchUser } from "../types/twitter";

/**
 * Twitter爬虫服务 - 负责从Twitter网页爬取用户数据
 */
class TwitterScraperService {
  /**
   * 构建Twitter搜索URL
   * @param query 搜索关键词
   * @returns 格式化的搜索URL
   */
  getSearchUrl(query: string): string {
    // 确保查询词被正确编码
    const encodedQuery = encodeURIComponent(query);
    return `https://twitter.com/search?q=${encodedQuery}&src=typed_query&f=user`;
  }

  /**
   * 从Twitter搜索页面爬取用户数据
   * @param query 搜索关键词
   * @returns 用户数据数组的Promise
   */
  async scrapeUsers(query: string): Promise<TwitterSearchUser[]> {
    console.log(`开始爬取Twitter用户数据，搜索词: ${query}`);
    
    try {
      // 创建一个新标签页来加载搜索结果
      const tab = await chrome.tabs.create({ 
        url: this.getSearchUrl(query),
        active: false // 在后台打开
      });
      
      // 等待页面加载完成
      console.log(`等待页面加载完成，标签ID: ${tab.id}`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 在页面中执行脚本来爬取用户数据
      if (!tab.id) {
        throw new Error("标签页ID无效");
      }
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: this.scrapeUsersFromPage
      });
      
      // 关闭标签页
      await chrome.tabs.remove(tab.id);
      
      // 处理结果
      if (results && results[0] && results[0].result) {
        const users = results[0].result as TwitterSearchUser[];
        console.log(`成功爬取到 ${users.length} 个用户`);
        return users;
      }
      
      console.log("爬取成功但没有结果");
      return [];
    } catch (error) {
      console.error("Twitter用户爬取失败:", error);
      throw error;
    }
  }
  
  /**
   * 从当前页面爬取用户数据的函数
   * 注意：此函数将在页面上下文中执行
   * @returns 爬取到的用户数据
   */
  private scrapeUsersFromPage(): TwitterSearchUser[] {
    try {
      // 寻找所有用户卡片
      const userElements = document.querySelectorAll('[data-testid="cellInnerDiv"]');
      const users: TwitterSearchUser[] = [];
      
      userElements.forEach((element, index) => {
        try {
          if (index > 20) return; // 限制结果数量
          
          // 提取用户名 (@username)
          const usernameElement = element.querySelector('[data-testid="User-Name"] a:nth-child(2)');
          if (!usernameElement) return;
          
          const username = (usernameElement.textContent || "").trim().replace("@", "");
          
          // 提取全名
          const fullNameElement = element.querySelector('[data-testid="User-Name"] a:first-child > div > div > span');
          const fullName = fullNameElement ? (fullNameElement.textContent || "").trim() : "";
          
          // 提取头像URL
          const avatarElement = element.querySelector('img[src*="profile_images"]');
          const avatarUrl = avatarElement ? (avatarElement as HTMLImageElement).src : "";
          
          // 提取个人简介
          const bioElement = element.querySelector('[data-testid="UserCell"] > div:nth-child(2)');
          const bio = bioElement ? (bioElement.textContent || "").trim() : "";
          
          // 提取验证状态
          const verifiedBadge = element.querySelector('[data-testid="icon-verified"]');
          const isVerified = !!verifiedBadge;
          
          // 提取粉丝和关注数据
          const statsElements = element.querySelectorAll('[data-testid="UserCell"] > div:nth-child(3) span');
          let followersCount = 0;
          let followingCount = 0;
          
          statsElements.forEach((stat, statIndex) => {
            const text = stat.textContent || "";
            if (text.includes("粉丝") || text.includes("关注者") || text.includes("followers")) {
              followersCount = this.parseCountText(text);
            } else if (text.includes("正在关注") || text.includes("following")) {
              followingCount = this.parseCountText(text);
            }
          });
          
          // 创建用户对象
          const user: TwitterSearchUser = {
            id: `scraped-${Date.now()}-${index}`,
            username,
            fullName,
            avatarUrl,
            bio,
            isVerified,
            followersCount,
            followingCount
          };
          
          users.push(user);
        } catch (userError) {
          console.error("解析用户元素时出错:", userError);
        }
      });
      
      return users;
    } catch (error) {
      console.error("在页面上下文中爬取用户时出错:", error);
      return [];
    }
  }
  
  /**
   * 解析数量文本 (例如: "1.2万 粉丝" -> 12000)
   */
  private parseCountText(text: string): number {
    try {
      // 移除所有非数字、小数点和数量单位的字符
      const cleanText = text.replace(/[^0-9.KkMm万]/g, "");
      
      // 提取数字部分
      const numMatch = cleanText.match(/^[\d.]+/);
      if (!numMatch) return 0;
      
      const num = parseFloat(numMatch[0]);
      
      // 检查单位
      if (cleanText.includes("K") || cleanText.includes("k") || cleanText.includes("千")) {
        return num * 1000;
      } else if (cleanText.includes("M") || cleanText.includes("m") || cleanText.includes("万")) {
        return num * 10000;
      } else {
        return num;
      }
    } catch (error) {
      console.error("解析数量文本时出错:", error, text);
      return 0;
    }
  }
}

// 导出单例实例
export const twitterScraper = new TwitterScraperService(); 