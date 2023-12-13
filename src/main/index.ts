import { app, shell, BrowserWindow, globalShortcut, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { BrowserViewManager } from './BrowserViewManager'

const APP_USER_MODEID = "ai.typerefinery.app"
//height of the home bar
const HOME_MAX_HEIGHT = 36

let mainWindow: Electron.BrowserWindow
let tabsManager: BrowserViewManager

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    // frame: false, // frameless window?
    // show: false, // show when created?
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true
    }
  })

  // create instance of tabsManager
  tabsManager = new BrowserViewManager(mainWindow, HOME_MAX_HEIGHT)

  mainWindow.on('closed', () => {
    if (tabsManager) {
      tabsManager.destroyAllBrowserView()
    }
  })

  mainWindow.on('ready-to-show', () => {
    //show window when its ready to show
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/home.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId(APP_USER_MODEID)

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // create the app window
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      tabsManager.init()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    tabsManager.destroyAllBrowserView()
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on('open-notice', () => {
  const child = new BrowserWindow({ parent: mainWindow, modal: true, show: true })
  child.loadURL('http://localhost:3000/')
})

ipcMain.on('open-notice-dialog', () => {
  const child = new BrowserWindow({ parent: mainWindow, modal: true })
  child.loadURL('https://www.google.com')
  dialog.showOpenDialog(child)
})
