import { messagingApi, middleware, WebhookEvent, Message, MessageEvent, FollowEvent, UnfollowEvent, PostbackEvent } from '@line/bot-sdk';
import { ILineConfig, ILineMessageHandler, ILineService } from '../../interfaces/line.interface';

type LineMessage = Exclude<Message, { type: 'flex' }>;

export class LineService implements ILineService {
  private client: messagingApi.MessagingApiClient;
  private handler: ILineMessageHandler;

  constructor(config: ILineConfig, handler: ILineMessageHandler) {
    this.client = new messagingApi.MessagingApiClient({
      channelAccessToken: config.channelAccessToken,
    });
    this.handler = handler;
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

  public async replyMessage(replyToken: string, messages: LineMessage[]): Promise<void> {
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
