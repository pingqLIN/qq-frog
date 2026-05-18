import { spawnSync } from "node:child_process"
import process from "node:process"

const result = spawnSync("wxt", ["prepare"], {
  env: {
    ...process.env,
    WXT_SKIP_ENV_VALIDATION: "true",
  },
  shell: process.platform === "win32",
  stdio: "inherit",
})

process.exit(result.status ?? 1)
