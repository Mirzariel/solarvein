/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
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
  build: {
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
