import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

//This prerender script is loaded on untrusted URLs that do not need API access to application.

// Custom APIs for renderer
const api = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  switchPage(): Promise<any> {
    return ipcRenderer.invoke('switch-to-electronjs', 'switch')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
