import { summarizeProfile } from "../services/ai";
import {
  extractTwitterPosts,
  isTwitterProfileUrl,
  isTwitterReplyUrl,
} from "../twitter/timeline";
import { convertTwitterPostToMarkdown } from "../twitter/common";
import { Settings, DEFAULT_SETTINGS } from "../types";
import { isBuzzWebsiteUrl } from "../utils/url";

// Initialize extension settings if not already set
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Extension installed/updated");
  const settings = await new Promise<Settings>((resolve) => {
    chrome.storage.sync.get(["settings"], (result) => {
      resolve(result.settings);
    });
  });

  if (!settings) {
    console.log("Initializing default settings");
    await new Promise<void>((resolve) => {
      chrome.storage.sync.set({ settings: DEFAULT_SETTINGS }, resolve);
    });
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);

  if (message.type === "ANALYZE_PROFILE") {
    handleProfileAnalysis(message.html);
    return true; // Will respond asynchronously
  }

  if (message.type === "PROFILE_TRAIT") {
    console.log("Handling profile trait update");
    // Save the profile data
    chrome.storage.sync.get(["profile"], (result) => {
      console.log("Retrieved profile:", result.profile);
      const profile = message.data.text;
      chrome.storage.sync.set({ profile }, () => {
        console.log("Profile saved, forwarding to popup");
        // Forward the text data to the popup
        chrome.runtime.sendMessage({
          type: "PAGE_ANALYSIS",
          data: {
            text: profile,
          },
        });
      });
    });
  }

  if (message.type === "GET_PROFILE_CONTENT") {
    console.log("Getting profile content");
    // Retrieve existing profile content
    chrome.storage.sync.get(["profile"], (result) => {
      console.log("Retrieved profile:", result);
      sendResponse({ content: result.profile || "" });
    });
    return true; // Required for async response
  }

  if (message.type === "AUTO_REPLY_BUZZ") {
    autoReplyBuzz();
    return true;
  }

  if (message.type === "TEST_TWITTER") {
    testTwitter();
    return true;
  }
});

// Add tab monitoring
chrome.tabs.onCreated.addListener((tab) => {
  console.log("New tab created:", tab);

  const openerTabId = tab.openerTabId;

  if (openerTabId) {
    console.log("Opener tab id:", openerTabId);
    chrome.tabs.get(openerTabId, (openerTab) => {
      console.log("Opener tab:", openerTab);
    });
  }

  console.log("Tab url:", tab.url);
  console.log("is twitter reply url:", isTwitterReplyUrl(tab.url || ""));

  const isTwitterReply = true;

  // Check if it's a URL of twitter reply
  if (isTwitterReply) {
    console.log("Twitter reply tab detected");

    // You can send a message to inform other parts of your extension
    handleNewTwitterReplyTab(tab.id);
  }
});

