import supabaseClient from "../../../shared/providers/supabase";
import { ResourceStatus } from "../../../shared/types/tenants";

const CHECKSLIP_LINE_NOTIFY_CHANNEL = 'line_notify';

type CheckSlipLineNotifyConfig = {
    userId: string[];
    groupId: string[];
};

const upsertTenantChannelConfig = async (
    tenantId: string,
    config: CheckSlipLineNotifyConfig,
    status?: ResourceStatus,
): Promise<void> => {
    const payload = {
        tenant_id: tenantId,
        channel: CHECKSLIP_LINE_NOTIFY_CHANNEL,
        config,
        status: status,
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
): Promise<{ config: CheckSlipLineNotifyConfig; status?: ResourceStatus }> => {
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

export { upsertTenantChannelConfig, fetchTenantChannelConfig }
