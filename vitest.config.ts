import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Testes das regras puras (src/lib, src/invest, src/store, src/theme, traduções).
// Componentes React Native não rodam aqui.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
});
