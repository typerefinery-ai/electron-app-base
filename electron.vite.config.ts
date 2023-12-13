import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import inject from '@rollup/plugin-inject'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), inject({ $: 'jquery', jQuery: 'jquery' })]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    server: {
      port: 5174
    }
  }
})
