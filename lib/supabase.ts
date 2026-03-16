import { createClient } from "@supabase/supabase-js";

const supabaseUrl = https://jliixepzqngcdnhfaepe.supabase.co;
const supabaseAnonKey = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsaWl4ZXB6cW5nY2RuaGZhZXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2ODY1NDUsImV4cCI6MjA4OTI2MjU0NX0.rnJ4TMknDPP18haoZ5UFUM0Uox70pePtix8e2pnpIQ8;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);