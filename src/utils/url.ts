export function isTwitterProfileUrl(url: string): boolean {
  // Match twitter.com/username or x.com/username but not subpages
  // Also allow www subdomain
  return /^https?:\/\/((?:www\.)?twitter\.com|(?:www\.)?x\.com)\/[^/]+$/.test(
    url
  );
}

export function isBuzzWebsiteUrl(url: string): boolean {
  console.log("check isBuzzWebsiteUrl", url);
  return (
    url.startsWith("http://localhost:3000") ||
    url.startsWith("https://buzz.ai") ||
    url.startsWith("https://staging.buzzz.fun")
  );
}
