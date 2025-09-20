import { fetchTenantIdsByLineUserId } from "../../providers/db";
import logger from "../../../shared/logger";
import { getLineUserId } from "../../lib/lineHeper";
import { MessageEvent } from "@line/bot-sdk";
import { getMessagingService } from "../../services/line/line.service";
import { Tenant } from "../../../shared/types/tenants";

export async function tenantsBelongToLineUserId(messageEvent: MessageEvent): Promise<Tenant[]> {
    const lineMessagingService = getMessagingService();

  const lineUserId = getLineUserId(messageEvent);

  if (!lineUserId) {
    logger.warn({ source: messageEvent.source }, 'Missing LINE userId for CheckSlip registration');
    await lineMessagingService.replyMessage(messageEvent.replyToken, [
      {
        type: 'text',
        text: 'ไม่สามารถลงทะเบียนได้ เนื่องจากไม่พบข้อมูลผู้ใช้งานจาก LINE กรุณาลองใหม่อีกครั้งในแชทส่วนตัวนะคะ',
      },
    ]);
    return [];
  }

    const tenants = await fetchTenantIdsByLineUserId(lineUserId);

    if (tenants.length === 0) {
        logger.info({ lineUserId }, 'LINE user has no tenant binding, prompting for connection');
        return [];
    }

    return tenants;
}

