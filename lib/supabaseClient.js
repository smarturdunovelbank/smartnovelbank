import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// NOTE: This uses the public anon key, same as your current Blogger widget.
// Make sure Row Level Security (RLS) on `urdu_novels` only allows SELECT.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
