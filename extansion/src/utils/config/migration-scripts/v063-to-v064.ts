/**
 * Migration script from v063 to v064
 * - Renames translate/video subtitle prompt tokens:
 *   - {{targetLang}} -> {{targetLanguage}}
 *   - {{title}} -> {{webTitle}}
 *   - {{summary}} -> {{webSummary}}
 * - Renames selection toolbar custom action prompt tokens:
 *   - {{context}} -> {{paragraphs}}
 *   - {{targetLang}} -> {{targetLanguage}}
 *   - {{title}} -> {{webTitle}}
 * - Updates dictionary template wording from "context" to "paragraphs"
 * - Renames dictionary output field labels:
 *   - Context -> Paragraphs
 *   - Context Translation -> Paragraphs Translation
 *
 * IMPORTANT: All values are hardcoded inline. Migration scripts are frozen
 * snapshots — never import constants or helpers that may change.
 */
function replaceTranslatePromptTokens(text: any): any {
  if (typeof text !== "string") {
    return text
  }

  return text
    .replaceAll("{{targetLang}}", "{{targetLanguage}}")
    .replaceAll("{{title}}", "{{webTitle}}")
    .replaceAll("{{summary}}", "{{webSummary}}")
}

function replaceCustomActionPromptTokens(text: any): any {
  if (typeof text !== "string") {
    return text
  }

  return text
    .replaceAll("{{context}}", "{{paragraphs}}")
    .replaceAll("{{targetLang}}", "{{targetLanguage}}")
    .replaceAll("{{title}}", "{{webTitle}}")
}

function migrateCustomPromptsConfig(config: any): any {
  if (!config || !Array.isArray(config.patterns)) {
    return config
  }

  return {
    ...config,
    patterns: config.patterns.map((pattern: any) => ({
      ...pattern,
      systemPrompt: replaceTranslatePromptTokens(pattern.systemPrompt),
      prompt: replaceTranslatePromptTokens(pattern.prompt),
    })),
  }
}

function isDictionaryLikeAction(action: any): boolean {
  return Array.isArray(action?.outputSchema)
    && action.outputSchema.some((field: any) =>
      field?.id === "dictionary-context"
      || field?.id === "default-dictionary-context"
      || field?.id === "dictionary-context-translation"
      || field?.id === "default-dictionary-context-translation",
    )
}

function migrateDictionaryText(text: any): any {
  if (typeof text !== "string") {
    return text
  }

  return text
    .replaceAll("surrounding context", "surrounding paragraphs")
    .replaceAll("provided context", "provided paragraphs")
    .replaceAll("Keep Context short and directly tied to the selected text.", "Keep Paragraphs exactly as provided in the prompt.")
    .replaceAll("- Context:", "- Paragraphs:")
    .replaceAll("- Context Translation:", "- Paragraphs Translation:")
    .replaceAll("\nContext: {{paragraphs}}", "\nParagraphs: {{paragraphs}}")
    .replaceAll("根據給定的詞語及其上下文，生成簡潔的詞典條目，匹配所需的輸出對象。", "根據給定的詞語及其周圍段落，生成簡潔的詞典條目，匹配所需的輸出對象。")
    .replaceAll("聚焦於最匹配所提供上下文的含義。", "聚焦於最匹配所提供段落內容的含義。")
    .replaceAll("保持語境簡短，直接關聯選中的文本。", "保持段落內容與提示詞一致，不要改寫。")
    .replaceAll("- 語境：", "- 段落內容：")
    .replaceAll("- 語境翻譯：", "- 段落翻譯：")
    .replaceAll("\n上下文：{{paragraphs}}", "\n段落內容：{{paragraphs}}")
}

function migrateDictionaryField(field: any): any {
  if (field?.id === "dictionary-context" || field?.id === "default-dictionary-context") {
    return {
      ...field,
      name: field.name === "語境"
        ? "段落內容"
        : field.name === "Context"
          ? "Paragraphs"
          : field.name,
      description: typeof field.description === "string"
        ? field.description
            .replaceAll("The context in the prompt above, don't change it.", "The paragraphs from the prompt above. Do not rewrite them.")
            .replaceAll("The paragraphs in the prompt above, don't change them.", "The paragraphs from the prompt above. Do not rewrite them.")
            .replaceAll("上方提示詞中的語境，請勿修改。", "使用上方提示詞中的原始段落內容，不要改寫。")
            .replaceAll("上方提示詞中的段落內容，請勿修改。", "使用上方提示詞中的原始段落內容，不要改寫。")
        : field.description,
    }
  }

  if (field?.id === "dictionary-context-translation" || field?.id === "default-dictionary-context-translation") {
    return {
      ...field,
      name: field.name === "語境翻譯"
        ? "段落翻譯"
        : field.name === "Context Translation"
          ? "Paragraphs Translation"
          : field.name,
      description: typeof field.description === "string"
        ? field.description
            .replaceAll("The translation of the context.", "The translation of the paragraphs.")
            .replaceAll("語境的翻譯。", "段落內容的翻譯。")
        : field.description,
    }
  }

  return field
}

function migrateCustomActions(actions: any): any {
  if (!Array.isArray(actions)) {
    return actions
  }

  return actions.map((action: any) => {
    const migratedAction = {
      ...action,
      systemPrompt: replaceCustomActionPromptTokens(action.systemPrompt),
      prompt: replaceCustomActionPromptTokens(action.prompt),
      outputSchema: Array.isArray(action.outputSchema)
        ? action.outputSchema.map((field: any) => ({
            ...field,
            description: replaceCustomActionPromptTokens(field.description),
          }))
        : action.outputSchema,
    }

    if (!isDictionaryLikeAction(migratedAction)) {
      return migratedAction
    }

    return {
      ...migratedAction,
      systemPrompt: migrateDictionaryText(migratedAction.systemPrompt),
      prompt: migrateDictionaryText(migratedAction.prompt),
      outputSchema: Array.isArray(migratedAction.outputSchema)
        ? migratedAction.outputSchema.map(migrateDictionaryField)
        : migratedAction.outputSchema,
    }
  })
}

export function migrate(oldConfig: any): any {
  return {
    ...oldConfig,
    translate: {
      ...oldConfig?.translate,
      customPromptsConfig: migrateCustomPromptsConfig(oldConfig?.translate?.customPromptsConfig),
    },
    selectionToolbar: {
      ...oldConfig?.selectionToolbar,
      customActions: migrateCustomActions(oldConfig?.selectionToolbar?.customActions),
    },
    videoSubtitles: {
      ...oldConfig?.videoSubtitles,
      customPromptsConfig: migrateCustomPromptsConfig(oldConfig?.videoSubtitles?.customPromptsConfig),
    },
  }
}
