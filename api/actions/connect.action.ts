import * as line from '@line/bot-sdk';
import { LineService } from '../services/line/line.service';

const TENANT_LINK_BASE_URL = 'https://admin.kaojai.ai/profile/line_connect';

const createTenantLinkingConfirmMessage = (lineUserId: string): line.TemplateMessage => ({
  type: 'template',
  altText: 'ต้องการผูกร้านค้ากับ LINE นี้หรือไม่?',
  template: {
    type: 'confirm',
    text: 'LINE นี้ ยังไม่เคยผูกกับร้านในระบบ KaoJai.ai\nต้องการผูกกับร้านค้าหรือไม่?',
    actions: [
      {
        type: 'uri',
        label: 'ต้องการ',
        uri: `${TENANT_LINK_BASE_URL}?userId=${encodeURIComponent(lineUserId)}`,
      },
      {
        type: 'message',
        label: 'ไม่เป็นไร',
        text: 'ไม่เป็นไร',
      },
    ],
  },
});

export const promptTenantLinking = async (
  lineService: LineService,
  replyToken: string,
  lineUserId: string,
): Promise<void> => {
  const confirmMessage = createTenantLinkingConfirmMessage(lineUserId);

  await lineService.replyMessage(replyToken, [confirmMessage]);
};

export const getTenantLinkingConfirmMessage = createTenantLinkingConfirmMessage;
