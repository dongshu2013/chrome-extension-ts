import { Buzz } from "../types";
import { getReplyIntentUrl } from "../utils/common";
import { BUZZ_HOST } from "../utils/constants";

const INTERVAL_TIME = 15000;

export let buzzApiKey: string = "";
export let executingBuzzId: string | null = null;
export let executingBuzzReplyText: string | null = null;

export async function setBuzzApiKey(apiKey: string) {
  buzzApiKey = apiKey;
}

export async function startApiBuzz() {
  try {
    console.log("Start api buzz:", buzzApiKey);
    console.log("Request URL:", `${BUZZ_HOST}/api/ext/get-buzz-for-user`);

    const response = await fetch(`${BUZZ_HOST}/api/ext/get-buzz-for-user`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": buzzApiKey,
      },
    });

    const data = await response.json().catch((err) => {
      console.log("Error getting buzz for user:", err);
      return null;
    });
    const buzzList = data?.buzzList || [];
    const buzz: Buzz = buzzList[0];

    if (!buzz) {
      console.log("No buzz found");
      setTimeout(() => {
        startApiBuzz();
      }, INTERVAL_TIME);
      return;
    }

    console.log("Buzz:", buzz);

    const generateReplyResponse = await fetch(
      `${BUZZ_HOST}/api/generate-reply`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": buzzApiKey,
        },
        body: JSON.stringify({
          instructions: buzz.instructions,
          tweetText: buzz.tweetText,
        }),
      }
    );

    const generateReplyData = await generateReplyResponse
      .json()
      .catch((err) => {
        console.log("Error generating reply:", err);
        return null;
      });

    const replyText = generateReplyData?.text;

    if (!replyText) {
      console.log("No reply text found");
      setTimeout(() => {
        startApiBuzz();
      }, INTERVAL_TIME);
      return;
    }

    console.log("Reply text:", replyText);

    executingBuzzId = buzz.id;
    executingBuzzReplyText = replyText;

    // Open new twitter tab with reply text
    const twitterUrl = getReplyIntentUrl(buzz.tweetLink, replyText);
    chrome.tabs.create({ url: twitterUrl });
  } catch (err) {
    console.log("Error starting api buzz:", err);
  }
}

export async function replyApiBuzz(replyUrl: string | undefined) {
  try {
    if (!replyUrl) {
      console.log("No reply url found");
      startApiBuzz();
      return;
    }

    console.log(
      "Reply api buzz:",
      executingBuzzId,
      replyUrl,
      executingBuzzReplyText
    );

    const response = await fetch(`${BUZZ_HOST}/api/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": buzzApiKey,
      },
      body: JSON.stringify({
        buzzId: executingBuzzId,
        replyLink: replyUrl,
        text: executingBuzzReplyText,
      }),
    });

    const data = await response.json().catch((err) => {
      console.log("Error replying api buzz:", err);
      return null;
    });

    console.log("Reply api buzz response:", data);

    startApiBuzz();
  } catch (err) {
    console.log("Error replying api buzz:", err);
  }
}
