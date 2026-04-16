import process from 'node:process'
import enMessages from './locales/en.json'
import zhCNMessages from './locales/zh-CN.json'

export type Messages = Record<string, string>

export const messages = {
  'en': enMessages,
  'zh-CN': zhCNMessages,
}

export type Locale = 'zh-CN' | 'en'

export function detectLocale(): Locale {
  const lang = process.env.LANG || process.env.LC_ALL || Intl.DateTimeFormat().resolvedOptions().locale
  return lang?.startsWith('zh') ? 'zh-CN' : 'en'
}

export function createI18n(locale: Locale, messages: Messages) {
  return (key: string, params?: Record<string, string | number>) => {
    let text = messages[key] || key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`{${k}}`, 'g'), String(v))
      }
    }
    return text
  }
}

export function mergeMessages(base: Messages, override: Messages): Messages {
  return { ...base, ...override }
}

export function createLocaleI18n(locale?: Locale) {
  const loc = locale || detectLocale()
  return createI18n(loc, messages[loc])
}
