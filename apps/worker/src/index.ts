import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './env';
import { runUser } from './pipeline/run-user';
import type { UserSettings } from './pipeline/types';

async function main(): Promise<void> {
  const env = loadEnv();
  const db = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let query = db.from('jm_settings').select('*');
  if (env.onlyUserId) query = query.eq('user_id', env.onlyUserId);
  const { data, error } = await query;
  if (error) throw new Error(`loading settings failed: ${error.message}`);

  let failures = 0;
  for (const settings of (data ?? []) as UserSettings[]) {
    const stats = await runUser(db, env, settings);
    if (!stats) {
      console.log(`user ${settings.user_id}: skipped (ran recently)`);
      continue;
    }
    if (stats.errors.length > 0) failures++;
    console.log(
      `user ${settings.user_id}: collected=${stats.collected} new=${stats.newJobs} filtered=${stats.filteredOut} scored=${stats.scored} notified=${stats.notified} errors=${stats.errors.length}`,
    );
    for (const message of stats.errors) console.log(`  - ${message}`);
  }
  if (failures > 0) console.log(`${failures} run(s) finished with errors`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
