import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import fr from './fr'
import tr from './tr'

type Lang = 'fr' | 'tr'
type Keys = keyof typeof fr

const dicts: Record<Lang, typeof fr> = { fr, tr: tr as unknown as typeof fr }

interface I18nStore {
  lang: Lang
  setLang: (l: Lang) => void
}

export const useI18n = create<I18nStore>()(
  persist(
    (set) => ({ lang: 'fr', setLang: (lang) => set({ lang }) }),
    { name: 'planningIA-lang' }
  )
)

export function useT() {
  const { lang } = useI18n()
  return (key: Keys, fallback?: string): string => {
    return (dicts[lang] as any)[key] ?? (dicts.fr as any)[key] ?? fallback ?? key
  }
}

export function getLang(): Lang {
  return useI18n.getState().lang
}
