import * as line from '@line/bot-sdk';
import logger from '../../shared/logger';
import { LineService } from '../services/line/line.service';
import { promptTenantLinking } from './connect.action';
import { extractGroupId, extractUserId, getLineUserId } from '../lib/lineHeper';
import { CHECKSLIP_LINE_NOTIFY_CHANNEL, CHECKSLIP_LINE_WEBHOOK_CHANNEL, fetchTenantChannelConfig, upsertTenantChannelConfig } from '../providers/db/checkslip';
import { fetchTenantIdsByLineUserId } from '../providers/db';

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
  lineService: LineService,
  replyToken: string,
  message: string,
): Promise<void> => {
  await lineService.replyMessage(replyToken, [
    {
      type: 'text',
      text: message,
    },
  ]);
};

export const registerCheckSlipNotify = async (
  lineService: LineService,
  messageEvent: line.MessageEvent,
): Promise<void> => {
  const target = extractRegistrationTarget(messageEvent);

  if (!target) {
    logger.warn({ source: messageEvent.source }, 'Unsupported LINE source for CheckSlip registration');
    await replyWithMessage(
      lineService,
      messageEvent.replyToken,
      'ขออภัย ไม่สามารถลงทะเบียนจากช่องทางนี้ได้ค่ะ',
    );
    return;
  }

  const lineUserId = getLineUserId(messageEvent);

  if (!lineUserId) {
    logger.warn({ source: messageEvent.source }, 'Missing LINE userId for CheckSlip registration');
    await replyWithMessage(
      lineService,
      messageEvent.replyToken,
      'ไม่สามารถลงทะเบียนได้ เนื่องจากไม่พบข้อมูลผู้ใช้งานจาก LINE กรุณาลองใหม่อีกครั้งในแชทส่วนตัวนะคะ',
    );
    return;
  }

  try {
    const tenantIds = await fetchTenantIdsByLineUserId(lineUserId);

    if (tenantIds.length === 0) {
      logger.info({ lineUserId }, 'LINE user has no tenant binding, prompting for connection');
      await promptTenantLinking(lineService, messageEvent.replyToken, lineUserId, extractGroupId(messageEvent.source));
      return;
    }

    await Promise.all(tenantIds.map(async (tenantId) => {
      const { config, status } = await fetchTenantChannelConfig(tenantId);

      if (target.type === 'user' && !config.userId.includes(target.id)) {
        config.userId.push(target.id);
      }

      if (target.type === 'group' && !config.groupId.includes(target.id)) {
        config.groupId.push(target.id);
      }

      return Promise.all([
        upsertTenantChannelConfig(tenantId, CHECKSLIP_LINE_NOTIFY_CHANNEL, config, status),
        upsertTenantChannelConfig(tenantId, CHECKSLIP_LINE_WEBHOOK_CHANNEL, config, status),
      ]);
    }));

    await replyWithMessage(
      lineService,
      messageEvent.replyToken,
      'ลงทะเบียนรับแจ้งเตือน CheckSlip เรียบร้อยแล้วค่ะ',
    );
  } catch (error) {
    logger.error(error, 'Failed to register CheckSlip notification');
    await replyWithMessage(
      lineService,
      messageEvent.replyToken,
      'ขออภัย ระบบไม่สามารถลงทะเบียนได้ในขณะนี้ กรุณาลองใหม่อีกครั้งนะคะ',
    );
  }
};

export const unregisterCheckSlipNotify = async (
  lineService: LineService,
  messageEvent: line.MessageEvent,
): Promise<void> => {
  const target = extractRegistrationTarget(messageEvent);

  if (!target) {
    logger.warn({ source: messageEvent.source }, 'Unsupported LINE source for CheckSlip unregistration');
    await replyWithMessage(
      lineService,
      messageEvent.replyToken,
      'ขออภัย ไม่สามารถยกเลิกจากช่องทางนี้ได้ค่ะ',
    );
    return;
  }

  const lineUserId = getLineUserId(messageEvent);

  if (!lineUserId) {
    logger.warn({ source: messageEvent.source }, 'Missing LINE userId for CheckSlip unregistration');
    await replyWithMessage(
      lineService,
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
        lineService,
        messageEvent.replyToken,
        'ไม่พบการลงทะเบียนแจ้งเตือน CheckSlip สำหรับ LINE นี้ค่ะ',
      );
      return;
    }

    await Promise.all(tenantIds.map(async (tenantId) => {
      const { config, status } = await fetchTenantChannelConfig(tenantId);

      if (target.type === 'user') {
        config.userId = config.userId.filter((id) => id !== target.id);
      }

      if (target.type === 'group') {
        config.groupId = config.groupId.filter((id) => id !== target.id);
      }

      return await upsertTenantChannelConfig(tenantId, CHECKSLIP_LINE_NOTIFY_CHANNEL, config, status);
    }));

    await replyWithMessage(
      lineService,
      messageEvent.replyToken,
      'ยกเลิกรับแจ้งเตือน CheckSlip เรียบร้อยแล้วค่ะ',
    );
  } catch (error) {
    logger.error(error, 'Failed to unregister CheckSlip notification');
    await replyWithMessage(
      lineService,
      messageEvent.replyToken,
      'ขออภัย ระบบไม่สามารถยกเลิกการแจ้งเตือนได้ในขณะนี้ กรุณาลองใหม่อีกครั้งนะคะ',
    );
  }
};
