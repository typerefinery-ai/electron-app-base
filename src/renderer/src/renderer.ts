import Split from 'split-grid'
import $ from 'jquery'
import { SplitUtils } from './splitutils'

export function init(): void {
  window.addEventListener('DOMContentLoaded', () => {
    ready(window.document)
  })
}

function ready(document): void {
  console.log('loading home.ts')

  // const { ipc } = window

  const splitUtils = new SplitUtils($)

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
    ]
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
    ]
  })

  splitUtils.resetHorizontalSize()

  //window content row split, left and right
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  splitUtils.gridVerticalertical = Split({
    minSize: 0,
    snapOffset: 50,
    columnGutters: [
      {
        track: 1,
        element: splitUtils.ContentSplitEl
      }
    ]
  })

  //TODO: set split size made by user
  splitUtils.resetVerticalSize()

  splitUtils.WindowFocusToggle.on('click', function () {
    if (splitUtils.isWindowFocusToggleFocus) {
      splitUtils.setMainFocus(true)
      //reset gutter
      splitUtils.resetHorizontalSize()
      splitUtils.setHorizontalFocus(true)
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
  })

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      // const cr = entry.contentRect
      console.log('Element:', entry.target)
      // console.log(`Element size: ${cr.width}px x ${cr.height}px`)
      // console.log(`Element padding: ${cr.top}px ; ${cr.left}px`)

      splitUtils.updateElementSize(splitUtils.ContentLeftEl, splitUtils.ContentLeftBodyEl)
      splitUtils.updateElementSize(splitUtils.ContentRightEl, splitUtils.ContentRightBodyEl)
      splitUtils.updateElementSize(splitUtils.LeftAsideEl, splitUtils.LeftAsideEl)
      splitUtils.updateElementSize(splitUtils.RightAsideEl, splitUtils.RightAsideEl)
      splitUtils.updateElementSize(splitUtils.GutterEl, splitUtils.GutterEl)

      //resetHorizontalSize()
      console.log(['splitUtils.LeftAside', splitUtils.LeftAside.width() == 0])
      if (splitUtils.LeftAside.width() == 0) {
        splitUtils.setMainLeftAsideFocus()
      } else {
        splitUtils.setMainLeftAsideFocus(true)
      }
      console.log(['splitUtils.RightAside', splitUtils.RightAside.width() == 0])
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

      // if (ipc && ipc.windowResize) {
      //   ipc.windowResize({
      //     left: {
      //       x: splitUtils.ContentLeft.offset().top,
      //       y: splitUtils.ContentLeft.offset().left,
      //       width: splitUtils.ContentLeft.width(),
      //       height: splitUtils.ContentLeft.height()
      //     },
      //     right: {
      //       x: splitUtils.ContentRight.offset().top,
      //       y: splitUtils.ContentRight.offset().left,
      //       width: splitUtils.ContentRight.width(),
      //       height: splitUtils.ContentRight.height()
      //     },
      //     gutter: {
      //       x: splitUtils.Gutter.offset().top,
      //       y: splitUtils.Gutter.offset().left,
      //       width: splitUtils.Gutter.width(),
      //       height: splitUtils.Gutter.height()
      //     },
      //     leftAside: {
      //       x: splitUtils.LeftAside.offset().top,
      //       y: splitUtils.LeftAside.offset().left,
      //       width: splitUtils.LeftAside.width(),
      //       height: splitUtils.LeftAside.height()
      //     },
      //     rightAside: {
      //       x: splitUtils.RightAside.offset().top,
      //       y: splitUtils.RightAside.offset().left,
      //       width: splitUtils.RightAside.width(),
      //       height: splitUtils.RightAside.height()
      //     }
      //   })
      // }
    }
  })

  resizeObserver.observe(splitUtils.ContentHorizontalEl)
  resizeObserver.observe(splitUtils.ContentVerticalEl)
  resizeObserver.observe(splitUtils.ContentLeftEl)
  resizeObserver.observe(splitUtils.ContentRightEl)

  splitUtils.ContentSplit.on('dblclick', function (event) {
    if (splitUtils.isContentSplitFocus) {
      // splitUtils.setVerticalFocus(true)
      splitUtils.resetVerticalSize()
    } else {
      // splitUtils.setVerticalFocus()
      if (event.shiftKey) {
        splitUtils.resetVerticalSize(splitUtils.DEFAULT_GRID_VERTICAL_HIDE_RIGHT_SIZE)
      } else {
        splitUtils.resetVerticalSize(splitUtils.DEFAULT_GRID_VERTICAL_HIDE_LEFT_SIZE)
      }
    }
  })

  splitUtils.GutterSplit.on('dblclick', function () {
    if (splitUtils.isGutterSplitFocus) {
      // splitUtils.setHorizontalFocus(true)
      splitUtils.resetHorizontalSize()
    } else {
      // splitUtils.setHorizontalFocus()
      splitUtils.resetHorizontalSize(splitUtils.DEFAULT_GRID_HORIZONTAL_HIDE_SIZE)
    }
  })

  splitUtils.LeftAsideSplit.on('dblclick', function () {
    if (splitUtils.isLeftAsideSplitFocus) {
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
  })

  splitUtils.RightAsideSplit.on('dblclick', function () {
    if (splitUtils.isRightAsideSplitFocus) {
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
  })

  console.log('loaded home.ts')
}

init()
