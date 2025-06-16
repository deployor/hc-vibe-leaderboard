"use client";

import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';

interface SlackUser {
  id: string;
  name: string;
  profile?: {
    display_name?: string;
  };
}

interface SlackChannel {
  id: string;
  name: string;
}

// --- Caching for fetched data ---
const cache = {
  emojis: null as Record<string, string> | null,
  users: new Map<string, SlackUser>(),
  channels: new Map<string, SlackChannel>(),
};

// --- API Fetching Functions ---
async function fetchEmojis() {
  if (cache.emojis) return cache.emojis;
  try {
    const res = await fetch('/api/slack/emojis');
    if (!res.ok) throw new Error('Failed to fetch emojis');
    const emojis = await res.json();
    cache.emojis = emojis;
    return emojis;
  } catch (error) {
    console.error(error);
    return {};
  }
}

async function fetchUserInfo(userId: string) {
  if (cache.users.has(userId)) return cache.users.get(userId);
  try {
    const res = await fetch(`/api/slack/users/${userId}`);
    if (!res.ok) return null;
    const user = await res.json();
    cache.users.set(userId, user);
    return user;
  } catch {
    return null;
  }
}

// --- Main Component ---
export const MrkdwnText: React.FC<{ children: string }> = ({ children }) => {
  const [parsedHtml, setParsedHtml] = useState('');

  useEffect(() => {
    let isMounted = true;
    
    async function parseMrkdwn() {
      if (!children) {
        setParsedHtml('');
        return;
      }

      const emojis = await fetchEmojis();
      let text = children;

      // --- HTML Entity Encoding ---
      text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      // --- Emojis ---
      if (emojis) {
        text = text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, emojiName) => {
          const emojiUrl = emojis[emojiName];
          if (emojiUrl && emojiUrl.startsWith('http')) {
            return `<img src="${emojiUrl}" alt="${emojiName}" class="inline-emoji" />`;
          } else if (emojiUrl) { // alias
            return `:${emojiUrl.replace('alias:', '')}:`;
          }
          return match;
        });
      }

      // --- Basic Formatting ---
      text = text
        .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/~(.*?)~/g, '<del>$1</del>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
        .replace(/\n/g, '<br />');
        
      // --- Links ---
      text = text.replace(
        /&lt;(http[^|]+)\|([^>]+)&gt;/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>'
      );
      text = text.replace(
        /&lt;(http[^>]+)&gt;/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
      );

      // --- Mentions (placeholders) ---
      text = text.replace(/&lt;@([A-Z0-9]+)&gt;/g, `<span class="mention mention-user" data-user-id="$1">@$1</span>`);
      text = text.replace(/&lt;#([A-Z0-9]+)\|?([^>]*)&gt;/g, `<span class="mention mention-channel" data-channel-id="$1">#$2</span>`);
      text = text.replace(/&lt;!subteam\^([A-Z0-9]+)\|?([^>]*)&gt;/g, `<span class="mention mention-group" data-group-id="$1">@$2</span>`);
      text = text.replace(/&lt;!(here|channel|everyone)\|?([^>]*)&gt;/g, `<span class="mention mention-special">@$1</span>`);
      
      if (isMounted) {
        setParsedHtml(DOMPurify.sanitize(text));
      }
    }

    parseMrkdwn();

    return () => { isMounted = false; };
  }, [children]);

  useEffect(() => {
    if (!parsedHtml) return;

    // --- Resolve User Mentions ---
    const userMentions = document.querySelectorAll<HTMLElement>('.mention[data-user-id]');
    userMentions.forEach(async (el) => {
      const userId = el.dataset.userId;
      if (userId) {
        const user = await fetchUserInfo(userId);
        if (user) {
          el.textContent = `@${user.profile?.display_name || user.name}`;
        }
      }
    });
  }, [parsedHtml]);

  return <div dangerouslySetInnerHTML={{ __html: parsedHtml }} className="text-slate-200 whitespace-pre-wrap break-words leading-relaxed text-base" />;
}; 