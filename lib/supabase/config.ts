// Public Supabase connection details.
//
// These are the project's public client credentials. The anon key is designed to
// be exposed to the browser — access is governed by Row-Level Security, the
// @adt.com sign-up restriction, and (for AI features) the server-only
// ANTHROPIC_API_KEY.
//
// We intentionally hardcode these rather than read them from env vars: a
// malformed value in the Vercel env (a truncated key, or a URL with a trailing
// slash) would otherwise override the correct values and break auth with
// "Invalid API key". To point the app at a different Supabase project, edit the
// two constants below.

// SUPABASE_LOCAL_TEST_URL is a server-only escape hatch for automated local
// testing against a mock; it is never set in any deployed environment.
export const SUPABASE_URL =
  process.env.SUPABASE_LOCAL_TEST_URL || "https://ivlenppmsnjdzhvcokvu.supabase.co";

export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bGVucHBtc25qZHpodmNva3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NzkxNDMsImV4cCI6MjA5ODM1NTE0M30.zmC_Aw1O7BgpKGj5CDzzlbjBMDTUpxzUxTBsGSteXAQ";
