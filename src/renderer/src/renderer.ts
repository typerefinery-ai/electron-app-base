import Split from 'split-grid'
import $ from 'jquery';

export function init(): void {
  window.addEventListener('DOMContentLoaded', () => {
    ready(window.document)
  })
}

function ready(document): void {
  console.log('loading home.ts')

  //window content column split, left aise and right aside column
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const gridM = Split({
    minSize: 0,
    snapOffset: 40,
    columnGutters: [
      {
        track: 1,
        element: document.querySelector('.gutterM-col-1')
      },
      {
        track: 3,
        element: document.querySelector('.gutterM-col-3')
      }
    ]
  })

  document.querySelector('.gridM').style['grid-template-columns'] = '0.04fr 10px 2fr 10px 0.04fr'

  //window content row split, content and gutter
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const gridH = Split({
    minSize: 0,
    snapOffset: 40,
    rowGutters: [
      {
        track: 1,
        element: document.querySelector('.gutterH-row-1')
      }
    ]
  })
  document.querySelector('.gridH').style['grid-template-rows'] = '90% 10px 1fr'

  //window content row split, left and right
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const gridV = Split({
    minSize: 0,
    snapOffset: 50,
    columnGutters: [
      {
        track: 1,
        element: document.querySelector('.gutterV-col-1')
      }
    ]
  })

  //TODO: set split size made by user
  document.querySelector('.gridV').style['grid-template-columns'] = '1fr 10px 1fr'

  //window contorls

  $('.windowfocus').on('click', function () {
    if ($('.windowfocus').attr('focus')) {
      $('.windowfocus').removeAttr('focus')
      //reset gutter
      document.querySelector('.gridH').style['grid-template-rows'] = '90% 10px 1fr'
      //reset assides
      document.querySelector('.gridM').style['grid-template-columns'] =
        '0.04fr 10px 2fr 10px 0.04fr'
    } else {
      //hide gutter
      $('.windowfocus').attr('focus', 'focus')
      document.querySelector('.gridH').style['grid-template-rows'] = '98% 10px 1fr'
      //hide asides
      document.querySelector('.gridM').style['grid-template-columns'] = '0fr 10px 1fr 10px 0fr'
    }
  })

  const $contentleft = $('.contentleft')

  $('.contentleft').resize(function () {
    console.log('resize')
    console.log([
      $contentleft.offset().left,
      $contentleft.offset().top,
      $contentleft.width(),
      $contentleft.height()
    ])
  })

  $('.gutterV-col-1').on('dblclick', function () {
    console.log('.gridV .gutterV-col-1 click')
    if ($('.gutterV-col-1').attr('focus')) {
      console.log('right hide')
      $('.gutterV-col-1').removeAttr('focus')
      //reset right col
      document.querySelector('.gridV').style['grid-template-columns'] = '1fr 10px 1fr'
    } else {
      console.log('right restore')
      //hide right col
      $('.gutterV-col-1').attr('focus', 'focus')
      document.querySelector('.gridV').style['grid-template-columns'] = '2fr 10px 0fr'
    }
  })

  $('.gutterH-row-1').on('dblclick', function () {
    if ($('.gutterH-row-1').attr('focus')) {
      console.log('gutter hide')
      $('.gutterH-row-1').removeAttr('focus')
      //reset gutter
      document.querySelector('.gridH').style['grid-template-rows'] = '90% 10px 1fr'
    } else {
      console.log('gutter restore')
      //hide right col
      $('.gutterH-row-1').attr('focus', 'focus')
      //hide gutter
      document.querySelector('.gridH').style['grid-template-rows'] = '100% 10px 0fr'
    }
  })

  console.log('loaded home.ts')
}

init()
