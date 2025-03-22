import CloudDownloadIcon from "@mui/icons-material/CloudDownload"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import SaveIcon from "@mui/icons-material/Save"
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from "@mui/material"
import React, { useState } from "react"

import { scrapeTwitterProfileData } from "../services/twitterScraper"
import type { TwitterProfileData } from "../types/twitter"

interface ProfileScraperProps {
  username?: string
  scrollCount?: number
  onSuccess?: (data: TwitterProfileData) => void
  onError?: (error: string) => void
}

/**
 * Component for scraping Twitter/X profiles and posts
 */
const ProfileScraper: React.FC<ProfileScraperProps> = ({
  username,
  scrollCount = 5,
  onSuccess,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<
    "idle" | "scraping" | "saving" | "success" | "error" | "scraped"
  >("idle")
  const [message, setMessage] = useState("")
  const [profileData, setProfileData] = useState<TwitterProfileData | null>(
    null
  )
  const [showFullData, setShowFullData] = useState(false)
  const [scrapedStats, setScrapedStats] = useState({
    attemptedPosts: 0,
    successfulPosts: 0,
    followers: 0,
    following: 0
  })
  const [saveError, setSaveError] = useState<string | null>(null)

  /**
   * Format numbers with K, M, B suffixes for better readability
   */
  const formatNumber = (num: number): string => {
    if (num === 0) return "0"

    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B"
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M"
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K"
    }
    return num.toString()
  }

  /**
   * Save scraped data to database via API
   */
  const saveDataToDatabase = async () => {
    if (!profileData) return

    try {
      setStatus("saving")
      setMessage("Saving data to database...")
      setProgress(80)
      setSaveError(null)

      // Save data via background script
      chrome.runtime.sendMessage(
        {
          type: "SAVE_PROFILE_DATA",
          profileData: profileData
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error saving profile data:",
              chrome.runtime.lastError
            )
            setSaveError(`Failed to save: ${chrome.runtime.lastError.message}`)
            // Keep the scraped status, don't go to full error
            setStatus("scraped")
            setMessage(
              `Data scraped successfully, but failed to save to database.`
            )
            setIsLoading(false)
            return
          }

          if (response && response.success) {
            setStatus("success")
            setMessage(
              `Data scraped and saved successfully. Retrieved ${formatNumber(profileData.posts.length)} posts, successfully processed ${formatNumber(scrapedStats.successfulPosts)} posts.`
            )
            setProgress(100)
          } else {
            setSaveError(response?.error || "Failed to save data")
            // Keep the scraped status, don't go to full error
            setStatus("scraped")
            setMessage(
              `Data scraped successfully, but failed to save to database.`
            )
          }
          setIsLoading(false)
        }
      )
    } catch (error) {
      console.error("Error saving profile data:", error)
      setSaveError(
        error instanceof Error ? error.message : "Failed to save data"
      )
      setStatus("scraped")
      setMessage(`Data scraped successfully, but failed to save to database.`)
      setIsLoading(false)
    }
  }

  /**
   * Scrape profile and posts data
   */
  const handleScrape = async () => {
    try {
      setIsLoading(true)
      setStatus("scraping")
      setMessage("Scraping personal information...")
      setProgress(10)
      setSaveError(null)

      // Get current username if not provided
      const targetUsername = username || getCurrentUsername()

      if (!targetUsername) {
        throw new Error(
          "Username not found. Please navigate to a Twitter/X profile page."
        )
      }

      // Start scraping process
      setProgress(20)
      setMessage(`Scraping @${targetUsername}'s personal information...`)

      // Execute scraping
      const data = await scrapeTwitterProfileData(scrollCount)

      setProgress(70)
      setMessage(
        `Successfully scraped! Retrieved personal information and ${formatNumber(data.posts.length)} posts.`
      )

      // Update stats
      const successfulPosts = data.posts.filter(
        (post) => post.id && post.text
      ).length
      setScrapedStats({
        attemptedPosts: data.posts.length,
        successfulPosts: successfulPosts,
        followers: data.profile.followersCount || 0,
        following: data.profile.followingCount || 0
      })

      // Save the data to state
      setProfileData(data)
      setStatus("scraped")
      setProgress(80)

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(data)
      }

      // Try to save to database if API is available
      try {
        await saveDataToDatabase()
      } catch (saveError) {
        console.error(
          "Failed to save to database but scraping was successful:",
          saveError
        )
        // We've already handled this in saveDataToDatabase
      }
    } catch (error) {
      console.error("Error scraping profile:", error)
      setStatus("error")
      setMessage(
        error instanceof Error ? error.message : "An unknown error occurred"
      )

      // Call error callback if provided
      if (onError) {
        onError(
          error instanceof Error ? error.message : "An unknown error occurred"
        )
      }
      setIsLoading(false)
    }
  }

  /**
   * Try to save to database again
   */
  const handleRetrySave = async () => {
    await saveDataToDatabase()
  }

  /**
   * Get current username from URL
   */
  const getCurrentUsername = (): string => {
    const url = window.location.href
    const match =
      url.match(/twitter\.com\/([^/]+)/i) || url.match(/x\.com\/([^/]+)/i)

    if (match && match[1]) {
      // Filter out common Twitter paths that aren't usernames
      const nonUsernamePaths = [
        "home",
        "explore",
        "notifications",
        "messages",
        "search"
      ]
      if (!nonUsernamePaths.includes(match[1].toLowerCase())) {
        return match[1]
      }
    }

    return ""
  }

  /**
   * Toggle show full data
   */
  const toggleShowFullData = () => {
    setShowFullData(!showFullData)
  }

  /**
   * Format date for display
   */
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString()
  }

  /**
   * Determine if we should show scraped data
   */
  const shouldShowScrapedData = () => {
    return (
      (status === "scraped" || status === "success") && profileData !== null
    )
  }

  /**
   * Get current status description
   */
  const getStatusDisplay = () => {
    switch (status) {
      case "scraping":
        return "Scraping data..."
      case "saving":
        return "Saving to database..."
      case "scraped":
        return "Data scraped successfully, but not saved to database"
      case "success":
        return "Data successfully scraped and saved"
      case "error":
        return "Scraping failed"
      default:
        return ""
    }
  }

  return (
    <Paper elevation={2} sx={{ p: 2, mt: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ color: "#805ad5" }}>
        Twitter Profile Scraper
      </Typography>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          From the current Twitter/X profile page, scrape personal information
          and posts. The data will be extracted in JSON format and automatically
          saved to the database.
        </Typography>
      </Box>

      {/* Status indicators */}
      {status !== "idle" && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="body2" fontWeight="medium" minWidth={140}>
              {getStatusDisplay()}
            </Typography>
            {isLoading && (
              <LinearProgress
                sx={{
                  flexGrow: 1,
                  "& .MuiLinearProgress-bar": { bgcolor: "#805ad5" }
                }}
                variant="determinate"
                value={progress}
              />
            )}
          </Stack>
        </Box>
      )}

      {/* Success Message */}
      {status === "success" && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      {/* Scraped but Not Saved Message */}
      {status === "scraped" && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      {/* Save Error Message */}
      {saveError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {saveError}
        </Alert>
      )}

      {/* Scraping Error Message */}
      {status === "error" && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <CircularProgress size={24} sx={{ mr: 1, color: "#805ad5" }} />
          <Typography variant="body2">{message}</Typography>
        </Box>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <Button
          variant="contained"
          sx={{
            bgcolor: "#805ad5",
            "&:hover": {
              bgcolor: "#6b46c1"
            }
          }}
          startIcon={<CloudDownloadIcon />}
          onClick={handleScrape}
          disabled={isLoading}>
          Scrape & Save Profile
        </Button>
      </Box>

      {/* Scraped Data Display - Show regardless of API save success */}
      {shouldShowScrapedData() && (
        <Box sx={{ mb: 2 }}>
          {/* Summary Chips */}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1, mb: 2 }}>
            <Chip
              label={`${formatNumber(profileData?.posts.length || 0)} posts`}
              size="small"
              sx={{
                color: "#805ad5",
                borderColor: "#805ad5"
              }}
              variant="outlined"
            />
            <Chip
              label={`${formatNumber(profileData?.profile.followersCount || 0)} followers`}
              size="small"
              sx={{
                color: "#805ad5",
                borderColor: "#805ad5"
              }}
              variant="outlined"
            />
            <Chip
              label={`${formatNumber(profileData?.profile.followingCount || 0)} following`}
              size="small"
              sx={{
                color: "#805ad5",
                borderColor: "#805ad5"
              }}
              variant="outlined"
            />
          </Box>

          {/* Detailed Statistics Table */}
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Statistics</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Value</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>@{profileData?.profile.username}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Display Name</TableCell>
                  <TableCell>{profileData?.profile.displayName}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Followers</TableCell>
                  <TableCell>
                    {formatNumber(profileData?.profile.followersCount || 0)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Following</TableCell>
                  <TableCell>
                    {formatNumber(profileData?.profile.followingCount || 0)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Attempted Posts</TableCell>
                  <TableCell>
                    {formatNumber(scrapedStats.attemptedPosts)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Successful Posts</TableCell>
                  <TableCell>
                    {formatNumber(scrapedStats.successfulPosts)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Success Rate</TableCell>
                  <TableCell>
                    {scrapedStats.attemptedPosts
                      ? Math.round(
                          (scrapedStats.successfulPosts /
                            scrapedStats.attemptedPosts) *
                            100
                        )
                      : 0}
                    %
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Scraped Time</TableCell>
                  <TableCell>
                    {profileData &&
                      new Date(profileData.scrapedAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Testing Only: Show Full Data Preview Section */}
          <Accordion
            sx={{ mt: 2 }}
            expanded={showFullData}
            onChange={toggleShowFullData}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: "#805ad5" }} />}
              sx={{
                "& .MuiAccordionSummary-content": {
                  color: "#805ad5"
                }
              }}>
              <Typography>
                View Raw Scraped Data (Only for Testing Purposes)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                This is the complete raw scraped data from the profile. This
                section is only for testing purposes and will be removed in the
                production environment.
              </Typography>

              {/* Profile Data Section */}
              <Typography
                variant="subtitle2"
                sx={{ mt: 2, fontWeight: "bold" }}>
                Personal Information Data:
              </Typography>
              <Box
                component="pre"
                sx={{
                  backgroundColor: "#f5f5f5",
                  p: 1,
                  borderRadius: 1,
                  overflow: "auto",
                  maxHeight: "200px",
                  fontSize: "0.75rem"
                }}>
                {JSON.stringify(profileData?.profile, null, 2)}
              </Box>

              {/* Posts Preview Section */}
              <Typography
                variant="subtitle2"
                sx={{ mt: 2, fontWeight: "bold" }}>
                Posts Data (First 3):
              </Typography>
              <Box
                component="pre"
                sx={{
                  backgroundColor: "#f5f5f5",
                  p: 1,
                  borderRadius: 1,
                  overflow: "auto",
                  maxHeight: "500px",
                  fontSize: "0.75rem"
                }}>
                {JSON.stringify(profileData?.posts.slice(0, 3), null, 2)}
              </Box>

              {/* Posts Table */}
              <Typography
                variant="subtitle2"
                sx={{ mt: 2, fontWeight: "bold" }}>
                Posts Table ({formatNumber(profileData?.posts.length || 0)}{" "}
                posts):
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 1, maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Text</TableCell>
                      <TableCell>Likes</TableCell>
                      <TableCell>Retweets</TableCell>
                      <TableCell>Replies</TableCell>
                      <TableCell>Reads</TableCell>
                      <TableCell>Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {profileData?.posts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell>{post.id.substring(0, 8)}...</TableCell>
                        <TableCell>{formatDate(post.createdAt)}</TableCell>
                        <TableCell>
                          {post.text.substring(0, 50)}
                          {post.text.length > 50 ? "..." : ""}
                          {post.originalPost && (
                            <Box
                              sx={{
                                ml: 1,
                                mt: 1,
                                p: 1,
                                bgcolor: "#f5f5f5",
                                borderLeft: "2px solid #805ad5"
                              }}>
                              <Typography
                                variant="caption"
                                display="block"
                                fontWeight="bold">
                                {post.originalPost.authorUsername ===
                                profileData?.profile.username
                                  ? "Original post"
                                  : `@${post.originalPost.authorUsername}'s post`}
                              </Typography>
                              <Typography variant="caption">
                                {post.originalPost.text?.substring(0, 50)}
                                {post.originalPost.text &&
                                post.originalPost.text.length > 50
                                  ? "..."
                                  : ""}
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>{formatNumber(post.likeCount)}</TableCell>
                        <TableCell>{formatNumber(post.retweetCount)}</TableCell>
                        <TableCell>{formatNumber(post.replyCount)}</TableCell>
                        <TableCell>
                          {post.viewCount ? formatNumber(post.viewCount) : "—"}
                        </TableCell>
                        <TableCell>
                          {post.isRetweet
                            ? "Repost"
                            : post.isReply
                              ? "Reply"
                              : "Tweet"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}
    </Paper>
  )
}

export default ProfileScraper
