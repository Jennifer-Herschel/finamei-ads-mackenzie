import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getPageTitle } from './page-titles'

/** Keeps the browser tab title in sync with the current screen. */
export function DocumentTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = getPageTitle(pathname)
  }, [pathname])
  return null
}
