export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getReplyIntentUrl(tweetUrl: string, text?: string) {
  try {
    const url = new URL(tweetUrl);
    const pathParts = url.pathname.split("/");
    const tweetId = pathParts[pathParts.length - 1];
    const intentUrl = `https://twitter.com/intent/tweet?in_reply_to=${tweetId}`;
    return text ? `${intentUrl}&text=${encodeURIComponent(text)}` : intentUrl;
  } catch {
    return tweetUrl;
  }
}