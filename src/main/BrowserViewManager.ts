// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BrowserView, ipcMain, globalShortcut, BrowserWindow } from 'electron'
import {
  DEVTOOLS,
  NativeThemeConfig,
  WINDOW_TITLE_BAR_OVERLAY_HEIGHT_PIXELS
} from './ElectronUtils'

//interface BrowserViewDecks to keep track of browserViews for a deck layout
export interface BrowserViewDecks {
  [key: string]: BrowserViewDeck
}

export interface BrowserViewLayout {
  left: BrowserViewSize
  leftContent: BrowserViewSize
  leftTabs: BrowserViewSize
  leftAddressBar: BrowserViewSize
  right: BrowserViewSize
  rightContent: BrowserViewSize
  rightTabs: BrowserViewSize
  rightAddressBar: BrowserViewSize
  gutter: BrowserViewSize
  leftAside: BrowserViewSize
  rightAside: BrowserViewSize
  footer: BrowserViewSize
}

export interface BrowserViewSize {
  width: number
  height: number
  x: number
  y: number
}

export interface OpenURL {
  url?: string
  file?: string
  focus?: boolean
  trusted?: boolean
  deckBackground?: boolean
}

export interface BrowserViewOptionsList {
  [key: string]: BrowserViewOptions
}

export interface BrowserViewOptions {
  applicationUrl?: string
  applicationKey: string
  backgroundColor?: string
  deckBackground?: boolean
  localFile?: string
  trusted?: boolean
  focus?: boolean
  deck: BrowserViewDeck
  browserView?: BrowserView
}

export interface KeyValuePair {
  [key: string]: string
}

export interface BrowserViewDeck {
  layout: string
  name: string
  size?: BrowserViewSize
  initUrl?: string
  initFile?: string
  scrollbars?: boolean
  backgroundColor?: string
  trusted?: true
  shortcutDevConsole?: string
  current?: BrowserViewOptions | null
  items?: BrowserViewOptionsList | null
}

export interface BroBrowserViewManagerwserViewDecks {
  [key: string]: BrowserViewDeck
}

export class BrowserViewManager {
  public DEFAULT_MAX_HEIGHT = 36

  #preloadScripts: KeyValuePair
  #mainWindow: Electron.BrowserWindow | null = null
  #browserViewList: { [key: string]: BrowserView } = {} // all of the browserViews
  #lastBrowserView: Electron.BrowserView | null = null
  #nextRemoveBrowserView: Electron.BrowserView | null = null
  #homeBrowserview: Electron.BrowserView | null = null
  #homeMaxHeight = 36
  #nativeThemeConfig: NativeThemeConfig | null = null

  #layoutConfig: BrowserViewLayout | null = null
  #browserViewDecks: BrowserViewDecks = {}

  #debug = false

  constructor(preloadScripts: KeyValuePair) {
    this.#preloadScripts = preloadScripts
  }
  // constructor(mainWindow: Electron.BrowserWindow, homeMaxHeight = 36) {
  //   this.#mainWindow = mainWindow
  //   this.#homeMaxHeight = homeMaxHeight
  //   this.#lastBrowserView = mainWindow.getBrowserView()
  //   this.#homeBrowserview = mainWindow.getBrowserView()
  //   this.#nextRemoveBrowserView = mainWindow.getBrowserView()
  // }

  private debug(...args): void {
    if (this.#debug) {
      console.log(...args)
    }
  }

  public getSize(): number[] {
    if (!this.#mainWindow) {
      return [0, 0]
    }
    return this.#mainWindow.getSize()
  }

  public destroyAllBrowserView(): void {
    // Object.keys(this.browserViewList).forEach((key) => {
    //   // this.browserViewList[key].destroy()
    // })
    // this.#browserViewList = {}
  }

  public removeBrowserView(browserView: BrowserView): void {
    if (!this.#mainWindow) {
      return
    }
    this.#mainWindow.removeBrowserView(browserView)
  }

  public addBrowserView(browserView: BrowserView): void {
    if (!this.#mainWindow) {
      return
    }
    this.debug('bvm addBrowserView', browserView)
    this.#mainWindow.addBrowserView(browserView)
  }

  public getWindowTitleBarHeightOffset(): number {
    return process.platform !== 'win32' ? WINDOW_TITLE_BAR_OVERLAY_HEIGHT_PIXELS : 40 //win: 60
  }

