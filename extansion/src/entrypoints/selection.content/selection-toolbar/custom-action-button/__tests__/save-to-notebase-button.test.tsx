// @vitest-environment jsdom
import type { Config } from "@/types/config/config"
import type { SelectionToolbarCustomAction } from "@/types/config/selection-toolbar"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { createStore, Provider } from "jotai"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { configAtom } from "@/utils/atoms/config"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { i18n } from "@/utils/i18n"
import { SaveToNotebaseButton } from "../save-to-notebase-button"

const { useSessionMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(() => ({ data: null, isPending: false })),
}))

vi.mock("@/utils/auth/auth-client", () => ({
  authClient: {
    useSession: useSessionMock,
  },
}))

function cloneConfig(config: Config): Config {
  return JSON.parse(JSON.stringify(config)) as Config
}

function createAction(): SelectionToolbarCustomAction {
  return {
    id: "action-1",
    name: "Summarize",
    icon: "tabler:sparkles",
    providerId: "provider-1",
    systemPrompt: "system",
    prompt: "prompt",
    outputSchema: [
      {
        id: "field-summary",
        name: "summary",
        type: "string",
        description: "",
        speaking: false,
      },
    ],
    notebaseConnection: {
      tableId: "table-1",
      tableNameSnapshot: "Articles",
      mappings: [],
    },
  }
}

describe("saveToNotebaseButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders save button for configured Notebase actions", () => {
    const store = createStore()
    const config = cloneConfig(DEFAULT_CONFIG)

    store.set(configAtom, config)
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <SaveToNotebaseButton
            action={createAction()}
            isRunning={false}
            result={{ summary: "A short summary" }}
          />
        </Provider>
      </QueryClientProvider>,
    )

    expect(screen.getByRole("button", { name: i18n.t("action.saveToNotebase") })).toBeInTheDocument()
  })
})
