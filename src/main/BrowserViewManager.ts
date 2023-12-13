import { BrowserView, ipcMain, globalShortcut } from 'electron'
import { DEVTOOLS } from './Utils'

export class BrowserViewManager {

  public DEFAULT_MAX_HEIGHT = 36

  #mainWindow: Electron.BrowserWindow
  #browserViewList: {[key: string]: BrowserView} = {} // all of the browserViews
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
    this.#browserViewList = {}
  }

  public removeBrowserView(browserView: BrowserView): void {
    this.#mainWindow.removeBrowserView(browserView)
  }

  public addBrowserView(browserView: BrowserView): void {
    this.#mainWindow.addBrowserView(browserView)
  }

  private createBrowserView(arg: any): void {
    const [width, height] = this.getSize()
    if (!this.#browserViewList[`${arg.applicationKey}`]) {
      this.#browserViewList[`${arg.applicationKey}`] = new BrowserView({ webPreferences: {nodeIntegration: true} })
      this.#browserViewList[`${arg.applicationKey}`].setAutoResize({ width: true, height: true })
      this.#browserViewList[`${arg.applicationKey}`].webContents.loadURL(`${arg.applicationUrl}`)
    } else {
      if (this.#nextRemoveBrowserView) {
        this.removeBrowserView(this.#nextRemoveBrowserView)
      }
    }
    this.addBrowserView(this.#browserViewList[`${arg.applicationKey}`])
    this.#browserViewList[`${arg.applicationKey}`].setBounds({ x: 0, y: this.#homeMaxHeight, width, height: height - this.#homeMaxHeight })
    if (Object.keys(this.#browserViewList).length > 1) {
      this.#nextRemoveBrowserView = this.#browserViewList[`${arg.applicationKey}`]
    }
    this.#lastBrowserView = this.#browserViewList[`${arg.applicationKey}`]
    globalShortcut.register('CmdOrCtrl+Alt+V', () => {
      DEVTOOLS(this.#mainWindow)
    })
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
