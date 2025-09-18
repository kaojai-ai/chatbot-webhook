import { AsyncLocalStorage } from 'async_hooks';
import { getDbClient } from './providers/supabase';

interface TenantStore {
  tenantId: string;
  tenantSlug: string;
}

const tenantContext = new AsyncLocalStorage<TenantStore>();

export async function withTenantContext<T>(tenantId: string, fn: () => T): Promise<T> {
    const { data } = await getDbClient()
        .from('tenants')
        .select('slug')
        .eq('id', tenantId)
        .single<{ slug: string }>();

    return tenantContext.run({ tenantId, tenantSlug: data?.slug || `empty_tenant_slug_${tenantId.substring(0, 8)}` }, fn);
}

export function getTenantStore(): TenantStore | undefined {
  return tenantContext.getStore();
}

export default tenantContext;
