import {
  app,
  shell,
  BrowserWindow,
  Tray,
  ipcMain,
  dialog,
  Menu,
  globalShortcut,
  crashReporter,
  systemPreferences,
  type BrowserWindowConstructorOptions,
  nativeTheme
} from 'electron'
import path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.ico?asset'
import { BrowserViewManager } from './BrowserViewManager'
import { MenuItemConstructorOptions, MenuItem } from 'electron/main'
import { type AppIPC, sharedAppIpc, IPCMethod } from '../preload/ipc'
import { getConfig, getEnvConfigWithDefault, tryParseInt } from './Utils'
import {
  DEVTOOLS,
  WINDOW_TITLE_BAR_OVERLAY,
  WINDOW_TITLE_BAR_OVERLAY_HEIGHT,
  createMenu,
  createTray,
  getNativeThemeConfig,
  getTitleBarOverlayOptions,
  handleDarkmode
} from './ElectronUtils'
import { Logger } from './Logger'
import i18n from './i18n'
import log from 'electron-log'
import * as Sentry from '@sentry/electron'
import { CaptureConsole } from '@sentry/integrations'
import ElectronWindowState from 'electron-window-state'
import {
  getNewLogPath,
  isFirstInstall,
  createFirstInstallFile,
  staticAsset
  // resourceBinary
} from './Resources'
import dotenv, { config } from 'dotenv'
import { updateElectronApp, UpdateSourceType } from 'update-electron-app'

//height of the home bar
const HOME_MAX_HEIGHT = 36
const DEFAULT_SHORTCUT_CONSOLE = 'CmdOrCtrl+Alt+I'

// tarack when the main window is closing
let mainWindowClosing = false
// track if we need to exist without prompt
const mainWindowCloseNoPrompt = false

let mainWindow: Electron.BrowserWindow
let mainWindowState: ElectronWindowState.State
let browserViewManager: BrowserViewManager
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let mainWindowMenu: Menu //create and update app menu
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let mainWindowTray: Tray //create and update app tray icon

const SCRIPT_PRELOAD = path.join(__dirname, '../preload/index.js')
const VITE_DEV_SERVER_HOST = getEnvConfigWithDefault('VITE_DEV_SERVER_HOST', 'localhost')
const VITE_DEV_SERVER_PORT: number = tryParseInt(
  getEnvConfigWithDefault('VITE_DEV_SERVER_PORT', '3000'),
  3000
)

const VITE_DEV_SERVER_SCHEMA = getEnvConfigWithDefault('VITE_DEV_SERVER_SCHEMA', 'http')

// create a new logs sub directory with date timestamp everytime the app starts
const logsDir = getNewLogPath('logs')

const defaultMainWindowTrayMenuTemplate: Array<MenuItemConstructorOptions | MenuItem> = [
  {
    id: 'menu-tray-open',
    label: 'Open',
    type: 'normal',
    click: () => mainWindow.show()
  },
  { type: 'separator' },
  {
    id: 'menu-tray-quit',
    label: 'Quit',
    click: () => app.quit()
  }
]

const defaultMainWidowMenyTemplate: Array<MenuItemConstructorOptions | MenuItem> = [
  {
    label: 'View',
    accelerator: 'CmdOrCtrl+Shift+V',
    submenu: [
      {
        label: 'open dev tool',
        accelerator: 'CmdOrCtrl+Shift+I',
        click(): void {
          mainWindow.webContents.openDevTools({ mode: 'detach' })
        }
      },
      {
        label: 'Quit',
        role: 'quit'
      }
    ]
  }
]

const defaultMainWindowOptions: BrowserWindowConstructorOptions = {
  width: 1200,
  height: 800,
  minWidth: 1200,
  minHeight: 800,
  // frame: false, // frameless window=true
  show: false, // show when created?
  //autoHideMenuBar: true,
  titleBarOverlay: true,
  titleBarStyle: 'hidden',
  ...(process.platform === 'linux' ? { icon } : {}),
  webPreferences: {
    preload: SCRIPT_PRELOAD,
    sandbox: false,
    nodeIntegration: true,
    contextIsolation: true,
    spellcheck: true,
    devTools: true
  }
}

const defaultChildWindowOptions: BrowserWindowConstructorOptions = {
  minWidth: 680,
  minHeight: 400,
  icon: path.join(__dirname, 'resources/icon.ico'),
  autoHideMenuBar: true
}

//support .env file
dotenv.config()

// Setup logging to file after crash reporter.
Object.assign(console, log.functions)
log.transports.file.resolvePathFn = (): string => path.join(logsDir, 'main.log')
const logger = new Logger(logsDir, 'electron')

