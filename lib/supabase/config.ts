// Public Supabase connection details.
//
// The anon key is designed to be exposed to the browser — access is governed by
// Row-Level Security, the @adt.com sign-up restriction, and (for AI features) the
// server-only ANTHROPIC_API_KEY. We read env vars first so the values can be
// overridden per environment, and fall back to the project defaults so the app
// works even if the Vercel env vars aren't wired up.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ivlenppmsnjdzhvcokvu.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bGVucHBtc25qZHpodmNva3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NzkxNDMsImV4cCI6MjA5ODM1NTE0M30.zmC_Aw1O7BgpKGj5CDzzlbjBMDTUpxzUxTBsGSteXAQ";
