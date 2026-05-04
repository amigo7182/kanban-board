// Re-export the SSR-aware browser client as a singleton for client components.
import { createClient } from "@/utils/supabase/client";

export const supabase = createClient();
