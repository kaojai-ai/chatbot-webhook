import { messagingApi, WebhookEvent, MessageEvent, FollowEvent, UnfollowEvent, PostbackEvent } from '@line/bot-sdk';
import { ILineConfig, ILineMessageHandler, ILineService } from '../../interfaces/line.interface';
import logger from '../../../shared/logger';
import * as line from '@line/bot-sdk';
import { LineMessageHandler } from './line.handler';


class LineService implements ILineService {
  private client: messagingApi.MessagingApiClient;
  private handler: ILineMessageHandler;
  private lineConfig: ILineConfig = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'YOUR_CHANNEL_ACCESS_TOKEN',
    channelSecret: process.env.LINE_CHANNEL_SECRET || 'YOUR_CHANNEL_SECRET'
  };

  constructor(handler: ILineMessageHandler) {
    this.client = new messagingApi.MessagingApiClient({
      channelAccessToken: this.lineConfig.channelAccessToken,
    });
    this.handler = handler;
  }

  public getMiddleware() {
    return line.middleware(this.lineConfig);
  }

  public async handleWebhook(events: WebhookEvent[]): Promise<void> {
    if (!events || events.length === 0) {
      return;
    }

    await Promise.all(
      events.map(async (event) => {
        try {
          await this.routeEvent(event);
        } catch (error) {
          if (error instanceof Error) {
            await this.handler.handleError(error);
          }
        }
      })
    );
  }

  public async replyMessage(replyToken: string, messages: line.messagingApi.Message[]): Promise<void> {
    await this.client.replyMessage({
      replyToken,
      messages,
    });
  }

  private async routeEvent(event: WebhookEvent): Promise<void> {
    switch (event.type) {
      case 'message':
        return this.handler.handleMessage(event as MessageEvent);
      case 'follow':
        return this.handler.handleFollow(event as FollowEvent);
      case 'unfollow':
        return this.handler.handleUnfollow(event as UnfollowEvent);
      case 'postback':
        return this.handler.handlePostback(event as PostbackEvent);
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }
  }
}

export function getMessagingService() {
  return new LineService(new LineMessageHandler());
}
