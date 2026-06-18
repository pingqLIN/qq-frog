"""
文字分段處理 — 針對 Gemini Nano 的 Context Window 限制
語言對：英文 → 繁體中文（目前版本）
"""
import re
import logging

logger = logging.getLogger(__name__)

MAX_CHARS_PER_CHUNK = 2000  # 保守估計，避免 token 溢出

# 匹配 block LaTeX ($$...$$)、inline LaTeX ($...$)、以及 LaTeX environment (\begin{}...\end{})
LATEX_RE = re.compile(
    r'(?P<block>\$\$.*?\$\$)|'
    r'(?P<inline>\$[^\$\n]+\$)|'
    r'(?P<env>\\begin\{(?P<envname>[a-zA-Z*]+)\}.*?\\end\{(?P=envname)\})',
    re.DOTALL
)

def extract_latex(text: str) -> tuple[str, dict[str, str]]:
    """
    提取 LaTeX 公式，用佔位符替換，翻譯後再還原。
    支援：$...$、$$...$$、\\begin{}...\\end{}
    回傳 (處理後文字, {佔位符: 原始公式})
    """
    placeholders = {}
    index = 0

    def repl(match):
        nonlocal index
        val = match.group(0)
        ph = f"[[LATEX_{index}]]"
        placeholders[ph] = val
        index += 1
        return ph

    protected_text = LATEX_RE.sub(repl, text)
    logger.info(f"[Chunker] 提取了 {index} 個 LaTeX 公式佔位符")
    return protected_text, placeholders

def restore_latex(text: str, placeholders: dict[str, str]) -> str:
    """將佔位符還原為原始 LaTeX 公式，包含對模型可能輸出空格或大小寫變化的容錯"""
    restored = text
    for ph, orig_val in placeholders.items():
        # ph 格式如 [[LATEX_0]]
        # 提取編號
        try:
            num = ph.replace("[", "").replace("]", "").split("_")[1]
        except Exception:
            # Fallback
            restored = restored.replace(ph, orig_val)
            continue

        # 模型在輸出時可能會將 [[LATEX_0]] 變成 [[ latex_0 ]]、[[ Latex_0 ]] 或 [[LATEX_0]] 等
        # 用不區分大小寫且允許空格的 regex 來進行安全替換
        pattern = re.compile(rf'\[\s*\[\s*LATEX\s*_\s*{num}\s*\]\s*\]', re.IGNORECASE)

        # 執行替換。使用 lambda 防止 orig_val 含有 backslash 等特殊字元被 regex 誤判
        restored = pattern.sub(lambda m: orig_val, restored)

    # 最後做一次 fallback 直接替換，以防萬一
    for ph, orig_val in placeholders.items():
        restored = restored.replace(ph, orig_val)

    return restored

def split_text(text: str, max_chars: int = MAX_CHARS_PER_CHUNK) -> list[str]:
    """
    依句號、換行符切分段落，確保每段不超過 max_chars
    優先在句子邊界切分，不截斷 LaTeX 公式
    """
    if len(text) <= max_chars:
        return [text]

    # 1. 依行切分
    lines = text.split("\n")
    sub_units = []

    for line in lines:
        if len(line) <= max_chars:
            sub_units.append(line)
        else:
            # 2. 如果單行長度依然超過 max_chars，則依句子邊界進一步細分
            # 使用 regex 切分，保留句尾標點符號 (.?! 後跟著空格或換行)
            sentence_ends = re.split(r'(?<=[.?!])\s+', line)
            for sentence in sentence_ends:
                s = sentence.strip()
                if not s:
                    continue
                # 如果單個句子還是非常長（極少見），則直接按長度硬切
                while len(s) > max_chars:
                    sub_units.append(s[:max_chars])
                    s = s[max_chars:]
                if s:
                    sub_units.append(s)
        # 加上換行標記，表示行邊界
        sub_units.append("\n")

    # 3. 組合小單元，使其儘量接近但不起過 max_chars
    chunks = []
    current_chunk = []
    current_len = 0

    for unit in sub_units:
        if unit == "\n":
            # 如果目前 chunk 不為空，可以保留換行
            if current_chunk:
                current_chunk.append("\n")
                current_len += 1
            continue

        # 計算加上此單元後的長度
        # 如果是 chunk 中第一個元素，不需要額外空格；否則預設加一個空格
        added_len = len(unit) + (1 if current_len > 0 else 0)

        if current_len + added_len <= max_chars:
            current_chunk.append(unit)
            current_len += added_len
        else:
            # 目前 chunk 已經夠大，打包輸出
            if current_chunk:
                chunks.append(" ".join(current_chunk).replace(" \n ", "\n").replace(" \n", "\n").replace("\n ", "\n"))
            current_chunk = [unit]
            current_len = len(unit)

    if current_chunk:
        chunks.append(" ".join(current_chunk).replace(" \n ", "\n").replace(" \n", "\n").replace("\n ", "\n"))

    # 清理多餘的空白 chunk
    chunks = [c.strip() for c in chunks if c.strip()]
    logger.info(f"[Chunker] 將 {len(text)} 字元的文字切分為 {len(chunks)} 個 chunks")
    return chunks

async def translate_with_chunking(text: str, translate_fn) -> str:
    """
    主要函式：分段翻譯並合併結果
    translate_fn: async (chunk: str) -> str
    """
    protected_text, placeholders = extract_latex(text)
    chunks = split_text(protected_text)

    results = []
    for i, chunk in enumerate(chunks):
        logger.info(f"[Chunker] 正在翻譯第 {i + 1}/{len(chunks)} 段 (字數: {len(chunk)})")
        # 呼叫傳入的翻譯 async 函數
        translated = await translate_fn(chunk)
        results.append(translated)

    combined = "\n\n".join(results)
    return restore_latex(combined, placeholders)
