import express, { Request, Response, Application } from 'express';
import * as line from '@line/bot-sdk';
import { LineService } from '../services/line/line.service';
import { LineMessageHandler } from '../services/line/line.handler';
import { ILineConfig } from '../interfaces/line.interface';
import { checkAvailabilityIntention } from '../intentions';

// LINE client configuration
const lineConfig: ILineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'YOUR_CHANNEL_ACCESS_TOKEN',
  channelSecret: process.env.LINE_CHANNEL_SECRET || 'YOUR_CHANNEL_SECRET'
};

export const createWebhook = (port: number = 3000): Application => {
  const app = express();
  const lineMessageHandler = new LineMessageHandler();
  const lineService = new LineService(lineConfig, lineMessageHandler);

  app.use(line.middleware(lineConfig));

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'webhook' });
  });

  // LINE Webhook endpoint
  app.post('/webhook', async (req: Request, res: Response) => {
    try {
      const events: line.WebhookEvent[] = req.body.events;
      console.log('Received webhook events:', events);

      try {
        // Process events only after successful forwarding
        for (const event of events) {
          if (event.type === 'message' && event.message.type === 'text') {
            // Check user intention
            const messageText = event.message.text;
            const intention = await checkAvailabilityIntention(messageText);

            if (intention.hasAvailabilityIntent) {
              // Handle availability check
              const responseText = intention.details?.date
                ? `Checking availability for ${intention.details.date}...`
                : 'Checking availability...';

              await lineService.replyMessage(event.replyToken, [{
                type: 'text',
                text: responseText
              }]);

              // Here you would typically call your availability service
              // For example: await availabilityService.checkAvailability(intention.details);
            } else {
              // Default response for other messages
              await lineService.replyMessage(event.replyToken, [{
                type: 'text',
                text: 'How can I help you with your booking?'
              }]);
            }
          }
        }
        res.status(200).end();
      } catch (error) {
        console.error('Error forwarding request:', error);
        res.status(500).json({ error: 'Error forwarding request' });
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Start the server
  app.listen(port, () => {
    console.log(`Webhook 1 server is running on http://localhost:${port}`);
    console.log(`Webhook 1 endpoint: http://localhost:${port}/webhook`);
    console.log(`Health check: http://localhost:${port}/health`);
  });

  return app;
};

export default createWebhook;
