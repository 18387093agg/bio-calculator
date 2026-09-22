import { defineConfig } from 'vitest/config';
import path from 'path';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    test: {
      environment: 'node',
      env: env,
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './'),
      },
    },
  };
});