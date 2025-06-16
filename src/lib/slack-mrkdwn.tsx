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
  }
}

// Client-side component for rendering mrkdwn
export const MrkdwnText: React.FC<{ children: string }> = ({ children }) => {
  const [emojis, setEmojis] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<Record<string, SlackUser>>({});
  const [parsedContent, setParsedContent] = useState<string>('');

  useEffect(() => {
    const fetchSlackData = async () => {
      try {
        // Fetch custom emojis from Slack Web API
        const emojiResponse = await fetch('/api/slack/emojis');
        const customEmojis = await emojiResponse.json();
        setEmojis(customEmojis);

        // Fetch users from Slack Web API
        const usersResponse = await fetch('/api/slack/users');
        const userList = await usersResponse.json();
        
        // Convert users to a dictionary for easy lookup
        const userDict = userList.reduce((acc: Record<string, SlackUser>, user: SlackUser) => {
          acc[user.id] = user;
          return acc;
        }, {});
        
        setUsers(userDict);
      } catch (error) {
        console.error('Failed to fetch Slack data', error);
      }
    };

    fetchSlackData();
  }, []);

  useEffect(() => {
    if (Object.keys(emojis).length > 0) {
      const parsed = SlackMrkdwn.parse(children, emojis, users);
      setParsedContent(parsed);
    }
  }, [children, emojis, users]);

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: parsedContent }} 
      className="text-slate-200 whitespace-pre-wrap break-words leading-relaxed text-base"
    />
  );
}; 