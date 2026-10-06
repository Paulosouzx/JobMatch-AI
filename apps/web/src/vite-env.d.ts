/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ALLOW_SIGNUPS?: string;
  readonly VITE_ENABLE_GITHUB_OAUTH?: string;
  readonly VITE_ENABLE_GOOGLE_OAUTH?: string;
  readonly VITE_REPO_URL?: string;
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
  const url: string;
  export default url;
}
