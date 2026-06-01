// @vitest-environment jsdom

import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { WhatsNewFooter } from "../whats-new-footer"

describe("whats new footer", () => {
  it("does not render external update links in the local build", () => {
    const { container } = render(<WhatsNewFooter />)

    expect(container).toBeEmptyDOMElement()
  })
})
