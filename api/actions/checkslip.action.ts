import * as line from '@line/bot-sdk';
import supabaseClient from '../../shared/providers/supabase';
import logger from '../../shared/logger';
import { LineService } from '../services/line/line.service';

const CHECKSLIP_LINE_NOTIFY_CHANNEL = 'checkslip_line_notify';

type CheckSlipLineNotifyConfig = {
  userId: string[];
  groupId: string[];
};

type RegistrationTarget =
  | { type: 'user'; id: string }
  | { type: 'group'; id: string };

const getTenantId = (): string | undefined =>
  process.env.CHECKSLIP_NOTIFY_TENANT_ID ??
  process.env.CHECKSLIP_TENANT_ID ??
  process.env.ONLY_TENANT_ID;

const ensureStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
};

const parseConfig = (config: unknown): CheckSlipLineNotifyConfig => {
  if (!config || typeof config !== 'object') {
    return { userId: [], groupId: [] };
  }

  const rawConfig = config as Partial<Record<'userId' | 'groupId', unknown>>;

  return {
    userId: ensureStringArray(rawConfig.userId),
    groupId: ensureStringArray(rawConfig.groupId),
  } satisfies CheckSlipLineNotifyConfig;
};

const extractRegistrationTarget = (
  messageEvent: line.MessageEvent,
): RegistrationTarget | undefined => {
  const source = messageEvent.source;

  switch (source.type) {
    case 'user':
      if (source.userId) {
        return { type: 'user', id: source.userId };
      }
      break;
    case 'group':
      if (source.groupId) {
        return { type: 'group', id: source.groupId };
      }
      break;
    default:
      break;
  }

  return undefined;
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

  return { config: parseConfig(data.config), status: data.status };
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
  const tenantId = getTenantId();

  if (!tenantId) {
    logger.error('CHECKSLIP_NOTIFY_TENANT_ID env is required to register notification');
    await replyWithMessage(
      lineService,
      messageEvent.replyToken,
      'ไม่สามารถลงทะเบียนได้ เนื่องจากระบบยังไม่พร้อม โปรดลองใหม่ภายหลังนะคะ',
    );
    return;
  }

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

  try {
    const { config, status } = await fetchTenantChannelConfig(tenantId);

    if (target.type === 'user' && !config.userId.includes(target.id)) {
      config.userId.push(target.id);
    }

    if (target.type === 'group' && !config.groupId.includes(target.id)) {
      config.groupId.push(target.id);
    }

    await upsertTenantChannelConfig(tenantId, config, status);

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
  const tenantId = getTenantId();

  if (!tenantId) {
    logger.error('CHECKSLIP_NOTIFY_TENANT_ID env is required to unregister notification');
    await replyWithMessage(
      lineService,
      messageEvent.replyToken,
      'ไม่สามารถยกเลิกการแจ้งเตือนได้ เนื่องจากระบบยังไม่พร้อม โปรดลองใหม่ภายหลังนะคะ',
    );
    return;
  }

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

  try {
    const { config, status } = await fetchTenantChannelConfig(tenantId);

    if (target.type === 'user') {
      config.userId = config.userId.filter((id) => id !== target.id);
    }

    if (target.type === 'group') {
      config.groupId = config.groupId.filter((id) => id !== target.id);
    }

    await upsertTenantChannelConfig(tenantId, config, status);

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
