import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/cp-geo-visualizer/',
  test: {
    environment: 'node',
    include: ['services/**/*.test.ts'],
  },
});
