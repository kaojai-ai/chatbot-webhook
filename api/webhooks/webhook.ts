import express, { Request, Response, Application } from 'express';
import * as line from '@line/bot-sdk';
import { LineService } from '../services/line/line.service';
import { LineMessageHandler } from '../services/line/line.handler';
import { ILineConfig } from '../interfaces/line.interface';
import { checkAvailabilityIntention } from '../intents';
import logger from '../../shared/logger';
import { sendGettingStartedCarousel } from '../actions';
import { isGettingStartedIntent } from '../intents';
import { replyAvailabilityIntention } from '../actions/availability.action';

// LINE client configuration
const lineConfig: ILineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'YOUR_CHANNEL_ACCESS_TOKEN',
  channelSecret: process.env.LINE_CHANNEL_SECRET || 'YOUR_CHANNEL_SECRET'
};


export const createWebhook = (port: number = 3000): Application => {
  const app = express();
  const lineMessageHandler = new LineMessageHandler();
  const lineService = new LineService(lineConfig, lineMessageHandler);

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'webhook' });
  });

  app.use(line.middleware(lineConfig));

  // LINE Webhook endpoint
  app.post('/webhook', async (req: Request, res: Response) => {
    try {
      const events: line.WebhookEvent[] = req.body.events;

      try {
        // Process events only after successful forwarding
        for (const event of events) {
          if (event.type !== 'message') {
            continue;
          }

          const messageEvent = event as line.MessageEvent;

          if (messageEvent.message.type !== 'text') {
            continue;
          }

          const messageText = messageEvent.message.text;
          logger.info({ type: event.type, message: messageText }, 'Received webhook user message %s', messageText);

          if (isGettingStartedIntent(messageEvent)) {
            await sendGettingStartedCarousel(lineService, messageEvent.replyToken);
            continue;
          }

          const intention = await checkAvailabilityIntention(messageText);

          if (intention.intent === 'availability') {
            await replyAvailabilityIntention(intention, lineService, messageEvent);
            continue;
          }
        }
        res.status(200).end();
      } catch (error) {
        logger.error(error, 'Error forwarding request: %s', String(error));
        res.status(500).json({ error: 'Error forwarding request' });
      }
    } catch (error) {
      logger.error(error, 'Error processing webhook: %s', String(error));
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Start the server
  app.listen(port, () => {
    logger.info(`Webhook 1 server is running on http://localhost:${port}`);
    logger.info(`Webhook 1 endpoint: http://localhost:${port}/webhook`);
    logger.info(`Health check: http://localhost:${port}/health`);
  });

  return app;
};

export default createWebhook;
