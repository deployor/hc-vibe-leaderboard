"use client";

import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';

// Emoji and User type definitions
interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  profile?: {
    display_name?: string;
    real_name?: string;
  };
}

// Mrkdwn parsing utility
export class SlackMrkdwn {
  // Escape HTML special characters
  private static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Parse mrkdwn text (synchronous version)
  static parse(
    text: string, 
    emojis: Record<string, string> = {}, 
    users: Record<string, SlackUser> = {}
  ): string {
    // Validate input
    if (!text) {
      console.warn('Empty text passed to SlackMrkdwn.parse');
      return '';
    }

    try {
      // Escape HTML special characters first
      let parsedText = this.escapeHtml(text);

      // Replace special mentions with enhanced styling
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

      // Parse user mentions with actual names
      parsedText = parsedText.replace(
        /<@(\w+)>/g, 
        (match, userId) => {
          const user = users[userId];
          const displayName = user 
            ? (user.profile?.display_name || user.real_name || user.name || `@${userId}`)
            : `@${userId}`;
          return `<span class="mention mention-user">@${displayName}</span>`;
        }
      );

      // Parse channel mentions
      parsedText = parsedText.replace(
        /<#(\w+)>/g, 
        (match, channelId) => `<span class="mention mention-channel">#${channelId}</span>`
      );

      // Parse links with custom text
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

      // Parse emojis (both standard and custom)
      const emojiRegex = /:\w+:/g;
      const emojiMatches = parsedText.match(emojiRegex) || [];
      
      for (const emoji of emojiMatches) {
        const emojiName = emoji.replace(/:/g, '');
        const emojiUrl = emojis[emojiName] || 
          `https://raw.githubusercontent.com/iamcal/emoji-data/master/img-apple-64/${emojiName}.png`;
        
        const emojiImage = emojiUrl 
          ? `<img src="${emojiUrl}" alt="${emoji}" class="inline-emoji" />`
          : emoji;
        
        parsedText = parsedText.replace(emoji, emojiImage);
      }

      // Sanitize the final HTML
      return DOMPurify.sanitize(parsedText);
    } catch (error) {
      console.error('Error parsing mrkdwn text:', error, 'Original text:', text);
      return text;  // Fallback to original text if parsing fails
    }
  }
}

// Client-side component for rendering mrkdwn
export const MrkdwnText: React.FC<{ children: string }> = ({ children }) => {
  const [emojis, setEmojis] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<Record<string, SlackUser>>({});
  const [parsedContent, setParsedContent] = useState<string>(children);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSlackData = async () => {
      try {
        setIsLoading(true);
        setFetchError(null);

        // Fetch custom emojis from Slack Web API
        const emojiResponse = await fetch('/api/slack/emojis');
        if (!emojiResponse.ok) {
          throw new Error(`Emoji fetch failed: ${emojiResponse.status}`);
        }
        const customEmojis = await emojiResponse.json();
        setEmojis(customEmojis);

        // Fetch users from Slack Web API
        const usersResponse = await fetch('/api/slack/users');
        if (!usersResponse.ok) {
          throw new Error(`Users fetch failed: ${usersResponse.status}`);
        }
        const userList = await usersResponse.json();
        
        // Convert users to a dictionary for easy lookup
        const userDict = userList.reduce((acc: Record<string, SlackUser>, user: SlackUser) => {
          acc[user.id] = user;
          return acc;
        }, {});
        
        setUsers(userDict);
      } catch (error) {
        console.error('Failed to fetch Slack data:', error);
        setFetchError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSlackData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      try {
        const parsed = SlackMrkdwn.parse(children, emojis, users);
        setParsedContent(parsed);
      } catch (error) {
        console.error('Failed to parse mrkdwn:', error);
        setParsedContent(children);
      }
    }
  }, [children, emojis, users, isLoading]);

  // If there's a fetch error, render the original text with an error indicator
  if (fetchError) {
    return (
      <div 
        className="text-slate-200 whitespace-pre-wrap break-words leading-relaxed text-base"
        title={`Failed to fetch Slack data: ${fetchError}`}
      >
        {children}
        <span 
          className="ml-2 text-xs text-red-500 bg-red-500/10 px-2 py-1 rounded"
          title={fetchError}
        >
          ⚠️ Formatting may be limited
        </span>
      </div>
    );
  }

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: parsedContent }} 
      className="text-slate-200 whitespace-pre-wrap break-words leading-relaxed text-base"
    />
  );
}; 