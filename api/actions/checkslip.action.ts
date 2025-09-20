import * as line from '@line/bot-sdk';
import logger from '../../shared/logger';
import { getMessagingService } from '../services/line/line.service';
import { extractGroupId, extractUserId, getLineUserId } from '../lib/lineHeper';
import { CHECKSLIP_LINE_NOTIFY_CHANNEL, CHECKSLIP_LINE_WEBHOOK_CHANNEL, fetchTenantChannelConfig, upsertTenantChannelConfig } from '../providers/db/checkslip';
import { fetchTenantIdsByLineUserId } from '../providers/db';
import { tenantsBelongToLineUserId } from '../core/checkslip';
import { createTenantLinkingConfirmMessage } from './connect.action';

type RegistrationTarget =
  | { type: 'user'; id: string }
  | { type: 'group'; id: string };

const extractRegistrationTarget = (
  messageEvent: line.MessageEvent,
): RegistrationTarget | undefined => {
  const source = messageEvent.source;
  const groupId = extractGroupId(source);

  if (groupId) {
    return { type: 'group', id: groupId };
  }

  const userId = extractUserId(source);

  if (userId) {
    return { type: 'user', id: userId };
  }

  return undefined;
};

const replyWithMessage = async (
  replyToken: string,
  message: string,
): Promise<void> => {
  await getMessagingService().replyMessage(replyToken, [
    {
      type: 'text',
      text: message,
    },
  ]);
};

export const registerCheckSlipNotify = async (
  messageEvent: line.MessageEvent,
): Promise<void> => {
  const target = extractRegistrationTarget(messageEvent);

  if (!target) {
    logger.warn({ source: messageEvent.source }, 'Unsupported LINE source for CheckSlip registration');
    await replyWithMessage(
      messageEvent.replyToken,
      'ขออภัย ไม่สามารถลงทะเบียนจากช่องทางนี้ได้ค่ะ',
    );
    return;
  }

  try {
    const foundTenants = await tenantsBelongToLineUserId(messageEvent);

    if (foundTenants.length === 0) {
      logger.info({ source: messageEvent.source }, 'No tenant found for LINE user, stop here');
      const linkTenantConfirmMessage = createTenantLinkingConfirmMessage(getLineUserId(messageEvent)!, extractGroupId(messageEvent.source));
      await getMessagingService().replyMessage(messageEvent.replyToken, [linkTenantConfirmMessage]);
      return;
    }

    await Promise.all(foundTenants.map(async (tenant) => {
      const { config, status } = await fetchTenantChannelConfig(tenant.id);

      if (target.type === 'user' && !config.userIds?.includes(target.id)) {
        config.userIds?.push(target.id);
      }

      if (target.type === 'group' && !config.groupIds?.includes(target.id)) {
        config.groupIds?.push(target.id);
      }

      return Promise.all([
        upsertTenantChannelConfig(tenant.id, CHECKSLIP_LINE_NOTIFY_CHANNEL, config, status),
        upsertTenantChannelConfig(tenant.id, CHECKSLIP_LINE_WEBHOOK_CHANNEL, config, status),
      ]);
    }));

    await replyWithMessage(
      messageEvent.replyToken,
      'ลงทะเบียนรับแจ้งเตือน CheckSlip เรียบร้อยแล้วค่ะ',
    );
  } catch (error) {
    logger.error(error, 'Failed to register CheckSlip notification');
    await replyWithMessage(
      messageEvent.replyToken,
      'ขออภัย ระบบไม่สามารถลงทะเบียนได้ในขณะนี้ กรุณาลองใหม่อีกครั้งนะคะ',
    );
  }
};

export const unregisterCheckSlipNotify = async (
  messageEvent: line.MessageEvent,
): Promise<void> => {
  const target = extractRegistrationTarget(messageEvent);

  if (!target) {
    logger.warn({ source: messageEvent.source }, 'Unsupported LINE source for CheckSlip unregistration');
    await replyWithMessage(
      messageEvent.replyToken,
      'ขออภัย ไม่สามารถยกเลิกจากช่องทางนี้ได้ค่ะ',
    );
    return;
  }

  const lineUserId = getLineUserId(messageEvent);

  if (!lineUserId) {
    logger.warn({ source: messageEvent.source }, 'Missing LINE userId for CheckSlip unregistration');
    await replyWithMessage(
      messageEvent.replyToken,
      'ไม่สามารถยกเลิกการแจ้งเตือนได้ เนื่องจากไม่พบข้อมูลผู้ใช้งานจาก LINE กรุณาลองใหม่อีกครั้งในแชทส่วนตัวนะคะ',
    );
    return;
  }

  try {
    const tenantIds = await fetchTenantIdsByLineUserId(lineUserId);

    if (tenantIds.length === 0) {
      logger.info({ lineUserId }, 'LINE user has no tenant binding while trying to unregister');
      await replyWithMessage(
        messageEvent.replyToken,
        'ไม่พบการลงทะเบียนแจ้งเตือน CheckSlip สำหรับ LINE นี้ค่ะ',
      );
      return;
    }

    await Promise.all(tenantIds.map(async (tenant) => {
      const { config, status } = await fetchTenantChannelConfig(tenant.id);

      if (target.type === 'user') {
        config.userIds = config.userIds?.filter((id) => id !== target.id);
      }

      if (target.type === 'group') {
        config.groupIds = config.groupIds?.filter((id) => id !== target.id);
      }

      return await upsertTenantChannelConfig(tenant.id, CHECKSLIP_LINE_NOTIFY_CHANNEL, config, status);
    }));

    await replyWithMessage(
      messageEvent.replyToken,
      'ยกเลิกรับแจ้งเตือน CheckSlip เรียบร้อยแล้วค่ะ',
    );
  } catch (error) {
    logger.error(error, 'Failed to unregister CheckSlip notification');
    await replyWithMessage(
      messageEvent.replyToken,
      'ขออภัย ระบบไม่สามารถยกเลิกการแจ้งเตือนได้ในขณะนี้ กรุณาลองใหม่อีกครั้งนะคะ',
    );
  }
};
