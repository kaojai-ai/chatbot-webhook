import express, { Request, Response, Application } from 'express';
import * as line from '@line/bot-sdk';
import { LineService } from '../services/line/line.service';
import { LineMessageHandler } from '../services/line/line.handler';
import { ILineConfig } from '../interfaces/line.interface';
import { checkAvailabilityIntention } from '../intentions';
import { AvailabilityService } from '../services/availability/availability.service';

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

            if (intention.intent === 'availability') {
              // Handle availability check
              const date = intention.details?.date;
              const month = intention.details?.month;
              const year = intention.details?.year;

              try {
                const availabilityService = new AvailabilityService();
                const availability = await availabilityService.getFormattedAvailability({ year, month, date });

                // Send the response
                await lineService.replyMessage(event.replyToken, [{
                  type: 'text',
                  text: availability
                }]);
              } catch (error) {
                console.error('Error processing availability check:', error);
                await lineService.replyMessage(event.replyToken, [{
                  type: 'text',
                  text: 'Sorry, there was an error checking availability. Please try again later.'
                }]);
              }

              // Here you would typically call your availability service
              // For example: await availabilityService.checkAvailability(intention.details);
            } else {
              // Default response for other messages
              await lineService.replyMessage(event.replyToken, [{
                type: 'text',
                text: 'สวัสดีจ้า... มีไรให้ช่วย? ถ้าอยากรู้วันว่า ก็ถามมาได้นะ ถามเฉยๆ หรือบอกเดือนมาเลยก็ได้'
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
