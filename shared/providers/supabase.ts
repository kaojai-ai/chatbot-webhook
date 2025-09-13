import { createClient } from '@supabase/supabase-js'
import { Database } from '@kaojai-ai/db-schema'

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

const supabaseClient = createClient<Database>(supabaseUrl, supabaseKey)

export default supabaseClient
