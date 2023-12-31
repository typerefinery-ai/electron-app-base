import {
  BrowserView,
  BrowserWindow,
  Menu,
  MenuItem,
  MenuItemConstructorOptions,
  Tray,
  app,
  ipcMain,
  nativeTheme
} from 'electron'

//open devtools in a window
export function DEVTOOLS(win: BrowserView | BrowserWindow): void {
  const isOpen = win.webContents.isDevToolsOpened()
  if (isOpen) {
    win.webContents.closeDevTools()
  } else {
    win.webContents.openDevTools()
  }
}

export function createTray(
  mainWindow: BrowserWindow,
  menuTemplate: Array<MenuItemConstructorOptions | MenuItem>,
  title: string,
  trayIconPath: string
): Tray {
  //tray
  const mainWindowTray = new Tray(trayIconPath)

  mainWindowTray.setToolTip(title)
  mainWindowTray.setTitle(title)

  const mainWindowTrayMenu = Menu.buildFromTemplate(menuTemplate)
  mainWindowTray.setContextMenu(mainWindowTrayMenu)

  mainWindowTray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
  })

  return mainWindowTray
}

export function createMenu(
  menuTemplate: Array<MenuItemConstructorOptions | MenuItem>,
  removeDebug: boolean = true
): Menu {
  if (removeDebug) {
    if (menuTemplate.find((item) => item.label === 'Debug')) {
      menuTemplate.unshift({
        label: 'Debug',
        submenu: [{ role: 'forceReload' }]
      })
    }
  }
  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)
  return menu
}

export function handleDarkmode(): void {
  ipcMain.handle('dark-mode:toggle', () => {
    if (nativeTheme.shouldUseDarkColors) {
      nativeTheme.themeSource = 'light'
    } else {
      nativeTheme.themeSource = 'dark'
    }
    return nativeTheme.shouldUseDarkColors
  })

  ipcMain.handle('dark-mode:system', () => {
    nativeTheme.themeSource = 'system'
  })

}
