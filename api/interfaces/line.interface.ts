import * as line from '@line/bot-sdk';

export interface ILineConfig {
  channelAccessToken: string;
  channelSecret: string;
}

export interface ILineMessageHandler {
  handleMessage(event: line.MessageEvent): Promise<void>;
  handleFollow(event: line.FollowEvent): Promise<void>;
  handleUnfollow(event: line.UnfollowEvent): Promise<void>;
  handlePostback(event: line.PostbackEvent): Promise<void>;
  handleError(error: Error): Promise<void>;
}

export interface ILineService {
  handleWebhook(events: line.WebhookEvent[]): Promise<void>;
  replyMessage(replyToken: string, messages: Exclude<line.Message, { type: 'flex' }>[]): Promise<void>;
}
