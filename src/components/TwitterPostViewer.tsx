import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline"
import FavoriteIcon from "@mui/icons-material/Favorite"
import RepeatIcon from "@mui/icons-material/Repeat"
import SearchIcon from "@mui/icons-material/Search"
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
  Link,
  TextField,
  Typography
} from "@mui/material"
import React, { useState } from "react"

import type { TwitterPost } from "../types/twitter"

const TwitterPostViewer: React.FC = () => {
  const [username, setUsername] = useState("")
  const [posts, setPosts] = useState<TwitterPost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [count, setCount] = useState(10)

  const fetchPosts = async () => {
    if (!username) {
      setError("Please enter a Twitter username")
      return
    }

    setLoading(true)
    setError("")
    setPosts([])

    try {
      const response = await chrome.runtime.sendMessage({
        type: "FETCH_POSTS",
        username: username.replace(/^@/, ""), // Remove @ if present
        count
      })

      if (response.success) {
        setPosts(response.posts)
        if (response.posts.length === 0) {
          setError("No posts found for this user")
        }
      } else {
        setError(response.error || "Failed to fetch posts")
      }
    } catch (err) {
      setError("Error connecting to background script")
      console.error("Error fetching posts:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchPosts()
  }

  const formatDate = (timestamp: string) => {
    if (!timestamp) return ""
    try {
      const date = new Date(timestamp)
      return date.toLocaleString()
    } catch (err) {
      return timestamp
    }
  }

  const renderPost = (post: TwitterPost, index: number) => {
    return (
      <Card key={`${post.id || index}`} sx={{ mb: 2, maxWidth: "100%" }}>
        <CardHeader
          avatar={
            <Avatar
              src={`https://unavatar.io/twitter/${post.author.username}`}
            />
          }
          title={
            <Typography variant="subtitle1" fontWeight="bold">
              {post.author.displayName}{" "}
              <Typography
                component="span"
                variant="body2"
                color="text.secondary">
                @{post.author.username}
              </Typography>
            </Typography>
          }
          subheader={formatDate(post.timestamp)}
        />

        {/* If reply, show original tweet */}
        {post.type === "reply" && post.replyTo && (
          <Box
            sx={{
              mx: 2,
              my: 1,
              p: 1,
              bgcolor: "rgba(0, 0, 0, 0.03)",
              borderRadius: 1
            }}>
            <Typography variant="body2" color="text.secondary">
              Replying to{" "}
              <Link href={post.replyTo.author.profileUrl} target="_blank">
                @{post.replyTo.author.username}
              </Link>
              : {post.replyTo.content.slice(0, 100)}
              {post.replyTo.content.length > 100 ? "..." : ""}
            </Typography>
          </Box>
        )}

        {/* If repost, show original post */}
        {post.type === "repost" && post.originalPost && (
          <Box
            sx={{
              mx: 2,
              my: 1,
              p: 1,
              bgcolor: "rgba(0, 0, 0, 0.03)",
              borderRadius: 1
            }}>
            <Typography variant="body2">
              <Link href={post.originalPost.author.profileUrl} target="_blank">
                @{post.originalPost.author.username}
              </Link>
              : {post.originalPost.content.slice(0, 100)}
              {post.originalPost.content.length > 100 ? "..." : ""}
            </Typography>
          </Box>
        )}

        <CardContent>
          <Typography
            variant="body1"
            component="div"
            sx={{ whiteSpace: "pre-wrap" }}>
            {post.content}
          </Typography>

          {post.url && (
            <Box sx={{ mt: 1 }}>
              <Link href={post.url} target="_blank" rel="noopener">
                View on Twitter
              </Link>
            </Box>
          )}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mt: 2,
              color: "text.secondary"
            }}>
            <Box sx={{ display: "flex", alignItems: "center", mr: 2 }}>
              <ChatBubbleOutlineIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="body2">{post.repliesCount || 0}</Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", mr: 2 }}>
              <RepeatIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="body2">{post.retweetsCount || 0}</Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center" }}>
              <FavoriteIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="body2">{post.likesCount || 0}</Typography>
            </Box>
          </Box>
        </CardContent>

        {index < posts.length - 1 && <Divider />}
      </Card>
    )
  }

  return (
    <Box sx={{ p: 2, maxWidth: "600px", mx: "auto" }}>
      <Typography variant="h5" sx={{ mb: 2, textAlign: "center" }}>
        Twitter Post Viewer
      </Typography>

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: "flex", mb: 2 }}>
          <TextField
            fullWidth
            label="Twitter Username"
            variant="outlined"
            placeholder="Enter username (without @)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={!!error}
            helperText={error}
            sx={{ mr: 1 }}
          />
          <TextField
            type="number"
            label="Post Count"
            variant="outlined"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            InputProps={{ inputProps: { min: 1, max: 50 } }}
            sx={{ width: "100px", mr: 1 }}
          />
          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={loading}
            startIcon={
              loading ? <CircularProgress size={20} /> : <SearchIcon />
            }>
            Fetch
          </Button>
        </Box>
      </form>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {posts.length > 0 && (
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Found {posts.length} posts from @{username}:
          </Typography>
          <Box>{posts.map(renderPost)}</Box>
        </Box>
      )}
    </Box>
  )
}

export default TwitterPostViewer
