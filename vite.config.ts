import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'client',
  plugins: [react()],
  server: {
    // Vývojový server běží v síti (telefony). Bez omezení by kdokoli na Wi‑Fi stáhl přes /@fs/ libovolný
    // soubor projektu, třeba data/zrada-stav.json s klíčem moderátora a rolemi. Vydávat jen to, co klient potřebuje.
    fs: {
      strict: true,
      allow: [path.join(rootDir, 'client'), path.join(rootDir, 'shared'), path.join(rootDir, 'node_modules')],
    },
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
  },
});
