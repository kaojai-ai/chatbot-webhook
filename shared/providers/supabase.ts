import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@kaojai-ai/db-schema'

let client: SupabaseClient<Database> | null = null

export function getDbClient() {
  if (client) return client

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, NODE_ENV } = process.env

  const url = SUPABASE_URL
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY

  // Don’t crash at import time; validate when first used.
  if (!url || !key) {
    // In unit tests, you’ll usually mock this function anyway.
    // For safety, give a clearer message when someone forgot envs.
    const hint =
      NODE_ENV === 'test'
        ? 'In tests, mock getDbClient() or provide a test double.'
        : 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANON) in your env.'
    throw new Error(`Missing Supabase configuration. ${hint}`)
  }

  client = createClient<Database>(url, key, {
    // optional: tighter defaults for tests/CI
    global: { headers: { 'X-Client-Name': 'app-server' } },
  })
  return client
}