  // update sizes of decks to match layouts
  public resize(layoutConfig: BrowserViewLayout): void {
    this.debug('bvm resize', layoutConfig)
    this.#layoutConfig = layoutConfig
    //for each deck
    Object.keys(this.#browserViewDecks).forEach((key) => {
      const deck = this.#browserViewDecks[key]
      this.debug('bvm resize deck', deck.name)
      const deckLayout = layoutConfig[`${deck.layout}`]
      this.debug('bvm resize deckLayout', deckLayout)
      if (deck && deckLayout) {
        this.resizeDeck(deck, deckLayout)
      }
    })
  }

  // resize current browserView in deck
  private resizeDeck(deck: BrowserViewDeck, size: BrowserViewSize): void {
    deck.size = size
    // get current browserView in deck
    const browserViewInDeck = deck.current
    if (browserViewInDeck && browserViewInDeck.browserView) {
      this.debug('bvm resizeDeck view', browserViewInDeck.applicationKey, size)
      this.resizeView(browserViewInDeck.browserView, size)
    }
  }

  public themeChanged(nativeThemeConfig: NativeThemeConfig): void {
    this.#nativeThemeConfig = nativeThemeConfig
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('theme-changed', nativeThemeConfig)
    })
  }

  private showBrowserViewInDeck(deck: BrowserViewDeck, browserViewId: string): void {
    // if view exists in deck
    if (deck.items && deck.items[browserViewId]) {
      if (deck.current?.browserView) {
        this.hideView(deck.current?.browserView)
      }
      const browserView = deck.items[browserViewId].browserView
      if (browserView && deck.size) {
        this.resizeView(browserView, deck.size)
      }
      // update current in deck
      deck.current = deck.items[browserViewId]
    }
  }

  // hide a browser view
  private hideView(browserView: BrowserView): void {
    browserView.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  }

  // resize a browser view to a size
  private resizeView(browserView: BrowserView, size: BrowserViewSize): void {
    //get offset for title bar
    const offset = this.getWindowTitleBarHeightOffset()
    this.debug(
      'bvm resizeView before',
      size,
      offset,
      browserView.getBounds(),
      this.#mainWindow ? this.#mainWindow.getBounds() : null
    )
    try {
      browserView.setBounds({
        x: Number(size.x.toFixed(0)),
        y: Number(size.y.toFixed(0)),
        width: Number(size.width.toFixed(0)),
        height: Number(size.height.toFixed(0))
      })
    } catch (error) {
      this.debug('bvm resizeView error', error)
    }
    this.debug('bvm resizeView after', browserView.getBounds())
  }

  //create new browserView and add to deck
  private createBrowserViewInDeck(viewConfig: BrowserViewOptions): BrowserViewOptions {
    const deck = viewConfig.deck

    if (!deck) {
      this.debug('bvm createBrowserViewInDeck no deck')
      return viewConfig
    }

    const size: BrowserViewSize = viewConfig.deck.size || { width: 0, height: 0, x: 0, y: 0 }
    const browserViewOptions = {
      webPreferences: {
        scrollbars: viewConfig.deck.scrollbars || false,
        preload: viewConfig.trusted
          ? this.#preloadScripts['trusted']
          : this.#preloadScripts['public'],
        sandbox: viewConfig.trusted ? false : true,
        nodeIntegration: viewConfig.trusted ? true : false,
        contextIsolation: true,
        spellcheck: true,
        devTools: true
      }
    }
    const viewId = `${viewConfig.applicationKey}`
    //check if browserView already exists in deck
    // let browserView = this.#browserViewList[`${viewConfig.applicationKey}`]
    let browserViewInDeck = deck.items ? deck.items[viewId] : null
    if (!browserViewInDeck) {
      //init items if needed
      deck.items = deck.items || {}

      this.debug(
        'bvm createBrowserViewInDeck deck.items',
        deck.name,
        Object.keys(deck.items).length
      )
      //copy viewConfig to deck and add browserView
      deck.items[viewId] = {
        ...viewConfig,
        browserView: new BrowserView(browserViewOptions)
      }
      if (deck.backgroundColor) {
        deck.items[viewId].browserView?.setBackgroundColor(deck.backgroundColor)
      }
      // if (this.#browserViewDecks[deck.name].items) {
      //   this.#browserViewDecks[deck.name].items[viewId] = {
      //     ...viewConfig,
      //     browserView: new BrowserView(browserViewOptions)
      //   }
      // }
      this.debug(
        'bvm createBrowserViewInDeck deck.items',
        deck.name,
        Object.keys(deck.items).length,
        deck.items[viewId].browserView?.getBounds()
      )

      // get the browserView from the deck
      browserViewInDeck = deck.items[viewId]
      if (browserViewInDeck.browserView) {
        // for full screen resizing
        // browserView.setAutoResize({ width: true, height: true })
        if (viewConfig.localFile) {
          browserViewInDeck.browserView.webContents.loadFile(viewConfig.localFile)
        } else {
          browserViewInDeck.browserView.webContents.loadURL(`${viewConfig.applicationUrl}`)
        }
        if (viewConfig.backgroundColor) {
          browserViewInDeck.browserView.setBackgroundColor(viewConfig.backgroundColor)
        }
      }
    } else {
      if (this.#nextRemoveBrowserView) {
        this.removeBrowserView(this.#nextRemoveBrowserView)
      }
    }
    //update current browserView in deck
    deck.current = browserViewInDeck

    if (browserViewInDeck.browserView) {
      this.addBrowserView(browserViewInDeck.browserView)
      this.resizeView(browserViewInDeck.browserView, {
        x: size.x,
        y: size.y,
        width: size.width,
        height: size.height
      })
      if (Object.keys(this.#browserViewList).length > 1) {
        this.#nextRemoveBrowserView = browserViewInDeck.browserView //this.#browserViewList[`${viewConfig.applicationKey}`]
      }
      this.#lastBrowserView = browserViewInDeck.browserView //this.#browserViewList[`${viewConfig.applicationKey}`]
    }
    return browserViewInDeck
  }

  public openUrlInDeck(deckName: string, openurl: OpenURL): void {
    if (openurl.url === '' && openurl.file === '') {
      return
    }
    const deck = this.#browserViewDecks[`${deckName}`]
    if (!deck) {
      return
    }
    const countId = deck.items?.length || 0
    this.createBrowserViewInDeck({
      applicationUrl: openurl.url,
      applicationKey: `${deckName}-${countId}`,
      focus: openurl.focus,
      localFile: openurl.file,
      deckBackground: openurl.deckBackground,
      trusted: openurl.trusted,
      deck: deck
    })
  }

  // create a deck to keep track of the browserViews
  public addDeck(deck: BrowserViewDeck): void {
    //do not add if already exists
    if (this.#browserViewDecks[`${deck.layout}`]) {
      return
    }

    let initSize: BrowserViewSize = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    }
    if (this.#layoutConfig && this.#layoutConfig[`${deck.layout}`]) {
      initSize = this.#layoutConfig[`${deck.layout}`]
    }

    this.#browserViewDecks[`${deck.name}`] = {
      ...deck,
      size: initSize
    }

    if (deck.initUrl || deck.initFile) {
      this.openUrlInDeck(deck.name, {
        url: deck.initUrl,
        file: deck.initFile,
        trusted: deck.trusted,
        deckBackground: true
      })
    }

    //register console for deck
    if (deck.shortcutDevConsole) {
      globalShortcut.register(deck.shortcutDevConsole, () => {
        return this.openDevConsoleForDeck(deck.name)
      })
    }
  }

  private openDevConsoleForDeck(deckName: string): void {
    return DEVTOOLS(this.#browserViewDecks[`${deckName}`].current?.browserView)
  }

  public init(mainWindow: BrowserWindow, initDeck: BrowserViewDeck[]): void {
    this.debug('bvm init')
    this.#mainWindow = mainWindow

    // create stacks
    initDeck.forEach((deck) => {
      this.addDeck({
        ...deck,
        current: null,
        items: {}
      })
    })

    // this.onCreateBrowserView()
    // this.onChangeTabBrowserView()
    // this.onHomeBrowserView()
    // this.onCloseBrowserView()
  }

  // private onCreateBrowserView(): void {
  //   ipcMain.on('create-browser-view', (_, arg) => {
  //     this.createBrowserViewInDeck(arg)
  //   })
  // }
  // private onChangeTabBrowserView(): void {
  //   ipcMain.on('changetab-browser-view', (_, arg) => {
  //     this.createBrowserViewInDeck(arg)
  //   })
  // }
  // private onHomeBrowserView(): void {
  //   ipcMain.on('home-browser-view', () => {
  //     if (this.#lastBrowserView) {
  //       this.removeBrowserView(this.#lastBrowserView)
  //     }
  //   })
  // }
  // private onCloseBrowserView(): void {
  //   ipcMain.on('close-browser-view', (_, arg) => {
  //     if (this.#browserViewList[`${arg.applicationKey}`]) {
  //       this.removeBrowserView(this.#browserViewList[`${arg.applicationKey}`])
  //       // this.browserViewList[`${arg.applicationKey}`].destroy()
  //       delete this.#browserViewList[`${arg.applicationKey}`]
  //     }
  //   })
  // }
}