async function handleProfileAnalysis(html: string) {
  try {
    // Get settings
    const settings = await new Promise<Settings>((resolve) => {
      chrome.storage.sync.get(["settings"], (result) => {
        resolve(result.settings || DEFAULT_SETTINGS);
      });
    });

    // Extract posts
    const posts = await extractTwitterPosts(html, settings);

    if (posts.length === 0) {
      throw new Error("No posts found on this profile");
    }

    // Get existing profile content
    const existingContent = await getExistingProfile("");

    // Generate summary
    const postsMarkdown = convertTwitterPostToMarkdown(posts).split("\n");
    const updatedProfile = await summarizeProfile(
      postsMarkdown,
      existingContent,
      settings
    );

    // Save and broadcast the result
    chrome.storage.sync.set({ profile: updatedProfile }, () => {
      chrome.runtime.sendMessage({
        type: "PAGE_ANALYSIS",
        data: {
          text: updatedProfile,
        },
      });
    });
  } catch (error: unknown) {
    console.error("Error in profile analysis:", error);
    chrome.runtime.sendMessage({
      type: "PROFILE_ERROR",
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}

// Helper function to get existing profile content
async function getExistingProfile(url: string) {
  console.log("Getting existing profile content", url);
  return await new Promise<string>((resolve) => {
    chrome.storage.sync.get(["profile"], (result) => {
      resolve(result.profile || "");
    });
  });
}

async function autoReplyBuzz() {
  try {
    console.log("Start auto-reply buzz...");
    const tabs = await chrome.tabs.query({});

    const buzzTab = tabs.find((t) => t?.url && isBuzzWebsiteUrl(t.url));
    if (!buzzTab?.id) {
      console.error("No Buzz tab found");
      return;
    }

    // Execute in the context of the web page
    const replyBuzzButtons = await chrome.scripting.executeScript({
      target: { tabId: buzzTab.id },
      func: () => {
        const replyBuzzButtons =
          document.querySelectorAll('[id^="replyBuzz-"]');
        const replyBuzzButton = replyBuzzButtons[0] as HTMLButtonElement;
        if (replyBuzzButton) {
          replyBuzzButton.click();
        } else {
          console.log("No reply buzz button found");
        }
        return Array.from(replyBuzzButtons).map((el) => el.id);
      },
    });
  } catch (error: unknown) {
    console.error("Error starting auto reply buzz:", error);
  }
}

async function testTwitter() {
  console.log("Start test twitter");
  const tabs = await chrome.tabs.query({ active: true });
  handleNewTwitterReplyTab(tabs[0]?.id);
}

async function handleNewTwitterReplyTab(tabId: number | undefined) {
  if (!tabId) {
    console.error("handleNewTwitterReplyTab: No tab id found");
    return;
  }

  try {
    console.log("New twitter reply tab detected:", tabId);
    // Click reply in twitter
    const result = await chrome.scripting
      .executeScript({
        target: { tabId },
        func: async () => {
          console.log("Start script in twitter");

          const sleep = (ms: number) =>
            new Promise((resolve) => setTimeout(resolve, ms));

          const toolbar = document.querySelector('div[data-testid="toolBar"]');
          if (!toolbar) {
            console.log("Toolbar not found");
            return null;
          }

          // Now find the reply button within the toolbar
          const replyButton = toolbar.querySelector(
            'button[data-testid="tweetButton"]'
          ) as HTMLButtonElement;

          if (replyButton) {
            console.log("twitter replyButton found:", replyButton);
            try {
              console.log("twitter replyButton click");
              replyButton.click();

              let retryCount = 0;
              let newPostHref = "";

              while (retryCount < 10) {
                retryCount++;
                await sleep(1000);

                const alert = document.querySelector('[role="alert"]');
                if (alert) {
                  console.log("twitter alert found:", alert);
                  const viewLink = alert.querySelector('a[role="link"] span');

                  // If the link is found, get its href
                  if (
                    viewLink &&
                    (viewLink.textContent === "查看" ||
                      viewLink.textContent === "View")
                  ) {
                    const linkElement = viewLink.closest("a");
                    const hrefValue = linkElement
                      ? linkElement.getAttribute("href")
                      : null;
                    console.log("Found href:", hrefValue);
                    newPostHref = hrefValue || "";
                    break;
                  }
                }
              }

              return newPostHref;
            } catch (err) {
              console.error("twitter replyButton click error:", err);
            }
          } else {
            console.log("No reply button found");
          }
        },
      })
      .catch((err) => {
        console.error("twitter replyButton click error:", err);
      });

    // Process the result
    if (result && result[0] && result[0].result) {
      const newPostHref = result[0].result;

      // Now call handleNewTwitterReplyFinished with the URL
      if (newPostHref) {
        const fullNewPostUrl = `https://twitter.com${newPostHref}`;
        await handleNewTwitterReplyFinished(fullNewPostUrl);
      } else {
        await handleNewTwitterReplyFinished();
      }
    }

    // Close the tab after processing
    await chrome.tabs.remove(tabId);
  } catch (err) {
    console.error("Error handling new twitter reply tab:", err);
  }
}

async function handleNewTwitterReplyFinished(replyUrl?: string) {
  console.log("New twitter reply finished:", replyUrl);
  try {
    const tabs = await chrome.tabs.query({});

    const buzzTab = tabs.find((t) => t?.url && isBuzzWebsiteUrl(t.url));
    if (!buzzTab?.id) {
      console.error("No Buzz tab found");
      return;
    }

    // Execute in the context of the web page
    await chrome.scripting.executeScript({
      target: { tabId: buzzTab.id },
      func: () => {
        try {
          if (!replyUrl) {
            return;
          }

          // Find input of id replyLink
          const replyLinkInput = document.querySelector(
            '[id="replyLink"]'
          ) as HTMLInputElement;
          if (replyLinkInput) {
            replyLinkInput.value = replyUrl;
          }

          const replyBuzzButtons = document.querySelectorAll(
            '[id^="comfirmReply"]'
          );
          const replyBuzzButton = replyBuzzButtons[0] as HTMLButtonElement;
          if (replyBuzzButton) {
            replyBuzzButton.click();
          } else {
            console.log("No confirm reply button found");
          }
          return Array.from(replyBuzzButtons).map((el) => el.id);
        } catch (err) {
        } finally {
        }
      },
    });
  } catch (error: unknown) {
    console.error("Error starting auto reply buzz:", error);
  }
}
