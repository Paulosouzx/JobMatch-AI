export interface WorkerEnv {
  supabaseUrl: string;
  serviceRoleKey: string;
  force: boolean;
  onlyUserId: string | null;
  fallback: {
    llmApiKey: string | null;
    telegramToken: string | null;
    telegramChatId: string | null;
  };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function optional(name: string): string | null {
  const value = process.env[name];
  return value ? value : null;
}

export function loadEnv(): WorkerEnv {
  return {
    supabaseUrl: required('SUPABASE_URL'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
    force: process.env.JOBMATCH_FORCE === '1',
    onlyUserId: optional('JOBMATCH_USER_ID'),
    fallback: {
      llmApiKey: optional('LLM_API_KEY'),
      telegramToken: optional('TELEGRAM_BOT_TOKEN'),
      telegramChatId: optional('TELEGRAM_CHAT_ID'),
    },
  };
}
