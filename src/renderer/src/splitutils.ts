/* eslint-disable @typescript-eslint/no-explicit-any */
export class SplitUtils {
  private static instance: SplitUtils

  DEFAULT_GRID_MAIN_SIZE = '1fr 10px 14fr 10px 1fr'
  DEFAULT_GRID_MAIN_HIDE_SIZE = '0fr 10px 1fr 10px 0fr'
  DEFAULT_GRID_MAIN_HIDE_LEFT_SIZE = '0fr 10px 15fr 10px 1fr'
  DEFAULT_GRID_MAIN_HIDE_RIGHT_SIZE = '1fr 10px 15fr 10px 0fr'

  DEFAULT_GRID_HORIZONTAL_SIZE = '7fr 10px 1fr'
  DEFAULT_GRID_HORIZONTAL_HIDE_SIZE = '1fr 10px 0fr'

  DEFAULT_GRID_VERTICAL_SIZE = '1fr 10px 1fr'
  DEFAULT_GRID_VERTICAL_HIDE_LEFT_SIZE = '1fr 10px 0fr'
  DEFAULT_GRID_VERTICAL_HIDE_RIGHT_SIZE = '0fr 10px 1fr'

  $gridMain
  $gridMainSplitLeftAside
  $gridMainSplitRightAside

  $gridHorizontal
  $gridHorizontalSplitGutter
  $gridVertical
  $gridVerticalSplit

  $gutter

  $asideLeft
  $asideRight

  $windowfocus

  $contentleft
  $contentleftbody
  $contentlefttabs
  $contentleftaddressbar

  $contentright
  $contentrightbody
  $contentrighttabs
  $contentrightaddressbar

  $footer

