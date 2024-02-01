import { resolve } from 'path';
import { splitVendorChunkPlugin } from 'vite';
import dts from 'vite-plugin-dts';
import version from 'vite-plugin-package-version';

const PROJECT_DIR = resolve(__dirname);
const SRC_DIR = resolve(PROJECT_DIR, 'src');
const OUT_DIR = resolve(PROJECT_DIR, 'dist');
const STATIC_DIR = resolve(PROJECT_DIR, 'static');

const isProd = 'production' === process.env.NODE_ENV;

export default {
  publicDir: STATIC_DIR,

  plugins: [
    splitVendorChunkPlugin(),
    // Inject `package.json`::`version` into `import.meta.env.PACKAGE_VERSION`
    version(),

    // Generate type declarations
    dts({
      include: [SRC_DIR],
      outDir: resolve(OUT_DIR, 'types'),
      rollupTypes: isProd
    })
  ],

  // Necessary for running within Docker
  server: {
    cors: true,
    host: true
  }
};
