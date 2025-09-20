import express, { Request, Response, Application } from 'express';
import * as line from '@line/bot-sdk';
import { checkAvailabilityIntention } from '../intents';
import logger from '../../shared/logger';
import { sendGettingStartedCarousel, registerCheckSlipNotify, unregisterCheckSlipNotify, sendCheckSlipInfo } from '../actions';
import { isGettingStartedIntent } from '../intents';
import { replyAvailabilityIntention } from '../actions/availability.action';
import { getMessagingService } from '../services/line/line.service';

export const createWebhook = (port: number = 3000): Application => {
  const app = express();
  const lineService = getMessagingService();

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'webhook' });
  });

  app.use(lineService.getMiddleware());

  // LINE Webhook endpoint
  app.post('/webhook', async (req: Request, res: Response) => {
    try {
      const events: line.WebhookEvent[] = req.body.events;

      try {
        // Process events only after successful forwarding
        for (const event of events) {

          if (event.source.type !== 'user' || !event.source.userId) {
            logger.info("Event source is not a user or no user ID found in event");
            continue;
          }

          if (event.type === 'follow') {
            const followEvent = event as line.FollowEvent;

            logger.info('Received follow event for user: %s', followEvent.source.userId);

            if (followEvent.replyToken) {
              await sendGettingStartedCarousel(followEvent.replyToken);
            } else {
              logger.warn('Missing reply token for follow event');
            }

            continue;
          }

          if (event.type !== 'message') {
            logger.info({ type: event.type }, 'Unsupported event type');
            continue;
          }

          const messageEvent = event as line.MessageEvent;

          if (messageEvent.message.type !== 'text') {
            continue;
          }

          const messageText = messageEvent.message.text;
          const normalizedMessage = messageText.trim();
          logger.info({ type: event.type, message: messageText }, 'Received webhook user message %s', messageText);

          const gettingStartIntent = isGettingStartedIntent(messageEvent);
          if (gettingStartIntent) {
            switch (gettingStartIntent.intent) {
              case 'menu':
                await sendGettingStartedCarousel(messageEvent.replyToken);
                break;
              case 'checkslip':
                await sendCheckSlipInfo(messageEvent);
                break;
            }
            continue;
          }

          if (normalizedMessage === 'ลงทะเบียนรับแจ้งเตือน CheckSlip') {
            await registerCheckSlipNotify(messageEvent);
            continue;
          }

          if (normalizedMessage === 'ยกเลิกรับแจ้งเตือน CheckSlip') {
            await unregisterCheckSlipNotify(messageEvent);
            continue;
          }

          if (!!process.env.AVAILABILITY_MODE) {
            const intention = await checkAvailabilityIntention({ ...messageEvent, message: { ...messageEvent.message } });

            if (intention.intent === 'availability') {
              await replyAvailabilityIntention(intention, messageEvent);
              continue;
            }
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
