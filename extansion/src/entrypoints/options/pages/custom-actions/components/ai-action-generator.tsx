import type {
  SelectionToolbarCustomAction,
  SelectionToolbarCustomActionOutputField,
  SelectionToolbarCustomActionOutputType,
} from "@/types/config/selection-toolbar"
import { Icon } from "@iconify/react"
import { useAtom, useAtomValue } from "jotai"
import { useMemo, useState } from "react"
import ProviderSelector from "@/components/llm-providers/provider-selector"
import { Alert, AlertDescription } from "@/components/ui/base-ui/alert"
import { Button } from "@/components/ui/base-ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/base-ui/field"
import { Textarea } from "@/components/ui/base-ui/textarea"
import { isLLMProviderConfig } from "@/types/config/provider"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import {
  createOutputSchemaField,
  DEFAULT_ACTION_NAME,
  ICON_PATTERN,
  SELECTION_TOOLBAR_CUSTOM_ACTION_TOKENS,
} from "@/utils/constants/custom-action"
import { getRandomUUID } from "@/utils/crypto-polyfill"
import { extractAISDKErrorMessage } from "@/utils/error/extract-message"
import { i18n } from "@/utils/i18n"
import { sendMessage } from "@/utils/message"
import { getUniqueName } from "@/utils/name"
import { cn } from "@/utils/styles/utils"
import { selectedCustomActionIdAtom } from "../atoms"

interface GeneratedCustomActionDraft {
  name: string
  icon: string
  systemPrompt: string
  prompt: string
  outputSchema: Array<{
    name: string
    type: SelectionToolbarCustomActionOutputType
    description: string
    speaking?: boolean
  }>
}

const GENERATOR_SYSTEM_PROMPT = `You design custom AI actions for a browser extension.
Return only valid JSON. Do not wrap the JSON in markdown.

The user will describe a feature they want. Convert it into:
- a concise action name
- an Iconify icon name, preferably tabler:*
- a systemPrompt that defines role, goal, and rules
- a prompt that includes the right placeholders
- an outputSchema with 1 to 6 useful fields

Available placeholders:
{{selection}} selected text
{{paragraphs}} surrounding paragraph context
{{targetLanguage}} the user's target language
{{webTitle}} current page title
{{webContent}} current page text

Use placeholders only when they help the action. Prefer {{selection}} for selected text actions.
Make prompts reusable, explicit, and safe against irrelevant context.
If the user's request is written in Chinese, use Traditional Chinese for action names and field labels.

JSON shape:
{
  "name": "Action name",
  "icon": "tabler:sparkles",
  "systemPrompt": "...",
  "prompt": "...",
  "outputSchema": [
    { "name": "Result", "type": "string", "description": "What this field contains", "speaking": true }
  ]
}`

