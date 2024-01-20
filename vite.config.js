import { resolve } from 'path';
import version from 'vite-plugin-package-version';

const PROJECT_DIR = resolve(__dirname);
const SRC_DIR = resolve(PROJECT_DIR, '.');

export default {
  publicDir: resolve(SRC_DIR, 'static'),

  plugins: [version()],

  build: {
    emptyOutDir: true
  },

  server: {
    cors: true,
    host: true
  }
};
