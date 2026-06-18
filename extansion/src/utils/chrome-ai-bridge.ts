import type { Config } from "@/types/config/config"
import { storage } from "#imports"
import { CONFIG_STORAGE_KEY } from "@/utils/constants/config"
import { logger } from "@/utils/logger"

interface WSTranslateTask {
  task_id: string
  system_prompt?: string
  user_prompt: string
  temperature?: number
}

interface WSTranslateResult {
  task_id: string
  success: boolean
  result?: string
  error?: string
  elapsed_ms?: number
}

export class ChromeAIBridge {
  public url: string
  private socket: WebSocket | null = null
  private retryCount = 0
  private maxRetries = 5
  private reconnectTimer: any = null
  private isIntentionalDisconnect = false

  constructor(url: string) {
    this.url = url
  }

  public connect() {
    this.isIntentionalDisconnect = false
    if (this.socket) {
      this.disconnect()
    }

    logger.info(`[ChromeAIBridge] 正在連線至 ${this.url}`)

    // 主動檢查 Prompt API 支援性並警告
    const aiObj = (globalThis as any).chrome?.ai || (globalThis as any).ai
    if (!aiObj || !aiObj.languageModel) {
      logger.error("[ChromeAIBridge] ❌ 此 Chrome 環境不支援 Prompt API (chrome.ai.languageModel)")
    }

    try {
      this.socket = new WebSocket(this.url)
    }
    catch (e: any) {
      logger.error("[ChromeAIBridge] WebSocket 建立失敗", e)
      this.handleReconnect()
      return
    }

    this.socket.onopen = () => {
      logger.info("[ChromeAIBridge] WebSocket 連線成功！")
      this.retryCount = 0
    }

    this.socket.onclose = () => {
      logger.warn("[ChromeAIBridge] WebSocket 連線中斷")
      this.socket = null
      if (!this.isIntentionalDisconnect) {
        this.handleReconnect()
      }
    }

    this.socket.onerror = (err) => {
      logger.error("[ChromeAIBridge] WebSocket 錯誤", err)
    }

    this.socket.onmessage = async (event) => {
      try {
        const task: WSTranslateTask = JSON.parse(event.data)
        logger.info(`[ChromeAIBridge] 收到翻譯任務 ${task.task_id.slice(0, 8)}`)
        await this.handleTask(task)
      }
      catch (err: any) {
        logger.error("[ChromeAIBridge] 解析任務訊息失敗", err)
      }
    }
  }

  public disconnect() {
    this.isIntentionalDisconnect = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.socket) {
      try {
        this.socket.close()
      }
      catch {}
      this.socket = null
    }
    logger.info("[ChromeAIBridge] WebSocket 已主動中斷連線")
  }

  public getStatus(): "connected" | "connecting" | "disconnected" {
    if (!this.socket)
      return "disconnected"
    switch (this.socket.readyState) {
      case WebSocket.OPEN:
        return "connected"
      case WebSocket.CONNECTING:
        return "connecting"
      default:
        return "disconnected"
    }
  }

  private handleReconnect() {
    if (this.retryCount >= this.maxRetries) {
      logger.error(`[ChromeAIBridge] 已達最大重試次數 (${this.maxRetries})，停止自動重連`)
      return
    }

    const delay = 2 ** this.retryCount * 1000 // 1s, 2s, 4s, 8s, 16s
    this.retryCount++
    logger.info(`[ChromeAIBridge] 將在 ${delay / 1000} 秒後進行第 ${this.retryCount} 次重連...`)

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private async handleTask(task: WSTranslateTask) {
    const startTime = Date.now()
    let session: any = null

    try {
      const aiObj = (globalThis as any).chrome?.ai || (globalThis as any).ai
      if (!aiObj || !aiObj.languageModel) {
        throw new Error("此 Chrome 環境不支援 Prompt API (chrome.ai.languageModel)")
      }

      const capabilities = await aiObj.languageModel.capabilities()
      if (capabilities.available === "no") {
        throw new Error("Gemini Nano 尚未就緒 (capabilities.available is 'no')")
      }

      const sysPrompt = task.system_prompt || "You are a professional academic translator. Translate the given English text into Traditional Chinese (繁體中文). Preserve LaTeX math expressions exactly as-is. Output only the translated text, no explanations."

      session = await aiObj.languageModel.create({
        systemPrompt: sysPrompt,
        temperature: task.temperature ?? 0.3,
      })

      const translation = await session.prompt(task.user_prompt)
      const elapsed = Date.now() - startTime

      logger.info(`[ChromeAIBridge] 任務 ${task.task_id.slice(0, 8)} 翻譯成功，耗時 ${elapsed}ms`)
      this.sendResult({
        task_id: task.task_id,
        success: true,
        result: translation,
        elapsed_ms: elapsed,
      })
    }
    catch (err: any) {
      const elapsed = Date.now() - startTime
      logger.error(`[ChromeAIBridge] 任務 ${task.task_id.slice(0, 8)} 失敗: ${err.message}`)
      this.sendResult({
        task_id: task.task_id,
        success: false,
        error: err.message,
        elapsed_ms: elapsed,
      })
    }
    finally {
      if (session) {
        try {
          await session.destroy()
        }
        catch {}
      }
    }
  }

  private sendResult(result: WSTranslateResult) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      logger.error(`[ChromeAIBridge] 無法傳送結果，WebSocket 未連線 | task_id=${result.task_id.slice(0, 8)}`)
      return
    }
    try {
      this.socket.send(JSON.stringify(result))
    }
    catch (err: any) {
      logger.error(`[ChromeAIBridge] 傳送結果失敗: ${err.message}`)
    }
  }
}

// 全域單例與儲存監聽管理
let activeBridge: ChromeAIBridge | null = null

export function initChromeAIBridge() {
  const syncBridge = (config: Config | null) => {
    if (!config)
      return
    const chromeAIProvider = config.providersConfig.find((p: any) => p.provider === "chrome-ai")
    const enabled = chromeAIProvider?.enabled ?? false
    const bridgeUrl = (chromeAIProvider as any)?.bridgeUrl || "ws://localhost:8001/ws"

    if (enabled) {
      if (!activeBridge) {
        activeBridge = new ChromeAIBridge(bridgeUrl)
        activeBridge.connect()
      }
      else if (activeBridge.url !== bridgeUrl) {
        logger.info(`[ChromeAIBridge] Bridge URL 變更，重新連線 | 舊=${activeBridge.url} 新=${bridgeUrl}`)
        activeBridge.disconnect()
        activeBridge = new ChromeAIBridge(bridgeUrl)
        activeBridge.connect()
      }
      else if (activeBridge.getStatus() === "disconnected") {
        logger.info("[ChromeAIBridge] Bridge 處於中斷狀態，嘗試重新連線")
        activeBridge.connect()
      }
    }
    else {
      if (activeBridge) {
        logger.info("[ChromeAIBridge] chrome-ai 已停用，中斷連線")
        activeBridge.disconnect()
        activeBridge = null
      }
    }
  }

  // 初始讀取
  storage.getItem<Config>(`local:${CONFIG_STORAGE_KEY}`).then(syncBridge).catch((err) => {
    logger.error("[ChromeAIBridge] 讀取設定檔失敗", err)
  })

  // 監聽變更
  storage.watch<Config>(`local:${CONFIG_STORAGE_KEY}`, syncBridge)
}
