import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jliixepzqngcdnhfaepe.supabase.co";
const supabaseAnonKey = "YOUR_REAL_SUPABASE_ANON_KEY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);