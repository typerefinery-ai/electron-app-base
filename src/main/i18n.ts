import i18next from 'i18next'
import Backend from 'i18next-fs-backend'
import { staticAsset } from './Resources'

export const i18nextOptions = {
  lng: 'en',
  fallbackLng: 'en',
  preload: ['en'],
  ns: ['translation'],
  defaultNS: 'translation',
  backend: {
    loadPath: staticAsset('/locales/{{lng}}/{{ns}}.json')
    //loadPath: new URL(`./{{ns}}.json`, import.meta.url).href
  }
}

i18next.use(Backend).init(i18nextOptions, (err, t) => {
  if (err) return console.log('something went wrong loading', err)
})

export default i18next
