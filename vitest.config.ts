import { defineConfig } from 'vitest/config';

// Testy herního jádra běží v Node bez prohlížeče, nezávisle na vite.config.ts (ten má root v client/).
export default defineConfig({
  test: {
    include: ['server/**/*.test.ts', 'shared/**/*.test.ts'],
    environment: 'node',
  },
});
