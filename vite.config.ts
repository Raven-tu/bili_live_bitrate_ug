import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vite'
import monkey, { util } from 'vite-plugin-monkey'
import Package from './package.json'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    AutoImport({
      dts: 'src/auto-imports.d.ts',
      imports: [
        util.unimportPreset,
      ],
      dirs: [
        'src/modules/**',
        'src/constants.js',
      ],
    }),
    monkey({
      entry: 'src/main.js',
      userscript: {
        'namespace': Package.name,
        'name': Package.displayName,
        'version': Package.version, // Update version as needed
        'description': Package.description,
        'author': Package.author,
        'icon': 'https://live.bilibili.com/favicon.ico',
        'match': ['*://live.bilibili.com/*'],
        'require': [
        ],
        'connect': [
          'live.bilibili.com',
        ],
        'grant': [
          'unsafeWindow',
        ],
        'run-at': 'document-start',
      },
      server: {
        mountGmApi: true,
      },
      build: {
        // externalGlobals: {
        // },
      },
    }),
  ],
})
