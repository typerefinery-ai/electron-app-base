import Split from 'split-grid'
import $ from 'jquery'
import { SplitUtils } from './splitutils'
import { AppIPC } from '../../preload/ipc'

const ipc = (window as unknown as { ipc: AppIPC }).ipc
const splitUtils = new SplitUtils($)

export function init(): void {

  //listen for window resize
  window.addEventListener('resize', () => {
    console.log('window resize')
    resizeUpdate(ipc, splitUtils)
  })
  //listen when window dom is loaded
  window.addEventListener('DOMContentLoaded', () => {
    ready(window.document)
  })
  //listen when window has lost focus
  window.addEventListener('blur', () => {
    console.log('window blur')
    cancelResize(ipc, splitUtils)
  })

  window['setWindowTitle'] = setWindowTitle
  window['windowFocus'] = windowFocus
  window['windowFocusLeft'] = windowFocusLeft
  window['windowFocusRight'] = windowFocusRight

  //listen for ipc calls from main process
  window.electron.ipcRenderer.on('windowFocus', () => {
    console.log('ipc windowFocus')
    windowFocus()
  })

  //listen for ipc calls from main process
  window.electron.ipcRenderer.on('windowFocusLeft', () => {
    console.log('ipc windowFocusLeft')
    windowFocusLeft()
  })

  //listen for ipc calls from main process
  window.electron.ipcRenderer.on('windowFocusRight', () => {
    console.log('ipc windowFocusRight')
    windowFocusRight()
  })

}

function cancelResize(ipc: AppIPC, splitUtils: SplitUtils): void {
  if (ipc && ipc.windowResizeCancel) {
    const layout = splitUtils.getLayout()
    // console.log('ipc.windowResize', layout)
    window['mainLayoutConfig'] = layout
    ipc.windowResizeCancel(layout)
  }

  // for each property in object splitUtils.gridMain.columnGutters
  Object.keys(splitUtils.gridMain.columnGutters).forEach((key) => {
    // if dragging is still happening, stop it
    if (splitUtils.gridMain.columnGutters[key].dragging) {
      console.log(key, splitUtils.gridMain.columnGutters[key])
      splitUtils.gridMain.columnGutters[key].stopDragging()
    }
  })

  // for each property in object splitUtils.gridHorizontal.rowGutters
  Object.keys(splitUtils.gridHorizontal.rowGutters).forEach((key) => {
    // if dragging is still happening, stop it
    if (splitUtils.gridHorizontal.rowGutters[key].dragging) {
      console.log(key, splitUtils.gridHorizontal.rowGutters[key])
      splitUtils.gridHorizontal.rowGutters[key].stopDragging()
    }
  })

  // for each property in object splitUtils.gridVertical.columnGutters
  Object.keys(splitUtils.gridVertical.columnGutters).forEach((key) => {
    // if dragging is still happening, stop it
    if (splitUtils.gridVertical.columnGutters[key].dragging) {
      console.log(key, splitUtils.gridVertical.columnGutters[key])
      splitUtils.gridVertical.columnGutters[key].stopDragging()
    }
  })

}

function resizeUpdate(ipc: AppIPC, splitUtils: SplitUtils): void {
  if (ipc && ipc.windowResize) {
    const layout = splitUtils.getLayout()
    // console.log('ipc.windowResize', layout)
    window['mainLayoutConfig'] = layout
    ipc.windowResize(layout)
  }
}

function toggleRightAside(force: boolean): void {
  if (splitUtils.isRightAsideSplitFocus || force) {
    // splitUtils.setMainRightAsideFocus(true)
    //resetHorizontalSize()
    if (splitUtils.isLeftAsideSplitFocus) {
      splitUtils.resetMainSize(splitUtils.DEFAULT_GRID_MAIN_HIDE_LEFT_SIZE)
    } else {
      splitUtils.resetMainSize()
    }
  } else {
    // splitUtils.setMainRightAsideFocus()
    if (splitUtils.isLeftAsideSplitFocus) {
      splitUtils.resetMainSize(splitUtils.DEFAULT_GRID_MAIN_HIDE_SIZE)
    } else {
      splitUtils.resetMainSize(splitUtils.DEFAULT_GRID_MAIN_HIDE_RIGHT_SIZE)
    }
  }
}

