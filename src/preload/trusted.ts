import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { type AppIPC, sharedAppIpc } from './ipc'
import { NativeThemeConfig } from '../main/ElectronUtils'

export interface AppEnvironment {
  platform: typeof process.platform
  frameless: boolean
}

const appEnvironment: AppEnvironment = {
  platform: process.platform,
  frameless: true
}

declare global {
  const ipc: AppIPC
  const appEnvironment: AppEnvironment
}

window.addEventListener('DOMContentLoaded', () => {
  console.log('api ipc DOMContentLoaded')
  const replaceText = (selector: string, text: string): void => {
    const element = document.getElementById(selector)
    if (element) {
      element.innerText = text
    }
  }

  for (const dependency of ['chrome', 'node', 'electron']) {
    const replaceWith: string = process.versions[dependency] || ''
    replaceText(`${dependency}-version`, replaceWith)
  }
})

console.log('api ipc')

ipcRenderer.on('theme-changed', (event, options: NativeThemeConfig) => {
  console.log('theme-changed', event, options)
  document.documentElement.style.setProperty(
    '--window-title-bar-color-light',
    options.windowTitleBarColorLight
  )
  document.documentElement.style.setProperty(
    '--window-title-bar-color-dark',
    options.windowTitleBarColorDark
  )
  document.documentElement.style.setProperty(
    '--window-title-bar-color',
    options.windowTitleBarColor
  )
  document.documentElement.style.setProperty(
    '--window-title-bar-text-color',
    options.windowTitleBarTextColor
  )
  document.documentElement.style.setProperty('--window-accent-color', options.windowAccentColor)
  document.documentElement.style.setProperty(
    '--window-background-color',
    options.windowBackgroundColor
  )
  document.documentElement.style.setProperty('--window-color', options.windowColor)
  //set title bar height to a default, it will be first picked from titlebar-area-height
  document.documentElement.style.setProperty(
    '--window-title-bar-height',
    options.windowTitleBarHeight
  )
})

contextBridge.exposeInMainWorld('api', {
  request: (channel: string, data: object) => {
    console.log('api request', channel, data)
    ipcRenderer.send(channel, data)
  },
  response: (channel: string, func: (data: object) => void) => {
    console.log('api response', channel, func)
    // Strip event as it includes `sender` and is a security risk
    ipcRenderer.on(channel, (event, data) => func(data))
    // ipcRenderer.on(channel, (data) => func(data))
  }
})

console.log([
  'ipc exposed',
  Object.fromEntries(
    Object.entries(sharedAppIpc).map(([channel, method]) => {
      return [channel, method.call.bind(method)]
    })
  )
])

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    console.log('process.contextIsolated start')
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld(
      'ipc',
      Object.fromEntries(
        Object.entries(sharedAppIpc).map(([channel, method]) => {
          return [channel, method.call.bind(method)]
        })
      )
    )
    contextBridge.exposeInMainWorld('appEnvironment', appEnvironment)
    console.log('process.contextIsolated loaded')
  } catch (error) {
    console.error(error)
  }
} else {
  console.log('window contextBridge start')
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.appEnvironment = appEnvironment
  // @ts-ignore (define in dts)
  Object.entries(sharedAppIpc).forEach(([channel, method]) => {
    window['api'][channel] = method.call.bind(method)
  })
  console.log('window contextBridge loaded')
}

//dark mode
contextBridge.exposeInMainWorld('darkMode', {
  toggle: () => ipcRenderer.invoke('dark-mode:toggle'),
  system: () => ipcRenderer.invoke('dark-mode:system'),
  light: () => ipcRenderer.invoke('dark-mode:light'),
  dark: () => ipcRenderer.invoke('dark-mode:dark')
})