logger.log(`app.isPackaged: ${app.isPackaged}`)
//variables
let isDev = !app.isPackaged
const isProd = app.isPackaged
console.log(`isDev: ${isDev}`)
const envMode = getEnvConfigWithDefault('NODE_ENV', '')
console.log(`envMode: ${envMode}`)
if (envMode != '') {
  isDev = envMode === 'dev' || envMode === 'development'
}

if (isProd) {
  // setup crash reporter first
  if (getEnvConfigWithDefault('CRASH_REPORTER_SUBMIT_URL')) {
    // Start crash reporter before setting up logging
    crashReporter.start({
      companyName: config['companyName'],
      productName: config['productName'],
      ignoreSystemCrashHandler: true,
      submitURL: getEnvConfigWithDefault('CRASH_REPORTER_SUBMIT_URL')
    })

    Sentry.init({
      dsn: getEnvConfigWithDefault('ERROR_REPORT_SENTURY_DSN'),
      sampleRate: 1.0,
      integrations: [
        new CaptureConsole({
          levels: getEnvConfigWithDefault('ERROR_REPORT_LEVEL')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any
      ]
    })
  }

  console.log(`APP_UPDATE_REPO: ${getEnvConfigWithDefault('APP_UPDATE_REPO')}`)
  // run auto update
  updateElectronApp({
    updateSource: {
      type: UpdateSourceType.ElectronPublicUpdateService,
      repo: getEnvConfigWithDefault('APP_UPDATE_REPO')
    },
    updateInterval: getEnvConfigWithDefault('APP_UPDATE_INTERVAL'),
    logger: require('electron-log')
  })
}

//only allow one instance of the app and focus main window if already running
const appMainInstanceLock = app.requestSingleInstanceLock()
if (!appMainInstanceLock) {
  app.quit()
  process.exit(0)
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  if (process.platform === 'win32') {
    // Set application name for Windows 10+ notifications
    electronApp.setAppUserModelId(getConfig('productName'))
    // app.setAppUserModelId(getConfig('productName'))
  }

  nativeTheme.on('updated', () => {
    const nativeThemeConfig = getNativeThemeConfig()
    //get titlebar optons based on system config
    const titleBarOverlay = getTitleBarOverlayOptions(WINDOW_TITLE_BAR_OVERLAY_HEIGHT)

    console.log('theme updated ', titleBarOverlay)

    const windows = BrowserWindow.getAllWindows()
    windows.forEach((window) => {
      window.webContents.send('theme-changed', nativeThemeConfig)
      window.setTitleBarOverlay(titleBarOverlay)
      console.log('window updated', window.title)
    })
  })

  //gpu-process-crashed
  app.on('child-process-gone', (event, details) => {
    console.log('child-process-gone')
  })

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
    setWindowIcon()
  })

  // set default window state
  mainWindowState = ElectronWindowState({
    defaultHeight: +getConfig('appHeight'),
    defaultWidth: getConfig('appWidth')
  })

  // create the app window
  mainWindow = createMainWindow(mainWindowState)

  addIpcEvents(mainWindow)
  handleDarkmode()

  createSplashWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    const allWindows = BrowserWindow.getAllWindows()
    if (allWindows.length === 0) {
      mainWindow = createMainWindow(mainWindowState)
    } else {
      //focus first window
      allWindows[0].focus()
    }
  })

  mainWindow.on('close', function (e) {
    //exit without prompt
    if (!mainWindowCloseNoPrompt) {
      logger.log('mainWindow.on close')
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: [i18n.t('prompt.quit'), i18n.t('prompt.no'), i18n.t('prompt.minimize')],
        title: i18n.t('prompt.confirm'),
        message: i18n.t('prompt.msg'),
        defaultId: 1,
        cancelId: 1
      })
      //quit
      if (choice === 0) {
        mainWindowClosing = true
        // if some service have not stopped, do not quit
        mainWindow.hide()
        createExitWindow()
        // loadResource(mainWindow, staticAsset('loader/exiting.html'), '')
        e.preventDefault()
      } else if (choice === 1) {
        e.preventDefault()
        mainWindowClosing = false

        //Dialog will be closed by clicking "X" button.
      } else {
        e.preventDefault()
        mainWindowClosing = false
        mainWindow.hide()
      }
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (browserViewManager) {
      browserViewManager.destroyAllBrowserView()
    }
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

// ipcMain.on('open-notice', () => {
//   const child = new BrowserWindow({ parent: mainWindow, modal: true, show: true })
//   child.loadURL('http://localhost:3000/')
// })

// ipcMain.on('open-notice-dialog', () => {
//   const child = new BrowserWindow({ parent: mainWindow, modal: true })
//   child.loadURL('https://www.google.com')
//   dialog.showOpenDialog(child)
// })

ipcMain.on('lang-change', (e, lang) => {
  logger.log('ipc lang-change', lang)
  i18n.changeLanguage(lang)
  mainWindow.setTitle(i18n.t('app.title'))
})

ipcMain.on('menu-click', (e, action) => {
  logger.log('ipc menu-click', action)
  if (action === 'min') {
    mainWindow.minimize()
  } else if (action === 'max') {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
  } else if (action === 'close') {
    mainWindow.close()
  }
})

// ipcMain.handle('addTab', (e) => {
//   // mainWindow.setTopBrowserView(mainWindow.getBrowserViews()[1]);
//   setupView('https://github.com');
//   mainWindow.setTopBrowserView(mainWindow.getBrowserViews().length);
// });

// new window example arg: new windows url
// ipcMain.handle("open-win", (event, arg) => {
//   logger.log("ipc open-win")
//   const childWindow = new BrowserWindow({
//     ...defaultChildWindowOptions,
//     webPreferences: {
//       preload: SCRIPT_PRELOAD,
//     },
//   })

//   loadResource(childWindow, "../index.html", arg)
// })


function addIpcEvents(window: BrowserWindow): void {
  const ipcImplementation: AppIPC = {
    isAuthenticated() {
      logger.log('ipc isAuthenticated')
      return true
    },
    minimize() {
      logger.log('ipc minimize')
      window?.minimize()
    },
    maximize() {
      logger.log('ipc maximize')
      window?.maximize()
    },
    unmaximize() {
      logger.log('ipc unmaximize')
      window?.unmaximize()
    },
    close() {
      logger.log('ipc close')
      window?.close()
    },
    isMaximized() {
      logger.log('ipc isMaximized')
      return window?.isMaximized() ?? false
    },
    isMinimized() {
      logger.log('ipc isMinimized')
      return window?.isMinimized() ?? false
    },
    isNormal() {
      logger.log('ipc isNormal')
      return window?.isNormal() ?? false
    },
    setBadgeCount(n: number) {
      logger.log(`ipc setBadgeCount ${n}`)
      return app.setBadgeCount(n)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getServices(): any {
      logger.log(`ipc getServices`)
      // return serviceManager.getServicesSimple()
    },
    //app path
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getAppPath(): any {
      const appPath = app.getPath('exe')
      logger.log(`app.appPath: ${appPath}`)
      return appPath
    },
    //App data path
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getAppDataPath(): any {
      const appAppDataPath = app.getPath('appData') + `\\TypeRefinery`
      logger.log(`app.appLogs: ${appAppDataPath}`)
      return appAppDataPath
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getDirectory(path): any {
      shell.showItemInFolder(path) // Show the given file in a file manager. If possible, select the file.
      // shell.openPath(path)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async restartService(serviceid: string): Promise<any> {
      logger.log(`ipc restartService {serviceid}`)
      // const aservice = serviceManager.getService(serviceid)
      // if (aservice) {
      //   await aservice.stop()
      //   await aservice.start()
      // } else {
      //   logger.log(`service {serviceid} not found`)
      //   return false
      // }
      return true
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async startService(serviceid: string): Promise<any> {
      logger.log(`ipc startService {serviceid}`)
      // const aservice = serviceManager.getService(serviceid)
      // if (aservice) {
      //   await aservice.start()
      // } else {
      //   logger.log(`service {serviceid} not found`)
      //   return false
      // }
      return true
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stopService(serviceid: string): any {
      logger.log(`ipc stopService {serviceid}`)
      // const aservice = serviceManager.getService(serviceid)
      // if (aservice) {
      //   aservice.stop()
      // } else {
      //   logger.log(`service {serviceid} not found`)
      //   return false
      // }
      return true
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startAll(): any {
      logger.log(`ipc startAll`)
      const isFirstRun = isFirstInstall()
      logger.log(`first run: ${isFirstRun}`)
      // serviceManager.startAll(isFirstRun)
      // create file installed.txt
      if (isFirstRun) {
        logger.log('create first run file.')
        createFirstInstallFile()
        logger.log(`next run will be first run?: ${isFirstInstall()}`)
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stopAll(): any {
      logger.log(`ipc stopAll`)
      // serviceManager.stopAll()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getGlobalEnv(): any {
      logger.log(`ipc getGlobalEnv`)
      // return serviceManager.getGlobalEnv()
    }
  }

  Object.values(sharedAppIpc).forEach((method) => method.clean())
  Object.entries(ipcImplementation).forEach(([channel, implementation]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sharedAppIpc[channel as keyof AppIPC].implement(implementation.bind(ipcImplementation) as any)
  })
}

/* CREATE WINDOW */

function createSplashWindow(): void {
  //splash screen
  const splash = new BrowserWindow({
    width: 500,
    height: 550,
    transparent: false,
    frame: false,
    alwaysOnTop: true
  })

  splash.loadURL(staticAsset('loader/splash.html'))
  splash.center()
  setTimeout(function () {
    splash.close()
    mainWindowState.manage(mainWindow)
    mainWindow.center()
    mainWindow.show()
  }, 2000)
}

function createExitWindow(): void {
  //splash screen
  const exiting = new BrowserWindow({
    width: 500,
    height: 550,
    transparent: false,
    frame: false,
    alwaysOnTop: true
  })

  exiting.loadURL(staticAsset('loader/exiting.html'))
  exiting.center()
  setTimeout(function () {
    app.exit()
  }, 2000)
}

function createMainWindow(mainWindowState: ElectronWindowState.State): Electron.BrowserWindow {
  // Create the browser window.
  const newMainWindow = new BrowserWindow({
    ...mainWindowState,
    ...defaultMainWindowOptions
  })

  if (WINDOW_TITLE_BAR_OVERLAY) {
    newMainWindow.setTitleBarOverlay(getTitleBarOverlayOptions(WINDOW_TITLE_BAR_OVERLAY_HEIGHT))
  }
  // create instance of tabsManager
  browserViewManager = new BrowserViewManager(newMainWindow, HOME_MAX_HEIGHT)

  newMainWindow.webContents.on('did-finish-load', () => {
    newMainWindow.webContents.send('theme-changed', getNativeThemeConfig())
    console.log('did-finish-load')
    // setupView('https://electronjs.org');
    // setupViewLocal('local.html');
    if (!mainWindowClosing) {
      logger.log('mainWindow.webContents.on did-finish-load')
      // check installed.txt file exists
      const isFirstRun = isFirstInstall()
      logger.log(`first run: ${isFirstRun}`)
      logger.log(`mainWindow.webContents.on did-finish-load startAll.`)
      // create file installed.txt
      if (isFirstRun) {
        logger.log('create first run file.')
        createFirstInstallFile()
        logger.log(`next run will be first run?: ${isFirstInstall()}`)
      }
    }
  })

  newMainWindow.on('resize', () => {
    browserViewManager.resize(newMainWindow.getBounds())
    newMainWindow.getBrowserViews().forEach((view) => {
      //console.log(view.getBounds())
      // resizeView(view)
    })
  })

  newMainWindow.on('closed', () => {
    if (browserViewManager) {
      browserViewManager.destroyAllBrowserView()
    }
  })

  newMainWindow.on('ready-to-show', () => {
    //show window when its ready to show
    //newMainWindow?.show()
  })

  newMainWindow.webContents.on('render-process-gone', (event, details) => {
    console.log('webcontent crashed')
  })

  newMainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    newMainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    loadResource(newMainWindow, '../renderer/index.html', '')
    // newMainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindowMenu = createMenu(defaultMainWidowMenyTemplate, !app.isPackaged)
  mainWindowTray = createTray(
    mainWindow,
    defaultMainWindowTrayMenuTemplate,
    getConfig('productName'),
    staticAsset('assets/tray_icon.png')
  )

  //change default shortcut for open devtools
  globalShortcut.register(DEFAULT_SHORTCUT_CONSOLE, () => {
    DEVTOOLS(mainWindow)
  })
  browserViewManager.init()

  return newMainWindow
}

/* UTILS */

function setWindowIcon(): void {
  if (process.platform === 'linux') {
    mainWindow.setIcon(path.join(__dirname, 'res/applogo.png'))
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadResource(window: BrowserWindow, uri: string, arg: any): void {
  logger.log(`loadResource: ${uri}, ${arg}`)
  if (isDev) {
    const urlArgs = arg ? `#${arg}` : ''
    const url = `${VITE_DEV_SERVER_SCHEMA}://${VITE_DEV_SERVER_HOST}:${VITE_DEV_SERVER_PORT}/${urlArgs}`
    logger.log(`loadurl: ${url}`)
    window.loadURL(url)
  } else {
    logger.log(`loadfile: ${path.join(__dirname, `${uri}`)}, ${arg}`)
    window.loadFile(path.join(__dirname, `${uri}`), {
      hash: `${arg}`
    })
  }
  // window.webContents.openDevTools()
}