function toggleLeftAside(force: boolean): void {
  if (splitUtils.isLeftAsideSplitFocus || force) {
    // splitUtils.setMainLeftAsideFocus(true)
    //resetHorizontalSize()
    if (splitUtils.isRightAsideSplitFocus) {
      splitUtils.resetMainSize(splitUtils.DEFAULT_GRID_MAIN_HIDE_RIGHT_SIZE)
    } else {
      splitUtils.resetMainSize()
    }
  } else {
    // splitUtils.setMainLeftAsideFocus()
    if (splitUtils.isRightAsideSplitFocus) {
      splitUtils.resetMainSize(splitUtils.DEFAULT_GRID_MAIN_HIDE_SIZE)
    } else {
      splitUtils.resetMainSize(splitUtils.DEFAULT_GRID_MAIN_HIDE_LEFT_SIZE)
    }
  }
}

function toggleGutter(force: boolean): void {
  if (splitUtils.isGutterSplitFocus && !force) {
    // splitUtils.setHorizontalFocus(true)
    splitUtils.resetHorizontalSize()
  } else {
    // splitUtils.setHorizontalFocus()
    splitUtils.resetHorizontalSize(splitUtils.DEFAULT_GRID_HORIZONTAL_HIDE_SIZE)
  }
}

function toggleContent(shiftKey: boolean, force: boolean = false): void {
  console.log(`toggleContent ${shiftKey} ${splitUtils.isContentSplitFocus}`)
  if (splitUtils.isContentSplitFocus && !force) {
    console.log('toggleContent reset')
    // splitUtils.setVerticalFocus(true)
    splitUtils.resetVerticalSize()
  } else {
    console.log('toggleContent hide')
    // splitUtils.setVerticalFocus()
    if (shiftKey) {
      //hide left
      splitUtils.resetVerticalSize(splitUtils.DEFAULT_GRID_VERTICAL_HIDE_LEFT_SIZE)
    } else {
      //hide right
      splitUtils.resetVerticalSize(splitUtils.DEFAULT_GRID_VERTICAL_HIDE_RIGHT_SIZE)
    }
  }
}

