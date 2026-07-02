import type { TestSeriesObject } from "./types"
import { testSeries as v073TestSeries } from "./v073"

export const testSeries = Object.fromEntries(
  Object.entries(v073TestSeries).map(([key, value]) => {
    const config = { ...value.config }
    delete config.betaExperience

    return [
      key,
      {
        ...value,
        config,
      },
    ]
  }),
) satisfies TestSeriesObject
