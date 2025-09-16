import * as line from '@line/bot-sdk';
import { LineService } from '../services/line/line.service';

const gettingStartedCarousel: line.TemplateMessage = {
  type: 'template',
  altText: 'เมนูช่วยเหลือน้องเข้าใจ',
  template: {
    type: 'carousel',
    columns: [
      {
        title: 'รับแจ้งเตือน CheckSlip',
        text: 'ลงทะเบียนรับการแจ้งเตือนปัญหา CheckSlip ผ่าน LINE',
        actions: [
          {
            type: 'message',
            label: 'ลงทะเบียน',
            text: 'ลงทะเบียนรับแจ้งเตือน CheckSlip',
          },
        ],
      },
      {
        title: 'ติดต่อ Support',
        text: 'สอบถามเรื่องอื่นๆ กับทีมซัพพอร์ตของเรา',
        actions: [
          {
            type: 'message',
            label: 'สอบถามเรื่องอื่นๆ',
            text: 'สอบถามเรื่องอื่นๆ',
          },
        ],
      },
    ],
  },
};

export const sendGettingStartedCarousel = async (
  lineService: LineService,
  replyToken: string,
): Promise<void> => {
  await lineService.replyMessage(replyToken, [gettingStartedCarousel]);
};

export const getGettingStartedCarousel = (): line.TemplateMessage => gettingStartedCarousel;