function ready(document): void {
  console.log('loading home.ts')

  //window content column split, left aise and right aside column
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  splitUtils.gridMain = Split({
    minSize: 0,
    snapOffset: 40,
    columnGutters: [
      {
        track: 1,
        element: splitUtils.LeftAsideSplitEl
      },
      {
        track: 3,
        element: splitUtils.RightAsideSplitEl
      }
    ],
    onDrag: function (direction, track, gridTemplateStyle) {
      let doEvent = true
      const id = `${direction}${track}`
      console.log(`onDrag gridMain "${id}" "${direction}" "${track}", "${gridTemplateStyle}"`)

      //if splitUtils.gridMainPreviousTemplate is an object and has a property name id get its value
      if (!splitUtils.gridMainPreviousTemplate) {
        splitUtils.gridMainPreviousTemplate = {}
      }

      const previousTemplate = splitUtils.gridMainPreviousTemplate[id]

      if (!previousTemplate) {
        splitUtils.gridMainPreviousTemplate[id] = gridTemplateStyle
        doEvent = false
      } else if (previousTemplate !== gridTemplateStyle) {
        console.log(`onDrag gridMain changed ${splitUtils.gridMainPreviousTemplate[id]}`)
        splitUtils.gridMainPreviousTemplate[id] = gridTemplateStyle
        doEvent = false
      }
      if (doEvent) {
        console.log(`onDragStart gridMain "${direction}" "${track}"`)
        if (ipc && ipc.windowResizeStart) {
          ipc.windowResizeStart('gridMain')
        }
      }
    },
    onDragStart: function (direction, track) {
      console.log('onDragStart gridMain', direction, track)
      // if (ipc && ipc.windowResizeStart) {
      //   ipc.windowResizeStart('gridMain')
      // }
    },
    onDragEnd: function (direction, track) {
      console.log('onDragEnd gridMain', direction, track)
      resizeUpdate(ipc, splitUtils)
    }
  })

  //set initial split size
  splitUtils.resetMainSize()

  //window content row split, content and gutter
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  splitUtils.gridHorizontal = Split({
    minSize: 0,
    snapOffset: 40,
    rowGutters: [
      {
        track: 1,
        element: splitUtils.GutterSplitEl
      }
    ],
    onDrag: function (direction, track, gridTemplateStyle) {
      let doEvent = true
      const id = `${direction}${track}`
      console.log(`onDrag gridHorizontal "${id}" "${direction}" "${track}", "${gridTemplateStyle}"`)
      if (
        !splitUtils.gridHorizontalPreviousTemplate ||
        !splitUtils.gridHorizontalPreviousTemplate[id]
      ) {
        splitUtils.gridHorizontalPreviousTemplate[id] = gridTemplateStyle
        doEvent = false
      } else if (splitUtils.gridHorizontalPreviousTemplate[id] !== gridTemplateStyle) {
        console.log('onDrag gridHorizontal changed')
        splitUtils.gridHorizontalPreviousTemplate[id] = gridTemplateStyle
        doEvent = false
      }
      if (doEvent) {
        console.log(`onDragStart gridHorizontal "${direction}" "${track}"`)
        if (ipc && ipc.windowResizeStart) {
          ipc.windowResizeStart('gridHorizontal')
        }
      }
    },
    onDragStart: function (direction, track) {
      console.log('onDragStart gridHorizontal', direction, track)
      // if (ipc && ipc.windowResizeStart) {
      //   ipc.windowResizeStart('gridHorizontal')
      // }
    },
    onDragEnd: function (direction, track) {
      console.log('onDragEnd gridHorizontal', direction, track)
      resizeUpdate(ipc, splitUtils)
    }
  })

  splitUtils.resetHorizontalSize()

  //window content row split, left and right
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  splitUtils.gridVertical = Split({
    minSize: 0,
    snapOffset: 50,
    columnGutters: [
      {
        track: 1,
        element: splitUtils.ContentSplitEl
      }
    ],
    onDrag: function (direction, track, gridTemplateStyle) {
      let doEvent = true
      const id = `${direction}${track}`
      console.log(`onDrag gridVertical "${id}" "${direction}" "${track}", "${gridTemplateStyle}"`)
      if (
        !splitUtils.gridVerticalPreviousTemplate ||
        !splitUtils.gridVerticalPreviousTemplate[id]
      ) {
        splitUtils.gridVerticalPreviousTemplate[id] = gridTemplateStyle
        doEvent = false
      } else if (splitUtils.gridVerticalPreviousTemplate[id] !== gridTemplateStyle) {
        console.log('onDrag gridVertical changed')
        splitUtils.gridVerticalPreviousTemplate[id] = gridTemplateStyle
        doEvent = false
      }
      if (doEvent) {
        console.log(`onDragStart gridVertical "${direction}" "${track}"`)
        if (ipc && ipc.windowResizeStart) {
          ipc.windowResizeStart('gridVertical')
        }
      }
    },
    onDragStart: function (direction, track) {
      console.log(`onDragStart gridVertical "${direction}" "${track}"`)
      // if (ipc && ipc.windowResizeStart) {
      //   ipc.windowResizeStart('gridVertical')
      // }
    },
    onDragEnd: function (direction, track) {
      console.log(`onDragEnd gridVertical "${direction}" "${track}"`)
      resizeUpdate(ipc, splitUtils)
    }
  })

  //TODO: set split size made by user
  splitUtils.resetVerticalSize()

  // //resize views now
  // const layout = splitUtils.getLayout()
  // console.log('ipc.windowResize', layout)
  // window['mainLayoutConfig'] = layout
  // ipc.windowResize(layout)

  // window focus toggle
  splitUtils.WindowFocusToggle.on('click', function () {
    console.log(`isWindowFocusToggleFocus ${splitUtils.isWindowFocusToggleFocus}`)
    windowFocus()
  })

  // window focus right toggle
  splitUtils.WindowFocusRightToggle.on('click', function () {
    console.log(`isWindowFocusRightToggleFocus ${splitUtils.isWindowFocusRightToggleFocus}`)
    windowFocusRight()

  })

  // window focus left toggle
  splitUtils.WindowFocusLeftToggle.on('click', function () {
    console.log(`isWindowFocusLeftToggleFocus ${splitUtils.isWindowFocusLeftToggleFocus}`)
    windowFocusLeft()
  })

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      // const cr = entry.contentRect
      //console.log('Element:', entry.target)
      // console.log(`Element size: ${cr.width}px x ${cr.height}px`)
      // console.log(`Element padding: ${cr.top}px ; ${cr.left}px`)

      splitUtils.updateElementSize(splitUtils.ContentLeftEl, splitUtils.ContentLeftBodyEl)
      splitUtils.updateElementSize(splitUtils.ContentRightEl, splitUtils.ContentRightBodyEl)
      splitUtils.updateElementSize(splitUtils.LeftAsideEl, splitUtils.LeftAsideEl)
      splitUtils.updateElementSize(splitUtils.RightAsideEl, splitUtils.RightAsideEl)
      splitUtils.updateElementSize(splitUtils.GutterEl, splitUtils.GutterEl)

      //resetHorizontalSize()
      //console.log(['splitUtils.LeftAside', splitUtils.LeftAside.width() == 0])
      if (splitUtils.LeftAside.width() == 0) {
        splitUtils.setMainLeftAsideFocus()
      } else {
        splitUtils.setMainLeftAsideFocus(true)
      }
      //console.log(['splitUtils.RightAside', splitUtils.RightAside.width() == 0])
      if (splitUtils.RightAside.width() == 0) {
        splitUtils.setMainRightAsideFocus()
      } else {
        splitUtils.setMainRightAsideFocus(true)
      }
      if (splitUtils.Gutter.height() == 0) {
        splitUtils.setHorizontalFocus()
      } else {
        splitUtils.setHorizontalFocus(true)
      }
      if (splitUtils.ContentLeft.width() == 0) {
        splitUtils.setVerticalFocus()
      } else if (splitUtils.ContentRight.width() == 0) {
        splitUtils.setVerticalFocus()
      } else {
        splitUtils.setVerticalFocus(true)
      }

      if (ipc && ipc.windowResize) {
        // get title bar size from :root css variable --env-titlebar-area-height
        const titleBarHeight = parseInt(
          getComputedStyle(document.documentElement).getPropertyValue('--env-titlebar-area-height')
        )
      }
    }
  })

  resizeObserver.observe(splitUtils.ContentHorizontalEl)
  resizeObserver.observe(splitUtils.ContentVerticalEl)
  resizeObserver.observe(splitUtils.ContentLeftEl)
  resizeObserver.observe(splitUtils.ContentRightEl)

  splitUtils.ContentSplit.on('dblclick', function (event) {
    toggleContent(event.shiftKey)
    resizeUpdate(ipc, splitUtils)
  })

  splitUtils.GutterSplit.on('dblclick', function () {
    toggleGutter(false)
    resizeUpdate(ipc, splitUtils)
  })

  splitUtils.LeftAsideSplit.on('dblclick', function () {
    toggleLeftAside(false)
    resizeUpdate(ipc, splitUtils)
  })

  splitUtils.RightAsideSplit.on('dblclick', function () {
    toggleRightAside(false)
    resizeUpdate(ipc, splitUtils)
  })

  document.getElementById('windowdarkmodetoggle').addEventListener('change', async (el) => {
    if (window['darkMode']) {
      if (el.target.value === '1') {
        console.log('Theme Light')
        await window.darkMode.light()
      } else if (el.target.value === '2') {
        console.log('Theme Default')
        await window.darkMode.system()
      } else if (el.target.value === '3') {
        console.log('Theme Dark')
        await window.darkMode.dark()
      }
    }
  })

  console.log('loaded home.ts')
}

