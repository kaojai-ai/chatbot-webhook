import { getDbClient } from "../../../shared/providers/supabase";
import { Tenant } from "../../../shared/types/tenants";

const fetchTenantIdsByLineUserId = async (lineUserId: string): Promise<Tenant[]> => {
  const { data, error } = await getDbClient().rpc('get_tenant_by_line_uid', { p_line_user_id: lineUserId });

  if (error) {
    throw error;
  }

  const tenantIds = Array.isArray(data) ? data : [];

  const { data: tenants, error: tenantsError } = await getDbClient().from('tenants').select('*').in('id', tenantIds);

  if (tenantsError) {
    throw tenantsError;
  }

  return tenants;
};

export { fetchTenantIdsByLineUserId }
