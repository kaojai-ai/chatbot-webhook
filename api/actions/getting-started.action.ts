import * as line from '@line/bot-sdk';
import { LineService } from '../services/line/line.service';

const gettingStartedCarousel: line.TemplateMessage = {
  type: 'template',
  altText: 'เริ่มต้นใช้งาน น้องเข้าใจ 💚',
  template: {
    type: 'carousel',
    columns: [
      {
        title: 'น้องเข้าใจ ทำอะไรได้บ้าง?',
        thumbnailImageUrl: 'https://kaojai.ai/images/generic_landscape_1.png',
        text: 'สวัสดี 👋, น้องเข้าใจ 💚 AI ChatBot 🤖 ยินดีช่วยเหลือธุรกิจร้านค้า และน้องเก่งมากๆ มารู้จักน้องกันเถอะ 🥰',
        actions: [
          {
            type: 'message',
            label: 'น้องทำอะไรได้บ้าง?',
            text: 'KaoJai ทำอะไรได้บ้าง',
          },
          {
            type: 'message',
            label: 'ติดต่อ ทีมงาน',
            text: 'ติดต่อ',
          }
        ],
      },
      {
        title: 'รับแจ้งเตือน CheckSlip',
        thumbnailImageUrl: 'https://checkslip.kaojai.ai/images/blogs/danger-of-fake-slips.png',
        text: 'ลงทะเบียนรับการแจ้งเตือนปัญหา CheckSlip ผ่าน LINE',
        actions: [
          {
            type: 'message',
            label: 'ลงทะเบียน',
            text: 'ลงทะเบียนรับแจ้งเตือน CheckSlip',
          },
          {
            type: 'message',
            label: 'ยกเลิกแจ้งเตือน',
            text: 'ยกเลิกรับแจ้งเตือน CheckSlip',
          }
        ],
      },
      {
        title: 'ติดต่อ Support',
        thumbnailImageUrl: 'https://kaojai.ai/images/support.png',
        text: 'สอบถามเรื่องอื่นๆ กับทีมซัพพอร์ตของเรา',
        actions: [
          {
            type: 'message',
            label: 'สอบถามเรื่องอื่นๆ',
            text: 'สอบถามเรื่องอื่นๆ',
          },
          {
            type: 'message',
            label: 'ติดต่อ ทีมงาน',
            text: 'ติดต่อ',
          }
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