export function setWindowTitle(title: string): void {
  console.log('setWindowTitle', title)
  const titleElement = document.getElementById('windowtitle');
  document.title = title
  if (titleElement) {
    titleElement.textContent = title;
  } else {
    console.error('Window title element not found');
  }
  ipc.setWindowTitle(title)
}

export function windowFocus(): void {
  console.log('call windowFocus')
  splitUtils.resetVerticalSize()

  if (splitUtils.isWindowFocusToggleFocus) {
    splitUtils.setMainFocus(true)
    //reset gutter
    splitUtils.resetHorizontalSize()
    splitUtils.setHorizontalFocus(true)
    //reset vertical
    splitUtils.resetVerticalSize()
    //reset assides
    splitUtils.resetMainSize()
  } else {
    splitUtils.setMainFocus()
    //hide gutter
    splitUtils.resetHorizontalSize(splitUtils.DEFAULT_GRID_HORIZONTAL_HIDE_SIZE)
    splitUtils.setHorizontalFocus()
    //hide asides
    splitUtils.resetMainSize(splitUtils.DEFAULT_GRID_MAIN_HIDE_SIZE)
  }
  resizeUpdate(ipc, splitUtils)
}

export function windowFocusLeft(): void {
  console.log('call windowFocusLeft')
  if (splitUtils.isWindowFocusLeftToggleFocus) {
    splitUtils.setMainFocusLeft(true)
    //reset gutter
    splitUtils.resetHorizontalSize()
    splitUtils.setHorizontalFocus(true)
    //reset vertical
    splitUtils.resetVerticalSize()
    //reset assides
    splitUtils.resetMainSize()
  } else {
    splitUtils.setMainFocusLeft()
    //hide gutter
    splitUtils.resetHorizontalSize(splitUtils.DEFAULT_GRID_HORIZONTAL_HIDE_SIZE)
    splitUtils.setHorizontalFocus()
    //hide asides
    splitUtils.resetMainSize(splitUtils.DEFAULT_GRID_MAIN_HIDE_SIZE)
    // hide right aside
    toggleContent(false, true)
  }
  resizeUpdate(ipc, splitUtils)
}

export function windowFocusRight(): void {
  console.log('call windowFocusRight')
  // if already focused reset everything
  if (splitUtils.isWindowFocusRightToggleFocus) {
    console.log('toggle right off')
    splitUtils.setMainFocusRight(true)
    //reset gutter
    splitUtils.resetHorizontalSize()
    splitUtils.setHorizontalFocus(true)
    //reset vertical
    splitUtils.resetVerticalSize()
    //reset assides
    splitUtils.resetMainSize()
  } else {
    console.log('toggle right on')
    splitUtils.setMainFocusRight()
    //hide gutter
    splitUtils.resetHorizontalSize(splitUtils.DEFAULT_GRID_HORIZONTAL_HIDE_SIZE)
    splitUtils.setHorizontalFocus()
    //hide asides
    splitUtils.resetMainSize(splitUtils.DEFAULT_GRID_MAIN_HIDE_SIZE)
    // hide left aside
    toggleContent(true, true)
  }
  resizeUpdate(ipc, splitUtils)
}

init()
