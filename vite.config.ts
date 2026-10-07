import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': `http://localhost:${process.env.API_PORT ?? 3001}` },
    // Native file events were being missed on this Windows setup (stale modules after edits);
    // polling a project this small is cheap and reliable.
    watch: { usePolling: true, interval: 250 },
  },
});
