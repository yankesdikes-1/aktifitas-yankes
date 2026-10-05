import { createClient } from '@supabase/supabase-js'

// Ganti dengan URL dan Anon Key dari project Supabase Anda
// Atau gunakan Environment Variables di Vercel (VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR_SUPABASE_URL.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
