import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/data/database.types";

// Never a secret/service-role key here — this module ships to the browser.
// The publishable key is safe client-side: it only grants what Row Level
// Security policies allow (see supabase/migrations/0004_rls_policies.sql),
// i.e. read-only access to published rows.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabasePublishableKey!)
  : null;