  $
  gridMain
  gridHorizontal
  gridVerticalertical

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor($: any) {
    if (SplitUtils.instance) {
      return SplitUtils.instance
    }
    SplitUtils.instance = this
    this.init($)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  init($: any): void {
    console.log('loaded splitutils.ts')

    this.$ = $

    this.$gridMain = $('.gridMain')
    this.$gridMainSplitLeftAside = $('.gutterMain-col-1')
    this.$gridMainSplitRightAside = $('.gutterMain-col-3')

    this.$gridHorizontal = $('.gridHorizontal')
    this.$gridHorizontalSplitGutter = $('.gutterHorizontal-row-1')
    this.$gridVertical = $('.gridVertical')
    this.$gridVerticalSplit = $('.gutterV-col-1')

    this.$gutter = $('.gutter')

    this.$asideLeft = $('.asideleft')
    this.$asideRight = $('.asideright')

    this.$windowfocus = $('.windowfocus')

    this.$contentleft = $('.contentleft')
    this.$contentleftbody = $('.contentleft .contentbody')
    this.$contentlefttabs = $('.contentleft .contenttabs')
    this.$contentleftaddressbar = $('.contentleft .contentaddress')

    this.$contentright = $('.contentright')
    this.$contentrightbody = $('.contentright .contentbody')
    this.$contentrighttabs = $('.contentright .contenttabs')
    this.$contentrightaddressbar = $('.contentright .contentaddress')

    this.$footer = $('.windowfooter')
  }

  get LeftAside(): any {
    return this.$asideLeft
  }
  get LeftAsideEl(): any {
    return this.$asideLeft[0]
  }
  get LeftAsideSplit(): any {
    return this.$gridMainSplitLeftAside
  }
  get isLeftAsideSplitFocus(): boolean {
    return this.LeftAsideSplit.attr('focus') === 'focus'
  }
  get LeftAsideSplitEl(): any {
    return this.$gridMainSplitLeftAside[0]
  }
  get RightAside(): any {
    return this.$asideRight
  }
  get RightAsideEl(): any {
    return this.$asideRight[0]
  }
  get RightAsideSplit(): any {
    return this.$gridMainSplitRightAside
  }
  get isRightAsideSplitFocus(): boolean {
    return this.RightAsideSplit.attr('focus') === 'focus'
  }
  get RightAsideSplitEl(): any {
    return this.$gridMainSplitRightAside[0]
  }

  get Gutter(): any {
    return this.$gutter
  }
  get GutterEl(): any {
    return this.$gutter[0]
  }
  get GutterSplit(): any {
    return this.$gridHorizontalSplitGutter
  }
  get isGutterSplitFocus(): boolean {
    return this.GutterSplit.attr('focus') === 'focus'
  }
  get GutterSplitEl(): any {
    return this.$gridHorizontalSplitGutter[0]
  }

  get ContentHorizontal(): any {
    return this.$gridHorizontal
  }
  get ContentHorizontalEl(): any {
    return this.$gridHorizontal[0]
  }
  get ContentVertical(): any {
    return this.$gridVertical
  }
  get ContentVerticalEl(): any {
    return this.$gridVertical[0]
  }

  get ContentSplit(): any {
    return this.$gridVerticalSplit
  }
  get isContentSplitFocus(): boolean {
    return this.ContentSplit.attr('focus') === 'focus'
  }

  get ContentSplitEl(): any {
    return this.$gridVerticalSplit[0]
  }
  get ContentLeft(): any {
    return this.$contentleft
  }
  get ContentLeftEl(): any {
    return this.$contentleft[0]
  }
  get ContentLeftBodyEl(): any {
    return this.$contentleftbody[0]
  }
  get ContentLeftBody(): any {
    return this.$contentleftbody
  }
  get ContentLeftTabs(): any {
    return this.$contentlefttabs
  }
  get ContentLeftTabsEl(): any {
    return this.$contentlefttabs[0]
  }
  get ContentLeftAddressBar(): any {
    return this.$contentleftaddressbar
  }
  get ContentLeftAddressBarEl(): any {
    return this.$contentleftaddressbar[0]
  }
  get ContentRight(): any {
    return this.$contentright
  }
  get ContentRightEl(): any {
    return this.$contentright[0]
  }
  get ContentRightBody(): any {
    return this.$contentrightbody
  }
  get ContentRightBodyEl(): any {
    return this.$contentrightbody[0]
  }
  get ContentRightTabs(): any {
    return this.$contentrighttabs
  }
  get ContentRightTabsEl(): any {
    return this.$contentrighttabs[0]
  }
  get ContentRightAddressBar(): any {
    return this.$contentrightaddressbar
  }
  get ContentRightAddressBarEl(): any {
    return this.$contentrightaddressbar[0]
  }

  get Footer(): any {
    return this.$footer
  }
  get FooterEl(): any {
    return this.$footer[0]
  }

  get WindowFocusToggle(): any {
    return this.$windowfocus
  }
  get isWindowFocusToggleFocus(): any {
    return this.WindowFocusToggle.attr('focus') === 'focus'
  }

  //TODO: set split size made by user
  resetVerticalSize(size?: string): void {
    this.$gridVertical.css('grid-template-columns', size || this.DEFAULT_GRID_VERTICAL_SIZE)
  }

  setVerticalFocus(reset?: boolean): void {
    if (reset) {
      this.$gridVerticalSplit.removeAttr('focus')
      return
    }
    this.$gridVerticalSplit.attr('focus', 'focus')
  }

  resetHorizontalSize(size?: string): void {
    this.$gridHorizontal.css('grid-template-rows', size || this.DEFAULT_GRID_HORIZONTAL_SIZE)
  }
  setHorizontalFocus(reset?: boolean): void {
    if (reset) {
      this.$gridHorizontalSplitGutter.removeAttr('focus')
      return
    }
    this.$gridHorizontalSplitGutter.attr('focus', 'focus')
  }

  setMainFocus(reset?: boolean): void {
    if (reset) {
      this.$windowfocus.removeAttr('focus')
      this.$gridMainSplitLeftAside.removeAttr('focus')
      this.$gridMainSplitRightAside.removeAttr('focus')
      return
    }
    this.$windowfocus.attr('focus', 'focus')
    this.$gridMainSplitLeftAside.attr('focus', 'focus')
    this.$gridMainSplitRightAside.attr('focus', 'focus')
  }

  resetMainSize(size?: string): void {
    this.$gridMain.css('grid-template-columns', size || this.DEFAULT_GRID_MAIN_SIZE)
  }

  setMainLeftAsideFocus(reset?: boolean): void {
    if (reset) {
      this.$gridMainSplitLeftAside.removeAttr('focus')
      return
    }
    this.$gridMainSplitLeftAside.attr('focus', 'focus')
  }

  setMainRightAsideFocus(reset?: boolean): void {
    if (reset) {
      this.$gridMainSplitRightAside.removeAttr('focus')
      return
    }
    this.$gridMainSplitRightAside.attr('focus', 'focus')
  }

  // use to dump html into an element
  updateElementSize($element, $outputelement): void {
    const size = this.getSize(this.$($element))
    this.$($outputelement).html(size.width + 'px x ' + size.height + 'px')
  }

  getSize($element): { width: number; height: number } {
    const size = {
      width: $element.width(),
      height: $element.height()
    }
    return size
  }
}
