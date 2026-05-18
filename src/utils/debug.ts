export function printNodeStructure(node: Node, indent = 0): string {
  const spacing = " ".repeat(indent * 2)
  let result = ""

  if (node.nodeType === 3) {
    // 文本節點
    const text = node.textContent?.trim() || ""
    if (text) {
      result += `${spacing}"${text}"\n`
    }
  }
  else if (node.nodeType === 1) {
    // 元素節點
    const elem = node as HTMLElement
    const tagName = elem.tagName.toLowerCase()
    const attrs = Array.from(elem.attributes, attr => `${attr.name}="${attr.value}"`)
      .join(" ")

    result += `${spacing}<${tagName}${attrs ? ` ${attrs}` : ""}>\n`

    // 遞歸處理子節點
    if (elem.childNodes.length > 0) {
      [...elem.childNodes].forEach((child) => {
        result += printNodeStructure(child, indent + 1)
      })
    }

    result += `${spacing}</${tagName}>\n`
  }

  return result
}
