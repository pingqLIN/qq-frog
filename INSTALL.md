# QQ Frog Installation Guide

## 1. Environment Requirements

- Node.js `>= 22.0.0`
- `pnpm` 10.x (auto-managed by corepack with modern Node)
- Chrome/Edge/Firefox desktop browser for testing
- Optional: Python 3.11 for local PDF translation bridge (OCR and Native Messaging mode)
- Git (for contributors and source builds)

## 2. Get the Source

```bash
git clone <your-forked-repo-url>
cd qq-frog
```

## 3. Install Extension Dependencies

```bash
pnpm install --frozen-lockfile
```

## 4. Run Extension in Development

```bash
pnpm dev
```

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Load the unpacked extension from `extansion/` (or your local repo path).

If you prefer a clean build before loading:

```bash
pnpm build
```

## 5. Build and Package

```bash
pnpm build
pnpm zip              # Chrome package
pnpm zip:firefox      # Firefox package
pnpm zip:edge         # Edge package
```

## 6. Optional: Local PDF Translation Bridge

QQ Frog PDF translation can use a local Python bridge. If you do not enable this, web translation still works.

### 6.1 Install bridge Python dependencies

```bash
cd bridge
py -3.11 -m venv ..\.venv-paddleocr
..\.venv-paddleocr\Scripts\python.exe -m pip install --upgrade pip setuptools wheel
..\.venv-paddleocr\Scripts\python.exe -m pip install paddlepaddle -i https://www.paddlepaddle.org.cn/packages/stable/cpu/
..\.venv-paddleocr\Scripts\python.exe -m pip install -r requirements-paddleocr.txt
```

If you use `requirements-paddleocr.txt`, you can run local OCR translation.

### 6.2 Start the bridge server

```bash
..\.venv-paddleocr\Scripts\python.exe -m uvicorn server:app --host 0.0.0.0 --port 8001
```

Open:

- `http://localhost:8001/ui` (optional local Gemini Nano helper page)
- `http://localhost:8001/pdf/health` (health check)

### 6.3 Native Messaging (optional local Windows host)

If you want QQ Frog to start the local bridge process automatically:

1. Open extension details page and copy the 32-character extension ID from `chrome://extensions`.
2. Run:

```powershell
cd bridge
.\install_native_host_windows.ps1 -ExtensionId "<QQ_FROG_EXTENSION_ID>"
```

3. In QQ Frog Options → PDF Translation, use localhost bridge URL and run the bridge test.

## 7. Bridge Verification

```bash
curl http://localhost:8001/pdf/health
```

If the response is successful and OCR status is available, bridge integration is ready for extension-side checks.

## 8. Development Testing

- `SKIP_FREE_API=true pnpm test` to skip live translation API tests during CI style validation.
- `pnpm type-check` and `pnpm lint`.

## 9. Notes for Public Repository Readiness

- Do not commit local output files (for example `extansion/pdf-result.html`, local logs, `node_modules`, `.output`, `.audit`).
- Do not commit secret keys or runtime credentials.
- Keep external integrations configurable and documented.

For detailed bridge behavior and provider routing, see [bridge/README.md](./bridge/README.md).
