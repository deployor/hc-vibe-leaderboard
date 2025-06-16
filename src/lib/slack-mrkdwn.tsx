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
  emojisPromise: null as Promise<Record<string, string>> | null,
  users: new Map<string, SlackUser>(),
  channels: new Map<string, SlackChannel>(),
};

// --- API Fetching Functions ---
async function fetchEmojis() {
  if (cache.emojis) return cache.emojis;
  if (cache.emojisPromise) return cache.emojisPromise;
  cache.emojisPromise = (async () => {
    try {
      const res = await fetch('/api/slack/emojis');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      cache.emojis = data;
      return data;
    } catch (e) {
      console.error('Emoji fetch failed', e);
      cache.emojis = {};
      return {};
    }
  })();
  return cache.emojisPromise;
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

async function fetchChannelInfo(channelId: string) {
  if (cache.channels.has(channelId)) return cache.channels.get(channelId);
  try {
    const res = await fetch(`/api/slack/channels/${channelId}`);
    if (!res.ok) return null;
    const data = await res.json();
    cache.channels.set(channelId, data as SlackChannel);
    return data as SlackChannel;
  } catch {
    return null;
  }
}

// --- Main Component ---
export const MrkdwnText: React.FC<{ children: string }> = ({ children }) => {
  const [emojiReady, setEmojiReady] = useState<boolean>(!!cache.emojis);
  const [parsedHtml, setParsedHtml] = useState('');

  // fetch emojis once
  useEffect(() => {
    if (!emojiReady) {
      fetchEmojis().then(() => setEmojiReady(true));
    }
  }, [emojiReady]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const emojis = cache.emojis || {};
      let text = children;

      // --- HTML Entity Encoding ---
      text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      // --- Emojis ---
      text = text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, name) => {
        if (emojis && emojis[name] && emojis[name].startsWith('http')) {
          return `<img src="/api/slack/emoji/${encodeURIComponent(name)}" alt="${name}" class="inline-emoji" />`;
        }
        // Placeholder spinner
        return `<span class="inline-emoji emoji-spinner" data-emoji-name="${name}"></span>`;
      });

      // --- Basic Formatting ---
      text = text
        .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/~(.*?)~/g, '<del>$1</del>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
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
      text = text.replace(/&lt;@([A-Z0-9]+)&gt;/g, `<span class="mention mention-user" data-loading="true" data-user-id="$1">@$1</span>`);
      text = text.replace(/&lt;#([A-Z0-9]+)\|?([^>]*)&gt;/g, `<span class="mention mention-channel" data-loading="true" data-channel-id="$1">#$2</span>`);
      text = text.replace(/&lt;!subteam\^([A-Z0-9]+)\|?([^>]*)&gt;/g, `<span class="mention mention-group" data-group-id="$1">@$2</span>`);
      text = text.replace(/&lt;!(here|channel|everyone)&gt;/g, `<span class="mention mention-special">@$1</span>`);
      
      if (isMounted) {
        setParsedHtml(DOMPurify.sanitize(text));
      }
    })();

    return () => { isMounted = false; };
  }, [children, emojiReady]);

  useEffect(() => {
    if (!parsedHtml) return;

    // --- Resolve User Mentions ---
    const userMentions = document.querySelectorAll<HTMLElement>('.mention[data-loading="true"][data-user-id]');
    userMentions.forEach(async (el) => {
      const userId = el.dataset.userId;
      if (userId) {
        const user = await fetchUserInfo(userId);
        if (user) {
          el.textContent = `@${user.profile?.display_name || user.name}`;
          el.removeAttribute('data-loading');
        }
      }
    });
  }, [parsedHtml]);

  // re-render emojis once ready
  useEffect(() => {
    if (!emojiReady) return;
    const spinnerNodes = document.querySelectorAll<HTMLElement>('.emoji-spinner');
    if (spinnerNodes.length === 0) return;
    spinnerNodes.forEach(node => {
      const name = node.dataset.emojiName!;
      const url = cache.emojis?.[name];
      if (url && url.startsWith('http')) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = name;
        img.className = 'inline-emoji';
        node.replaceWith(img);
      }
    });
  }, [emojiReady]);

  // resolve channel names
  useEffect(() => {
    if (!parsedHtml) return;
    const channelNodes = document.querySelectorAll<HTMLElement>('.mention-channel[data-loading="true"][data-channel-id]');
    channelNodes.forEach(async el => {
      const cid = el.dataset.channelId!;
      const info = await fetchChannelInfo(cid);
      if (info) {
        el.textContent = `#${info.name}`;
        el.removeAttribute('data-loading');
      }
    });
  }, [parsedHtml]);

  return <div dangerouslySetInnerHTML={{ __html: parsedHtml }} className="text-slate-200 whitespace-pre-wrap break-words leading-relaxed text-base" />;
};

export const PureMrkdwnText = React.memo(MrkdwnText, (prev, next) => prev.children === next.children); 