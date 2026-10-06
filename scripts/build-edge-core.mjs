import { build } from 'esbuild';

await build({
  entryPoints: ['packages/core/src/edge.ts'],
  outfile: 'supabase/functions/_shared/core.js',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  external: ['zod'],
  legalComments: 'none',
});
