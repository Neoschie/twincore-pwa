import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jliixepzqngcdnhfaepe.supabase.co";
const supabaseAnonKey = "PASTE_YOUR_REAL_ANON_KEY_HERE";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
