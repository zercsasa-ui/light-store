import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mutebkvjowivxupnexzp.supabase.co'
const supabaseKey = 'sb_publishable_oyu0Kmel3M15Am53sI_tzg_dZws5Hds'

export const supabase = createClient(supabaseUrl, supabaseKey)
