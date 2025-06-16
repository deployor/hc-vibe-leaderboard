import { WebClient } from '@slack/web-api';

export async function getSlackClient() {
  // Retrieve the Slack token from environment
  const slackToken = process.env.SLACK_BOT_TOKEN;

  if (!slackToken) {
    throw new Error('No Slack token available');
  }

  // Initialize Slack Web API client
  return new WebClient(slackToken);
} 