/* eslint-disable @typescript-eslint/no-explicit-any */
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  systemPreferences,
  type BrowserWindowConstructorOptions,
  nativeTheme
} from 'electron'
import path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.ico?asset'
import {
  BrowserViewLayout,
  BrowserViewManager,
  BrowserViewDeck,
  KeyValuePair
} from './BrowserViewManager'
import { MenuItemConstructorOptions, MenuItem } from 'electron/main'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { type AppIPC, sharedAppIpc, IPCMethod } from '../preload/ipc'
import { getConfig, getEnvConfigWithDefault, tryParseInt } from './Utils'
import {
  DEVTOOLS,
  WINDOW_TITLE_BAR_OVERLAY,
  WINDOW_TITLE_BAR_OVERLAY_HEIGHT_PIXELS,
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
const DEFAULT_SHORTCUT_CONSOLE = 'CmdOrCtrl+Alt+I'
const DEFAULT_SHORTCUT_FOCUS = 'Alt+f'
const DEFAULT_SHORTCUT_FOCUS_LEFT = 'Alt+l'
const DEFAULT_SHORTCUT_FOCUS_RIGHT = 'Alt+r'
const DEFAULT_SHORTCUT_SETTING = 'Alt+b'

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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let mainLayoutConfig: BrowserViewLayout

const MAIN_LOGFILE_NAME = 'main.log'
const MAIN_DEFAULT_ICON = 'assets/logo.png'
const WINDOW_CHILD_DEFAULT_ICON = 'assets/logo.png'
const MAIN_WINDOW_FILE = '../renderer/index.html'
const SCRIPT_PRELOAD = path.join(__dirname, '../preload/index.js')
const SCRIPT_PRELOAD_TRUSTED = path.join(__dirname, '../preload/trusted.js')
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
    preload: SCRIPT_PRELOAD_TRUSTED,
    sandbox: false,
    nodeIntegration: true,
    contextIsolation: true,
    spellcheck: true,
    devTools: true
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const defaultChildWindowOptions: BrowserWindowConstructorOptions = {
  minWidth: 680,
  minHeight: 400,
  icon: path.join(__dirname, WINDOW_CHILD_DEFAULT_ICON),
  autoHideMenuBar: true
}

//support .env file
dotenv.config()

// Setup logging to file after crash reporter.
Object.assign(console, log.functions)
log.transports.file.resolvePathFn = (): string => path.join(logsDir, MAIN_LOGFILE_NAME)
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
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

  //gpu-process-crashed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.on('child-process-gone', (_event, _details) => {
    console.log('child-process-gone')
  })

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
    setWindowIcon(MAIN_DEFAULT_ICON)
  })

  // set default window state
  mainWindowState = ElectronWindowState({
    defaultHeight: getConfig('appHeight'),
    defaultWidth: getConfig('appWidth')
  })

  // create the app window
  mainWindow = createMainWindow(mainWindowState)

  addIpcEvents(mainWindow)

  const initDecksConfig: BrowserViewDeck[] = [
    {
      layout: 'leftContent',
      name: 'leftContent',
      backgroundColor: 'lightblue',
      scrollbars: true,
      trusted: true,
      initFile: staticAsset('loader/leftContent.html')
    },
    {
      layout: 'leftTabs',
      name: 'leftTabs',
      backgroundColor: 'lightgreen',
      shortcutDevConsole: 'CmdOrCtrl+Alt+Shift+1',
      trusted: true,
      initFile: staticAsset('loader/leftTabs.html')
    },
    {
      layout: 'leftAddressBar',
      name: 'leftAddressBar',
      backgroundColor: 'lightpink',
      initFile: staticAsset('loader/leftAddressBar.html')
    },
    {
      layout: 'rightContent',
      name: 'rightContent',
      backgroundColor: 'lightyellow',
      scrollbars: true,
      initFile: staticAsset('loader/rightContent.html')
    },
    {
      layout: 'rightTabs',
      name: 'rightTabs',
      backgroundColor: 'lightpurple',
      initFile: staticAsset('loader/rightTabs.html')
    },
    {
      layout: 'rightAddressBar',
      name: 'rightAddressBar',
      backgroundColor: 'lightred',
      initFile: staticAsset('loader/rightAddressBar.html')
    },
    {
      layout: 'gutter',
      name: 'gutter',
      backgroundColor: 'lightorange',
      initFile: staticAsset('loader/gutter.html')
    },
    {
      layout: 'leftAside',
      name: 'leftAside',
      backgroundColor: 'lightbrown',
      initFile: staticAsset('loader/leftAside.html')
    },
    {
      layout: 'rightAside',
      name: 'right',
      backgroundColor: 'lightblue',
      initFile: staticAsset('loader/rightAside.html')
    },
    {
      layout: 'footer',
      name: 'footer',
      scrollbars: false,
      backgroundColor: 'lightgray',
      initFile: staticAsset('loader/footer.html')
    }
  ]

  const preloadScripts: KeyValuePair = {
    default: SCRIPT_PRELOAD,
    public: SCRIPT_PRELOAD,
    trusted: SCRIPT_PRELOAD_TRUSTED
  }

  // create instance of tabsManager
  browserViewManager = new BrowserViewManager(preloadScripts)
  // init stacks
  browserViewManager.init(mainWindow, initDecksConfig)

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

  //monitor system theme changes to theme config
  nativeTheme.on('updated', () => {
    const nativeThemeConfig = getNativeThemeConfig()
    //get titlebar optons based on system config
    const titleBarOverlay = getTitleBarOverlayOptions(WINDOW_TITLE_BAR_OVERLAY_HEIGHT_PIXELS)

    console.log('theme updated ', titleBarOverlay)

    if (browserViewManager) {
      browserViewManager.themeChanged(nativeThemeConfig)
    }

    mainWindow.setTitleBarOverlay(titleBarOverlay)

    // const windows = BrowserWindow.getAllWindows()
    // windows.forEach((window) => {
    //   window.webContents.send('theme-changed', nativeThemeConfig)
    //   window.setTitleBarOverlay(titleBarOverlay)
    //   console.log('window updated', window.title)
    // })
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

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
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

ipcMain.on('lang-change', (_e, lang) => {
  logger.log('ipc lang-change', lang)
  i18n.changeLanguage(lang)
  mainWindow.setTitle(i18n.t('app.title'))
})

ipcMain.on('menu-click', (_e, action) => {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    async restartService(_serviceid: string): Promise<any> {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    async startService(_serviceid: string): Promise<any> {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    stopService(_serviceid: string): any {
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
    },
    windowResizeCancel(): void {
      logger.log(`ipc windowResizeCancel`)
      browserViewManager.cancelResize()
    },
    windowResizeStart(name: string): void {
      logger.log(`ipc windowResizeStart ${name}`)
      browserViewManager.hideAll(name)
      // browserViewManager.resizeStart()
    },
    windowResizeEnd(name: string): void {
      logger.log(`ipc windowResizeEnd ${name}`)
      browserViewManager.showAll(name)
      // browserViewManager.resizeEnd()
    },
    windowResize(layoutConfig: BrowserViewLayout): void {
      // logger.log(`ipc main windowResize`, layoutConfig)
      mainLayoutConfig = layoutConfig
      browserViewManager.resize(layoutConfig)
    },
    windowHide(name: string): void {
      logger.log(`ipc windowHide ${name}`)
      browserViewManager.hideAll()
    },
    windowShow(name: string): void {
      logger.log(`ipc windowShow ${name}`)
      // if name is empty, show all
      if (name === '') {
        browserViewManager.showAll()
      } else {
        browserViewManager.show(name)
      }
    },
    setWindowTitle(title: string): void {
      logger.log(`ipc setWindowTitle ${title}`)
      mainWindow.setTitle(title)
      // run setWindowTitle in renderer
      mainWindow.webContents.send('setWindowTitle', title)
    },
    switchPageLeft(config: never): void {
      logger.log(`ipc switchPageLeft`, config)
    },
    switchPageRight(config: never): void {
      logger.log(`ipc switchPageRight`, config)
    },
    addTab(config: never): void {
      console.log(`ipc addTab`, config)
      logger.log(`ipc addTab`, config)
    },
    removeTab(config: never): void {
      logger.log(`ipc removeTab`, config)
    },
    changeTheme(config: never): void {
      logger.log(`ipc changeTheme`, config)
    },
    changeSettings(config: never): void {
      logger.log(`ipc changeSettings`, config)
    },
    getEnv: function (): any[] | Promise<any[]> {
      throw new Error('Function not implemented.')
    },
    topicSend: function (sourceId: string, topic: string, data: any): void {
      throw new Error('Function not implemented.')
    },
    topicListen: function (sourceId: string, topic: string, data: any): void {
      throw new Error('Function not implemented.')
    },
    windowFocus: function (): void {
      mainWindow.webContents.send('windowFocusRight')
    },
    windowFocusLeft: function (): void {
      mainWindow.webContents.send('windowFocusRight')
    },
    windowFocusRight: function (): void {
      mainWindow.webContents.send('windowFocusRight')
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
    newMainWindow.setTitleBarOverlay(getTitleBarOverlayOptions(WINDOW_TITLE_BAR_OVERLAY_HEIGHT_PIXELS))
  }

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
    //console.log('main window resieze', mainWindow.webContents['mainLayoutConfig'])
    //browserViewManager.resize(newMainWindow.getBounds())
    // newMainWindow.getBrowserViews().forEach((view) => {
    //   //console.log(view.getBounds())
    //   // resizeView(view)
    // })
  })

  // on blur
  newMainWindow.on('blur', () => {
    //console.log('main window blur')
    // browserViewManager.hideAll()
    if (browserViewManager) {
      browserViewManager.cancelResize()
    }
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
    console.log('webcontent crashed', event, details)
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
    loadResource(newMainWindow, MAIN_WINDOW_FILE, '')
  }

  mainWindowMenu = createMenu(defaultMainWidowMenyTemplate, !app.isPackaged)
  mainWindowTray = createTray(
    newMainWindow,
    defaultMainWindowTrayMenuTemplate,
    getConfig('productName'),
    staticAsset('assets/tray_icon.png')
  )

  //change default shortcut for open devtools
  globalShortcut.register(DEFAULT_SHORTCUT_CONSOLE, () => {
    DEVTOOLS(mainWindow)
  })

  // add shortcut to focus on main window
  globalShortcut.register(DEFAULT_SHORTCUT_FOCUS, () => {
    logger.log('windowFocus')
    if (mainWindow) {
      logger.log('send windowFocus')
      mainWindow.webContents.send('windowFocus')
    }
  })

  // add shortcut to focus on left window
  globalShortcut.register(DEFAULT_SHORTCUT_FOCUS_LEFT, () => {
    logger.log('windowFocusLeft')
    if (mainWindow) {
      mainWindow.webContents.send('windowFocusLeft')
    }
  })

  // add shortcut to focus on right window
  globalShortcut.register(DEFAULT_SHORTCUT_FOCUS_RIGHT, () => {
    logger.log('windowFocusRight')
    if (mainWindow) {
      mainWindow.webContents.send('windowFocusRight')
    }
  })

  return newMainWindow
}

/* UTILS */

function setWindowIcon(assetPath: string): void {
  if (process.platform === 'linux') {
    const iconPath: string = path.join(__dirname, assetPath)
    mainWindow.setIcon(iconPath)
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
