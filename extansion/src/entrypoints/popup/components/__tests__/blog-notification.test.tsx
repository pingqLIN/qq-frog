// @vitest-environment jsdom

import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import BlogNotification from "../blog-notification"

describe("blog notification", () => {
  it("does not render external update links in the local build", () => {
    const { container } = render(<BlogNotification />)

    expect(container).toBeEmptyDOMElement()
  })
})
