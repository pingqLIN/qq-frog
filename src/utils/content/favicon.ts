/**
 * get the favicon url
 * @return {string} favicon url
 */

export function getFaviconUrl(): string {
  // 優先級列表：常見 rel 屬性
  const relList = [
    "icon",
    "shortcut icon",
    "apple-touch-icon",
    "apple-touch-icon-precomposed",
    "mask-icon",
  ]

  const candidates: { url: string, size: number, type: string } [] = []

  for (const rel of relList) {
    const links = document.head.querySelectorAll(
      `link[rel="${rel}"]`,
    ) as NodeListOf<HTMLLinkElement>

    links.forEach((link) => {
      if (link.href) {
        const size = link.sizes.length > 0
          ? Math.max(...Array.from(link.sizes, s => Number.parseInt(s) || 0))
          : 0

        candidates.push({
          url: link.href,
          size,
          type: link.type || "",
        })
      }
    })
  }

  // 按以下優先級排序：
  // 1. 更大的尺寸優先
  // 2. SVG 格式優先（通常更清晰）
  // 3. PNG 格式優先於 ICO
  candidates.sort((a, b) => {
    if (a.size !== b.size)
      return b.size - a.size
    if (a.type === "image/svg+xml" && b.type !== "image/svg+xml")
      return -1
    if (b.type === "image/svg+xml" && a.type !== "image/svg+xml")
      return 1
    if (a.type === "image/png" && b.type === "image/x-icon")
      return -1
    if (b.type === "image/png" && a.type === "image/x-icon")
      return 1
    return 0
  })

  // 如果找到了候選圖標，返回最優的那個
  if (candidates.length > 0) {
    return candidates[0].url
  }

  // 如果依然沒找到，就回退到站點根目錄的 /favicon.ico
  const { origin } = window.location
  return `${origin}/favicon.ico`
}
