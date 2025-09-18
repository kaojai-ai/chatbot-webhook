import { getDbClient } from "../../../shared/providers/supabase";


const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;


const fetchTenantIdsByLineUserId = async (lineUserId: string): Promise<string[]> => {
  const { data, error } = await getDbClient().rpc('get_tenant_by_line_uid', { p_line_user_id: lineUserId },
  );

  if (error) {
    throw error;
  }

  const tenantIds = Array.isArray(data) ? data : [];

  return [...new Set(tenantIds.filter(isNonEmptyString))];
};

export { fetchTenantIdsByLineUserId }
