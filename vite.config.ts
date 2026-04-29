import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig, type UserConfig } from 'vite'

export default defineConfig(({ mode }) => {
  if (mode === 'content') {
    return createClassicScriptConfig('src/content/index.ts', 'SoundCloudResumeContent', 'content.js')
  }

  if (mode === 'inject') {
    return createClassicScriptConfig('src/inject/index.ts', 'SoundCloudResumeInject', 'inject.js')
  }

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'popup.html'),
          background: resolve(__dirname, 'src/background/index.ts'),
        },
        output: {
          entryFileNames: (chunk) => {
            if (chunk.name === 'background') return 'background.js'
            return 'assets/[name]-[hash].js'
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  }
})

function createClassicScriptConfig(entry: string, name: string, fileName: string): UserConfig {
  return {
    build: {
      emptyOutDir: false,
      copyPublicDir: false,
      lib: {
        entry: resolve(__dirname, entry),
        name,
        formats: ['iife'],
        fileName: () => fileName,
      },
    },
  }
}
