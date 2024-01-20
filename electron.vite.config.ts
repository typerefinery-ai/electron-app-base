import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import inject from '@rollup/plugin-inject'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), inject({ $: 'jquery', jQuery: 'jquery' })]
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          trusted: resolve(__dirname, 'src/preload/trusted.ts')
        }
      }
    }
  },
  renderer: {
    server: {
      port: 5174
    }
  }
})
