/// <reference types="vitest/config" />
import { realpathSync } from 'node:fs';
import { defineConfig, searchForWorkspaceRoot, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** Preloads the latin Geist + Geist Mono variable fonts in production (both are on the first screen); filenames are content-hashed. */
function preloadDisplayFont(): Plugin {
  return {
    name: 'solarvein-preload-display-font',
    apply: 'build',
    transformIndexHtml(_html, ctx) {
      const files = Object.keys(ctx.bundle ?? {}).filter((f) => /geist(-mono)?-latin-wght-normal-[\w-]+\.woff2$/.test(f));
      return files.map((file) => ({
        tag: 'link',
        attrs: { rel: 'preload', href: `/${file}`, as: 'font', type: 'font/woff2', crossorigin: '' },
        injectTo: 'head' as const,
      }));
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadDisplayFont()],
  // Worker worktrees junction node_modules to the lead checkout: allow its real path so fonts are served (no 403).
  server: {
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), realpathSync('node_modules')] },
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
