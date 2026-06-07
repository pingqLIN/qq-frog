# Interface Tour

QQ Frog is a Chrome extension with several small surfaces instead of one large app window. This tour is based on the reviewed interface screenshots in the local `appsrc/` intake folder.

The raw intake screenshots stay local because they include browser chrome, live web pages, and media-player context. Publishable screenshots should be curated separately under `extansion/src/assets/demo/`.

## Options Page

The Options page is the configuration center for the local-first fork.

- General maps each feature to its active provider, including page translation, video subtitles, selection toolbar translation, input translation, custom AI actions, and language detection.
- API Providers stores user-managed provider entries such as Google Translate, Gemini, DeepLX, OpenAI, and OpenAI-compatible providers. API keys are entered by the user and are not bundled in the repository.
- Custom AI Actions defines reusable structured actions for selected text. The reviewed configuration emphasizes publication-quality Traditional Chinese output for Taiwan, terminology preservation, and source-faithful translation.
- Overlay Tools configures on-page entry points such as the floating button, selection toolbar, and context menu.

## Popup

The toolbar popup is the fast path for page translation.

- Choose source and target languages.
- Select translation mode, such as bilingual output.
- Pick the translation service for the current action.
- Toggle site-level behavior, including disabling the extension on the current site, always translating the site, hover translation, and AI smart context.
- Open Options or More actions from the bottom bar.

## Page Overlays

QQ Frog exposes lightweight page-level controls for reading without leaving the current tab.

- The context menu adds a QQ Frog Translate command for selected text or current-page actions.
- The selection toolbar appears near highlighted text and can send the selected passage into translation workflows.
- The floating button gives quick access to on-page translation controls.

## Side Panel And Translation Hub

The side panel is suited for longer selected passages and provider comparison.

- The Translate tab accepts source text, target language, translation mode, and provider presets.
- Provider rows make it possible to compare or rerun translation through different services.
- The panel keeps the original page visible, which is useful for context-sensitive reading and review.

## Video Subtitles

The video subtitle surface is focused on YouTube subtitle workflows.

- The player overlay can enable or disable QQ Frog video subtitles and open subtitle tools.
- The side panel Video Subtitles tab configures subtitle enablement, auto-enable behavior, AI segmentation, display mode, position, opacity, and font styling.
- The reviewed flow shows bilingual subtitles over video playback while keeping style controls in the side panel.

## Documentation Placement

- Keep README screenshots short and product-facing.
- Use this document for the full interface map and workflow notes.
- Keep raw screenshot batches in `appsrc/` or another ignored intake folder until a curated asset is intentionally prepared for publication.
