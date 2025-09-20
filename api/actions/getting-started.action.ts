import * as line from '@line/bot-sdk';
import { getMessagingService } from '../services/line/line.service';
import { createTenantLinkingConfirmMessage } from './connect.action';
import { extractGroupId, getLineUserId } from '../lib/lineHeper';
import { tenantsBelongToLineUserId } from '../core/checkslip';

const gettingStartedCarousel: line.TemplateMessage = {
  type: 'template',
  altText: 'เริ่มต้นใช้งาน น้องเข้าใจ 💚',
  template: {
    type: 'carousel',
    columns: [
      {
        title: 'น้องเข้าใจ ทำอะไรได้บ้าง?',
        thumbnailImageUrl: 'https://kaojai.ai/images/generic_landscape_1.png',
        text: '👋 น้องเข้าใจเองจ้า~ 💚 น้องเก่งมากๆ มารู้จักน้องกัน 🥰',
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
        text: 'ลงทะเบียนรับการแจ้งเตือน CheckSlip ผ่าน LINE',
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

export const sendCheckSlipInfo = async (
  messageEvent: line.MessageEvent,
) => {
  const lineUserId = getLineUserId(messageEvent)
  const replyToken = messageEvent.replyToken;
  const msgChkSlipInfoToSend: line.messagingApi.Message[] = []

  const foundTenants = await tenantsBelongToLineUserId(messageEvent);
  if (foundTenants.length === 0) {
    msgChkSlipInfoToSend.push({
      type: 'text',
      text: "แค่ส่งสลิปมาให้น้อง... เดี๋ยวน้องเข้าใจ ตรวจสลิป ให้ทันทีเลยครับ 💚\n\n👀 แต่ถ้าอยากให้น้องตรวจละเอียดๆ\n\n#สลิปใช้ซ้ำ #สลิปตรงบัญชี\n\nต้องลงทะเบียนกับน้องด้วยน้า~ 🙌",
    });

    if (lineUserId) {
      msgChkSlipInfoToSend.push(createTenantLinkingConfirmMessage(lineUserId, extractGroupId(messageEvent.source)))
    }
  } else {
    msgChkSlipInfoToSend.push({
      type: 'text',
      text: `สวัสดีครับ 👋\n\nธุรกิจ: ${foundTenants.map(t => t.name).join(', ')}\n\nแค่ส่งสลิปมาให้น้อง... เดี๋ยวน้องเข้าใจ ตรวจสลิป ให้ทันทีเลยครับ 💚`,
    });
  }

  return getMessagingService().replyMessage(replyToken, msgChkSlipInfoToSend);
};

export const sendGettingStartedCarousel = async (
    replyToken: string,
  ): Promise<void> => {
    await getMessagingService().replyMessage(replyToken, [gettingStartedCarousel]);
  };

export const getGettingStartedCarousel = (): line.TemplateMessage => gettingStartedCarousel;
