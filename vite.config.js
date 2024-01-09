import { resolve } from 'path';

const PROJECT_DIR = resolve(__dirname);
const SRC_DIR = resolve(PROJECT_DIR, '.');
const DIST_DIR = resolve(PROJECT_DIR, 'build');

export default {
  publicDir: resolve(SRC_DIR, 'static'),

  build: {
    outDir: DIST_DIR,
    emptyOutDir: true
  },

  server: {
    cors: true,
    host: true
  }
};
