import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env
    .VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
    | string
    | undefined;
const supabaseKey = supabasePublishableKey || supabaseAnonKey;
const supabaseSecretKey = import.meta.env.VITE_SUPABASE_SECRET_KEY as
    | string
    | undefined;

if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocalDev = host === "localhost" || host === "127.0.0.1";

    if ((!supabaseUrl || !supabaseKey) && !isLocalDev) {
        console.warn(
            "[Supabase] Missing VITE_SUPABASE_URL and client key. " +
                "Frontend will not read agents from Supabase."
        );
    }

    if (supabaseSecretKey) {
        console.warn(
            "[Supabase] VITE_SUPABASE_SECRET_KEY should not be exposed to the browser. Remove it from Vercel."
        );
    }
}

/**
 * Supabase client — only created when env vars are present (i.e. cloud mode).
 * In local dev the app falls back to the FastAPI WebSocket automatically.
 */
export const supabase =
    supabaseUrl && supabaseKey
        ? createClient(supabaseUrl, supabaseKey)
        : null;

/** True when Supabase credentials are available (Vercel / cloud deployment). */
export const isSupabaseMode = supabase !== null;
