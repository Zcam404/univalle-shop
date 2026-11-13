import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Configuración de Vite.
 *
 * En desarrollo (`npm run dev`) las peticiones a `/api` se reenvían al API
 * Gateway en localhost:3000. Así el frontend siempre llama a rutas relativas
 * (`/api/...`), igual que en producción, donde Nginx hace el mismo reenvío.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
