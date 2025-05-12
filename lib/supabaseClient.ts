// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
console.log("▶ fetching from:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("▶ using anon key prefix:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0,8));

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
