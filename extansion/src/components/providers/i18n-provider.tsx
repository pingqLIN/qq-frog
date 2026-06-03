import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { initAppLocale, subscribeAppLocale } from "@/utils/i18n"

export function I18nProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [version, setVersion] = useState(0)

  void version

  useEffect(() => {
    let isMounted = true

    void initAppLocale().then(() => {
      if (isMounted)
        setIsReady(true)
    })

    const unsubscribe = subscribeAppLocale(() => {
      setVersion(version => version + 1)
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  if (!isReady)
    return null

  return children
}
