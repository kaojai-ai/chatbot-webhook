import { ILineMessageHandler } from '../../interfaces/line.interface';
import * as line from '@line/bot-sdk';
import fetch from 'node-fetch';
import logger from '../../../shared/logger';

export class LineMessageHandler implements ILineMessageHandler {
  async handleMessage(event: line.MessageEvent): Promise<void> {
    if (event.message.type !== 'text') {
      return;
    }

    const forwardUrl = process.env.FORWARD_URL;
    if (!forwardUrl) {
      logger.error('FORWARD_URL is not set in environment variables');
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
      logger.error(error, 'Error forwarding message: %s', String(error));
      throw error;
    }
  }

  async handleFollow(event: line.FollowEvent): Promise<void> {
    logger.info('Received follow event: %s', event);
    // Handle follow event if needed
  }

  async handleUnfollow(event: line.UnfollowEvent): Promise<void> {
    logger.info('Received unfollow event: %s', event);
    // Handle unfollow event if needed
  }

  async handlePostback(event: line.PostbackEvent): Promise<void> {
    logger.info('Received postback event: %s', event);
    // Handle postback event if needed
  }

  async handleError(error: Error): Promise<void> {
    logger.error(error, 'Error in LINE message handler: %s', String(error));
    // Additional error handling logic can be added here
  }
}
