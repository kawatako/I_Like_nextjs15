// supabase/functions/_shared/supabaseClient.ts
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?no-check";

const url = Deno.env.get("SUPABASE_URL")!;
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const sb = createClient(url!, key!);