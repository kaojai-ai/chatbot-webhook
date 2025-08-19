import express, { Request, Response, Application } from 'express';
import * as line from '@line/bot-sdk';
import { LineService } from '../services/line/line.service';
import { LineMessageHandler } from '../services/line/line.handler';
import { ILineConfig } from '../interfaces/line.interface';
import { checkAvailabilityIntention } from '../intentions';
import { AvailabilityService } from '../services/availability/availability.service';
import OpenAI from 'openai';

// LINE client configuration
const lineConfig: ILineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'YOUR_CHANNEL_ACCESS_TOKEN',
  channelSecret: process.env.LINE_CHANNEL_SECRET || 'YOUR_CHANNEL_SECRET'
};

// OpenAI client for generating Thai jokes
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
            } else if (intention.intent === 'operating_hour') {
              // Return operating hours (Thai)
              await lineService.replyMessage(event.replyToken, [{
                type: 'text',
                text: '⏰ เวลาให้บริการ: ทุกวัน 9:00–21:00 น.\nหากต้องการจองหรือตรวจสอบวันว่าง พิมพ์วันที่/เดือนมาได้เลยนะครับ/ค่ะ'
              }]);
            } else if (intention.intent === 'joke') {
              // Get a one-line Thai joke via OpenAI
              try {
                const completion = await openai.chat.completions.create({
                  model: 'gpt-5-mini',
                  messages: [
                    { role: 'system', content: 'คุณเป็นนักเล่าเรื่องตลกภาษาไทยที่สุภาพ ปลอดภัย และสั้นกระชับ' },
                    { role: 'user', content: 'ขอเรื่องตลก 1 บรรทัด เป็นภาษาไทย แบบสุภาพและอ่านได้ทุกวัย' }
                  ],
                });
                const joke = completion.choices[0]?.message?.content?.trim() || 'ขำ ๆ 😂';
                await lineService.replyMessage(event.replyToken, [{ type: 'text', text: joke }]);
              } catch (error) {
                console.error('Error fetching joke from OpenAI:', error);
                await lineService.replyMessage(event.replyToken, [{
                  type: 'text',
                  text: 'ขอโทษด้วยนะ ตอนนี้เล่าเรื่องตลกไม่ได้ ลองใหม่อีกครั้งได้เลยครับ/ค่ะ 🙏'
                }]);
              }
            } else if (intention.intent === 'book') {
              // Booking not yet available; supplier API needed
              await lineService.replyMessage(event.replyToken, [{
                type: 'text',
                text: 'ตอนนี้ยังจองให้ไม่ได้เลย 😢 เขาไม่เปิด API ให้งะ 😭'
              }]);
            } else {
              // Default response for other messages
              await lineService.replyMessage(event.replyToken, [{
                type: 'text',
                text: '👋สวัสดีจ้า... มีไรให้ช่วย?\n  ถามวันว่างได้ ให้วัน ให้เดือน มาเหอะ ตอบได้\n หรือ ถามวันชั่วโมงให้บริการก็ได้ ⏰ ให้เล่าเรื่องตลกก็ได้นะ 😂'
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
