import type { TwitterPostDetail } from "../types/twitter"
import { scrapeTwitterPostDetail } from "./twitter-scraper/core/detail-scraper"

/**
 * Twitter Post Detail Scraper Service
 * Responsible for extracting detailed information about Twitter posts, including comments
 */
class TwitterPostDetailScraperService {
  /**
   * Scrape a Twitter post detail by its ID
   * @param postId The Twitter post ID to scrape
   * @param commentsCount Number of comments to retrieve (use 0 or negative number to scrape all available comments)
   * @returns Promise with TwitterPostDetail object
   */
  async scrapePostDetail(
    postId: string,
    commentsCount: number = 10
  ): Promise<TwitterPostDetail> {
    console.log(`Starting to scrape post detail for ID: ${postId}`)
    console.log(
      `Comments to retrieve: ${commentsCount <= 0 ? "all available" : commentsCount}`
    )

    try {
      // Create a new tab to load the post detail page
      const tab = await chrome.tabs.create({
        url: `https://twitter.com/i/status/${postId}`,
        active: false // Open in background
      })

      // Wait for page to load
      console.log(`Waiting for post detail page to load, tab ID: ${tab.id}`)
      await new Promise((resolve) => setTimeout(resolve, 3000))

      if (!tab.id) {
        throw new Error("Invalid tab ID")
      }

      // Execute scraping script
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scrapeTwitterPostDetail,
        args: [postId, commentsCount]
      })

      // Close the tab
      await chrome.tabs.remove(tab.id)

      // Process the results
      if (results && results[0] && results[0].result) {
        const postDetail = results[0].result as TwitterPostDetail
        console.log(
          `Successfully scraped post detail with ${postDetail.comments.length} comments`
        )
        return postDetail
      }

      throw new Error("No results returned from scraping script")
    } catch (error) {
      console.error("Error scraping post detail:", error)
      throw error
    }
  }

  /**
   * Scrape a Twitter post detail using the current tab
   * This is useful when you're already on a Twitter post page and want to scrape its details
   * @param commentsCount Number of comments to retrieve (use 0 or negative number to scrape all available comments)
   * @returns Promise with TwitterPostDetail object
   */
  async scrapeCurrentPostDetail(
    commentsCount: number = 10
  ): Promise<TwitterPostDetail> {
    console.log(
      "Starting scrapeCurrentPostDetail with commentsCount:",
      commentsCount <= 0 ? "all available" : commentsCount
    )

    try {
      // 直接使用当前页面的URL，而不是尝试通过chrome.tabs.query获取
      // 这样可以在content script中正常工作
      const url = window.location.href
      console.log("Current URL for post detail scraping:", url)

      if (!url.includes("twitter.com") && !url.includes("x.com")) {
        console.error("Not on Twitter or X.com website")
        throw new Error("Not on Twitter or X.com website")
      }

      // Extract post ID from URL
      const postIdMatch = url.match(/status\/(\d+)/)
      if (!postIdMatch || !postIdMatch[1]) {
        console.error("Cannot extract post ID from URL:", url)
        throw new Error("Cannot extract post ID from URL")
      }

      const postId = postIdMatch[1]
      console.log("Extracted post ID:", postId)

      // 直接执行脚本函数，而不是尝试使用chrome.scripting.executeScript
      // 因为我们已经在Twitter页面的上下文中了
      try {
        console.log("Executing scraping function directly")
        const postDetail = await scrapeTwitterPostDetail(postId, commentsCount)

        if (postDetail) {
          console.log(
            `Successfully scraped post detail with ${postDetail.comments?.length || 0} comments`
          )
          return postDetail
        }

        console.error("No results returned from scraping function")
        throw new Error("No results returned from scraping function")
      } catch (scriptError) {
        console.error("Error in executing scraping function:", scriptError)
        throw scriptError
      }
    } catch (error) {
      console.error("Error in scrapeCurrentPostDetail:", error)
      throw error
    }
  }

  /**
   * Format a post detail object into a cleaned JSON string
   * This is useful for exporting or displaying the data
   * @param postDetail The TwitterPostDetail object to format
   * @returns Formatted JSON string
   */
  formatPostDetailToJson(postDetail: TwitterPostDetail): string {
    try {
      // Create a simplified version of the post detail
      const simplifiedDetail = {
        postId: postDetail.id,
        text: postDetail.text,
        createdAt: postDetail.createdAt,
        author: {
          username: postDetail.authorUsername,
          displayName: postDetail.authorDisplayName,
          profileUrl: postDetail.authorProfileUrl,
          avatar: postDetail.authorAvatar,
          isVerified: postDetail.isVerified
        },
        metrics: {
          likes: postDetail.likeCount,
          retweets: postDetail.retweetCount,
          replies: postDetail.replyCount,
          views: postDetail.viewCount
        },
        media: postDetail.detailedMedia || {
          images:
            postDetail.media
              ?.filter((m) => m.type === "image")
              .map((m) => ({
                url: m.url,
                altText: m.altText
              })) || [],
          videos:
            postDetail.media
              ?.filter((m) => m.type === "video")
              .map((m) => ({
                url: m.url,
                thumbnailUrl: m.thumbnailUrl
              })) || [],
          gifs:
            postDetail.media
              ?.filter((m) => m.type === "gif")
              .map((m) => ({
                url: m.url,
                thumbnailUrl: m.thumbnailUrl
              })) || []
        },
        links: postDetail.links || [],
        hashtags: postDetail.hashtags || [],
        mentions: postDetail.mentionedUsers || [],
        postUrl: postDetail.postUrl,
        replyList: postDetail.comments.map((comment) => ({
          id: comment.id,
          text: comment.text,
          createdAt: comment.createdAt,
          author: {
            username: comment.authorUsername,
            displayName: comment.authorDisplayName,
            profileUrl: comment.authorProfileUrl,
            avatar: comment.authorAvatar,
            isVerified: comment.isVerified
          },
          metrics: {
            likes: comment.likeCount,
            retweets: comment.retweetCount,
            replies: comment.replyCount,
            views: comment.viewCount
          },
          replyToId: comment.replyToId,
          postUrl: comment.postUrl
        }))
      }

      // Convert to formatted JSON
      return JSON.stringify(simplifiedDetail, null, 2)
    } catch (error) {
      console.error("Error formatting post detail to JSON:", error)
      return JSON.stringify({ error: "Failed to format post detail" })
    }
  }
}

// Export singleton instance
export const twitterPostDetailScraper = new TwitterPostDetailScraperService()
