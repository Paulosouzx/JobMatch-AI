export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  allowSignups: import.meta.env.VITE_ALLOW_SIGNUPS === 'true',
  githubOAuth: import.meta.env.VITE_ENABLE_GITHUB_OAUTH === 'true',
  googleOAuth: import.meta.env.VITE_ENABLE_GOOGLE_OAUTH !== 'false',
  repoUrl: import.meta.env.VITE_REPO_URL ?? 'https://github.com/Paulosouzx/JobMatch-AI',
};

export const isConfigured = config.supabaseUrl !== '' && config.supabaseAnonKey !== '';
