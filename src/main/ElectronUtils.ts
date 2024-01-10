import {
  BrowserView,
  BrowserWindow,
  Menu,
  MenuItem,
  MenuItemConstructorOptions,
  TitleBarOverlayOptions,
  Tray,
  app,
  ipcMain,
  nativeTheme,
  systemPreferences
} from 'electron'

export const WINDOW_TITLE_BAR_OVERLAY_COLOR = '#e8e8e8'
export const WINDOW_TITLE_BAR_OVERLAY_COLOR_DARK = '#202020'
export const WINDOW_TITLE_BAR_OVERLAY_SYMBOL_COLOR = '#ffffff'
export const WINDOW_TITLE_BAR_OVERLAY_SYMBOL_COLOR_DARK = '#1a1a1a'
export const WINDOW_COLOR = '#f9f9f9'
export const WINDOW_COLOR_DARK = '#3b3b3b'
export const WINDOW_TITLE_BAR_OVERLAY_HEIGHT_PIXELS = 35
export const WINDOW_TITLE_BAR_OVERLAY = true
export const COLOR_LIGHT = '#ffffff'
export const COLOR_DARK = '#000000'

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

export interface DarkModeIPC {
  toggle: () => Promise<boolean>
  system: () => Promise<void>
  light: () => Promise<void>
  dark: () => Promise<void>
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
  ipcMain.handle('dark-mode:light', () => {
    nativeTheme.themeSource = 'light'
  })
  ipcMain.handle('dark-mode:dark', () => {
    nativeTheme.themeSource = 'dark'
  })
}

export interface NativeThemeConfig {
  shouldUseDarkColors: boolean
  windowAccentColor: string
  windowTitleBarColor: string
  windowTitleBarColorLight: string
  windowTitleBarColorDark: string
  windowTitleBarTextColor: string
  windowColor: string
  windowBackgroundColor: string
  windowTitleBarHeight: string
}

export function getNativeThemeConfig(): NativeThemeConfig {
  // console.log('> getAccentColor', systemPreferences.getAccentColor())
  // console.log('> getAccentColor', systemPreferences.getAccentColor().substring(0, 6))
  // console.log('desktop ', systemPreferences.getColor('desktop'))
  // console.log('window-frame', systemPreferences.getColor('window-frame'))
  // console.log('window-text', systemPreferences.getColor('window-text'))
  // console.log('window', systemPreferences.getColor('window'))
  // console.log('app-workspace', systemPreferences.getColor('app-workspace'))
  // console.log('menubar', systemPreferences.getColor('menubar'))
  // console.log('menu-highlight', systemPreferences.getColor('menu-highlight'))
  // console.log('3d-face', systemPreferences.getColor('3d-face'))
  // console.log('active-border', systemPreferences.getColor('active-border'))
  // console.log('active-caption', systemPreferences.getColor('active-caption'))
  // console.log('active-caption-gradient', systemPreferences.getColor('active-caption-gradient'))

  const accentColor = '#' + systemPreferences.getAccentColor().substring(0, 6)

  const nativeThemeConfig: NativeThemeConfig = {
    shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    windowAccentColor: accentColor,
    windowTitleBarTextColor: accentColor,
    windowTitleBarColor: chooseColor(
      WINDOW_TITLE_BAR_OVERLAY_COLOR,
      WINDOW_TITLE_BAR_OVERLAY_COLOR_DARK
    ),
    windowTitleBarColorLight: WINDOW_TITLE_BAR_OVERLAY_COLOR,
    windowTitleBarColorDark: WINDOW_TITLE_BAR_OVERLAY_COLOR_DARK,
    windowColor:
      systemPreferences.getColor('window-text') || systemPreferences.getColor('window-frame-text'),
    windowBackgroundColor: getDefaultColor(
      systemPreferences.getColor('window') || systemPreferences.getColor('window-background'),
      WINDOW_COLOR,
      WINDOW_COLOR_DARK
    ),
    windowTitleBarHeight: WINDOW_TITLE_BAR_OVERLAY_HEIGHT_PIXELS + 'px'
  }

  return nativeThemeConfig
}

export function chooseColor(light: string, dark: string): string {
  if (nativeTheme.shouldUseDarkColors) {
    return dark
  } else {
    return light
  }
}

export function getDefaultColor(color: string, light: string, dark: string): string {
  if (color == COLOR_DARK || nativeTheme.shouldUseDarkColors) {
    return dark
  } else if (color.toLowerCase() == COLOR_LIGHT) {
    return light
  }
  return color
}

export function getTitleBarOverlayOptions(height: number): TitleBarOverlayOptions {
  //get system config
  const themeSettings = getNativeThemeConfig()
  console.log('> getTitleBarOverlayOptions', themeSettings)

  return {
    color: themeSettings.windowTitleBarColor,
    symbolColor: themeSettings.windowAccentColor,
    height: height
  }
}
