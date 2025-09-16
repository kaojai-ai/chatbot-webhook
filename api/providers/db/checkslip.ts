import supabaseClient from "../../../shared/providers/supabase";

const CHECKSLIP_LINE_NOTIFY_CHANNEL = 'line_notify';

type CheckSlipLineNotifyConfig = {
    userId: string[];
    groupId: string[];
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

export { upsertTenantChannelConfig, fetchTenantChannelConfig }
