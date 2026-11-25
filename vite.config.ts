import { defineConfig } from 'vite'
import path from 'path'
import fs from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { normalizeText } from './tools/kit/normalize.mjs'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

// Only the local dev server substitutes supplied delta clips.
// The stored index retains its original production URLs.
function localKitClips() {
  return {
    name: 'local-kit-clips',
    apply: 'serve' as const,
    load(id: string) {
      if (id === path.resolve(__dirname, 'src/data/kit/audio-index.json')) {
        const index = JSON.parse(fs.readFileSync(id, 'utf8'));
        for (const name of ['tts-targets.json', 'tts-scenepage-targets.json', 'tts-words-targets.json']) {
          const targets = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'tools/kit', name), 'utf8'));
          for (const target of targets) {
            const localFile = path.resolve(__dirname, 'tools/kit/.tts-cache', target.file);
            if (fs.existsSync(localFile)) {
              const key = target.normalizedKey ?? normalizeText(target.spokenText);
              index[key] = { ...index[key], audioUrl: '/@fs/' + localFile };
            }
          }
        }
        return JSON.stringify(index);
      }
      if (id !== path.resolve(__dirname, 'src/data/kit/clips-index.json')) return;
      const index = JSON.parse(fs.readFileSync(id, 'utf8'));
      for (const clip of Object.values(index) as { audioUrl: string }[]) {
        const pathname = new URL(clip.audioUrl).pathname;
        const relative = pathname.replace(/^\/content\/clips\//, '');
        const localFile = path.resolve(__dirname, 'tools/kit/clips', relative);
        if (localFile.startsWith(path.resolve(__dirname, 'tools/kit/clips') + path.sep) && fs.existsSync(localFile)) {
          clip.audioUrl = '/@fs/' + localFile;
        }
      }
      return JSON.stringify(index);
    },
  };
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    localKitClips(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    proxy: {
      '/dev-payments': {
        target: 'http://127.0.0.1:9001',
        rewrite: path => path.replace(/^\/dev-payments/, ''),
      },
      '/dev-membership': {
        target: 'https://api.learnyzenglish.com',
        changeOrigin: true,
        cookieDomainRewrite: '',
        headers: { origin: 'https://learnyzenglish.com' },
        rewrite: path => path.replace(/^\/dev-membership/, ''),
      },
      // Local browsers are intentionally denied direct JSON requests by the
      // content domain. Proxy public lesson JSON through Vite so development
      // uses the same complete manifest as production.
      '/dev-content': {
        target: 'https://go.learnyzenglish.com',
        changeOrigin: true,
        headers: {
          referer: 'https://learnyzenglish.com/',
        },
        rewrite: path => path.replace(/^\/dev-content/, '/content'),
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
