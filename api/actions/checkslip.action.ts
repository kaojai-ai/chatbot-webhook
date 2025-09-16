import * as line from '@line/bot-sdk';
import supabaseClient from '../../shared/providers/supabase';
import logger from '../../shared/logger';
import { LineService } from '../services/line/line.service';
import { promptTenantLinking } from './connect.action';

const CHECKSLIP_LINE_NOTIFY_CHANNEL = 'checkslip_line_notify';

type CheckSlipLineNotifyConfig = {
  userId: string[];
  groupId: string[];
};

type RegistrationTarget =
  | { type: 'user'; id: string }
  | { type: 'group'; id: string };

const extractGroupId = (source: line.EventSource): string | undefined => {
  const groupId = (source as { groupId?: unknown }).groupId;

  if (typeof groupId === 'string' && groupId.length > 0) {
    return groupId;
  }

  return undefined;
};

const extractUserId = (source: line.EventSource): string | undefined => {
  const userId = (source as { userId?: unknown }).userId;

  if (typeof userId === 'string' && userId.length > 0) {
    return userId;
  }

  return undefined;
};

const ensureStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
};

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

const getLineUserId = (messageEvent: line.MessageEvent): string | undefined =>
  extractUserId(messageEvent.source);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const fetchTenantIdsByLineUserId = async (lineUserId: string): Promise<string[]> => {
  const { data, error } = await supabaseClient.rpc('get_tenant_by_line_uid', { p_line_user_id: lineUserId },
  );

  if (error) {
    throw error;
  }

  const tenantIds = Array.isArray(data) ? data : [];

  return [...new Set(tenantIds.filter(isNonEmptyString))];
};

const upsertTenantChannelConfig = async (
  tenantId: string,
  config: CheckSlipLineNotifyConfig,
  status?: string | null,
): Promise<void> => {
  const payload = {
    tenant_id: tenantId,
    channel: CHECKSLIP_LINE_NOTIFY_CHANNEL,
    config,
    status: status ?? 'ACTIVE',
  };

  const { error: upsertError } = await supabaseClient
    .schema('checkslip')
    .from('tenant_channels')
    .upsert(payload, { onConflict: 'tenant_id,channel' });

  if (upsertError) {
    throw upsertError;
  }
};

const fetchTenantChannelConfig = async (
  tenantId: string,
): Promise<{ config: CheckSlipLineNotifyConfig; status?: string | null }> => {
  const { data, error } = await supabaseClient
    .schema('checkslip')
    .from('tenant_channels')
    .select('config, status')
    .eq('tenant_id', tenantId)
    .eq('channel', CHECKSLIP_LINE_NOTIFY_CHANNEL)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { config: { userId: [], groupId: [] }, status: undefined };
  }

  return { config: data.config as CheckSlipLineNotifyConfig, status: data.status };
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
      await promptTenantLinking(lineService, messageEvent.replyToken, lineUserId);
      return;
    }

    for (const tenantId of tenantIds) {
      const { config, status } = await fetchTenantChannelConfig(tenantId);

      if (target.type === 'user' && !config.userId.includes(target.id)) {
        config.userId.push(target.id);
      }

      if (target.type === 'group' && !config.groupId.includes(target.id)) {
        config.groupId.push(target.id);
      }

      await upsertTenantChannelConfig(tenantId, config, status);
    }

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

    for (const tenantId of tenantIds) {
      const { config, status } = await fetchTenantChannelConfig(tenantId);

      if (target.type === 'user') {
        config.userId = config.userId.filter((id) => id !== target.id);
      }

      if (target.type === 'group') {
        config.groupId = config.groupId.filter((id) => id !== target.id);
      }

      await upsertTenantChannelConfig(tenantId, config, status);
    }

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
