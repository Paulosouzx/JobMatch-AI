import { createClient } from '@supabase/supabase-js';
import { config } from './config';

export const supabase = createClient(
  config.supabaseUrl || 'http://localhost:54321',
  config.supabaseAnonKey || 'missing-key',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);

export const APP_TAG = { app: 'jobmatch' } as const;
