import React, { useEffect, useState } from "react"

import { twitterPostDetailScraper } from "../services/post-scraper"
import type { TwitterPostDetail } from "../types/twitter"

interface PostDetailViewProps {
  postId?: string
  useCurrentTab?: boolean
  commentsCount?: number
  fetchAllComments?: boolean
  postDetail?: TwitterPostDetail
}

const TwitterPostDetailView: React.FC<PostDetailViewProps> = ({
  postId,
  useCurrentTab = false,
  commentsCount = 10,
  fetchAllComments = true,
  postDetail: initialPostDetail = null
}) => {
  const [loading, setLoading] = useState<boolean>(!initialPostDetail)
  const [error, setError] = useState<string | null>(null)
  const [postDetail, setPostDetail] = useState<TwitterPostDetail | null>(
    initialPostDetail
  )
  const [jsonView, setJsonView] = useState<boolean>(false)

  // 确定要获取的评论数量
  const finalCommentsCount = fetchAllComments ? -1 : commentsCount

  console.log("TwitterPostDetailView rendered with:", {
    postId,
    useCurrentTab,
    commentsCount: finalCommentsCount,
    fetchAllComments,
    hasInitialData: !!initialPostDetail
  })

  useEffect(() => {
    if (initialPostDetail) {
      console.log("Using provided post detail data:", initialPostDetail.id)
      setPostDetail(initialPostDetail)
      setLoading(false)
      return
    }

    const fetchPostDetail = async () => {
      if (!postId && !useCurrentTab) {
        console.log("Error: No postId and useCurrentTab is false")
        setError("Please provide a post ID or enable current tab scraping")
        setLoading(false)
        return
      }

      console.log("Starting to fetch post detail:", {
        postId,
        useCurrentTab,
        commentsCount: finalCommentsCount,
        fetchAllComments
      })
      setLoading(true)
      setError(null)

      try {
        let detail: TwitterPostDetail | null = null

        // 使用 try-catch 块分别处理每种情况的错误
        if (useCurrentTab) {
          try {
            console.log("检查当前页面URL:", window.location.href)
            console.log(
              "Scraping current post detail, comments:",
              finalCommentsCount <= 0 ? "all" : finalCommentsCount
            )
            detail =
              await twitterPostDetailScraper.scrapeCurrentPostDetail(
                finalCommentsCount
              )
            console.log("获取到帖子详情:", detail?.id || "无ID")
          } catch (innerError) {
            console.error("当前页面抓取错误:", innerError)
            console.error(
              "错误类型:",
              Object.prototype.toString.call(innerError)
            )
            console.error(
              "错误堆栈:",
              innerError instanceof Error ? innerError.stack : "无堆栈信息"
            )

            // 在这里重新抛出错误，以便外层catch块可以捕获它
            throw new Error(
              `当前页面抓取失败: ${innerError instanceof Error ? innerError.message : String(innerError)}`
            )
          }
        } else if (postId) {
          try {
            console.log(
              `Scraping post detail for ID: ${postId}, comments: ${finalCommentsCount <= 0 ? "all" : finalCommentsCount}`
            )
            detail = await twitterPostDetailScraper.scrapePostDetail(
              postId,
              finalCommentsCount
            )
            console.log("获取到帖子详情:", detail?.id || "无ID")
          } catch (innerError) {
            console.error("通过ID抓取错误:", innerError)
            console.error(
              "错误类型:",
              Object.prototype.toString.call(innerError)
            )
            console.error(
              "错误堆栈:",
              innerError instanceof Error ? innerError.stack : "无堆栈信息"
            )

            throw new Error(
              `通过ID抓取失败: ${innerError instanceof Error ? innerError.message : String(innerError)}`
            )
          }
        } else {
          throw new Error("无效的配置")
        }

        if (detail) {
          console.log(
            "Successfully fetched post detail:",
            detail.id,
            "with",
            detail.comments?.length || 0,
            "comments"
          )
          setPostDetail(detail)
        } else {
          throw new Error("获取帖子详情失败，未返回数据")
        }
      } catch (err) {
        console.error("Error in fetchPostDetail:", err)

        // 记录更详细的错误信息
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error("错误消息:", errorMessage)

        // 设置用户友好的错误消息
        setError(`获取帖子详情失败: ${errorMessage}`)

        // 添加更详细的控制台日志，帮助调试
        console.error("完整错误信息:", err)
        console.error("错误类型:", Object.prototype.toString.call(err))
        try {
          console.error(
            "错误序列化:",
            JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
          )
        } catch (jsonError) {
          console.error("错误无法序列化:", jsonError)
        }
        console.error(
          "错误堆栈:",
          err instanceof Error ? err.stack : "无堆栈信息"
        )

        // 记录环境信息
        console.log("当前URL:", window.location.href)
        console.log(
          "当前环境:",
          typeof window !== "undefined" ? "browser" : "non-browser"
        )
        console.log(
          "Chrome API可用:",
          typeof chrome !== "undefined" && !!chrome.runtime
        )
      } finally {
        setLoading(false)
      }
    }

    fetchPostDetail()
  }, [
    postId,
    useCurrentTab,
    finalCommentsCount,
    initialPostDetail,
    fetchAllComments
  ])

  if (loading) {
    return (
      <div style={{ color: "#333", backgroundColor: "#fff", padding: "8px" }}>
        <div style={{ textAlign: "center" }}>
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
            style={{ margin: "0 auto" }}></div>
          <span style={{ color: "#333", display: "block", marginTop: "8px" }}>
            Loading post details...
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          backgroundColor: "#ffebee",
          color: "#d32f2f",
          padding: "8px",
          borderRadius: "4px"
        }}>
        <h3
          style={{ color: "#d32f2f", fontWeight: "bold", margin: "0 0 6px 0" }}>
          Error
        </h3>
        <p style={{ color: "#d32f2f", margin: "0 0 6px 0" }}>{error}</p>
        <p style={{ color: "#666", fontSize: "0.875rem", margin: "6px 0 0 0" }}>
          Debug Info: postId={postId}, useCurrentTab={String(useCurrentTab)}
        </p>
        <p style={{ color: "#666", fontSize: "0.875rem", margin: "6px 0 0 0" }}>
          URL: {window.location.href}
        </p>
      </div>
    )
  }

  if (!postDetail) {
    return (
      <div style={{ color: "#333", backgroundColor: "#fff", padding: "8px" }}>
        <p style={{ color: "#333", margin: "0 0 6px 0" }}>
          No post details available.
        </p>
        <p style={{ color: "#666", fontSize: "0.875rem", margin: "6px 0 0 0" }}>
          Debug Info: postId={postId}, useCurrentTab={String(useCurrentTab)}
        </p>
        <p style={{ color: "#666", fontSize: "0.875rem", margin: "6px 0 0 0" }}>
          URL: {window.location.href}
        </p>
      </div>
    )
  }

  const toggleView = () => {
    setJsonView(!jsonView)
  }

  if (jsonView) {
    return (
      <div style={{ color: "#333", backgroundColor: "#fff", padding: "8px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px"
          }}>
          <button
            onClick={toggleView}
            style={{
              color: "#333",
              backgroundColor: "#e2e8f0",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "0.875rem",
              border: "none",
              cursor: "pointer"
            }}>
            Switch to UI View
          </button>
        </div>
        <pre
          style={{
            backgroundColor: "#f1f5f9",
            color: "#333",
            padding: "8px",
            borderRadius: "4px",
            overflow: "auto",
            maxHeight: "400px",
            fontSize: "0.875rem"
          }}>
          {twitterPostDetailScraper.formatPostDetailToJson(postDetail)}
        </pre>
      </div>
    )
  }

  // UI View
  return (
    <div style={{ color: "#333", backgroundColor: "#fff", padding: "8px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "8px"
        }}>
        <button
          onClick={toggleView}
          style={{
            color: "#333",
            backgroundColor: "#e2e8f0",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "0.875rem",
            border: "none",
            cursor: "pointer"
          }}>
          Switch to JSON View
        </button>
      </div>

      {/* Post Header */}
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "8px",
          marginBottom: "8px",
          backgroundColor: "#fff"
        }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            marginBottom: "6px"
          }}>
          {postDetail.authorAvatar && (
            <img
              src={postDetail.authorAvatar}
              alt={postDetail.authorDisplayName}
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "9999px",
                marginRight: "8px"
              }}
            />
          )}
          <div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ color: "#333", fontWeight: "bold" }}>
                {postDetail.authorDisplayName}
              </span>
              {postDetail.isVerified && (
                <svg
                  style={{
                    width: "1rem",
                    height: "1rem",
                    marginLeft: "4px",
                    color: "#3b82f6"
                  }}
                  fill="currentColor"
                  viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div style={{ color: "#6b7280" }}>@{postDetail.authorUsername}</div>
          </div>
        </div>

        {/* Post Content */}
        <p
          style={{
            color: "#333",
            marginBottom: "8px",
            whiteSpace: "pre-wrap"
          }}>
          {postDetail.text}
        </p>

        {/* Post Media */}
        {postDetail.media && postDetail.media.length > 0 && (
          <div style={{ marginBottom: "8px" }}>
            {postDetail.media
              .filter((m) => m.type === "image")
              .slice(0, 4)
              .map((image, index) => (
                <div
                  key={index}
                  style={{
                    overflow: "hidden",
                    borderRadius: "4px",
                    marginBottom: "4px"
                  }}>
                  <img
                    src={image.url}
                    alt={image.altText || ""}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "250px",
                      display: "block",
                      margin: "0 auto"
                    }}
                  />
                </div>
              ))}
            {postDetail.media
              .filter((m) => m.type === "video" || m.type === "gif")
              .slice(0, 1)
              .map((video, index) => (
                <div
                  key={`video-${index}`}
                  style={{
                    overflow: "hidden",
                    borderRadius: "4px",
                    position: "relative"
                  }}>
                  {video.thumbnailUrl ? (
                    <div style={{ position: "relative" }}>
                      <img
                        src={video.thumbnailUrl}
                        alt="Video thumbnail"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "250px",
                          display: "block",
                          margin: "0 auto"
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: "0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                        <div
                          style={{
                            backgroundColor: "rgba(0, 0, 0, 0.6)",
                            borderRadius: "9999px",
                            padding: "4px"
                          }}>
                          <svg
                            style={{
                              width: "1.25rem",
                              height: "1.25rem",
                              color: "#fff"
                            }}
                            fill="currentColor"
                            viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        backgroundColor: "#e5e7eb",
                        height: "8rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                      <span style={{ color: "#333" }}>Video content</span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Post Engagement */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            color: "#6b7280",
            fontSize: "0.875rem",
            paddingTop: "8px",
            borderTop: "1px solid #e2e8f0"
          }}>
          <div style={{ marginRight: "12px" }}>
            <span style={{ fontWeight: "bold", color: "#4b5563" }}>
              {postDetail.replyCount || 0}
            </span>{" "}
            Replies
          </div>
          <div style={{ marginRight: "12px" }}>
            <span style={{ fontWeight: "bold", color: "#4b5563" }}>
              {postDetail.retweetCount || 0}
            </span>{" "}
            Retweets
          </div>
          <div style={{ marginRight: "12px" }}>
            <span style={{ fontWeight: "bold", color: "#4b5563" }}>
              {postDetail.likeCount || 0}
            </span>{" "}
            Likes
          </div>
          {postDetail.viewCount && (
            <div>
              <span style={{ fontWeight: "bold", color: "#4b5563" }}>
                {postDetail.viewCount}
              </span>{" "}
              Views
            </div>
          )}
        </div>
      </div>

      {/* Comments Section */}
      <div>
        <h3 style={{ color: "#333", fontWeight: "bold", marginBottom: "8px" }}>
          Comments ({postDetail.comments?.length || 0})
        </h3>
        {!postDetail.comments || postDetail.comments.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No comments available</p>
        ) : (
          <div>
            {postDetail.comments.map((comment) => (
              <div
                key={comment.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "8px",
                  backgroundColor: "#fff",
                  marginBottom: "8px"
                }}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  {comment.authorAvatar && (
                    <img
                      src={comment.authorAvatar}
                      alt={comment.authorDisplayName}
                      style={{
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "9999px",
                        marginRight: "8px"
                      }}
                    />
                  )}
                  <div style={{ flex: "1 1 0%" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span
                        style={{
                          fontWeight: "bold",
                          fontSize: "0.875rem",
                          color: "#333"
                        }}>
                        {comment.authorDisplayName}
                      </span>
                      {comment.isVerified && (
                        <svg
                          style={{
                            width: "0.75rem",
                            height: "0.75rem",
                            marginLeft: "4px",
                            color: "#3b82f6"
                          }}
                          fill="currentColor"
                          viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812a3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      <span
                        style={{
                          color: "#6b7280",
                          fontSize: "0.75rem",
                          marginLeft: "4px"
                        }}>
                        @{comment.authorUsername}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        marginTop: "4px",
                        color: "#333"
                      }}>
                      {comment.text}
                    </p>

                    {/* Comment Media */}
                    {comment.media && comment.media.length > 0 && (
                      <div style={{ marginTop: "4px" }}>
                        {comment.media
                          .filter((m) => m.type === "image")
                          .slice(0, 1)
                          .map((image, index) => (
                            <div
                              key={index}
                              style={{
                                overflow: "hidden",
                                borderRadius: "4px"
                              }}>
                              <img
                                src={image.url}
                                alt={image.altText || ""}
                                style={{ maxHeight: "150px", maxWidth: "100%" }}
                              />
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Comment Engagement */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        color: "#6b7280",
                        fontSize: "0.75rem",
                        marginTop: "6px"
                      }}>
                      <div style={{ marginRight: "10px" }}>
                        <span style={{ fontWeight: "bold", color: "#4b5563" }}>
                          {comment.replyCount || 0}
                        </span>{" "}
                        Replies
                      </div>
                      <div style={{ marginRight: "10px" }}>
                        <span style={{ fontWeight: "bold", color: "#4b5563" }}>
                          {comment.retweetCount || 0}
                        </span>{" "}
                        Retweets
                      </div>
                      <div>
                        <span style={{ fontWeight: "bold", color: "#4b5563" }}>
                          {comment.likeCount || 0}
                        </span>{" "}
                        Likes
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TwitterPostDetailView
