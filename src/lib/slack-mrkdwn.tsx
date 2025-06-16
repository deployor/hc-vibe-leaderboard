import React from 'react';
import DOMPurify from 'dompurify';

// Emoji type definition
interface SlackEmoji {
  short_names: string[];
  image: string;
}

// Fetch emoji from Slack's emoji list
async function fetchSlackEmoji(): Promise<SlackEmoji[]> {
  try {
    const response = await fetch('https://raw.githubusercontent.com/iamcal/emoji-data/master/emoji.json');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch Slack emojis', error);
    return [];
  }
}

// Mrkdwn parsing utility
export class SlackMrkdwn {
  private static emojiCache: SlackEmoji[] = [];
  private static emojiPromise: Promise<SlackEmoji[]> | null = null;

  // Escape HTML special characters
  private static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Fetch and cache emojis
  private static async getEmojis(): Promise<SlackEmoji[]> {
    if (this.emojiPromise) return this.emojiPromise;
    
    this.emojiPromise = fetchSlackEmoji().then(emojis => {
      this.emojiCache = emojis;
      return emojis;
    });

    return this.emojiPromise;
  }

  // Convert emoji to image
  private static async convertEmoji(emoji: string): Promise<string> {
    await this.getEmojis();
    
    // Find emoji in the list
    const emojiData = this.emojiCache.find(
      e => e.short_names.includes(emoji.replace(/:/g, ''))
    );

    if (emojiData) {
      return `<img src="https://raw.githubusercontent.com/iamcal/emoji-data/master/img-apple-64/${emojiData.image}" alt="${emoji}" class="inline-emoji" />`;
    }

    return emoji;
  }

  // Parse mrkdwn text
  static async parse(text: string): Promise<React.ReactNode> {
    // Escape HTML special characters first
    let parsedText = this.escapeHtml(text);

    // Replace special mentions
    parsedText = parsedText.replace(
      /<!(\w+)>/g, 
      (match, mention) => {
        const mentionMap: {[key: string]: string} = {
          'here': '<span class="mention mention-here">@here</span>',
          'channel': '<span class="mention mention-channel">@channel</span>',
          'everyone': '<span class="mention mention-everyone">@everyone</span>'
        };
        return mentionMap[mention] || match;
      }
    );

    // Parse user mentions
    parsedText = parsedText.replace(
      /<@(\w+)>/g, 
      (match, userId) => `<span class="mention mention-user">@${userId}</span>`
    );

    // Parse channel mentions
    parsedText = parsedText.replace(
      /<#(\w+)>/g, 
      (match, channelId) => `<span class="mention mention-channel">#${channelId}</span>`
    );

    // Parse links
    parsedText = parsedText.replace(
      /<(https?:\/\/[^\s|]+)(\|([^>]+))?>/g, 
      (match, url, _, linkText) => 
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText || url}</a>`
    );

    // Parse basic formatting
    parsedText = parsedText
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')  // Bold
      .replace(/_([^_]+)_/g, '<em>$1</em>')  // Italic
      .replace(/~([^~]+)~/g, '<del>$1</del>')  // Strikethrough
      .replace(/`([^`]+)`/g, '<code>$1</code>')  // Inline code
      .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')  // Code block
      .replace(/\n/g, '<br/>');  // Line breaks

    // Parse emojis
    const emojiRegex = /:\w+:/g;
    const emojiMatches = parsedText.match(emojiRegex) || [];
    
    for (const emoji of emojiMatches) {
      const emojiImage = await this.convertEmoji(emoji);
      parsedText = parsedText.replace(emoji, emojiImage);
    }

    // Sanitize the final HTML
    const sanitizedHtml = DOMPurify.sanitize(parsedText);

    // Convert to React elements
    return <span dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
  }
}

// Utility component for easy rendering
export const MrkdwnText: React.FC<{ children: string }> = async ({ children }) => {
  const parsedContent = await SlackMrkdwn.parse(children);
  return <>{parsedContent}</>;
}; 