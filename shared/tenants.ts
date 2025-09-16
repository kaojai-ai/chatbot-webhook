import { CheckSlipTenantConfig, TenantConfig } from './types/tenants';
import logger from './logger';
import supabaseClient from './providers/supabase';

/**
 * Fetch tenant configuration of checkslip module from Supabase.
 * Expects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)
 * to be available in environment variables. The table `tenant_configs`
 * should contain a JSON column `config` with tenant settings.
 */
export async function fetchCheckSlipTenantConfigs(): Promise<CheckSlipTenantConfig[]> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    return [];
  }

  try {
    const supabaseQuery = supabaseClient
    .schema('checkslip')
    .from('tenant_configs')
    .select('*')

    if (!!process.env.ONLY_TENANT_ID) {
      logger.info("[DEBUG MODE] RUN ONLY TENANT: %s", process.env.ONLY_TENANT_ID);
      supabaseQuery.eq('tenant_id', process.env.ONLY_TENANT_ID);
    } else {
      supabaseQuery.eq('status', 'active');
    }

    const { data, error } = await supabaseQuery;

    if (error) {
      logger.error(error, 'Failed to fetch tenant configurations from Supabase');
      return [];
    }

    return (data ?? [])
    .map((row) => {
      return {
        ...(row.config as unknown as Omit<CheckSlipTenantConfig, 'status' | 'tenantId'>),
        tenantId: row.tenant_id,
        status: row.status,
      } satisfies CheckSlipTenantConfig;
    });

  } catch (err) {
    logger.error(err, 'Failed to fetch tenant configurations from Supabase');
    return [];
  }
}
