import { defineConfig } from 'vitest/config';

// Relative base so the build works on a GitHub Pages project subpath.
export default defineConfig({
  base: './',
  test: { include: ['tests/unit/**/*.test.ts'] },
});
