'use client'
import ThemeSwitch from "./theme-switch"

export function TopBar() {
  return (
    <div
      className={ "fixed px-4 py-2 w-screen flex items-center h-14 z-50 bg-gray-100 dark:bg-gray-800 shadow" }
    >
      <ThemeSwitch></ThemeSwitch>
    </div>
    )
}