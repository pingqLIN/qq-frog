const WINDOWS_SAFE_BATCH_SIZE = 20

function quoteArgument(value) {
  return JSON.stringify(value)
}

function chunk(values, size) {
  const chunks = []

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }

  return chunks
}

export default {
  "*": files => chunk(files, WINDOWS_SAFE_BATCH_SIZE)
    .map(batch => `pnpm exec eslint --fix --no-warn-ignored ${batch.map(quoteArgument).join(" ")}`),
}
