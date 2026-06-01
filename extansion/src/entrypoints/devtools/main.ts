interface ChromeDevtoolsPanels {
  create: (title: string, iconPath: string, pagePath: string) => void
}

interface ChromeDevtoolsGlobal {
  chrome?: {
    devtools?: {
      panels?: ChromeDevtoolsPanels
    }
  }
}

const panels = (globalThis as ChromeDevtoolsGlobal).chrome?.devtools?.panels

panels?.create(
  "擴充設定",
  "icon/16.png",
  "options.html",
)
