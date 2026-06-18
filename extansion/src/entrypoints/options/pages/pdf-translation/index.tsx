import type { PdfTranslationOutputMode, PdfTranslationProvider } from "@/types/config/pdf-translation"
import { deepmerge } from "deepmerge-ts"
import { useAtom } from "jotai"
import { HelpTooltip } from "@/components/help-tooltip"
import { Field, FieldContent, FieldLabel } from "@/components/ui/base-ui/field"
import { Input } from "@/components/ui/base-ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/base-ui/select"
import { Switch } from "@/components/ui/base-ui/switch"
import { PDF_TRANSLATION_OUTPUT_MODES, PDF_TRANSLATION_PROVIDERS } from "@/types/config/pdf-translation"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { i18n } from "@/utils/i18n"
import { ConfigCard } from "../../components/config-card"
import { PageLayout } from "../../components/page-layout"

export function PdfTranslationPage() {
  return (
    <PageLayout title={i18n.t("options.pdfTranslation.title")}>
      <div className="*:border-b [&>*:last-child]:border-b-0">
        <PdfTranslationConfig />
      </div>
    </PageLayout>
  )
}

function PdfTranslationConfig() {
  const [pdfTranslationConfig, setPdfTranslationConfig] = useAtom(configFieldsAtomMap.pdfTranslation)

  const updateConfig = (patch: Partial<typeof pdfTranslationConfig>) => {
    void setPdfTranslationConfig(deepmerge(pdfTranslationConfig, patch))
  }

  const handleProviderChange = (provider: PdfTranslationProvider | null) => {
    if (!provider)
      return
    updateConfig({ provider })
  }

  const handleOutputModeChange = (outputMode: PdfTranslationOutputMode | null) => {
    if (!outputMode)
      return
    updateConfig({ outputMode })
  }

  return (
    <ConfigCard
      id="pdf-translation-config"
      title={i18n.t("options.pdfTranslation.config.title")}
      description={i18n.t("options.pdfTranslation.config.description")}
    >
      <div className="space-y-6">
        <Field orientation="horizontal">
          <FieldContent className="self-center">
            <FieldLabel htmlFor="pdf-translation-toggle">
              {i18n.t("options.pdfTranslation.config.enable")}
              <HelpTooltip>{i18n.t("options.pdfTranslation.config.enableDescription")}</HelpTooltip>
            </FieldLabel>
          </FieldContent>
          <Switch
            id="pdf-translation-toggle"
            checked={pdfTranslationConfig.enabled}
            onCheckedChange={checked => updateConfig({ enabled: checked })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="pdf-translation-service-url">
            {i18n.t("options.pdfTranslation.config.serviceUrl")}
            <HelpTooltip>{i18n.t("options.pdfTranslation.config.serviceUrlDescription")}</HelpTooltip>
          </FieldLabel>
          <Input
            id="pdf-translation-service-url"
            value={pdfTranslationConfig.serviceUrl}
            onChange={event => updateConfig({ serviceUrl: event.target.value })}
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent className="self-center">
            <FieldLabel>{i18n.t("options.pdfTranslation.config.provider")}</FieldLabel>
          </FieldContent>
          <Select value={pdfTranslationConfig.provider} onValueChange={handleProviderChange}>
            <SelectTrigger className="w-56">
              <SelectValue render={<span />}>
                {i18n.t(`options.pdfTranslation.config.providers.${pdfTranslationConfig.provider}`)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {PDF_TRANSLATION_PROVIDERS.map(provider => (
                  <SelectItem key={provider} value={provider}>
                    {i18n.t(`options.pdfTranslation.config.providers.${provider}`)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field orientation="horizontal">
          <FieldContent className="self-center">
            <FieldLabel>{i18n.t("options.pdfTranslation.config.outputMode")}</FieldLabel>
          </FieldContent>
          <Select value={pdfTranslationConfig.outputMode} onValueChange={handleOutputModeChange}>
            <SelectTrigger className="w-56">
              <SelectValue render={<span />}>
                {i18n.t(`options.pdfTranslation.config.outputModes.${pdfTranslationConfig.outputMode}`)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {PDF_TRANSLATION_OUTPUT_MODES.map(outputMode => (
                  <SelectItem key={outputMode} value={outputMode}>
                    {i18n.t(`options.pdfTranslation.config.outputModes.${outputMode}`)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </ConfigCard>
  )
}
