import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
    | string
    | undefined;

/**
 * Supabase client — only created when env vars are present (i.e. cloud mode).
 * In local dev the app falls back to the FastAPI WebSocket automatically.
 */
export const supabase =
    supabaseUrl && supabaseAnonKey
        ? createClient(supabaseUrl, supabaseAnonKey)
        : null;

/** True when Supabase credentials are available (Vercel / cloud deployment). */
export const isSupabaseMode = supabase !== null;
