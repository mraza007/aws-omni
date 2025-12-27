import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';

const browser = process.env.BROWSER ?? 'chrome';
const manifest = browser === 'firefox'
  ? await import('./manifest.firefox.json')
  : await import('./manifest.json');

export default defineConfig({
  plugins: [
    preact(),
    crx({ manifest: manifest.default }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: browser === 'firefox' ? 'dist-firefox' : 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        options: resolve(__dirname, 'src/options/options.html'),
      },
    },
  },
});