export function AIActionGenerator() {
  const [selectionToolbarConfig, setSelectionToolbarConfig] = useAtom(configFieldsAtomMap.selectionToolbar)
  const providersConfig = useAtomValue(configFieldsAtomMap.providersConfig)
  const [selectedCustomActionId, setSelectedCustomActionId] = useAtom(selectedCustomActionIdAtom)
  const [description, setDescription] = useState("")
  const [selectedProviderId, setSelectedProviderId] = useState("")
  const [draft, setDraft] = useState<GeneratedCustomActionDraft | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const customActions = selectionToolbarConfig.customActions ?? []
  const selectedAction = customActions.find(action => action.id === selectedCustomActionId)
  const llmProviders = useMemo(
    () => providersConfig.filter(provider => provider.enabled && isLLMProviderConfig(provider)),
    [providersConfig],
  )

  const activeProviderId = llmProviders.some(provider => provider.id === selectedProviderId)
    ? selectedProviderId
    : selectedAction?.providerId && llmProviders.some(provider => provider.id === selectedAction.providerId)
      ? selectedAction.providerId
      : llmProviders[0]?.id ?? ""

  const canGenerate = description.trim().length > 0 && activeProviderId.length > 0 && !isGenerating

  async function handleGenerate() {
    if (!canGenerate) {
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await sendMessage("backgroundGenerateText", {
        providerId: activeProviderId,
        system: GENERATOR_SYSTEM_PROMPT,
        prompt: buildGeneratorPrompt(description),
        temperature: 0.2,
        maxRetries: 0,
      })
      setDraft(normalizeGeneratedDraft(response.text))
    }
    catch (err) {
      setError(extractAISDKErrorMessage(err))
    }
    finally {
      setIsGenerating(false)
    }
  }

  async function handleApply() {
    if (!draft || !activeProviderId) {
      return
    }

    const normalizedAction = createActionFromDraft(draft, activeProviderId, customActions, selectedAction)
    const nextCustomActions = selectedAction
      ? customActions.map(action => action.id === selectedAction.id ? normalizedAction : action)
      : [...customActions, normalizedAction]

    await setSelectionToolbarConfig({
      ...selectionToolbarConfig,
      customActions: nextCustomActions,
    })

    setSelectedCustomActionId(normalizedAction.id)
  }

  return (
    <section className="flex flex-col gap-4 border-b pb-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Icon icon="tabler:sparkles" className="size-4 text-primary" />
          <h3 className="text-sm font-medium">
            {i18n.t("options.floatingButtonAndToolbar.selectionToolbar.customActions.aiGenerator.title")}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {i18n.t("options.floatingButtonAndToolbar.selectionToolbar.customActions.aiGenerator.description")}
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
        <Field>
          <FieldLabel>
            {i18n.t("options.floatingButtonAndToolbar.selectionToolbar.customActions.aiGenerator.inputLabel")}
          </FieldLabel>
          <Textarea
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder={i18n.t("options.floatingButtonAndToolbar.selectionToolbar.customActions.aiGenerator.inputPlaceholder")}
            className="min-h-24 resize-y"
            disabled={llmProviders.length === 0}
          />
          <FieldDescription>
            {i18n.t("options.floatingButtonAndToolbar.selectionToolbar.customActions.aiGenerator.inputHint")}
          </FieldDescription>
        </Field>

        <div className="flex flex-col gap-3">
          <Field>
            <FieldLabel>
              {i18n.t("options.floatingButtonAndToolbar.selectionToolbar.customActions.aiGenerator.provider")}
            </FieldLabel>
            <ProviderSelector
              providers={llmProviders}
              value={activeProviderId}
              onChange={setSelectedProviderId}
              placeholder={i18n.t("options.floatingButtonAndToolbar.selectionToolbar.customActions.form.selectProvider")}
              className="w-full"
            />
          </Field>

          <Button
            type="button"
            className="w-full"
            disabled={!canGenerate}
            onClick={() => void handleGenerate()}
          >
            {isGenerating
              ? i18n.t("options.floatingButtonAndToolbar.selectionToolbar.customActions.aiGenerator.generating")
              : i18n.t("options.floatingButtonAndToolbar.selectionToolbar.customActions.aiGenerator.generate")}
          </Button>
        </div>
      </div>

      {llmProviders.length === 0 && (
        <Alert>
          <AlertDescription>
            {i18n.t("options.floatingButtonAndToolbar.selectionToolbar.customActions.noEnabledLlmProvider")}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {draft && (
        <GeneratedDraftPreview
          draft={draft}
          isUpdatingExisting={!!selectedAction}
          onApply={() => void handleApply()}
        />
      )}
    </section>
  )
}

function GeneratedDraftPreview({
  draft,
  isUpdatingExisting,
  onApply,
}: {
  draft: GeneratedCustomActionDraft
  isUpdatingExisting: boolean
  onApply: () => void
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon icon={draft.icon} className="size-4 shrink-0 text-zinc-600 dark:text-zinc-300" />
            <div className="truncate text-sm font-medium">{draft.name}</div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.outputSchema.map(field => (
              <span
                key={`${field.name}-${field.type}`}
                className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground"
              >
                {field.name}
              </span>
            ))}
          </div>
        </div>

        <Button type="button" size="sm" onClick={onApply} className="shrink-0">
          {isUpdatingExisting
            ? i18n.t("options.floatingButtonAndToolbar.selectionToolbar.customActions.aiGenerator.applyToCurrent")
            : i18n.t("options.floatingButtonAndToolbar.selectionToolbar.customActions.aiGenerator.createAction")}
        </Button>
      </div>

      <div className="mt-3 grid gap-3 text-xs text-muted-foreground lg:grid-cols-2">
        <PromptPreview
          label={i18n.t("options.floatingButtonAndToolbar.selectionToolbar.customActions.form.systemPrompt")}
          value={draft.systemPrompt}
        />
        <PromptPreview
          label={i18n.t("options.floatingButtonAndToolbar.selectionToolbar.customActions.form.prompt")}
          value={draft.prompt}
        />
      </div>
    </div>
  )
}

function PromptPreview({ label, value }: { label: string, value: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 font-medium text-foreground">{label}</div>
      <pre className={cn(
        "max-h-32 overflow-auto whitespace-pre-wrap rounded-md border bg-background p-2 font-sans text-xs",
        "break-words [overflow-wrap:anywhere]",
      )}
      >
        {value}
      </pre>
    </div>
  )
}

function buildGeneratorPrompt(description: string) {
  return `User request:
${description.trim()}

Create a reusable custom AI action. Include appropriate placeholders from:
${SELECTION_TOOLBAR_CUSTOM_ACTION_TOKENS.map(token => `{{${token}}}`).join(", ")}

Return only JSON.`
}

function normalizeGeneratedDraft(text: string): GeneratedCustomActionDraft {
  const parsed = parseJsonObject(text)
  const draft = parsed as Partial<GeneratedCustomActionDraft>
  const outputSchema = Array.isArray(draft.outputSchema)
    ? draft.outputSchema
    : []

  return {
    name: getStringOrDefault(draft.name, DEFAULT_ACTION_NAME),
    icon: ICON_PATTERN.test(getStringOrDefault(draft.icon, "")) ? getStringOrDefault(draft.icon, "") : "tabler:sparkles",
    systemPrompt: getStringOrDefault(draft.systemPrompt, ""),
    prompt: getStringOrDefault(draft.prompt, "{{selection}}"),
    outputSchema: normalizeOutputSchema(outputSchema),
  }
}

function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim()
  const candidate = stripJsonFence(trimmed)
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")

  if (start < 0 || end <= start) {
    throw new Error(i18n.t("options.floatingButtonAndToolbar.selectionToolbar.customActions.aiGenerator.invalidResponse"))
  }

  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1))
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  }
  catch {
    // Fall through to a localized error below.
  }

  throw new Error(i18n.t("options.floatingButtonAndToolbar.selectionToolbar.customActions.aiGenerator.invalidResponse"))
}

