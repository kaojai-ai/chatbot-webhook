import { LineService } from "../services/line/line.service";
import { AvailabilityService } from "../services/availability";
import logger from "../../shared/logger";
import { OperatingHoursService } from "../services/operating-hours";
import { IntentionResult } from "../intents";
import * as line from '@line/bot-sdk';
import { openaiClient } from "../providers/openai";
import type { AvailabilityByDate, OpenAiAvailableDays } from "../services/availability/types";
import { clampText, formatDateTitle, formatDateForAction } from "../../shared/lib";
import { formatAvailabilityDetails } from "../lib/responseFormat";

const MAX_CAROUSEL_CARDS = 5;

const buildAvailabilityCarousel = (availabilityByDate: OpenAiAvailableDays[]): line.TemplateMessage => {
  const columns: line.TemplateColumn[] = availabilityByDate.slice(0, MAX_CAROUSEL_CARDS).map((day) => {
    const title = clampText(formatDateTitle(day.dateFormat), 40);
    const text = day.availabilityText;
    const actionDate = formatDateForAction(day.dateFormat);

    return {
      title,
      text,
      actions: [
        {
          type: 'message' as const,
          label: 'เลือกวันที่นี้',
          text: `สนใจจองวันที่ ${actionDate}`,
        },
      ],
    } satisfies line.TemplateColumn;
  });

  const altTextDates = columns.map((column) => column.title).join(', ');

  return {
    type: 'template',
    altText: clampText(`ช่วงเวลาว่าง: ${altTextDates}`, 400),
    template: {
      type: 'carousel',
      columns,
    },
  };
};

export const replyAvailabilityIntention = async (intention: IntentionResult, lineService: LineService, messageEvent: line.MessageEvent) => {
  if (intention.intent === 'availability') {
    // Handle availability check
    const date = intention.details?.date;
    const month = intention.details?.month;
    const year = intention.details?.year;

    try {
      const availabilityService = new AvailabilityService();
      const { summary, error, availableDays } = await availabilityService.getAvailabilityOverview({ year, month, date });

      if (!error && summary) {
        const messages: line.messagingApi.Message[] = [];

        messages.push({
          type: 'text',
          text: clampText(summary, 400),
        });

        messages.push(buildAvailabilityCarousel(availableDays));

        await lineService.replyMessage(messageEvent.replyToken, messages);
      } else {
        await lineService.replyMessage(messageEvent.replyToken, [{
          type: 'text',
          text: error || summary || 'Availability information is not available.',
        }]);
      }
    } catch (error) {
      logger.error(error, 'Error processing availability check: %s', String(error));
      await lineService.replyMessage(messageEvent.replyToken, [{
        type: 'text',
        text: 'Sorry, there was an error checking availability. Please try again later.'
      }]);
    }

    // Here you would typically call your availability service
    // For example: await availabilityService.checkAvailability(intention.details);
  } else if (intention.intent === 'operating_hour') {
    try {
      const operatingHoursService = new OperatingHoursService();
      const message = await operatingHoursService.getOperatingHoursMessage();
      await lineService.replyMessage(messageEvent.replyToken, [{ type: 'text', text: message }]);
    } catch (error) {
      logger.error(error, 'Error fetching operating hours: %s', String(error));
      await lineService.replyMessage(messageEvent.replyToken, [{
        type: 'text',
        text: 'ขออภัย ไม่สามารถดึงข้อมูลเวลาเปิดทำการได้ในขณะนี้'
      }]);
    }
  } else if (intention.intent === 'joke') {
    // Get a one-line Thai joke via OpenAI
    try {
      const completion = await openaiClient.getChatCompletion({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: 'คุณเป็นนักเล่าเรื่องตลกภาษาไทยที่สุภาพ ปลอดภัย และสั้นกระชับ' },
          { role: 'user', content: 'ขอเรื่องตลก 1 บรรทัด เป็นภาษาไทย แบบสุภาพและอ่านได้ทุกวัย' }
        ],
      });
      const joke = completion.choices[0]?.message?.content?.trim() || 'ขำ ๆ 😂';
      await lineService.replyMessage(messageEvent.replyToken, [{ type: 'text', text: joke }]);
    } catch (error) {
      logger.error(error, 'Error fetching joke from OpenAI: %s', String(error));
      await lineService.replyMessage(messageEvent.replyToken, [{
        type: 'text',
        text: 'ขอโทษด้วยนะ ตอนนี้เล่าเรื่องตลกไม่ได้ ลองใหม่อีกครั้งได้เลยครับ/ค่ะ 🙏'
      }]);
    }
  } else if (intention.intent === 'book') {
    // Booking not yet available; supplier API needed
    await lineService.replyMessage(messageEvent.replyToken, [{
      type: 'text',
      text: 'ตอนนี้ยังจองให้ไม่ได้เลย 😢 เขาไม่เปิด API ให้งะ 😭'
    }]);
  } else {
    // Default response for other messages
    await lineService.replyMessage(messageEvent.replyToken, [{
      type: 'text',
      text: '👋สวัสดีจ้า... น้องเข้าใจ 💚 เองจ้า...\nถามวันว่างได้ ให้วัน ให้เดือน มาเลย\nหรือ ถามชั่วโมงทำการก็ได้ ⏰ ให้เล่าเรื่องตลกก็ได้นะ 😂\nแวะไปบ้านน้องได้น้า 🏠 KaoJai.ai'
    }]);
  }
}
