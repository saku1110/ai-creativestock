import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY

if (!url) throw new Error('Missing SUPABASE_URL for admin client')
if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_KEY for admin client')

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false }
})