function stripJsonFence(text: string) {
  if (!text.startsWith("```")) {
    return text
  }

  const firstLineEnd = text.indexOf("\n")
  const closingFenceStart = text.lastIndexOf("```")
  if (firstLineEnd < 0 || closingFenceStart <= firstLineEnd) {
    return text
  }

  return text.slice(firstLineEnd + 1, closingFenceStart).trim()
}

function normalizeOutputSchema(schema: unknown[]): GeneratedCustomActionDraft["outputSchema"] {
  const fields = schema
    .map((field): GeneratedCustomActionDraft["outputSchema"][number] | null => {
      if (!field || typeof field !== "object") {
        return null
      }

      const source = field as Record<string, unknown>
      const name = getStringOrDefault(source.name, "").trim()
      if (!name) {
        return null
      }

      const type: SelectionToolbarCustomActionOutputType = source.type === "number" ? "number" : "string"

      return {
        name,
        type,
        description: getStringOrDefault(source.description, ""),
        speaking: source.speaking === true,
      }
    })
    .filter((field): field is GeneratedCustomActionDraft["outputSchema"][number] => field !== null)
    .slice(0, 6)

  return fields.length > 0
    ? fields
    : [{
        name: i18n.t("options.floatingButtonAndToolbar.selectionToolbar.customActions.form.defaultFieldName"),
        type: "string",
        description: "",
        speaking: true,
      }]
}

function createActionFromDraft(
  draft: GeneratedCustomActionDraft,
  providerId: string,
  customActions: SelectionToolbarCustomAction[],
  selectedAction?: SelectionToolbarCustomAction,
): SelectionToolbarCustomAction {
  const existingNames = new Set(
    customActions
      .filter(action => action.id !== selectedAction?.id)
      .map(action => action.name),
  )
  const name = getUniqueName(draft.name.trim() || DEFAULT_ACTION_NAME, existingNames)
  const outputSchema = draft.outputSchema.map<SelectionToolbarCustomActionOutputField>(field =>
    createOutputSchemaField(field.name, field.type, field.description, undefined, field.speaking === true),
  )

  return {
    id: selectedAction?.id ?? getRandomUUID(),
    enabled: selectedAction?.enabled ?? true,
    providerId,
    name,
    icon: draft.icon,
    systemPrompt: draft.systemPrompt,
    prompt: draft.prompt,
    outputSchema,
  }
}

function getStringOrDefault(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback
}
