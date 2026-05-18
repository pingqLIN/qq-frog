/* eslint-disable no-console */

const isDev = import.meta.env.DEV

/** ANSI 顏色碼（Node 控制檯） */
const ansi = {
  reset: "\x1B[0m",
  gray: "\x1B[90m",
  blue: "\x1B[34m",
  yellow: "\x1B[33m",
  red: "\x1B[31m",
}

/** 瀏覽器 %c 樣式 */
const css = {
  gray: "color:#aaa",
  blue: "color:#2196f3",
  yellow: "color:#ffb300",
  red: "color:#f44336",
}

type Level = "log" | "info" | "warn" | "error"

function noop() {}

function createLogger(level: Level) {
  if (!isDev) {
    return noop
  }
  const prefix = "[dev-log]"
  // Node 環境 → 用 ANSI；否則用瀏覽器 %c
  const useAnsi = typeof window === "undefined"

  const color = {
    log: useAnsi ? ansi.gray : css.gray,
    info: useAnsi ? ansi.blue : css.blue,
    warn: useAnsi ? ansi.yellow : css.yellow,
    error: useAnsi ? ansi.red : css.red,
  }[level]

  if (useAnsi) {
    return console[level].bind(console, `${color}${prefix}${ansi.reset}`)
  }
  return console[level].bind(console, `%c${prefix}`, color)
}

export const logger = {
  log: createLogger("log"),
  info: createLogger("info"),
  warn: createLogger("warn"),
  error: createLogger("error"),
}
