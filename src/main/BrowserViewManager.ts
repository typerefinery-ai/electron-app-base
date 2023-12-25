import { BrowserView, ipcMain, globalShortcut } from 'electron'
import path from 'path'

export interface BrowserViewSize {
  width: number
  height: number
  x: number
  y: number
}

export interface BrowserViewOptions {
  applicationUrl: string
  applicationKey: string
  backgroundColor?: string
  localFile?: string
  trusted?: boolean
}

export class BrowserViewManager {
  public DEFAULT_MAX_HEIGHT = 36

  #mainWindow: Electron.BrowserWindow
  #browserViewList: { [key: string]: BrowserView } = {} // all of the browserViews
  #lastBrowserView: Electron.BrowserView | null
  #nextRemoveBrowserView: Electron.BrowserView | null
  #homeBrowserview: Electron.BrowserView | null
  #homeMaxHeight = 36

  constructor(mainWindow: Electron.BrowserWindow, homeMaxHeight = 36) {
    this.#mainWindow = mainWindow
    this.#homeMaxHeight = homeMaxHeight
    this.#lastBrowserView = mainWindow.getBrowserView()
    this.#homeBrowserview = mainWindow.getBrowserView()
    this.#nextRemoveBrowserView = mainWindow.getBrowserView()
  }

  public getSize(): number[] {
    return this.#mainWindow.getSize()
  }

  public destroyAllBrowserView(): void {
    // Object.keys(this.browserViewList).forEach((key) => {
    //   // this.browserViewList[key].destroy()
    // })
    // this.#browserViewList = {}
  }

  public removeBrowserView(browserView: BrowserView): void {
    this.#mainWindow.removeBrowserView(browserView)
  }

  public addBrowserView(browserView: BrowserView): void {
    this.#mainWindow.addBrowserView(browserView)
  }

  public getWindowTitleBarHeightOffset(): number {
    return process.platform !== 'win32' ? 60 : 40
  }

  public resize(bounds: Electron.Rectangle): void {
    // console.log(
    //   'resize: width: ' +
    //     bounds.width +
    //     ' height: ' +
    //     bounds.height +
    //     ' x: ' +
    //     bounds.x +
    //     ' y: ' +
    //     bounds.y
    // )
  }

  public resizeView(browserView: BrowserView, size: BrowserViewSize): void {
    browserView.setBounds({ x: size.x, y: size.y, width: size.width, height: size.height })
  }

  private createBrowserView(arg: BrowserViewOptions): void {
    const [width, height] = this.getSize()
    const browserViewOptions = {
      webPreferences: {
        scrollbars: true,
        preload: arg.trusted ? path.join(__dirname, '../preload/trusted.js') : '',
        sandbox: arg.trusted ? false : true,
        nodeIntegration: arg.trusted ? true : false
      }
    }

    let browserView = this.#browserViewList[`${arg.applicationKey}`]
    if (!browserView) {
      this.#browserViewList[`${arg.applicationKey}`] = new BrowserView(browserViewOptions)
      browserView = this.#browserViewList[`${arg.applicationKey}`]
      browserView.setAutoResize({ width: true, height: true })
      if (arg.localFile) {
        browserView.webContents.loadFile(arg.localFile)
      } else {
        browserView.webContents.loadURL(`${arg.applicationUrl}`)
      }
      if (arg.backgroundColor) {
        browserView.setBackgroundColor(arg.backgroundColor)
      }
    } else {
      if (this.#nextRemoveBrowserView) {
        this.removeBrowserView(this.#nextRemoveBrowserView)
      }
    }
    this.addBrowserView(browserView)
    this.resizeView(browserView, {
      x: 0,
      y: this.#homeMaxHeight,
      width,
      height: height - this.#homeMaxHeight
    })
    if (Object.keys(this.#browserViewList).length > 1) {
      this.#nextRemoveBrowserView = this.#browserViewList[`${arg.applicationKey}`]
    }
    this.#lastBrowserView = this.#browserViewList[`${arg.applicationKey}`]
  }

  public init(): void {
    this.onCreateBrowserView()
    this.onChangeTabBrowserView()
    this.onHomeBrowserView()
    this.onCloseBrowserView()
  }

  private onCreateBrowserView(): void {
    ipcMain.on('create-browser-view', (_, arg) => {
      this.createBrowserView(arg)
    })
  }
  private onChangeTabBrowserView(): void {
    ipcMain.on('changetab-browser-view', (_, arg) => {
      this.createBrowserView(arg)
    })
  }
  private onHomeBrowserView(): void {
    ipcMain.on('home-browser-view', () => {
      if (this.#lastBrowserView) {
        this.removeBrowserView(this.#lastBrowserView)
      }
    })
  }
  private onCloseBrowserView(): void {
    ipcMain.on('close-browser-view', (_, arg) => {
      if (this.#browserViewList[`${arg.applicationKey}`]) {
        this.removeBrowserView(this.#browserViewList[`${arg.applicationKey}`])
        // this.browserViewList[`${arg.applicationKey}`].destroy()
        delete this.#browserViewList[`${arg.applicationKey}`]
      }
    })
  }
}
