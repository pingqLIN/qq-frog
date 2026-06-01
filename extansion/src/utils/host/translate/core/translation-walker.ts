import type { Config } from "@/types/config/config"
import {
  BLOCK_ATTRIBUTE,
  CONTENT_WRAPPER_CLASS,
  PARAGRAPH_ATTRIBUTE,
  WALKED_ATTRIBUTE,
} from "../../../constants/dom-labels"
import { isBlockTransNode, isHTMLElement, isTextNode, isTransNode } from "../../dom/filter"
import { translateNodes } from "./translation-modes"

const MAX_CONCURRENT_NODE_TRANSLATIONS = 4

async function runLimitedConcurrency(tasks: Array<() => Promise<void>>, limit: number): Promise<void> {
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const task = tasks[nextIndex]
      nextIndex++
      if (!task) {
        continue
      }
      await task()
    }
  }

  const workerCount = Math.min(limit, tasks.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
}

export async function translateWalkedElement(
  element: HTMLElement,
  walkId: string,
  config: Config,
  toggle: boolean = false,
): Promise<void> {
  if (!toggle && element.querySelector(`.${CONTENT_WRAPPER_CLASS}`))
    return

  // if the walkId is not the same, return
  if (element.getAttribute(WALKED_ATTRIBUTE) !== walkId)
    return

  const tasks: Array<() => Promise<void>> = []

  if (element.hasAttribute(PARAGRAPH_ATTRIBUTE)) {
    let hasBlockNodeChild = false

    for (const child of element.childNodes) {
      if (isHTMLElement(child) && child.hasAttribute(BLOCK_ATTRIBUTE)) {
        hasBlockNodeChild = true
        break
      }
    }

    const computedStyle = window.getComputedStyle(element)
    const isFlexParent = computedStyle.display.includes("flex")

    if (!hasBlockNodeChild) {
      tasks.push(() => translateNodes([element], walkId, toggle, config))
    }
    else {
      // prevent children change during iteration
      const children = [...element.childNodes]
      let consecutiveInlineNodes: ChildNode[] = []
      for (const child of children) {
        if (isTransNode(child) && isBlockTransNode(child) && !isTextNode(child)) {
          // force the children to be block translation style unless the parent is a flex parent
          const inlineNodes = consecutiveInlineNodes
          tasks.push(() => translateNodes(inlineNodes, walkId, toggle, config, !isFlexParent))
          consecutiveInlineNodes = []
          tasks.push(() => translateWalkedElement(child, walkId, config, toggle))
        }
        else {
          consecutiveInlineNodes.push(child)
        }
      }

      if (consecutiveInlineNodes.length) {
        const inlineNodes = consecutiveInlineNodes
        tasks.push(() => translateNodes(inlineNodes, walkId, toggle, config, !isFlexParent))
        consecutiveInlineNodes = []
      }
    }
  }
  else {
    for (const child of element.childNodes) {
      if (isHTMLElement(child)) {
        tasks.push(() => translateWalkedElement(child, walkId, config, toggle))
      }
    }
    if (element.shadowRoot) {
      for (const child of element.shadowRoot.children) {
        if (isHTMLElement(child)) {
          tasks.push(() => translateWalkedElement(child, walkId, config, toggle))
        }
      }
    }
  }
  // This simultaneously ensures that when concurrent translation
  // and external await call this function, all translations are completed
  await runLimitedConcurrency(tasks, MAX_CONCURRENT_NODE_TRANSLATIONS)
}
