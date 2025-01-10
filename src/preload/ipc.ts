import { ipcRenderer, ipcMain } from 'electron'

/* eslint-disable @typescript-eslint/no-explicit-any */
export class IPCMethod<A extends any[], R> {
  readonly #channel: string
  static #CHANNEL_GEN = 0

  constructor(channel: string) {
    this.#channel = channel
  }

  async call(...args: A): Promise<R> {
    const resolveChannel = String(IPCMethod.#CHANNEL_GEN++)
    const rejectChannel = String(IPCMethod.#CHANNEL_GEN++)
    const promise = new Promise<R>((resolve, reject) => {
      ipcRenderer.once(resolveChannel, (_event, reply: R) => resolve(reply))
      ipcRenderer.once(rejectChannel, (_event, reply: unknown) => reject(reply))
    })
    ipcRenderer.send(this.#channel, resolveChannel, rejectChannel, ...args)
    return promise
  }

  readonly #cleanupFunctions: (() => void)[] = []

  async implement(impl: (...args: A) => R | Promise<R>): Promise<void> {
    async function listener(
      event: Electron.IpcMainEvent,
      resolveChannel: string,
      rejectChannel: string,
      ...args: any[]
    ): Promise<void> {
      try {
        const reply = await impl(...(args as A))
        event.reply(resolveChannel, reply)
      } catch (e) {
        event.reply(rejectChannel, e)
      }
    }
    ipcMain.on(this.#channel, listener)
    this.#cleanupFunctions.push(() => ipcMain.off(this.#channel, listener))
  }

  clean(): void {
    let f: undefined | (() => void)
    while ((f = this.#cleanupFunctions.shift())) {
      f()
    }
  }
}

export const sharedAppIpc = {
  isAuthenticated: new IPCMethod<[], boolean>('isAuthenticated'),
  minimize: new IPCMethod<[], void>('minimize'),
  maximize: new IPCMethod<[], void>('maximize'),
  unmaximize: new IPCMethod<[], void>('unmaximize'),
  close: new IPCMethod<[], void>('close'),
  isMaximized: new IPCMethod<[], boolean>('isMaximized'),
  isMinimized: new IPCMethod<[], boolean>('isMinimized'),
  isNormal: new IPCMethod<[], boolean>('isNormal'),
  setBadgeCount: new IPCMethod<[number], boolean>('setBadgeCount'),
  getServices: new IPCMethod<[], any[]>('getServices'),
  getDirectory: new IPCMethod<[string], any[]>('getDirectory'),
  restartService: new IPCMethod<[string], any[]>('restartService'),
  stopService: new IPCMethod<[string], any[]>('stopService'),
  startService: new IPCMethod<[string], any[]>('startService'),
  startAll: new IPCMethod<[any], void>('startAll'),
  stopAll: new IPCMethod<[any], void>('stopAll'),
  getAppPath: new IPCMethod<[string], any[]>('getAppPath'),
  getAppDataPath: new IPCMethod<[string], any[]>('getAppDataPath'),
  getGlobalEnv: new IPCMethod<[], any[]>('getGlobalEnv'),
  getEnv: new IPCMethod<[], any[]>('getEnv'),
  windowResizeStart: new IPCMethod<[string], void>('windowResizeStart'),
  windowResizeEnd: new IPCMethod<[string], void>('windowResizeEnd'),
  windowResize: new IPCMethod<[any], void>('windowResize'),
  windowResizeCancel: new IPCMethod<[any], void>('windowResizeCancel'),
  windowHide: new IPCMethod<[any], void>('windowHide'),
  windowShow: new IPCMethod<[any], void>('windowShow'),
  setWindowTitle: new IPCMethod<[string], void>('setWindowTitle'),
  switchPageLeft: new IPCMethod<[never], void>('switchPageLeft'),
  switchPageRight: new IPCMethod<[never], void>('switchPageRight'),
  addTab: new IPCMethod<[never], void>('addTab'),
  removeTab: new IPCMethod<[never], void>('removeTab'),
  changeTheme: new IPCMethod<[never], void>('changeTheme'),
  changeSettings: new IPCMethod<[never], void>('changeSettings'),
  topicSend: new IPCMethod<[string, string, any], void>('topicSend'),
  topicListen: new IPCMethod<[string, string, any], void>('topicListen'),
  windowFocus: new IPCMethod<[], void>('windowFocus'),
  windowFocusLeft: new IPCMethod<[], void>('windowFocusLeft'),
  windowFocusRight: new IPCMethod<[], void>('windowFocusRight')
}

export type AppIPC = {
  [P in keyof typeof sharedAppIpc]: (typeof sharedAppIpc)[P] extends IPCMethod<infer A, infer R>
    ? (...args: A) => R | Promise<R>
    : never
}
