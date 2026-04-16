import process from 'node:process'

export type Messages = Record<string, string>

export function detectLocale(): 'zh-CN' | 'en' {
  const lang = process.env.LANG || process.env.LC_ALL || Intl.DateTimeFormat().resolvedOptions().locale
  return lang?.startsWith('zh') ? 'zh-CN' : 'en'
}

export function createI18n(locale: 'zh-CN' | 'en', messages: Messages) {
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
