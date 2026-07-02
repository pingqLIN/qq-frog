/**
 * Migration script from v073 to v074
 * - Removes the retired betaExperience gate from persisted config.
 */
export function migrate(oldConfig: any): any {
  const config = { ...(oldConfig ?? {}) }
  delete config.betaExperience
  return config
}
