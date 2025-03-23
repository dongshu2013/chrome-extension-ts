import React, { useEffect, useState } from "react"

import { twitterPostDetailScraper } from "../../services/post-scraper"
import type { TwitterPostDetail } from "../../types/twitter"
import { getPostIdFromUrl, isPostDetailPage } from "../../utils/twitterUtils"
import TwitterPostDetailView from "../TwitterPostDetailView"

interface PostDetailTabProps {
  postId?: string
  commentsCount?: number
  fetchAllComments?: boolean
}

/**
 * Post Detail Tab Component for Twitter Sidebar
 * Renders the Twitter post detail view
 */
const PostDetailTab: React.FC<PostDetailTabProps> = ({
  postId,
  commentsCount = 10,
  fetchAllComments = true
}) => {
  const [postDetail, setPostDetail] = useState<TwitterPostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 检查我们是否在帖子页面并提取帖子 ID
  const isPostPage = isPostDetailPage()
  const extractedPostId = isPostPage ? getPostIdFromUrl() : ""

  // 使用提供的 postId 或提取的 ID
  const finalPostId = postId || extractedPostId

  // 确定要获取的评论数量
  const finalCommentsCount = fetchAllComments ? -1 : commentsCount

  console.log("Post Detail Tab: isPostPage =", isPostPage)
  console.log("Post Detail Tab: extractedPostId =", extractedPostId)
  console.log("Post Detail Tab: finalPostId =", finalPostId)
  console.log("Post Detail Tab: fetchAllComments =", fetchAllComments)
  console.log("Post Detail Tab: commentsCount =", finalCommentsCount)
  console.log("Post Detail Tab: current URL:", window.location.href)

  // 直接在组件内获取帖子数据
  useEffect(() => {
    console.log("PostDetailTab mounted with ID:", finalPostId)
    console.log("isPostPage:", isPostPage, "extractedPostId:", extractedPostId)

    async function fetchPostDetail() {
      if (!isPostPage && !finalPostId) {
        console.log("No post ID found, displaying error message")
        setError("No post ID found. Please visit a Twitter post page.")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        console.log("Getting post details...")
        console.log(
          "Number of comments to retrieve:",
          finalCommentsCount <= 0 ? "all available" : finalCommentsCount
        )

        try {
          console.log(
            "Calling twitterPostDetailScraper.scrapeCurrentPostDetail method"
          )
          const detail =
            await twitterPostDetailScraper.scrapeCurrentPostDetail(
              finalCommentsCount
            )

          console.log("Post details data retrieved successfully")
          console.log(
            "Retrieved ID:",
            detail.id,
            "Number of comments:",
            detail.comments?.length || 0
          )

          setPostDetail(detail)
          setError(null)
        } catch (scrapingError) {
          console.error("Scraping error:", scrapingError)
          console.error(
            "Error stack:",
            scrapingError instanceof Error
              ? scrapingError.stack
              : "No stack trace"
          )

          throw new Error(
            `Scraping error: ${scrapingError instanceof Error ? scrapingError.message : String(scrapingError)}`
          )
        }
      } catch (err) {
        console.error("Failed to get post details:", err)
        const errorMessage = err instanceof Error ? err.message : String(err)
        setError(`Failed to get post details: ${errorMessage}`)

        // Add additional debugging information
        console.error("Error type:", Object.prototype.toString.call(err))
        try {
          console.error(
            "Full error object:",
            JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
          )
        } catch (jsonError) {
          console.error("Failed to serialize error object:", jsonError)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPostDetail()

    return () => {
      console.log("PostDetailTab unmounted")
    }
  }, [finalPostId, isPostPage, finalCommentsCount])

  if (loading) {
    return (
      <div
        className="twitter-analysis-tab-content"
        style={{ color: "#333", backgroundColor: "#fff" }}>
        <div className="loading-spinner" style={{ textAlign: "center" }}>
          <p style={{ color: "#333" }}>
            <i className="fas fa-spinner fa-spin"></i> Getting post details...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="twitter-analysis-tab-content"
        style={{ color: "#333", backgroundColor: "#fff" }}>
        <div
          className="error-message"
          style={{
            color: "#d32f2f",
            backgroundColor: "#ffebee",
            padding: "8px",
            borderRadius: "4px"
          }}>
          <h3 style={{ color: "#d32f2f", marginBottom: "6px" }}>错误</h3>
          <p style={{ color: "#333" }}>{error}</p>
          <p style={{ color: "#666", fontSize: "0.9em", marginTop: "6px" }}>
            调试信息: postId={finalPostId}, isPostPage={String(isPostPage)}
          </p>
          <p style={{ color: "#666", fontSize: "0.9em" }}>
            URL: {window.location.href}
          </p>
        </div>
      </div>
    )
  }

  // 如果直接获取了数据，则使用本地数据渲染
  if (postDetail) {
    return (
      <div
        className="twitter-analysis-tab-content"
        style={{ color: "#333", backgroundColor: "#fff" }}>
        <div data-testid="post-detail-tab" data-postid={finalPostId}>
          <TwitterPostDetailView
            key={`post-detail-direct-${finalPostId || "current"}-${Date.now()}`}
            postDetail={postDetail}
          />
        </div>
      </div>
    )
  }

  // 如果没有本地数据，则委托给 TwitterPostDetailView 组件获取数据
  return (
    <div
      className="twitter-analysis-tab-content"
      style={{ color: "#333", backgroundColor: "#fff", padding: "8px" }}>
      <div data-testid="post-detail-tab" data-postid={finalPostId}>
        <TwitterPostDetailView
          key={`post-detail-${finalPostId || "current"}-${Date.now()}`}
          postId={finalPostId || undefined}
          useCurrentTab={isPostPage}
          commentsCount={commentsCount}
        />
      </div>
    </div>
  )
}

export default PostDetailTab
