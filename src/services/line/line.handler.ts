import { ILineMessageHandler } from '../../interfaces/line.interface';
import * as line from '@line/bot-sdk';
import fetch from 'node-fetch';

export class LineMessageHandler implements ILineMessageHandler {
  async handleMessage(event: line.MessageEvent): Promise<void> {
    if (event.message.type !== 'text') {
      return;
    }

    const forwardUrl = process.env.FORWARD_URL;
    if (!forwardUrl) {
      console.error('FORWARD_URL is not set in environment variables');
      return;
    }

    try {
      await fetch(forwardUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'message',
          source: 'webhook1',
          message: event.message,
          userId: event.source.userId,
          timestamp: event.timestamp,
        }),
      });
    } catch (error) {
      console.error('Error forwarding message:', error);
      throw error;
    }
  }

  async handleFollow(event: line.FollowEvent): Promise<void> {
    console.log('Received follow event:', event);
    // Handle follow event if needed
  }

  async handleUnfollow(event: line.UnfollowEvent): Promise<void> {
    console.log('Received unfollow event:', event);
    // Handle unfollow event if needed
  }

  async handlePostback(event: line.PostbackEvent): Promise<void> {
    console.log('Received postback event:', event);
    // Handle postback event if needed
  }

  async handleError(error: Error): Promise<void> {
    console.error('Error in LINE message handler:', error);
    // Additional error handling logic can be added here
  }
}
