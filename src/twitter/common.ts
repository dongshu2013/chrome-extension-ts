import { TwitterAuthor, TwitterPost } from '../types/twitter';

export function extractAuthorInfo(element: Element): TwitterAuthor {
  const authorElement = element.querySelector('[data-testid="User-Name"]');
  const displayName = authorElement?.querySelector('span')?.textContent || '';
  const usernameElement = authorElement?.querySelector('[dir="ltr"]');
  const username = usernameElement?.textContent?.replace('@', '') || '';
  const profileUrl = `https://twitter.com/${username}`;
  
  return {
    username,
    displayName,
    profileUrl
  };
}

export function convertTwitterPostToMarkdown(post: TwitterPost | TwitterPost[]): string {
  console.log('Converting post(s) to markdown format');
  
  if (Array.isArray(post)) {
    return post.map(p => convertTwitterPostToMarkdown(p)).join('\n\n---\n\n');
  }
  
  let markdown = `## Tweet by [${post.author.displayName}](${post.author.profileUrl}) ${post.url ? `[🔗](${post.url})` : ''}\n`;
  markdown += `${post.content}\n\n`;
  
  // Add metadata if available
  const stats: string[] = [];
  if (post.likesCount) stats.push(`❤️ ${post.likesCount}`);
  if (post.retweetsCount) stats.push(`🔄 ${post.retweetsCount}`);
  if (post.repliesCount) stats.push(`💬 ${post.repliesCount}`);
  
  if (stats.length > 0) {
    markdown += `*${stats.join(' · ')}*\n`;
  }
  
  if (post.timestamp) {
    const date = new Date(post.timestamp);
    markdown += `*Posted on ${date.toLocaleDateString()}*\n`;
  }
  
  // Add replies if available
  if (post.replies && post.replies.length > 0) {
    markdown += '\n### Replies\n';
    post.replies.forEach(reply => {
      markdown += `\n**[${reply.author.displayName}](${reply.author.profileUrl})**\n`;
      markdown += `${reply.content}\n`;
      if (reply.timestamp) {
        const replyDate = new Date(reply.timestamp);
        markdown += `*Posted on ${replyDate.toLocaleDateString()}*\n`;
      }
      markdown += '---\n';
    });
  }

  // Add replyTo or originalPost if available
  if (post.type === 'reply') {
    markdown += '\n### Original Tweet\n';
    markdown += `**[${post.replyTo.author.displayName}](${post.replyTo.author.profileUrl})**\n`;
    markdown += `${post.replyTo.content}\n`;
    if (post.replyTo.timestamp) {
      const replyToDate = new Date(post.replyTo.timestamp);
      markdown += `*Posted on ${replyToDate.toLocaleDateString()}*\n`;
    }
  } else if (post.type === 'repost') {
    markdown += '\n### Original Tweet\n';
    markdown += `**[${post.originalPost.author.displayName}](${post.originalPost.author.profileUrl})**\n`;
    markdown += `${post.originalPost.content}\n`;
    if (post.originalPost.timestamp) {
      const originalPostDate = new Date(post.originalPost.timestamp);
      markdown += `*Posted on ${originalPostDate.toLocaleDateString()}*\n`;
    }
    if (post.hasQuote) {
      markdown += '\n### Quote Comment\n';
      markdown += `${post.quoteComment}\n`;
    }
  }
  
  console.log('Markdown conversion complete');
  return markdown;
}
