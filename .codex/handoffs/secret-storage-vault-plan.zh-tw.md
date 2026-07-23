# 密碼儲存庫改造交接計畫

此文件承接 side conversation 的結論，供 qq-frog 下一階段對話或實作使用。

## 目標

目前 API key 若跟著 Chrome 擴充設定保存，擴充被刪除、重新載入、ID 改變或 storage 被清掉時會一起消失。下一階段目標是讓敏感資訊脫離 extension storage，改由本機安全儲存層保存，並讓擴充只保存可復原的參照資訊。

長期目標是：

- Extension config 只保存 provider metadata 與 `secretRef`。
- Windows 優先使用 Credential Manager 或 DPAPI user scope。
- macOS 後續支援 Keychain。
- Linux 後續支援 Secret Service/libsecret 或 KWallet。
- 沒有系統密碼庫時，降級為使用者密碼保護的加密本機 vault。
- 最穩版本由本機 bridge 代理 provider API 請求，讓 API key 不回到 extension 記憶體。

## 建議架構

採用兩階段路線：

1. **快速過渡版：Just-in-time secret retrieval**
   - 擴充保存 `apiKeySecretRef`。
   - 需要呼叫 provider 時，透過 native host 或 bridge 暫時取得 API key。
   - 優點是改動小，可沿用現有 provider adapter。
   - 缺點是 API key 仍會短暫進入 extension 記憶體。

2. **目標版：Brokered secret use**
   - 擴充只送出 provider request payload 與 `secretRef`。
   - bridge/native host 從 OS vault 取出 secret 並代為呼叫 provider。
   - API key 不回傳給 extension。
   - 優點是安全邊界更清楚，缺點是需要整理 provider proxy、錯誤分類與相容性。

## SecretRef 模型

正常設定只保存參照，不保存明文 secret。

```ts
interface SecretRef {
  backend: "os-vault" | "encrypted-file" | "session"
  service: "qq-frog"
  account: string
  label?: string
  updatedAt?: number
}
```

建議 account 命名：

```text
provider:<providerId>:apiKey
```

Provider 設定遷移後應類似：

```ts
interface ProviderSecretFields {
  apiKey?: undefined
  apiKeySecretRef?: SecretRef
}
```

## Bridge / Native Host API

第一階段至少支援：

- `secret.status`
- `secret.set`
- `secret.get`
- `secret.delete`
- `secret.list`
- `secret.testProvider`

第二階段加入：

- `provider.request`
- `provider.models`
- `provider.health`

安全規則：

- Native Messaging `allowed_origins` 必須綁定真實 extension ID。
- 未知 command 必須拒絕。
- log 與 error 不可包含 secret 明文或遮罩前明文。
- 回傳錯誤需分類：`vault-unavailable`、`secret-missing`、`provider-auth-failed`、`network-failed`、`bridge-not-running`。

## 遷移步驟

1. 新增 `SecretRef` schema，保持 legacy `apiKey` 可讀。
2. 在 bridge/native host 增加 secret commands。
3. 實作 Windows vault adapter。
4. API Provider UI 顯示密鑰狀態：
   - 尚未儲存
   - 已存入 Windows 密碼庫
   - 需要遷移
   - 密碼庫不可用
5. 增加「將現有 API key 移到系統密碼庫」動作。
6. `secret.set` 成功且 provider 測試通過後，清除 plaintext `apiKey`。
7. 匯出/備份設定時，只包含 `secretRef`，不包含 plaintext API key。
8. 增加使用者密碼加密的 secrets 匯出/匯入功能。
9. Provider request 先支援 just-in-time retrieval，再逐步改成 brokered request。

## 完成條件

- 現有 provider API key 可遷移到 Windows vault。
- 遷移後 extension config 不再保存 plaintext API key。
- Provider connection test 可透過 `secretRef` 成功。
- 刪除或重新安裝 extension 不會刪除 Windows vault 裡的 secret。
- 重新安裝後，只要 native host 修復並授權，就能重新連回既有 secret。
- config backup/export 不包含 plaintext API key。
- 錯誤訊息能區分 missing secret、vault failure、provider auth failure、bridge failure。
- log 全面 redaction。
- 測試覆蓋 migration、missing secret、delete secret、redaction、provider test。

## 外部審查 Gate

本 side conversation 沒有實際啟動外部代理，因此審查 gate 目前不可標記為 passed。

建議下一階段使用 `external-audit-orchestrator` 建立 audit packet，並要求兩個獨立審查 lens：

1. **Security reviewer**
   - 檢查 threat model、secret exposure paths、native host origin restrictions、redaction、backup encryption。

2. **Product/runtime reviewer**
   - 檢查重裝/換 ID 復原、平台 fallback、診斷訊息、bridge lifecycle、migration safety。

Gate 狀態在有原始、實質 reviewer output 前應為：

```text
unavailable
```

## 已建立全域技能

side conversation 已建立並驗證以下 Codex skill：

```text
C:\Users\miles\.codex\skills\secret-storage-architecture
```

用途：

- 重複評估 API key、OAuth token、provider secret、本機 bridge secret 的儲存方案。
- 根據平台、架構、secret 類型、同步需求、復原需求給出建議。
- 產出 threat model、完成條件、審查重點與 fallback 設計。

觸發方式：

```text
$secret-storage-architecture
```

## Reference Inputs

- `local-project`: `Q:\Projects\external-audit-orchestrator\SKILL.md` - 用於外部審查 gate、報告格式與未執行 reviewer 不可標記 passed 的規則。
- `local-skill`: `C:\Users\miles\.codex\skills\.system\skill-creator\SKILL.md` - 用於建立技能結構與驗證流程。
- `local-skill`: `C:\Users\miles\.codex\skills\secret-storage-architecture` - side conversation 產出的可重用 secret storage 評估技能。
