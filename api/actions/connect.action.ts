import * as line from '@line/bot-sdk';
import { LineService } from '../services/line/line.service';

const TENANT_LINK_BASE_URL = 'https://admin.kaojai.ai/profile/line_connect';

const createTenantLinkingConfirmMessage = (lineUserId: string, groupId?: string): line.TemplateMessage => ({
  type: 'template',
  altText: 'ต้องการผูกร้านค้ากับ LINE นี้หรือไม่?',
  template: {
    type: 'confirm',
    text: 'คุณยังไม่เคยผูก LINE กับ KaoJai.ai\nต้องการผูกเลยหรือไม่?',
    actions: [
      {
        type: 'uri',
        label: 'ต้องการ',
        uri: `${TENANT_LINK_BASE_URL}?userId=${encodeURIComponent(lineUserId)}${groupId ? `&groupId=${encodeURIComponent(groupId)}` : ''}`,
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
  groupId?: string,
): Promise<void> => {
  const confirmMessage = createTenantLinkingConfirmMessage(lineUserId, groupId);

  await lineService.replyMessage(replyToken, [confirmMessage]);
};

export const getTenantLinkingConfirmMessage = createTenantLinkingConfirmMessage;
