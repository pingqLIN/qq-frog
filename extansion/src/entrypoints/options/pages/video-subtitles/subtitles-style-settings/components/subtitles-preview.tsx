import { useAtomValue } from "jotai"
import { Activity } from "react"
import { GradientBackground } from "@/components/gradient-background"
import { Label } from "@/components/ui/base-ui/label"
import { MainSubtitle, TranslationSubtitle } from "@/entrypoints/subtitles.content/ui/subtitle-lines"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { i18n } from "@/utils/i18n"
import { cn } from "@/utils/styles/utils"

export function SubtitlesPreview() {
  const { style } = useAtomValue(configFieldsAtomMap.videoSubtitles)
  const { displayMode, translationPosition, container } = style

  const sampleOriginal = "One, second, divination, reach, lack, vessel, boat, horn, flight, ghost, ephedra, cauldron, nose, teeth, dragon, flute, thicket, algae, broth, satchel, cliff, cavity, key, donkey, horse, parrot, steed, qilin, broken tooth, flood, coarse, appeal, and yue."
  const sampleTranslation = "一乙卜及乏皿舟角其飛鬼麻黃鼎鼻齒龍龠叢藻羹曩囊巖齲鑰驢驤鸚驪麢齾灪麤籲龥"

  const translationAbove = translationPosition === "above"
  const showMain = displayMode !== "translationOnly"
  const showTranslation = displayMode !== "originalOnly"

  const containerStyle = {
    backgroundColor: `rgba(0, 0, 0, ${container.backgroundOpacity / 100})`,
  }

  return (
    <div className="mb-4">
      <Label className="mb-2 block text-sm font-medium">
        {i18n.t("options.videoSubtitles.style.preview")}
      </Label>
      <GradientBackground>
        <div className="relative w-fit min-w-full h-fit min-h-32 rounded-lg overflow-hidden flex items-center justify-center p-4">
          <div
            className="flex flex-col gap-2 px-3 py-2 rounded text-center text-white max-w-[90%]"
            style={containerStyle}
          >
            <Activity mode={showMain ? "visible" : "hidden"}>
              <MainSubtitle content={sampleOriginal} className={cn("text-sm", translationAbove ? "order-2" : "order-1")} />
            </Activity>

            <Activity mode={showTranslation ? "visible" : "hidden"}>
              <TranslationSubtitle content={sampleTranslation} className={cn("text-sm", translationAbove ? "order-1" : "order-2")} />
            </Activity>
          </div>
        </div>
      </GradientBackground>
    </div>
  )
}
